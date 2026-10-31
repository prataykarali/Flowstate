#!/usr/bin/env python3
"""PrismLab P3.2: grounded audio question answering via local llama-server."""
import argparse
import base64
import json
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

BASE_URL = "http://127.0.0.1:8082"
SYSTEM = (
    "Answer questions about the provided audio clip. "
    "Base every answer only on what can be heard. "
    "If the answer is not supported by the clip, say 'Not stated in the audio'. "
    "Keep answers brief."
)


def request_json(url, payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {details}") from exc


def main():
    parser = argparse.ArgumentParser(description="Ask questions grounded in a local WAV recording")
    parser.add_argument("audio", type=Path, help="16-kHz mono 16-bit PCM WAV file")
    parser.add_argument("question", help="Question to ask about the recording")
    parser.add_argument("--url", default=BASE_URL, help="local llama-server base URL")
    args = parser.parse_args()
    try:
        with wave.open(str(args.audio), "rb") as source:
            rate, channels, sample_width, frames = (source.getframerate(), source.getnchannels(), source.getsampwidth(), source.getnframes())
        if (rate, channels, sample_width) != (16000, 1, 2):
            parser.error(f"Expected 16-kHz mono PCM16 WAV; got {rate} Hz, {channels} channel(s), {sample_width * 8} bit")
        model = request_json(args.url.rstrip("/") + "/v1/models")["data"][0]["id"]
        payload = {
            "model": model,
            "temperature": 0,
            "max_tokens": 180,
            "stream": False,
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": [
                    {"type": "input_audio", "input_audio": {
                        "data": base64.b64encode(args.audio.read_bytes()).decode("ascii"),
                        "format": "wav"
                    }},
                    {"type": "text", "text": args.question}
                ]}
            ]
        }
        print(f"[model] {model}")
        print(f"[audio] {args.audio.name}, {frames / rate:.2f}s")
        print(f"[question] {args.question}")
        t0 = time.perf_counter()
        response = request_json(args.url.rstrip("/") + "/v1/chat/completions", payload)
        answer = response["choices"][0]["message"]["content"]
        print(f"[answer] {answer}")
        print(f"[latency] {time.perf_counter() - t0:.2f}s")
    except (OSError, RuntimeError, KeyError, ValueError, IndexError) as exc:
        parser.exit(1, f"[error] {exc}\n")


if __name__ == "__main__":
    main()
