import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from prismlab.api_server import app


class TestP6RouteRegistration(unittest.TestCase):

    def test_live_routes_in_openapi(self):
        paths = app.openapi()["paths"]

        for path in (
            "/api/v1/live/text",
            "/api/v1/live/execute",
        ):
            self.assertIn(path, paths)
            self.assertIn("post", paths[path])

    def test_live_routes_reject_missing_token(self):
        with patch.dict(os.environ, {
            "PRISMLAB_LIVE_ENABLED": "1",
            "PRISMLAB_LIVE_TOKEN": "test-token",
        }):
            with TestClient(app) as client:
                for path in (
                    "/api/v1/live/text",
                    "/api/v1/live/execute",
                ):
                    response = client.post(
                        path,
                        json=(
                            {"prompt": "Authentication test"}
                            if path.endswith("/text")
                            else {
                                "task": "chat",
                                "prompt": "Authentication test",
                            }
                        ),
                    )
                    self.assertEqual(
                        response.status_code, 401,
                        (path, response.text),
                    )

    def test_multimodal_disabled(self):
        with patch.dict(os.environ, {
            "PRISMLAB_LIVE_ENABLED": "0",
            "PRISMLAB_LIVE_TOKEN": "test-token",
        }):
            with TestClient(app) as client:
                response = client.post(
                    "/api/v1/live/execute",
                    headers={
                        "X-Prismlab-Token": "test-token"
                    },
                    json={},
                )
                self.assertEqual(
                    response.status_code, 403,
                    response.text,
                )


if __name__ == "__main__":
    unittest.main()
