
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from prismlab.core.executor import execute
from prismlab.core.schema import PrismRequest
from prismlab.core.decision_adapter import validate_decision


class FakeManager:
    specs = {
        "d1": SimpleNamespace(
            base_url="http://127.0.0.1:8085",
            model_id="d1-text",
            auth_token=None,
        )
    }

    def probe(self, key):
        return SimpleNamespace(
            ready=True,
            state="ready",
            detail="model verified",
        )


def response(predicted="technical", confidence=0.92):
    labels = ("billing", "technical", "shipping", "other")
    remaining = (1 - confidence) / 3
    probs = {
        label: confidence if label == predicted else remaining
        for label in labels
    }
    return {
        "answers": {
            "route": {
                "choice": predicted,
                "probabilities": probs,
            }
        }
    }


class TestP6Decision(unittest.TestCase):

    def test_valid_response(self):
        prediction, confidence, probs = validate_decision(
            response()
        )
        self.assertEqual(prediction, "technical")
        self.assertAlmostEqual(confidence, 0.92)
        self.assertAlmostEqual(sum(probs.values()), 1.0)

    def test_invalid_probabilities(self):
        bad = response()
        bad["answers"]["route"]["probabilities"]["billing"] = 3
        with self.assertRaises(ValueError):
            validate_decision(bad)

    @patch(
        "prismlab.core.decision_adapter.query_d1",
        return_value=(response(), 0.01),
    )
    def test_real_dispatch_is_advisory(self, mock_query):
        req = PrismRequest(
            task="decision",
            text="The payment form is blank.",
        )
        manager = FakeManager()
        manager.specs = {"d1": SimpleNamespace(
            base_url="http://127.0.0.1:8085", model_id="d1-text",
            auth_token="test-key",
        )}
        result = execute(req, manager)
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.route, ("d1",))
        self.assertTrue(
            result.output["human_review_required"]
        )
        self.assertFalse(
            result.output["external_action_executed"]
        )
        self.assertIsNone(result.ttft_s)
        mock_query.assert_called_once()
        self.assertEqual(mock_query.call_args.kwargs["auth_token"], "test-key")

    @patch(
        "prismlab.core.decision_adapter.query_d1",
        return_value=(response("billing", 0.70), 0.01),
    )
    def test_low_confidence_gate(self, mock_query):
        req = PrismRequest(
            task="decision",
            text="Help with my subscription.",
        )
        result = execute(req, FakeManager())
        self.assertEqual(result.status, "completed")
        self.assertFalse(
            result.output["exploratory_gate_passed"]
        )
        self.assertTrue(
            result.output["human_review_required"]
        )


if __name__ == "__main__":
    unittest.main()
