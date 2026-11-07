"""Activity Session Manager for PrismLab S5-H.

Enforces strictly one active activity per visitor (CHAT, STORY, TRIVIA).
Features:
- Renewable leases tied to actual activity state.
- Separation of Activity Lock from global CPU Inference Worker Lock.
- Atomic lock acquisition, idempotent retries, and clean release.
- SQLite WAL checkpoint durability and startup crash reconciliation.
- Multi-tab race protection and conflict responses (HTTP 409).
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import threading
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("prismlab.activity_manager")

VALID_ACTIVITIES = {"CHAT", "STORY", "TRIVIA"}
DEFAULT_LEASE_TTL_S = 180.0  # 3 minutes renewable lease


@dataclass
class ActivitySession:
    visitor_id: str
    activity_type: str
    session_id: str
    status: str  # "active", "completed", "terminated", "expired"
    created_at: float
    updated_at: float
    expires_at: float
    idempotency_key: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    current_job_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["ttl_remaining_s"] = max(0.0, round(self.expires_at - time.time(), 1))
        return d


class ActivitySessionManager:
    def __init__(self, db_path: Optional[str | Path] = None):
        self._lock = threading.RLock()
        self._sessions: Dict[str, ActivitySession] = {}  # visitor_id -> ActivitySession

        if db_path is None:
            state_dir = Path(os.getenv("PRISMLAB_STATE_DIR", ".prismlab-local"))
            if not state_dir.is_absolute():
                state_dir = Path(__file__).resolve().parents[2] / state_dir
            state_dir.mkdir(parents=True, exist_ok=True)
            self._db_path = state_dir / "activity_checkpoints.db"
        else:
            self._db_path = Path(db_path)
            self._db_path.parent.mkdir(parents=True, exist_ok=True)

        self._init_db()
        self._reconcile_on_startup()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path), timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS activity_sessions (
                    visitor_id TEXT PRIMARY KEY,
                    activity_type TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    expires_at REAL NOT NULL,
                    idempotency_key TEXT,
                    metadata_json TEXT,
                    current_job_id TEXT
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS activity_checkpoints (
                    session_id TEXT NOT NULL,
                    turn_index INTEGER NOT NULL,
                    activity_type TEXT NOT NULL,
                    prompt TEXT,
                    output TEXT,
                    state_json TEXT,
                    timestamp REAL NOT NULL,
                    PRIMARY KEY (session_id, turn_index)
                );
            """)
            conn.commit()

    def _reconcile_on_startup(self) -> None:
        """On gateway startup, reconcile any orphaned active sessions from previous crashes."""
        now = time.time()
        with self._lock, self._get_connection() as conn:
            cur = conn.execute("SELECT * FROM activity_sessions WHERE status = 'active'")
            rows = cur.fetchall()
            for r in rows:
                conn.execute(
                    "UPDATE activity_sessions SET status = 'terminated', updated_at = ? WHERE visitor_id = ?",
                    (now, r["visitor_id"])
                )
            conn.commit()
            if rows:
                logger.info(f"Reconciled {len(rows)} orphaned activity sessions on startup.")

    def get_current_activity(self, visitor_id: str) -> Optional[ActivitySession]:
        with self._lock:
            session = self._sessions.get(visitor_id)
            if not session:
                with self._get_connection() as conn:
                    cur = conn.execute(
                        "SELECT * FROM activity_sessions WHERE visitor_id = ? AND status = 'active'",
                        (visitor_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        session = self._row_to_session(row)
                        self._sessions[visitor_id] = session

            if session:
                if session.status == "active" and time.time() >= session.expires_at:
                    session.status = "expired"
                    self._persist_session(session)
                    return None
                if session.status == "active":
                    return session
            return None

    def start_activity(
        self,
        visitor_id: str,
        activity_type: str,
        session_id: str,
        idempotency_key: Optional[str] = None,
        ttl_s: float = DEFAULT_LEASE_TTL_S,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, ActivitySession, Optional[str]]:
        """Atomically acquire the activity lock for visitor.

        Returns (success, session, error_code).
        If conflict, returns (False, conflicting_session, "ACTIVE_ACTIVITY_CONFLICT").
        """
        act_upper = activity_type.upper()
        if act_upper not in VALID_ACTIVITIES:
            raise ValueError(f"Invalid activity_type '{activity_type}'. Must be one of {VALID_ACTIVITIES}")

        now = time.time()
        with self._lock:
            existing = self.get_current_activity(visitor_id)
            if existing and existing.status == "active":
                # Check for idempotent retry
                if existing.session_id == session_id or (
                    idempotency_key and existing.idempotency_key == idempotency_key
                ):
                    # Same session - renew lease and update metadata
                    existing.expires_at = now + ttl_s
                    existing.updated_at = now
                    if metadata:
                        existing.metadata = {**(existing.metadata or {}), **metadata}
                    self._persist_session(existing)
                    return True, existing, None

                # Different active session -> Conflict!
                return False, existing, "ACTIVE_ACTIVITY_CONFLICT"

            # No active session - create new
            new_session = ActivitySession(
                visitor_id=visitor_id,
                activity_type=act_upper,
                session_id=session_id,
                status="active",
                created_at=now,
                updated_at=now,
                expires_at=now + ttl_s,
                idempotency_key=idempotency_key,
                metadata=metadata or {},
                current_job_id=None,
            )
            self._sessions[visitor_id] = new_session
            self._persist_session(new_session)
            return True, new_session, None

    def stop_activity(
        self,
        visitor_id: str,
        session_id: str,
        reason: str = "user_stopped",
    ) -> Tuple[bool, Optional[ActivitySession], Optional[str]]:
        """Atomically terminate an activity session and release the lock.

        Idempotent: Stopping an already stopped/expired session returns success.
        """
        now = time.time()
        with self._lock:
            session = self._sessions.get(visitor_id)
            if not session:
                with self._get_connection() as conn:
                    cur = conn.execute(
                        "SELECT * FROM activity_sessions WHERE visitor_id = ?",
                        (visitor_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        session = self._row_to_session(row)

            if not session:
                return True, None, "no_active_session"

            if session.session_id != session_id and session.status == "active":
                return False, session, "SESSION_MISMATCH"

            # Transition status
            final_status = "completed" if reason == "completed" else "terminated"
            session.status = final_status
            session.updated_at = now
            session.expires_at = now
            self._persist_session(session)
            self._sessions.pop(visitor_id, None)
            return True, session, None

    def renew_lease(
        self,
        visitor_id: str,
        session_id: Optional[str] = None,
        extension_s: float = DEFAULT_LEASE_TTL_S,
        active_job_id: Optional[str] = None,
    ) -> Tuple[bool, Optional[ActivitySession]]:
        """Extend lease TTL. Called on heartbeat or while inference is running."""
        now = time.time()
        with self._lock:
            session = self.get_current_activity(visitor_id)
            if not session or session.status != "active":
                return False, None

            if session_id and session.session_id != session_id:
                return False, None

            session.expires_at = now + extension_s
            session.updated_at = now
            if active_job_id:
                session.current_job_id = active_job_id
            self._persist_session(session)
            return True, session

    def validate_request_allowed(
        self,
        visitor_id: str,
        activity_session_id: Optional[str] = None,
        task_type: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[ActivitySession]]:
        """Validate whether an inference request is permitted for this visitor.

        Rules:
        - If visitor has an active non-CHAT session (STORY or TRIVIA):
          - Request MUST specify matching `activity_session_id`.
          - If matching, lease is auto-extended and request is allowed.
          - If missing or mismatching, returns (False, "ACTIVE_ACTIVITY_CONFLICT", active_session).
        - If visitor has active CHAT session:
          - Matching or untagged chat is allowed.
        - If visitor has NO active session:
          - Allowed.
        """
        now = time.time()
        with self._lock:
            active = self.get_current_activity(visitor_id)
            if not active or active.status != "active":
                return True, None, None

            # Visitor has an active session
            if activity_session_id:
                if active.session_id == activity_session_id:
                    # Validated participant! Auto-extend lease
                    active.expires_at = now + DEFAULT_LEASE_TTL_S
                    active.updated_at = now
                    self._persist_session(active)
                    return True, None, active
                else:
                    return False, "ACTIVE_ACTIVITY_CONFLICT", active

            # Request provided NO activity_session_id
            # If active activity is STORY or TRIVIA, reject arbitrary unlinked requests
            if active.activity_type in {"STORY", "TRIVIA"}:
                return False, "ACTIVE_ACTIVITY_CONFLICT", active

            # Active CHAT allows casual continuation
            active.expires_at = now + DEFAULT_LEASE_TTL_S
            active.updated_at = now
            self._persist_session(active)
            return True, None, active

    def save_checkpoint(
        self,
        session_id: str,
        turn_index: int,
        activity_type: str,
        prompt: Optional[str] = None,
        output: Optional[str] = None,
        state_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Persist an activity checkpoint (e.g. story turn or trivia question)."""
        now = time.time()
        state_json = json.dumps(state_data or {})
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO activity_checkpoints
                (session_id, turn_index, activity_type, prompt, output, state_json, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (session_id, turn_index, activity_type, prompt, output, state_json, now))
            conn.commit()

    def get_checkpoints(self, session_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute(
                "SELECT * FROM activity_checkpoints WHERE session_id = ? ORDER BY turn_index ASC",
                (session_id,)
            )
            rows = cur.fetchall()
            return [
                {
                    "session_id": r["session_id"],
                    "turn_index": r["turn_index"],
                    "activity_type": r["activity_type"],
                    "prompt": r["prompt"],
                    "output": r["output"],
                    "state": json.loads(r["state_json"] or "{}"),
                    "timestamp": r["timestamp"],
                }
                for r in rows
            ]

    def _persist_session(self, session: ActivitySession) -> None:
        meta_json = json.dumps(session.metadata or {})
        with self._get_connection() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO activity_sessions
                (visitor_id, activity_type, session_id, status, created_at, updated_at, expires_at, idempotency_key, metadata_json, current_job_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session.visitor_id,
                session.activity_type,
                session.session_id,
                session.status,
                session.created_at,
                session.updated_at,
                session.expires_at,
                session.idempotency_key,
                meta_json,
                session.current_job_id,
            ))
            conn.commit()

    def _row_to_session(self, row: sqlite3.Row) -> ActivitySession:
        return ActivitySession(
            visitor_id=row["visitor_id"],
            activity_type=row["activity_type"],
            session_id=row["session_id"],
            status=row["status"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            expires_at=row["expires_at"],
            idempotency_key=row["idempotency_key"],
            metadata=json.loads(row["metadata_json"] or "{}"),
            current_job_id=row["current_job_id"],
        )


# Global singleton instance
activity_manager = ActivitySessionManager()
