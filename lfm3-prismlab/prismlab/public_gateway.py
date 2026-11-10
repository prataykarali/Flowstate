"""Public, bounded inference gateway for a single-worker VPS."""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import secrets
import time
import threading
from dataclasses import dataclass, field
from typing import Callable

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from prismlab.core.cancellation import abort_upstream, unregister_upstream
from prismlab.live_api import _run_text
from prismlab.multimodal_api import MAX_BODY, parse_payload, run_local
from prismlab.on_demand import available_routes
from prismlab.admission_queue import AdmissionQueue, Ticket
from prismlab.session_auth import verify_bearer, issue_activity_receipt
from prismlab.core.activity_manager import activity_manager

@dataclass
class JobExecutionHandle:
    ticket: Ticket
    thread_ident: int | None = None
    worker_finished_event: asyncio.Event = field(default_factory=asyncio.Event)
    cancelled: bool = False

_handles: dict[str, JobExecutionHandle] = {}

@dataclass
class JobRecord:
    job_id: str
    visitor_id: str
    model_id: str
    activity_type: str
    status: str  # "queued", "running", "completed", "failed", "cancelled"
    position: int = 0
    created_at: float = field(default_factory=time.time)
    completed_at: float | None = None
    expires_at: float = field(default_factory=lambda: time.time() + 600)
    result: dict | None = None
    error: str | None = None
    streamed_tokens: list[str] = field(default_factory=list)
    cancelled: bool = False

_jobs: dict[str, JobRecord] = {}

def _cleanup_jobs() -> None:
    now = time.time()
    expired = [jid for jid, j in _jobs.items() if j.expires_at < now]
    for jid in expired:
        _jobs.pop(jid, None)
    while len(_jobs) > 100:
        oldest = min(_jobs.keys(), key=lambda k: _jobs[k].created_at)
        _jobs.pop(oldest, None)

app = FastAPI(title="PrismLab VPS Gateway", docs_url=None, redoc_url=None, openapi_url=None)
_allowed_origins = [origin.strip() for origin in os.getenv("PRISMLAB_ALLOWED_ORIGINS", "").split(",") if origin.strip()]

@app.middleware("http")
async def pna_middleware(request: Request, call_next):
    if request.method == "OPTIONS" and request.headers.get("access-control-request-private-network") == "true":
        res = JSONResponse(content={"ok": True})
        origin = request.headers.get("origin")
        if origin and (not _allowed_origins or origin in _allowed_origins or "*" in _allowed_origins):
            res.headers["Access-Control-Allow-Origin"] = origin
            res.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            res.headers["Access-Control-Allow-Headers"] = "*"
            res.headers["Access-Control-Allow-Credentials"] = "true"
            res.headers["Access-Control-Allow-Private-Network"] = "true"
            res.headers["Access-Control-Max-Age"] = "86400"
        return res
    response = await call_next(request)
    if request.headers.get("access-control-request-private-network") == "true":
        response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

if _allowed_origins:
    app.add_middleware(CORSMiddleware, allow_origins=_allowed_origins, allow_methods=["GET", "POST", "OPTIONS"],
                       allow_headers=["*"], max_age=86400)
queue = AdmissionQueue.from_env()
_cookie_secret = secrets.token_bytes(32)
_cookie_name = "prismlab_visitor"



def _visitor(request: Request) -> tuple[str, str | None]:
    secret = os.getenv("PRISMLAB_SESSION_SECRET")
    if secret:
        return verify_bearer(request.headers.get("authorization", ""), secret), None
    if os.getenv("PRISMLAB_PUBLIC_GATEWAY") == "1":
        raise HTTPException(503, "Session authentication is not configured")
    cookie = request.cookies.get(_cookie_name, "")
    if len(cookie) == 65 and cookie[32] == ".":
        value, signature = cookie.split(".", 1)
        if all(c in "0123456789abcdef" for c in value + signature):
            expected = hmac.new(_cookie_secret, value.encode(), hashlib.sha256).hexdigest()[:32]
            if hmac.compare_digest(signature, expected):
                return value, None
    value = secrets.token_hex(16)
    signature = hmac.new(_cookie_secret, value.encode(), hashlib.sha256).hexdigest()[:32]
    return value, f"{value}.{signature}"


def _set_cookie(response, request: Request, new_cookie: str | None) -> None:
    if new_cookie:
        response.set_cookie(_cookie_name, new_cookie, httponly=True,
                            secure=request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https",
                            samesite="lax", max_age=86400)


async def _payload(request: Request) -> dict:
    if request.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
        raise HTTPException(415, "JSON required")
    try:
        declared_size = int(request.headers.get("content-length", "0") or "0")
    except ValueError:
        raise HTTPException(400, "Invalid content length") from None
    if declared_size > MAX_BODY:
        raise HTTPException(413, "Request too large")
    content = bytearray()
    async for chunk in request.stream():
        content.extend(chunk)
        if len(content) > MAX_BODY:
            raise HTTPException(413, "Request too large")
    try:
        value = json.loads(content)
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(422, "Invalid JSON") from None
    if not isinstance(value, dict):
        raise HTTPException(422, "Expected JSON object")
    return value


def _text_job(body: dict) -> Callable:
    prompt = body.get("prompt")
    tokens = body.get("max_tokens", 128)
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 1000:
        raise HTTPException(422, "Prompt must be 1–1,000 characters")
    if not isinstance(tokens, int) or isinstance(tokens, bool) or not 4 <= tokens <= 256:
        raise HTTPException(422, "max_tokens must be 4–256")
    return lambda on_token=None: _run_text(prompt, on_token=on_token, max_tokens=tokens)


def _execute_job(body: dict) -> Callable:
    tokens = body.get("max_tokens", 128)
    if not isinstance(tokens, int) or isinstance(tokens, bool) or not 4 <= tokens <= 256:
        raise HTTPException(422, "max_tokens must be 4–256")
    body = {**body, "max_tokens": tokens}
    task, prompt, media, selected, model = parse_payload(body)
    if model is not None and model not in available_routes():
        raise HTTPException(503, f"Live inference for {model} is not installed on this host")
    rf = body.get("response_format")
    def _call_run_local(on_token=None):
        if rf is not None:
            try:
                return run_local(task, prompt, media, selected, model,
                                 body.get("decision_question"), body.get("max_tokens"), on_token,
                                 response_format=rf)
            except TypeError:
                pass
        return run_local(task, prompt, media, selected, model,
                         body.get("decision_question"), body.get("max_tokens"), on_token)
    return _call_run_local


async def _wait(ticket: Ticket, request: Request) -> None:
    deadline = asyncio.get_running_loop().time() + queue.wait_timeout_s
    while not ticket.ready.is_set():
        if ticket.cancelled:
            raise HTTPException(499, "Job cancelled")
        if await request.is_disconnected():
            await queue.cancel(ticket)
            raise asyncio.CancelledError
        if asyncio.get_running_loop().time() >= deadline:
            raise HTTPException(503, "Queue wait timed out; try again", headers={"Retry-After": "30"})
        try:
            await asyncio.wait_for(ticket.ready.wait(), timeout=2)
        except asyncio.TimeoutError:
            pass


@app.get("/local-api/status")
async def status(request: Request):
    visitor, cookie = _visitor(request)
    del visitor
    routes = available_routes()
    state = await queue.snapshot()
    response = JSONResponse({
        "gateway_enabled": bool(routes), "backend_available": bool(routes),
        "backend_live_enabled": bool(routes), "auto_start_available": bool(routes),
        "inference_busy": bool(state["active"]), "text_model_available": "text" in routes,
        "multimodal_model_available": any(route != "text" for route in routes),
        "on_demand_routes": routes, "backend_mode": "public_cpu_queue",
        "queue": state,
        "reason": "Models are ready on request." if routes else "No model runtime is available.",
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/readyz")
async def readyz():
    routes = available_routes()
    return JSONResponse({"ready": bool(routes), "available_routes": routes},
                        status_code=200 if routes else 503,
                        headers={"Cache-Control": "no-store"})


def _attach_receipt(result: dict, visitor: str, act_type: str | None = None, context_id: str | None = None) -> None:
    secret = os.getenv("PRISMLAB_SESSION_SECRET")
    if secret and isinstance(result, dict) and result.get("status") == "completed":
        req_id = result.get("request_id") or secrets.token_hex(16)
        route = result.get("route") or []
        model = result.get("backend_model_id") or result.get("requested_model") or (route[0] if route else "text")
        act = act_type or result.get("task") or "chat"
        ctx = context_id or result.get("activity_session_id") or ""
        try:
            result["activity_receipt"] = issue_activity_receipt(
                secret=secret,
                request_id=req_id,
                visitor_id=visitor,
                model_id=model,
                activity_type=act,
                output_text=result.get("output"),
                context_id=ctx,
            )
        except Exception:
            pass



async def _run_json(request: Request, job: Callable, payload: dict | None = None):
    visitor, cookie = _visitor(request)
    job_id = request.headers.get("x-job-id") or (payload.get("job_id") if payload else None) or secrets.token_urlsafe(18)
    model = payload.get("model") if payload else "text"
    task_name = payload.get("task") if payload else "chat"

    # Enforce activity exclusivity
    act_session_id = payload.get("activity_session_id") if payload else None
    allowed, err_code, active_sess = activity_manager.validate_request_allowed(visitor, act_session_id, task_name)
    if not allowed:
        status_code = 403 if err_code in {"SESSION_OWNERSHIP_MISMATCH", "ACCESS_DENIED"} else 409
        response = JSONResponse(
            status_code=status_code,
            content={
                "error": err_code or "ACTIVE_ACTIVITY_CONFLICT",
                "message": f"Visitor has active {active_sess.activity_type} session in progress." if active_sess else "Activity session access denied or invalid.",
                "active_session": active_sess.to_dict() if active_sess else None,
            },
            headers={"Cache-Control": "no-store"}
        )
        _set_cookie(response, request, cookie)
        return response

    job_rec = JobRecord(
        job_id=job_id,
        visitor_id=visitor,
        model_id=str(model or "text"),
        activity_type=str(task_name or "chat"),
        status="queued",
    )
    _cleanup_jobs()
    _jobs[job_id] = job_rec

    ticket = await queue.admit(visitor)
    handle = JobExecutionHandle(ticket=ticket)
    _handles[job_id] = handle

    started = False
    try:
        await _wait(ticket, request)
        if handle.cancelled or ticket.cancelled:
            job_rec.status = "cancelled"
            raise HTTPException(499, "Job cancelled")
        job_rec.status = "running"
        started = True
        if act_session_id:
            activity_manager.renew_lease(visitor, act_session_id, active_job_id=job_id)

        def worker():
            handle.thread_ident = threading.get_ident()
            unregister_upstream(handle.thread_ident)
            try:
                return job()
            finally:
                unregister_upstream(handle.thread_ident)
                handle.worker_finished_event.set()

        exec_started = time.perf_counter()
        def on_done(_):
            dur = time.perf_counter() - exec_started
            asyncio.create_task(queue.record_compute(visitor, dur))
            asyncio.create_task(queue.release(ticket))

        task = asyncio.create_task(asyncio.to_thread(worker))
        task.add_done_callback(on_done)

        try:
            job_timeout = float(os.getenv("PRISMLAB_JOB_TIMEOUT_S", "120.0"))
            result = await asyncio.wait_for(asyncio.shield(task), timeout=job_timeout)
            verified_act = "chat"
            if active_sess:
                verified_act = active_sess.activity_type.lower()
            elif payload and payload.get("checkpoint", {}).get("activity_type") == "STORY":
                verified_act = "story"
            elif act_session_id and "match" in str(act_session_id).lower():
                verified_act = "trivia"
            elif task_name and task_name in {"ocr", "audio_qa", "video_qa", "transcribe", "summarize", "decision"}:
                verified_act = task_name

            _attach_receipt(result, visitor, act_type=verified_act, context_id=act_session_id)
            if handle.cancelled:
                job_rec.status = "cancelled"
            else:
                job_rec.status = "completed" if result.get("status") == "completed" else "failed"
            job_rec.completed_at = time.time()
            job_rec.result = result

            if act_session_id and payload and "checkpoint" in payload:
                cp = payload["checkpoint"]
                activity_manager.save_checkpoint(
                    session_id=act_session_id,
                    turn_index=cp.get("turn_index", 0),
                    activity_type=cp.get("activity_type", task_name),
                    prompt=payload.get("prompt"),
                    output=result.get("output") if isinstance(result, dict) else str(result),
                    state_data=cp.get("state"),
                )
        except asyncio.TimeoutError:
            if handle.thread_ident is not None:
                abort_upstream(handle.thread_ident)
            handle.cancelled = True
            job_rec.status = "failed"
            job_rec.error = "Job execution timeout exceeded"
            raise HTTPException(504, "Inference execution timeout exceeded", headers={"Retry-After": "10"})
        except asyncio.CancelledError:
            # Client navigation/disconnect: detached, worker runs to completion in background
            raise
        except (OSError, RuntimeError, ValueError) as exc:
            import traceback
            traceback.print_exc()
            if handle.cancelled:
                job_rec.status = "cancelled"
                raise HTTPException(499, "Job cancelled")
            job_rec.status = "failed"
            job_rec.error = f"Inference unavailable: {exc}"
            raise HTTPException(503, f"Inference unavailable: {exc}") from None
        response = JSONResponse(result, status_code=200 if result.get("status") == "completed" else 502,
                                headers={
                                    "Cache-Control": "no-store",
                                    "X-Job-Id": job_id,
                                    "X-Compute-Budget": str(int(queue.compute_budget_s)),
                                })
        _set_cookie(response, request, cookie)
        return response
    finally:
        if not started:
            await queue.release(ticket)
            if job_rec.status == "queued":
                job_rec.status = "cancelled"


async def _run_stream(request: Request, job: Callable, payload: dict | None = None):
    visitor, cookie = _visitor(request)
    job_id = request.headers.get("x-job-id") or (payload.get("job_id") if payload else None) or secrets.token_urlsafe(18)
    model = payload.get("model") if payload else "text"
    task_name = payload.get("task") if payload else "chat"

    # Enforce activity exclusivity
    act_session_id = payload.get("activity_session_id") if payload else None
    allowed, err_code, active_sess = activity_manager.validate_request_allowed(visitor, act_session_id, task_name)
    if not allowed:
        status_code = 403 if err_code in {"SESSION_OWNERSHIP_MISMATCH", "ACCESS_DENIED"} else 409
        response = JSONResponse(
            status_code=status_code,
            content={
                "error": err_code or "ACTIVE_ACTIVITY_CONFLICT",
                "message": f"Visitor has active {active_sess.activity_type} session in progress." if active_sess else "Activity session access denied or invalid.",
                "active_session": active_sess.to_dict() if active_sess else None,
            },
            headers={"Cache-Control": "no-store"}
        )
        _set_cookie(response, request, cookie)
        return response

    job_rec = JobRecord(
        job_id=job_id,
        visitor_id=visitor,
        model_id=str(model or "text"),
        activity_type=str(task_name or "chat"),
        status="queued",
    )
    _cleanup_jobs()
    _jobs[job_id] = job_rec

    ticket = await queue.admit(visitor)
    handle = JobExecutionHandle(ticket=ticket)
    _handles[job_id] = handle

    async def events():
        started = False
        try:
            while not ticket.ready.is_set():
                if handle.cancelled or ticket.cancelled:
                    job_rec.status = "cancelled"
                    yield _sse("status", {"stage": "cancelled", "message": "Job cancelled", "job_id": job_id})
                    return
                if await request.is_disconnected():
                    job_rec.status = "cancelled"
                    await queue.cancel(ticket)
                    return
                position = await queue.position(ticket)
                job_rec.position = position
                yield _sse("status", {"stage": "queued", "message": f"Queue position {position}", "position": position, "job_id": job_id})
                try:
                    await asyncio.wait_for(ticket.ready.wait(), timeout=3)
                except asyncio.TimeoutError:
                    pass
                if asyncio.get_running_loop().time() - admitted_at >= queue.wait_timeout_s:
                    job_rec.status = "failed"
                    job_rec.error = "Queue wait timed out"
                    yield _sse("error", {"message": "Queue wait timed out; try again", "job_id": job_id})
                    return

            if handle.cancelled or ticket.cancelled:
                job_rec.status = "cancelled"
                return

            job_rec.status = "running"
            if act_session_id:
                activity_manager.renew_lease(visitor, act_session_id, active_job_id=job_id)
            yield _sse("status", {"stage": "loading_model", "message": "Preparing model…", "job_id": job_id})
            loop = asyncio.get_running_loop()
            updates: asyncio.Queue[tuple[str, dict]] = asyncio.Queue()

            def worker():
                handle.thread_ident = threading.get_ident()
                unregister_upstream(handle.thread_ident)
                held = ""
                mode = "opening"

                def on_token(token: str):
                    nonlocal held, mode
                    if mode == "thinking":
                        held += token
                        marker = held.find("</think>")
                        if marker < 0:
                            held = held[-16:]
                            return
                        token = held[marker + len("</think>"):]
                        held = ""
                        mode = "visible"
                    if mode == "opening":
                        held += token
                        if held.startswith("<think>"):
                            held = held[len("<think>"):]
                            mode = "thinking"
                            if held:
                                on_token("")
                            return
                        if "<think>".startswith(held):
                            return
                        token, held, mode = held, "", "visible"
                    if token:
                        job_rec.streamed_tokens.append(token)
                        loop.call_soon_threadsafe(updates.put_nowait, ("token", {"text": token}))
                try:
                    result = job(on_token=on_token)
                    verified_act = "chat"
                    if active_sess:
                        verified_act = active_sess.activity_type.lower()
                    elif payload and payload.get("checkpoint", {}).get("activity_type") == "STORY":
                        verified_act = "story"
                    elif act_session_id and "match" in str(act_session_id).lower():
                        verified_act = "trivia"
                    elif task_name and task_name in {"ocr", "audio_qa", "video_qa", "transcribe", "summarize", "decision"}:
                        verified_act = task_name

                    _attach_receipt(result, visitor, act_type=verified_act, context_id=act_session_id)
                    if handle.cancelled:
                        job_rec.status = "cancelled"
                    else:
                        job_rec.status = "completed"
                    job_rec.completed_at = time.time()
                    job_rec.result = result
                    if act_session_id and payload and "checkpoint" in payload:
                        cp = payload["checkpoint"]
                        activity_manager.save_checkpoint(
                            session_id=act_session_id,
                            turn_index=cp.get("turn_index", 0),
                            activity_type=cp.get("activity_type", task_name),
                            prompt=payload.get("prompt"),
                            output=result.get("output") if isinstance(result, dict) else str(result),
                            state_data=cp.get("state"),
                        )
                    loop.call_soon_threadsafe(updates.put_nowait, ("result", result))
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    if handle.cancelled:
                        job_rec.status = "cancelled"
                    else:
                        job_rec.status = "failed"
                        job_rec.error = f"Inference unavailable: {e}"
                        loop.call_soon_threadsafe(updates.put_nowait, ("error", {"message": f"Inference unavailable: {e}"}))
                finally:
                    unregister_upstream(handle.thread_ident)
                    handle.worker_finished_event.set()
                    loop.call_soon_threadsafe(updates.put_nowait, ("done", {}))

            exec_started = time.perf_counter()
            def on_done(_):
                dur = time.perf_counter() - exec_started
                asyncio.create_task(queue.record_compute(visitor, dur))
                asyncio.create_task(queue.release(ticket))

            task = asyncio.create_task(asyncio.to_thread(worker))
            task.add_done_callback(on_done)
            started = True
            job_timeout = float(os.getenv("PRISMLAB_JOB_TIMEOUT_S", "120.0"))
            exec_deadline = asyncio.get_running_loop().time() + job_timeout
            while True:
                # Browser navigation detachment: if client disconnected, do not cancel server job!
                # Simply break the SSE generator, worker will continue and populate job_rec in memory.
                if await request.is_disconnected():
                    return
                if asyncio.get_running_loop().time() >= exec_deadline:
                    if handle.thread_ident is not None:
                        abort_upstream(handle.thread_ident)
                    handle.cancelled = True
                    job_rec.status = "failed"
                    job_rec.error = "Job execution timeout exceeded"
                    yield _sse("error", {"message": "Job execution timeout exceeded", "job_id": job_id})
                    return
                try:
                    kind, data = await asyncio.wait_for(updates.get(), timeout=10)
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
                    continue
                if kind == "done":
                    return
                yield _sse(kind, data)
                if kind in ("result", "error"):
                    return
        finally:
            if not started:
                await queue.release(ticket)
                if job_rec.status == "queued":
                    job_rec.status = "cancelled"

    admitted_at = asyncio.get_running_loop().time()
    response = StreamingResponse(events(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no", "X-Job-Id": job_id, "X-Compute-Budget": str(int(queue.compute_budget_s))})
    _set_cookie(response, request, cookie)
    return response


def _sse(kind: str, data: dict) -> str:
    return f"event: {kind}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/local-api/jobs/active")
async def get_active_jobs(request: Request):
    visitor, cookie = _visitor(request)
    _cleanup_jobs()
    user_jobs = [
        {
            "job_id": j.job_id,
            "status": j.status,
            "model_id": j.model_id,
            "activity_type": j.activity_type,
            "position": j.position,
            "created_at": j.created_at,
            "completed_at": j.completed_at,
            "token_count": len(j.streamed_tokens),
            "has_result": j.result is not None,
        }
        for j in _jobs.values()
        if j.visitor_id == visitor
    ]
    response = JSONResponse({"jobs": user_jobs}, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.get("/local-api/jobs/{job_id}")
async def get_job(job_id: str, request: Request):
    visitor, cookie = _visitor(request)
    _cleanup_jobs()
    job_rec = _jobs.get(job_id)
    if not job_rec:
        raise HTTPException(404, "Job not found or expired")
    if job_rec.visitor_id != visitor:
        raise HTTPException(403, "Access denied to this job")
    response = JSONResponse({
        "job_id": job_rec.job_id,
        "status": job_rec.status,
        "model_id": job_rec.model_id,
        "activity_type": job_rec.activity_type,
        "position": job_rec.position,
        "streamed_tokens": job_rec.streamed_tokens,
        "result": job_rec.result,
        "error": job_rec.error,
        "completed_at": job_rec.completed_at,
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.post("/local-api/jobs/{job_id}/cancel")
async def cancel_job(job_id: str, request: Request):
    visitor, cookie = _visitor(request)
    job_rec = _jobs.get(job_id)
    if not job_rec:
        raise HTTPException(404, "Job not found")
    if job_rec.visitor_id != visitor:
        raise HTTPException(403, "Access denied to this job")
    job_rec.cancelled = True
    job_rec.status = "cancelled"

    handle = _handles.get(job_id)
    if handle:
        handle.cancelled = True
        pos = await queue.position(handle.ticket)
        if pos > 0:
            # Ticket is queued: remove immediately from waiting queue
            await queue.cancel(handle.ticket)
        elif pos == 0:
            # Ticket is active: trigger upstream socket abort
            if handle.thread_ident:
                abort_upstream(handle.thread_ident)
            # Await worker termination confirmation before releasing queue ticket
            try:
                await asyncio.wait_for(handle.worker_finished_event.wait(), timeout=6.0)
            except asyncio.TimeoutError:
                pass
            await queue.release(handle.ticket)

    response = JSONResponse({"status": "cancelled", "job_id": job_id}, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.get("/local-api/compute/status")
async def get_compute_status_endpoint(request: Request):
    visitor, cookie = _visitor(request)
    status_data = await queue.get_visitor_compute_status(visitor)
    response = JSONResponse(status_data, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.get("/local-api/activity/current")
async def get_current_activity_endpoint(request: Request):
    visitor, cookie = _visitor(request)
    session = activity_manager.get_current_activity(visitor)
    parked = activity_manager.get_parked_activity(visitor)
    response = JSONResponse({
        "active": session is not None,
        "activity": session.to_dict() if session else None,
        "parked": parked.to_dict() if parked else None,
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.post("/local-api/activity/park")
async def park_activity_endpoint(request: Request):
    visitor, cookie = _visitor(request)
    body = await _payload(request)
    sess_id = body.get("session_id")
    if not sess_id:
        raise HTTPException(422, "session_id required")
    metadata = body.get("metadata")

    ok, session, err = activity_manager.park_activity(visitor, sess_id, metadata=metadata)
    if not ok:
        status_code = 403 if err == "ACCESS_DENIED" else 404
        response = JSONResponse(
            status_code=status_code,
            content={"error": err, "session": session.to_dict() if session else None},
            headers={"Cache-Control": "no-store"}
        )
        _set_cookie(response, request, cookie)
        return response

    response = JSONResponse({
        "status": "parked",
        "session": session.to_dict() if session else None,
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.post("/local-api/activity/resume-parked")
async def resume_parked_activity_endpoint(request: Request):
    visitor, cookie = _visitor(request)
    body = await _payload(request)
    sess_id = body.get("session_id")
    if not sess_id:
        raise HTTPException(422, "session_id required")
    ttl_s = float(body.get("ttl_s", 180.0))

    ok, session, err = activity_manager.resume_parked_activity(visitor, sess_id, ttl_s=ttl_s)
    if not ok:
        status_code = 409 if err == "ACTIVE_ACTIVITY_CONFLICT" else (403 if err == "ACCESS_DENIED" else 404)
        response = JSONResponse(
            status_code=status_code,
            content={"error": err, "session": session.to_dict() if session else None},
            headers={"Cache-Control": "no-store"}
        )
        _set_cookie(response, request, cookie)
        return response

    response = JSONResponse({
        "status": "active",
        "session": session.to_dict(),
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.post("/local-api/activity/start")
async def start_activity_endpoint(request: Request):
    visitor, cookie = _visitor(request)
    body = await _payload(request)
    act_type = body.get("activity_type", "CHAT")
    sess_id = body.get("session_id") or secrets.token_hex(16)
    idem_key = body.get("idempotency_key")
    metadata = body.get("metadata")
    ttl_s = float(body.get("ttl_s", 180.0))

    try:
        ok, session, err = activity_manager.start_activity(
            visitor_id=visitor,
            activity_type=act_type,
            session_id=sess_id,
            idempotency_key=idem_key,
            ttl_s=ttl_s,
            metadata=metadata,
        )
    except ValueError as e:
        raise HTTPException(422, str(e))

    if not ok:
        response = JSONResponse(
            status_code=409,
            content={
                "error": "ACTIVE_ACTIVITY_CONFLICT",
                "message": f"Visitor already has an active {session.activity_type} session in progress.",
                "active_session": session.to_dict(),
            },
            headers={"Cache-Control": "no-store"}
        )
        _set_cookie(response, request, cookie)
        return response

    response = JSONResponse({
        "status": "active",
        "session": session.to_dict(),
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.post("/local-api/activity/stop")
async def stop_activity_endpoint(request: Request):
    visitor, cookie = _visitor(request)
    body = await _payload(request)
    sess_id = body.get("session_id")
    if not sess_id:
        raise HTTPException(422, "session_id required")
    reason = body.get("reason", "user_stopped")

    ok, session, err = activity_manager.stop_activity(visitor, sess_id, reason=reason)
    if not ok:
        status_code = 403 if err == "ACCESS_DENIED" else 409
        response = JSONResponse(
            status_code=status_code,
            content={"error": err, "session": session.to_dict() if session else None},
            headers={"Cache-Control": "no-store"}
        )
        _set_cookie(response, request, cookie)
        return response

    # Safely abort any in-flight inference worker jobs for this visitor
    for jid, j in list(_jobs.items()):
        if j.visitor_id == visitor and j.status in {"queued", "running"}:
            j.cancelled = True
            h = _handles.get(jid)
            if h:
                h.cancelled = True
                if h.thread_ident:
                    abort_upstream(h.thread_ident)

    secret = os.getenv("PRISMLAB_SESSION_SECRET")
    completion_receipt = None
    if secret and session and reason == "completed":
        try:
            completion_receipt = issue_activity_receipt(
                secret=secret,
                request_id=f"complete_{sess_id}_{secrets.token_hex(4)}",
                visitor_id=visitor,
                model_id="text",
                activity_type="story_complete",
                output_text=f"Story session {sess_id} completed",
                context_id=sess_id,
            )
        except Exception:
            pass

    response = JSONResponse({
        "status": "stopped",
        "session": session.to_dict() if session else None,
        "completion_receipt": completion_receipt,
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.post("/local-api/activity/heartbeat")
async def heartbeat_activity_endpoint(request: Request):
    visitor, cookie = _visitor(request)
    body = await _payload(request)
    sess_id = body.get("session_id")
    ext_s = float(body.get("extension_s", 180.0))
    ok, session = activity_manager.renew_lease(visitor, sess_id, extension_s=ext_s)
    response = JSONResponse({
        "active": ok,
        "session": session.to_dict() if session else None,
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.get("/local-api/activity/checkpoints/{session_id}")
async def get_checkpoints_endpoint(session_id: str, request: Request):
    visitor, cookie = _visitor(request)
    cps = activity_manager.get_checkpoints(session_id)
    response = JSONResponse({
        "session_id": session_id,
        "checkpoints": cps,
    }, headers={"Cache-Control": "no-store"})
    _set_cookie(response, request, cookie)
    return response


@app.post("/local-api/text")
async def text(request: Request):
    body = await _payload(request)
    return await _run_json(request, _text_job(body), body)


@app.post("/local-api/text/stream")
async def text_stream(request: Request):
    body = await _payload(request)
    return await _run_stream(request, _text_job(body), body)


@app.post("/local-api/execute")
async def execute(request: Request):
    body = await _payload(request)
    return await _run_json(request, _execute_job(body), body)


@app.post("/local-api/execute/stream")
async def execute_stream(request: Request):
    body = await _payload(request)
    return await _run_stream(request, _execute_job(body), body)



