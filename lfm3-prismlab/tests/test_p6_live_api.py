
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from prismlab.api_server import app
from prismlab.live_api import LIVE_LOCK


class TestLiveAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.url = "/api/v1/live/text"
        self.token = {"X-PrismLab-Token": "test-secret"}

    def tearDown(self):
        self.client.close()

    @patch.dict(
        "os.environ",
        {"PRISMLAB_LIVE_ENABLED": "0"},
    )
    def test_disabled_by_default(self):
        response = self.client.post(
            self.url,
            json={"prompt": "Hello"},
        )
        self.assertEqual(response.status_code, 403)

    @patch.dict(
        "os.environ",
        {
            "PRISMLAB_LIVE_ENABLED": "1",
            "PRISMLAB_LIVE_TOKEN": "test-secret",
        },
    )
    def test_token_required(self):
        response = self.client.post(
            self.url,
            json={"prompt": "Hello"},
        )
        self.assertEqual(response.status_code, 401)

    @patch.dict(
        "os.environ",
        {
            "PRISMLAB_LIVE_ENABLED": "1",
            "PRISMLAB_LIVE_TOKEN": "test-secret",
        },
    )
    def test_input_limit(self):
        response = self.client.post(
            self.url,
            headers=self.token,
            json={"prompt": "x" * 1001},
        )
        self.assertEqual(response.status_code, 422)

    @patch.dict(
        "os.environ",
        {
            "PRISMLAB_LIVE_ENABLED": "1",
            "PRISMLAB_LIVE_TOKEN": "test-secret",
        },
    )
    def test_busy_worker(self):
        LIVE_LOCK.acquire()
        try:
            response = self.client.post(
                self.url,
                headers=self.token,
                json={"prompt": "Hello"},
            )
            self.assertEqual(response.status_code, 409)
        finally:
            LIVE_LOCK.release()

    @patch.dict(
        "os.environ",
        {
            "PRISMLAB_LIVE_ENABLED": "1",
            "PRISMLAB_LIVE_TOKEN": "test-secret",
        },
    )
    @patch("prismlab.live_api._run_text")
    def test_success(self, mock_run):
        mock_run.return_value = {
            "mode": "live_local_inference",
            "status": "completed",
            "output": "Hello",
        }

        response = self.client.post(
            self.url,
            headers=self.token,
            json={"prompt": "Say hello"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["output"], "Hello"
        )
        mock_run.assert_called_once_with("Say hello")


if __name__ == "__main__":
    unittest.main()
