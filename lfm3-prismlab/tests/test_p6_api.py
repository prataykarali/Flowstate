
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from prismlab import api_server


class TestP6ReplayAPI(unittest.TestCase):

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name)

        self.directory_patch = patch.object(
            api_server, "REPLAY_DIR", self.path
        )
        self.directory_patch.start()

        self.client = TestClient(api_server.app)

        self.case = {
            "slug": "sample",
            "mode": "recorded_replay",
            "title": "Test replay",
            "route": ["vision"],
            "status": "completed",
            "output": "Blue",
            "metrics": {
                "total_latency_s": 1.0,
                "ttft_s": 0.7,
                "tokens_per_second": None,
            },
            "trace": [{
                "stage": "inference",
                "status": "ok",
                "model": "vision",
                "latency_s": 1.0,
                "ttft_s": 0.7,
            }],
            "evaluation": None,
        }

        (self.path / "sample.json").write_text(
            json.dumps(self.case),
            encoding="utf-8",
        )

    def tearDown(self):
        self.client.close()
        self.directory_patch.stop()
        self.temp.cleanup()

    @patch.dict(
        "os.environ",
        {"PRISMLAB_LIVE_ENABLED": "0"},
    )
    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            response.json()["live_inference_enabled"]
        )

    @patch.dict(
        "os.environ",
        {
            "PRISMLAB_LIVE_ENABLED": "1",
            "PRISMLAB_LIVE_TOKEN": "local-test-token",
        },
    )
    def test_health_live_enabled(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            response.json()["live_inference_enabled"]
        )
        self.assertEqual(
            response.json()["mode"],
            "replay_and_local_live",
        )

    def test_model_families(self):
        response = self.client.get("/api/v1/models")
        self.assertEqual(
            len(response.json()["items"]), 6
        )

    def test_list(self):
        response = self.client.get("/api/v1/replays")
        self.assertEqual(
            len(response.json()["items"]), 1
        )

    def test_read(self):
        response = self.client.get(
            "/api/v1/replays/sample"
        )
        self.assertEqual(
            response.json()["output"], "Blue"
        )

    def test_invalid_path(self):
        response = self.client.get(
            "/api/v1/replays/%2E%2E%5Cfoo"
        )
        self.assertEqual(response.status_code, 404)

    def test_sse_replay(self):
        response = self.client.get(
            "/api/v1/replays/sample/events"
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("event: stage", response.text)
        self.assertIn(
            '"live_model_called": false',
            response.text,
        )


if __name__ == "__main__":
    unittest.main()
