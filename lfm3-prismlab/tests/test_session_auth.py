import base64
import hashlib
import hmac
import json
import time
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from prismlab.public_gateway import app


def token(secret: str, visitor: str, expiry: int) -> str:
    encoded = base64.urlsafe_b64encode(json.dumps({"v": visitor, "exp": expiry}).encode()).decode().rstrip("=")
    signature = hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


class SessionAuthTests(unittest.TestCase):
    def test_public_gateway_rejects_missing_session_secret(self):
        with patch.dict("os.environ", {"PRISMLAB_PUBLIC_GATEWAY": "1", "PRISMLAB_SESSION_SECRET": ""}):
            client = TestClient(app)
            self.assertEqual(client.get("/local-api/status").status_code, 503)
            self.assertEqual(client.post("/local-api/text", json={"prompt": "hello"}).status_code, 503)
            client.close()

    def test_signed_session_is_required_and_tampering_is_rejected(self):
        visitor = "a" * 32
        good = token("test-secret", visitor, int(time.time()) + 600)
        with patch.dict("os.environ", {"PRISMLAB_SESSION_SECRET": "test-secret"}):
            client = TestClient(app)
            self.assertEqual(client.get("/local-api/status").status_code, 401)
            self.assertEqual(client.get("/local-api/status", headers={"Authorization": f"Bearer {good}"}).status_code, 200)
            changed = good[:-1] + ("0" if good[-1] != "0" else "1")
            self.assertEqual(client.get("/local-api/status", headers={"Authorization": f"Bearer {changed}"}).status_code, 401)
            expired = token("test-secret", visitor, int(time.time()) - 1)
            self.assertEqual(client.get("/local-api/status", headers={"Authorization": f"Bearer {expired}"}).status_code, 401)
            client.close()

    def test_activity_receipt_issuance_and_cryptographic_verification(self):
        from prismlab.session_auth import issue_activity_receipt, verify_activity_receipt

        secret = "super-secret-signing-key"
        visitor_a = "0123456789abcdef0123456789abcdef"
        visitor_b = "fedcba9876543210fedcba9876543210"
        req_id = "req_12345678"

        # 1. Genuine receipt verifies cleanly
        receipt = issue_activity_receipt(
            secret=secret,
            request_id=req_id,
            visitor_id=visitor_a,
            model_id="text",
            activity_type="chat",
            output_text="Rayleigh scattering",
            ttl_s=300,
        )
        payload = verify_activity_receipt(receipt, secret)
        self.assertEqual(payload["req"], req_id)
        self.assertEqual(payload["vis"], visitor_a)
        self.assertEqual(payload["mod"], "text")
        self.assertEqual(payload["act"], "chat")

        # 2. Forged receipt (signed with wrong secret) is rejected
        with self.assertRaises(ValueError):
            verify_activity_receipt(receipt, "wrong-secret-key")

        # 3. Tampered payload is rejected
        encoded, sig = receipt.split(".", 1)
        tampered_encoded = encoded[:-1] + ("A" if encoded[-1] != "A" else "B")
        with self.assertRaises(ValueError):
            verify_activity_receipt(f"{tampered_encoded}.{sig}", secret)

        # 4. Tampered signature is rejected
        tampered_sig = sig[:-1] + ("0" if sig[-1] != "0" else "1")
        with self.assertRaises(ValueError):
            verify_activity_receipt(f"{encoded}.{tampered_sig}", secret)

        # 5. Expired receipt is rejected
        expired_receipt = issue_activity_receipt(
            secret=secret,
            request_id=req_id,
            visitor_id=visitor_a,
            model_id="text",
            activity_type="chat",
            ttl_s=-10,
        )
        with self.assertRaises(ValueError):
            verify_activity_receipt(expired_receipt, secret)

        # 6. Cross-visitor mismatch is detected
        payload = verify_activity_receipt(receipt, secret)
        self.assertNotEqual(payload["vis"], visitor_b)

