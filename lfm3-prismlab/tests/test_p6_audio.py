
import tempfile
import unittest
import wave
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from prismlab.core.audio_adapter import (
    AudioResponse, execute_audio, validate_audio,
)
from prismlab.core.executor import execute
from prismlab.core.planner import plan_route
from prismlab.core.schema import MediaRef, PrismRequest


class FakeManager:
    def __init__(self, state="ready"):
        self.state = state
        self.starts = 0
        self.probes = 0
        self.specs = {
            "audio": SimpleNamespace(
                base_url="http://127.0.0.1:8082",
                model_id="lfm3-audio",
                auth_token=None,
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


class TestP6Audio(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.wav = Path(self.temp.name) / "sample.wav"
        self.make_wav(2000)

    def tearDown(self):
        self.temp.cleanup()

    def make_wav(self, amplitude):
        with wave.open(str(self.wav), "wb") as f:
            f.setnchannels(1)
            f.setsampwidth(2)
            f.setframerate(16000)
            f.writeframes(
                int(amplitude).to_bytes(
                    2, "little", signed=True
                ) * 16000
            )

    def request(self, task="transcribe", text=""):
        return PrismRequest(
            task=task, text=text,
            media=(MediaRef("audio", self.wav),),
        )

    def test_valid_audio(self):
        blob, sha, duration, rms = validate_audio(self.wav)
        self.assertTrue(blob)
        self.assertEqual(len(sha), 64)
        self.assertAlmostEqual(duration, 1.0)
        self.assertGreater(rms, 0.002)

    def test_silence_blocked(self):
        self.make_wav(0)
        req = self.request()
        manager = FakeManager()
        result = execute_audio(req, manager, plan_route(req))
        self.assertEqual(result.status, "review")
        self.assertEqual(manager.probes, 0)

    def test_bad_audio_format(self):
        self.wav.write_bytes(b"invalid wav")
        req = self.request()
        result = execute_audio(
            req, FakeManager(), plan_route(req)
        )
        self.assertEqual(result.status, "review")

    def test_audio_qa_requires_question(self):
        req = self.request("audio_qa")
        result = execute_audio(
            req, FakeManager(), plan_route(req)
        )
        self.assertEqual(result.status, "review")

    @patch(
        "prismlab.core.audio_adapter.post_audio",
        return_value=AudioResponse("Test transcript", 0.01),
    )
    def test_success(self, mock_post):
        req = self.request()
        manager = FakeManager()
        manager.specs["audio"].auth_token = "test-key"
        result = execute_audio(
            req, manager, plan_route(req)
        )
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.output, "Test transcript")
        self.assertIsNone(result.ttft_s)
        mock_post.assert_called_once()
        self.assertEqual(mock_post.call_args.kwargs["auth_token"], "test-key")

    @patch(
        "prismlab.core.audio_adapter.post_audio",
        return_value=AudioResponse("Test transcript", 0.01),
    )
    def test_executor_autostart(self, mock_post):
        manager = FakeManager("offline")
        result = execute(
            self.request(),
            manager,
            auto_start=True,
        )
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.route, ("audio",))
        self.assertEqual(manager.starts, 1)


if __name__ == "__main__":
    unittest.main()
