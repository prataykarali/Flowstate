
import unittest
from unittest.mock import patch

from prismlab.core.executor import execute, stream_text
from prismlab.core.schema import PrismRequest


class FakeStream:
    def __init__(self, chunks):
        self.chunks = chunks

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def __iter__(self):
        return iter(self.chunks)


def sse(*events):
    return FakeStream([
        ("data: " + e + "\n\n").encode()
        for e in events
    ])


class FakeState:
    def __init__(self, state):
        self.state = state
        self.detail = state
        self.ready = state == "ready"


class FakeManager:
    def __init__(self, state="ready"):
        from types import SimpleNamespace
        self.state = state
        self.starts = 0
        self.specs = {
            "text": SimpleNamespace(
                base_url="http://127.0.0.1:8080",
                model_id="lfm3-text",
            )
        }

    def probe(self, key):
        return FakeState(self.state)

    def start(self, key):
        self.starts += 1
        self.state = "ready"


class TestP6Executor(unittest.TestCase):

    @patch("prismlab.core.executor.urlopen")
    def test_stream(self, net):
        net.return_value = sse(
            '{"choices":[{"delta":{"content":"Hello"}}]}',
            '{"choices":[{"delta":{"content":" world"}}]}',
            "[DONE]",
        )
        result = stream_text(
            "http://127.0.0.1:8080", "lfm3-text", "Hi"
        )
        self.assertEqual(result.content, "Hello world")
        self.assertIsNotNone(result.ttft_s)

    @patch("prismlab.core.executor.urlopen")
    def test_token_limit_finish_reason_reaches_result(self, net):
        net.return_value = sse(
            '{"choices":[{"delta":{"content":"The bridge"}}]}',
            '{"choices":[{"delta":{},"finish_reason":"length"}]}',
            "[DONE]",
        )
        result = execute(PrismRequest(task="chat", text="Continue"), FakeManager())
        self.assertEqual(result.finish_reason, "length")
        self.assertEqual(result.output, "The bridge")

    @patch("prismlab.core.executor.urlopen")
    def test_stream_keeps_only_final_answer_after_think_marker(self, net):
        net.return_value = sse(
            '{"choices":[{"delta":{"content":"Draft reasoning"}}]}',
            '{"choices":[{"delta":{"content":"</think>Final answer."}}]}',
            "[DONE]",
        )
        result = stream_text("http://127.0.0.1:8080", "lfm3-text", "Hi")
        self.assertEqual(result.content, "Final answer.")

    @patch("prismlab.core.executor.urlopen")
    def test_interrupted_stream(self, net):
        net.return_value = sse(
            '{"choices":[{"delta":{"content":"Partial"}}]}'
        )
        with self.assertRaises(RuntimeError):
            stream_text(
                "http://127.0.0.1:8080", "lfm3-text", "Hi"
            )

    @patch("prismlab.core.executor.urlopen", side_effect=TimeoutError("runtime stalled"))
    def test_runtime_timeout_fails_without_answer(self, net):
        result = execute(PrismRequest(task="chat", text="Hello"), FakeManager())
        self.assertEqual(result.status, "failed")
        self.assertIsNone(result.output)

    @patch("prismlab.core.executor.urlopen")
    def test_complete_inference(self, net):
        net.return_value = sse(
            '{"choices":[{"delta":{"content":"Done"}}]}',
            "[DONE]",
        )
        result = execute(
            PrismRequest(task="chat", text="Hello"),
            FakeManager(),
        )
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.route, ("text",))
        self.assertEqual(result.output, "Done")

    def test_offline_review(self):
        result = execute(
            PrismRequest(task="chat", text="Hello"),
            FakeManager("offline"),
        )
        self.assertEqual(result.status, "review")

    @patch("prismlab.core.executor.urlopen")
    def test_automatic_start(self, net):
        net.return_value = sse(
            '{"choices":[{"delta":{"content":"Yes"}}]}',
            "[DONE]",
        )
        manager = FakeManager("offline")
        result = execute(
            PrismRequest(task="chat", text="Hello"),
            manager,
            auto_start=True,
        )
        self.assertEqual(manager.starts, 1)
        self.assertEqual(result.status, "completed")

    def test_unimplemented_adapter(self):
        result = execute(
            PrismRequest(task="speech", text="Say hello"),
            FakeManager(),
        )
        self.assertEqual(result.status, "review")


if __name__ == "__main__":
    unittest.main()
