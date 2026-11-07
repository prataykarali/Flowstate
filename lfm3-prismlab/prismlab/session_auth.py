"""Verify short-lived, Vercel-issued anonymous access tokens."""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import re
import time

from fastapi import HTTPException


def verify_bearer(authorization: str, secret: str) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "A valid playground session is required")
    token = authorization[7:]
    try:
        encoded, signature = token.split(".", 1)
        if not encoded or len(encoded) > 256 or len(signature) != 64:
            raise ValueError
        expected = hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        visitor = payload["v"]
        expires = payload["exp"]
        if not isinstance(visitor, str) or not re.fullmatch(r"[0-9a-f]{32}", visitor):
            raise ValueError
        if not isinstance(expires, int) or isinstance(expires, bool) or not time.time() < expires <= time.time() + 660:
            raise ValueError
        return visitor
    except (ValueError, KeyError, TypeError, UnicodeDecodeError, binascii.Error):
        raise HTTPException(401, "Playground session expired or invalid") from None


RECEIPT_DOMAIN_PREFIX = b"prismlab:receipt:v1:"


def issue_activity_receipt(
    secret: str,
    request_id: str,
    visitor_id: str,
    model_id: str,
    activity_type: str,
    output_text: str | dict | None = None,
    context_id: str | None = None,
    ttl_s: int = 300,
) -> str:
    """Issue a domain-separated cryptographic activity receipt for verified inference work."""
    issued_at = int(time.time())
    expires_at = issued_at + ttl_s
    raw_output = json.dumps(output_text, sort_keys=True) if isinstance(output_text, dict) else str(output_text or "")
    result_digest = hashlib.sha256(raw_output.encode()).hexdigest()[:32]
    
    payload = {
        "req": request_id,
        "vis": visitor_id,
        "mod": model_id,
        "act": activity_type,
        "dig": result_digest,
        "iat": issued_at,
        "exp": expires_at,
        "ctx": context_id or "",
    }
    canonical_json = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    encoded = base64.urlsafe_b64encode(canonical_json).decode().rstrip("=")
    signature = hmac.new(secret.encode(), RECEIPT_DOMAIN_PREFIX + canonical_json, hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def verify_activity_receipt(receipt: str, secret: str) -> dict:
    """Verify a domain-separated activity receipt and return the verified payload."""
    try:
        encoded, signature = receipt.split(".", 1)
        if not encoded or len(signature) != 64:
            raise ValueError("Malformed receipt token")
        canonical_json = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
        expected = hmac.new(secret.encode(), RECEIPT_DOMAIN_PREFIX + canonical_json, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid receipt signature")
        payload = json.loads(canonical_json)
        now = time.time()
        if not isinstance(payload.get("exp"), (int, float)) or payload["exp"] < now:
            raise ValueError("Receipt has expired")
        if not isinstance(payload.get("iat"), (int, float)) or payload["iat"] > now + 60:
            raise ValueError("Receipt issued in the future")
        return payload
    except Exception as err:
        raise ValueError(f"Receipt verification failed: {err}") from None

