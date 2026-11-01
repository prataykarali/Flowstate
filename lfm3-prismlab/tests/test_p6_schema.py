
"""Offline P6.1 contract tests: no local models or servers needed."""
import json
import unittest
from prismlab.core.schema import MediaRef, PrismRequest, PrismResult, TraceStep


class TestP6Schema(unittest.TestCase):
    def test_text_request(self):
        req = PrismRequest(task="chat", text="Explain KV caching")
        self.assertEqual(req.inputs, frozenset({"text"}))
        self.assertTrue(req.request_id)

    def test_multimodal_request(self):
        req = PrismRequest(
            task="video_qa", text="What happened first?",
            media=(MediaRef("video", "sample.mp4"), MediaRef("audio", "sound.wav")),
        )
        self.assertEqual(req.inputs, frozenset({"text", "video", "audio"}))
        self.assertEqual(len(json.loads(json.dumps(req.to_dict()))["media"]), 2)

    def test_audio_without_text(self):
        req = PrismRequest(task="transcribe", media=(MediaRef("audio", "clip.wav"),))
        self.assertEqual(req.inputs, frozenset({"audio"}))

    def test_missing_input(self):
        with self.assertRaises(ValueError):
            PrismRequest(task="chat", text="  ")

    def test_unknown_task(self):
        with self.assertRaises(ValueError):
            PrismRequest(task="unknown", text="Hello")

    def test_unknown_modality(self):
        with self.assertRaises(ValueError):
            MediaRef("sensor", "sample.bin")

    def test_invalid_media_items(self):
        with self.assertRaises(TypeError):
            PrismRequest(task="chat", media=("sample.png",))

    def test_trace_timing(self):
        with self.assertRaises(ValueError):
            TraceStep(stage="inference", status="ok", ttft_s=2.0, latency_s=1.0)

    def test_completed_result(self):
        step = TraceStep(
            stage="inference", status="ok",
            model="text", latency_s=1.2, ttft_s=0.4
        )
        result = PrismResult(
            request_id="abc", status="completed",
            output="Hello", route=("text",), trace=(step,),
            total_latency_s=1.5, ttft_s=0.4
        )
        wire = json.loads(json.dumps(result.to_dict()))
        self.assertEqual(wire["trace"][0]["model"], "text")
        self.assertEqual(wire["status"], "completed")

    def test_missing_metrics_not_zero(self):
        result = PrismResult(
            request_id="abc", status="review",
            warnings=("insufficient_evidence",)
        )
        self.assertIsNone(result.ttft_s)
        self.assertIsNone(result.peak_rss_mb)


if __name__ == "__main__":
    unittest.main()
