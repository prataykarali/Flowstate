
"""P6.5b: test sequential pipeline control flow without models."""
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from prismlab.core.fusion import run_audio_vision


def fake_result(status, output=None, ttft_s=None):
    return SimpleNamespace(
        status=status,
        output=output,
        ttft_s=ttft_s,
        to_dict=lambda: {
            "status": status,
            "output": output,
            "ttft_s": ttft_s,
        },
    )


class TestP6FusionPipeline(unittest.TestCase):

    def setUp(self):
        self.audio_manager = Mock()
        self.vision_manager = Mock()

    def run_pipeline(self, strict=False):
        return run_audio_vision(
            "sample.wav",
            "image.png",
            self.audio_manager,
            self.vision_manager,
            strict_gate=strict,
        )

    @patch("prismlab.core.fusion.execute")
    def test_asr_failure_stops_pipeline(self, execute):
        execute.return_value = fake_result("failed")

        report = self.run_pipeline()

        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["route"], ["audio"])
        execute.assert_called_once()
        self.audio_manager.close.assert_called_once()
        self.vision_manager.close.assert_not_called()

    @patch("prismlab.core.fusion.execute")
    def test_strict_gate_rejects_unclear_direction(self, execute):
        execute.return_value = fake_result(
            "completed",
            "What color is the rice most rectangular?",
        )

        report = self.run_pipeline(strict=True)

        self.assertEqual(report["status"], "review")
        self.assertEqual(report["route"], ["audio"])
        self.assertIsNone(report["answer"])
        execute.assert_called_once()

    @patch("prismlab.core.fusion.execute")
    def test_valid_handoff_to_vision(self, execute):
        execute.side_effect = [
            fake_result(
                "completed",
                "What color is the right most rectangle?",
            ),
            fake_result("completed", "Blue", 0.5),
        ]

        report = self.run_pipeline(strict=True)

        self.assertEqual(report["status"], "completed")
        self.assertEqual(report["route"], ["audio", "vision"])
        self.assertEqual(report["direction"], "rightmost")
        self.assertEqual(report["answer"], "Blue")
        self.assertIsNotNone(report["ttft_s"])
        self.assertEqual(execute.call_count, 2)
        self.audio_manager.close.assert_called_once()
        self.vision_manager.close.assert_called_once()

    @patch("prismlab.core.fusion.execute")
    def test_downstream_failure_preserved(self, execute):
        execute.side_effect = [
            fake_result(
                "completed",
                "What color is the leftmost rectangle?",
            ),
            fake_result("failed"),
        ]

        report = self.run_pipeline()

        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["route"], ["audio", "vision"])
        self.assertIsNone(report["answer"])
        self.assertEqual(execute.call_count, 2)


if __name__ == "__main__":
    unittest.main()
