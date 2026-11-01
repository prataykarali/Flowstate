
"""Offline P6.3 tests: no llama-server is started."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch
from urllib.error import HTTPError, URLError

from prismlab.core.lifecycle import LifecycleManager, RuntimeSpec


class Response:
    status = 200

    def __init__(self, value=None):
        self.value = value or {}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, *args):
        return json.dumps(self.value).encode()


SPEC = RuntimeSpec(
    "text", "http://127.0.0.1:8080", "lfm3-text"
)

CMD_SPEC = RuntimeSpec(
    "text", "http://127.0.0.1:8080", "lfm3-text",
    ("llama-server", "--port", "8080")
)


class TestLifecycle(unittest.TestCase):

    def test_reject_nonlocal_address(self):
        with self.assertRaises(ValueError):
            RuntimeSpec(
                "text", "http://example.com:8080", "lfm3-text"
            )

    def test_reject_duplicate_keys(self):
        with self.assertRaises(ValueError):
            LifecycleManager([SPEC, SPEC])

    @patch("prismlab.core.lifecycle.urlopen")
    def test_verified_ready(self, mock_urlopen):
        mock_urlopen.side_effect = [
            Response(),
            Response({"data": [{"id": "lfm3-text"}]})
        ]
        self.assertTrue(
            LifecycleManager([SPEC]).probe("text").ready
        )

    @patch("prismlab.core.lifecycle.urlopen")
    def test_model_mismatch(self, mock_urlopen):
        mock_urlopen.side_effect = [
            Response(),
            Response({"data": [{"id": "wrong"}]})
        ]
        self.assertEqual(
            LifecycleManager([SPEC]).probe("text").state,
            "mismatch"
        )

    @patch(
        "prismlab.core.lifecycle.urlopen",
        side_effect=URLError("refused")
    )
    def test_offline(self, mock_urlopen):
        self.assertEqual(
            LifecycleManager([SPEC]).probe("text").state,
            "offline"
        )

    @patch("prismlab.core.lifecycle.urlopen")
    def test_loading(self, mock_urlopen):
        mock_urlopen.side_effect = HTTPError(
            "localhost", 503, "loading", {}, None
        )
        self.assertEqual(
            LifecycleManager([SPEC]).start("text"),
            "external_loading"
        )

    @patch("prismlab.core.lifecycle.urlopen")
    def test_external_reuse_and_no_kill(self, mock_urlopen):
        mock_urlopen.side_effect = [
            Response(),
            Response({"data": [{"id": "lfm3-text"}]})
        ]
        manager = LifecycleManager([SPEC])
        self.assertEqual(
            manager.start("text"), "reused_external"
        )
        self.assertFalse(manager.stop("text"))

    @patch(
        "prismlab.core.lifecycle.urlopen",
        side_effect=URLError("refused")
    )
    def test_offline_without_launch_command(self, mock_urlopen):
        with self.assertRaisesRegex(
            RuntimeError, "no launch_command"
        ):
            LifecycleManager([SPEC]).start("text")

    @patch("prismlab.core.lifecycle.subprocess.Popen")
    @patch(
        "prismlab.core.lifecycle.urlopen",
        side_effect=URLError("refused")
    )
    def test_start_and_stop_own_process(
        self, mock_urlopen, mock_popen
    ):
        process = Mock()
        process.poll.return_value = None
        mock_popen.return_value = process

        with tempfile.TemporaryDirectory() as tmp:
            manager = LifecycleManager(
                [CMD_SPEC], log_dir=Path(tmp)
            )
            self.assertEqual(
                manager.start("text"),
                "launched_not_yet_ready"
            )
            self.assertEqual(
                manager.start("text"),
                "managed_starting"
            )
            self.assertTrue(manager.stop("text"))

        process.terminate.assert_called_once()
        process.wait.assert_called_once()

    @patch("prismlab.core.lifecycle.subprocess.Popen")
    @patch(
        "prismlab.core.lifecycle.urlopen",
        side_effect=URLError("refused")
    )
    def test_managed_slot_limit(
        self, mock_urlopen, mock_popen
    ):
        mock_popen.return_value.poll.return_value = None

        other = RuntimeSpec(
            "vision", "http://127.0.0.1:8180",
            "lfm3-vision",
            ("llama-server", "--port", "8180")
        )

        with tempfile.TemporaryDirectory() as tmp:
            manager = LifecycleManager(
                [CMD_SPEC, other],
                log_dir=tmp,
                max_managed=1,
            )
            manager.start("text")

            with self.assertRaisesRegex(
                RuntimeError, "limit reached"
            ):
                manager.start("vision")

            manager.close()


if __name__ == "__main__":
    unittest.main()
