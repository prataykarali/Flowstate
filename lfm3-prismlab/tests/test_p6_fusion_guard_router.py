import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from prismlab.core.fusion import run_audio_vision


def fake_asr(text, status="completed"):
    return SimpleNamespace(
        status=status,
        output=text,
        ttft_s=None,
        to_dict=lambda: {
            "status": status,
            "output": text,
        },
    )


class TestFusionSafetyGate(unittest.TestCase):

    def run_case(self, transcript, expected_status):
        audio_manager = Mock()
        vision_manager = Mock()

        with patch(
            "prismlab.core.fusion.execute",
            return_value=fake_asr(
                transcript, status=expected_status
            ),
        ) as inference:
            report = run_audio_vision(
                "data/p4/question.wav",
                "data/p4/colors.png",
                audio_manager,
                vision_manager,
                strict_gate=True,
                auto_start=False,
            )

        self.assertEqual(inference.call_count, 1)
        self.assertEqual(report["route"], ["audio"])
        self.assertIsNone(report["answer"])
        audio_manager.close.assert_called_once()
        vision_manager.close.assert_not_called()

        return report

    def test_missing_direction_withholds_vision(self):
        report = self.run_case(
            "What color is the rectangle?",
            "completed",
        )
        self.assertEqual(report["status"], "review")

    def test_conflicting_directions_withholds_vision(self):
        report = self.run_case(
            "Is it leftmost or rightmost?",
            "completed",
        )
        self.assertEqual(report["status"], "review")

    def test_failed_asr_withholds_vision(self):
        report = self.run_case("", "failed")
        self.assertEqual(report["status"], "failed")


if __name__ == "__main__":
    unittest.main()
