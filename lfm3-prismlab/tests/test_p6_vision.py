
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from PIL import Image

from prismlab.core.schema import MediaRef, PrismRequest
from prismlab.core.planner import plan_route
from prismlab.core.vision_adapter import (
    execute_vision, VisionStream, read_image
)


class FakeManager:
    def __init__(self, state="ready"):
        self.state = state
        self.probes = 0
        self.starts = 0
        self.specs = {
            "vision": SimpleNamespace(
                base_url="http://127.0.0.1:8180",
                model_id="lfm3-vision",
            )
        }

    def probe(self, key):
        self.probes += 1
        return SimpleNamespace(
            ready=self.state == "ready",
            state=self.state,
            detail=self.state,
        )

    def start(self, key):
        self.starts += 1
        self.state = "ready"


class TestP6Vision(unittest.TestCase):

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "test.png"
        Image.new("RGB", (32, 32), "blue").save(self.path)

    def tearDown(self):
        self.temp.cleanup()

    def request(self):
        return PrismRequest(
            task="ocr", text="Read this",
            media=(MediaRef("image", self.path),),
        )

    @patch(
        "prismlab.core.vision_adapter.stream_vision",
        return_value=VisionStream("BLUE", 0.0, 0.0, None),
    )
    def test_success(self, mock_stream):
        req = self.request()
        result = execute_vision(req, FakeManager(), plan_route(req))
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.output, "BLUE")
        self.assertTrue(result.evidence[0].startswith("image_sha256:"))

    @patch(
        "prismlab.core.vision_adapter.stream_vision",
        return_value=VisionStream("text", 0.0, 0.0, None),
    )
    def test_ocr_ignores_audio(self, mock_stream):
        req = PrismRequest(
            task="ocr", text="Read this",
            media=(
                MediaRef("image", self.path),
                MediaRef("audio", "missing.wav"),
            ),
        )
        result = execute_vision(req, FakeManager(), plan_route(req))
        self.assertEqual(result.status, "completed")

    @patch("prismlab.core.vision_adapter.stream_vision")
    def test_missing_image(self, mock_stream):
        self.path.unlink()
        req = self.request()
        manager = FakeManager()
        result = execute_vision(req, manager, plan_route(req))
        self.assertEqual(result.status, "review")
        self.assertEqual(manager.probes, 0)
        mock_stream.assert_not_called()

    @patch("prismlab.core.vision_adapter.stream_vision")
    def test_offline(self, mock_stream):
        req = self.request()
        result = execute_vision(
            req, FakeManager("offline"), plan_route(req)
        )
        self.assertEqual(result.status, "review")
        mock_stream.assert_not_called()

    @patch(
        "prismlab.core.vision_adapter.stream_vision",
        return_value=VisionStream("text", 0.0, 0.0, None),
    )
    def test_auto_start(self, mock_stream):
        req = self.request()
        manager = FakeManager("offline")
        result = execute_vision(
            req, manager, plan_route(req), auto_start=True
        )
        self.assertEqual(result.status, "completed")
        self.assertEqual(manager.starts, 1)

    def test_video_not_ignored(self):
        req = PrismRequest(
            task="video_qa", text="What happens?",
            media=(MediaRef("video", "clip.mp4"),),
        )
        result = execute_vision(req, FakeManager(), plan_route(req))
        self.assertEqual(result.status, "review")

    def test_invalid_image(self):
        self.path.write_bytes(b"not an image")
        with self.assertRaises(OSError):
            read_image(self.path)


if __name__ == "__main__":
    unittest.main()
