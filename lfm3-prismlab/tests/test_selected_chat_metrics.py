"""Selected-model metrics use server timings rather than guessed token counts."""
import json
from types import SimpleNamespace
from unittest.mock import patch

from prismlab.core.lifecycle import ProbeResult, RuntimeSpec
from prismlab.core.schema import PrismRequest
from prismlab.selected_chat import execute_selected


class Stream:
    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def __iter__(self):
        yield b'data: {"choices":[{"delta":{"content":"Hello"}}]}\n'
        yield b'data: {"choices":[],"usage":{"completion_tokens":1},"timings":{"predicted_per_second":12.5}}\n'
        yield b'data: [DONE]\n'


def test_stream_uses_llama_timings_and_tracks_first_token():
    spec = RuntimeSpec("text", "http://127.0.0.1:8080", "lfm3-1.7b")
    manager = SimpleNamespace(specs={"text": spec}, probe=lambda _: ProbeResult("ready", "ok"))
    tokens = []
    with patch("prismlab.selected_chat.urlopen", return_value=Stream()) as open_url:
        result = execute_selected(PrismRequest(task="chat", text="Hello"), manager, "text",
                                  auto_start=False, max_tokens=32, on_token=tokens.append)
    payload = json.loads(open_url.call_args.args[0].data)
    assert payload["stream_options"]["include_usage"] is True
    assert tokens == ["Hello"]
    assert result.output == "Hello"
    assert result.tokens_per_second == 12.5
    assert result.ttft_s is not None and 0 <= result.ttft_s <= result.total_latency_s
