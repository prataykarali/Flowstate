import json
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from prismlab.core import decision_adapter
from prismlab.core.executor import execute
from prismlab.core.schema import PrismRequest, MediaRef


class FakeManager:
    def __init__(self):
        self.specs = {
            name: SimpleNamespace(
                base_url="http://127.0.0.1:8188",
                model_id=alias,
            )
            for name, alias in (
                ("d1", "d1"),
                ("d1_omni", "d1-omni"),
            )
        }

    def probe(self, name):
        return SimpleNamespace(
            ready=True,
            state="ready",
            detail="Mocked ready state",
        )


class TestDecisionRouterContract(unittest.TestCase):
    def capture_payload(self, request):
        captured = []

        def intercept(req, *args, **kwargs):
            captured.append(json.loads(req.data))
            raise RuntimeError("Test intercepted HTTP request")

        with patch.object(
            decision_adapter, "urlopen", side_effect=intercept
        ):
            execute(request, FakeManager(), auto_start=False)

        self.assertEqual(len(captured), 1)
        return captured[0]

    def test_d1_includes_model(self):
        payload = self.capture_payload(
            PrismRequest(
                task="decision",
                text="A customer was billed twice.",
            )
        )
        self.assertEqual(payload["model"], "d1")
        self.assertIn("questions", payload)

    def test_d1_omni_includes_model(self):
        audio = Path("data/p4/question.wav")
        self.assertTrue(audio.is_file())

        payload = self.capture_payload(
            PrismRequest(
                task="decision",
                text="Classify the attached audio.",
                media=(MediaRef(kind="audio", path=audio),),
            )
        )
        self.assertEqual(payload["model"], "d1-omni")
        self.assertIn("files", payload)
        self.assertIn("questions", payload)


if __name__ == "__main__":
    unittest.main()
