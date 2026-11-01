
"""PrismLab P6.2 — offline capability planner tests."""
import unittest

from prismlab.core.schema import MediaRef, PrismRequest
from prismlab.core.planner import plan_route


def request(task, text="", *media):
    return PrismRequest(
        task=task,
        text=text,
        media=tuple(
            MediaRef(kind, f"test.{kind}")
            for kind in media
        ),
    )


class TestP6Planner(unittest.TestCase):

    def test_text_chat(self):
        plan = plan_route(request("chat", "Hello"))
        self.assertEqual((plan.status, plan.model), ("ready", "text"))

    def test_vision_chat(self):
        plan = plan_route(request("chat", "What is this?", "image"))
        self.assertEqual(plan.model, "vision")

    def test_audio_transcribe_without_text(self):
        plan = plan_route(request("transcribe", "", "audio"))
        self.assertEqual(plan.model, "audio")

    def test_ocr_ignores_audio(self):
        plan = plan_route(request("ocr", "Read sign", "audio", "image"))
        self.assertEqual(plan.model, "vision")
        self.assertEqual(plan.excluded_media, ("audio",))

    def test_decision_text(self):
        plan = plan_route(request("decision", "Charged twice"))
        self.assertEqual(plan.model, "d1")

    def test_decision_audio(self):
        plan = plan_route(request("decision", "Route issue", "audio"))
        self.assertEqual(plan.model, "d1_omni")

    def test_multimedia_ambiguous(self):
        plan = plan_route(request("decision", "Route", "audio", "image"))
        self.assertEqual((plan.status, plan.model), ("review", None))

    def test_multimedia_explicit_image(self):
        plan = plan_route(
            request("decision", "Route", "audio", "image"),
            {"image"},
        )
        self.assertEqual((plan.status, plan.model), ("ready", "d1"))

    def test_multimedia_explicit_audio(self):
        plan = plan_route(
            request("decision", "Route", "audio", "image"),
            {"audio"},
        )
        self.assertEqual((plan.status, plan.model), ("ready", "d1_omni"))

    def test_multimedia_explicit_combined(self):
        plan = plan_route(
            request("decision", "Route", "audio", "image"),
            {"audio", "image"},
        )
        self.assertEqual(plan.model, "d1_omni")
        self.assertTrue(
            any("experimental" in w for w in plan.warnings)
        )

    def test_missing_evidence(self):
        plan = plan_route(request("ocr", "Read text"))
        self.assertEqual(plan.status, "review")

    def test_bad_required_media(self):
        with self.assertRaises(ValueError):
            plan_route(request("chat", "Hello", "image"), {"audio"})

    def test_selection_does_not_remove_last_input(self):
        plan = plan_route(request("chat", "", "image"), set())
        self.assertEqual((plan.status, plan.model), ("review", None))

    def test_speech_output(self):
        plan = plan_route(request("speech", "Say hello"))
        self.assertEqual(plan.model, "audio")

    def test_video_qa(self):
        plan = plan_route(request("video_qa", "What happens?", "video"))
        self.assertEqual(plan.model, "vision")
        self.assertTrue(
            any("Video preprocessing" in w for w in plan.warnings)
        )


if __name__ == "__main__":
    unittest.main()
