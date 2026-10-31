#!/usr/bin/env python3
"""PrismLab P3 modular pipeline V2: local ASR -> grounded LFM3 text -> TTS.

Python standard library only. Both local llama.cpp servers must be running.
A JSON trace is persisted after each successful stage and after failures.
This is an experimental implementation, not a safety-certified system.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import math
import re
import struct
import time
import uuid
import wave
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

AUDIO_URL = "http://127.0.0.1:8082"
TEXT_URL = "http://127.0.0.1:8080"
ASR_PROMPT = "Perform ASR in English. Transcribe the speech; do not answer the question."
REASONING_PROMPT_V2 = (
    "You are the text reasoning stage of a voice assistant. "
    "Answer the question using facts stated in the user's message and reliable general knowledge. "
    "If a fact or relationship is explicitly stated, use it; do not say it is missing. "
    "If necessary personal or external information is absent, say you do not know; never guess. "
    "Reply with one concise, plain-text sentence, preferably at most 25 words. "
    "No Markdown, lists, or preambles."
)


def post(url: str, payload: dict, timeout: int = 360) -> bytes:
    req = Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}, method="POST"
    )
    with urlopen(req, timeout=timeout) as response:
        return response.read()


def pcm16_wav_info(path: Path) -> dict:
    """Validate real microphone/test WAV and reject near-silence."""
    with wave.open(str(path), "rb") as wf:
        sr, ch, width = wf.getframerate(), wf.getnchannels(), wf.getsampwidth()
        nframes = wf.getnframes()
        audio = wf.readframes(nframes)
    if (sr, ch, width) != (16000, 1, 2):
        raise ValueError(f"ASR requires 16-kHz, mono PCM16 WAV; got {(sr, ch, width)}")
    if not nframes or not audio:
        raise ValueError("Empty audio input")
    n = len(audio) // 2
    if n == 0:
        raise ValueError("Empty PCM samples")
    energy = math.fsum(sample[0] ** 2 for sample in struct.iter_unpack("<h", audio))
    rms = math.sqrt(energy / n) / 32768.0
    if rms < 0.002:
        raise ValueError(f"Near-silent audio (RMS={rms:.6f}); refusing ASR")
    return {"sample_rate": sr, "channels": ch, "sample_width": width,
            "duration_s": nframes / sr, "rms": rms,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def output_wav_info(path: Path) -> dict:
    with wave.open(str(path), "rb") as wf:
        if wf.getnframes() == 0 or wf.getframerate() <= 0:
            raise ValueError("TTS emitted an empty WAV")
        return {"duration_s": wf.getnframes() / wf.getframerate(),
                "sample_rate": wf.getframerate(), "channels": wf.getnchannels(),
                "sample_width": wf.getsampwidth()}


def parse_message(raw: bytes) -> tuple[str, dict]:
    obj = json.loads(raw)
    choice = obj["choices"][0]
    content = choice["message"].get("content")
    if not isinstance(content, str) or not content.strip():
        raise ValueError("Server returned empty or non-text message")
    return content.strip(), {"finish_reason": choice.get("finish_reason"),
                             "usage": obj.get("usage", {})}


def trace_write(path: Path, report: dict) -> None:
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def asr(wav: Path) -> tuple[str, dict]:
    payload = {
        "messages": [
            {"role": "system", "content": ASR_PROMPT},
            {"role": "user", "content": [{"type": "input_audio", "input_audio": {
                "data": base64.b64encode(wav.read_bytes()).decode("ascii"),
                "format": "wav"}}]}
        ],
        "temperature": 0,
        "max_tokens": 256,
    }
    return parse_message(post(f"{AUDIO_URL}/v1/chat/completions", payload))


def reason(transcript: str) -> tuple[str, dict]:
    payload = {
        "messages": [
            {"role": "system", "content": REASONING_PROMPT_V2},
            {"role": "user", "content": transcript},
        ],
        "temperature": 0,
        "max_tokens": 128,
        "chat_template_kwargs": {"enable_thinking": False},
        "stream": False,
    }
    return parse_message(post(f"{TEXT_URL}/v1/chat/completions", payload))


def synthesize(text: str) -> bytes:
    return post(f"{AUDIO_URL}/tts", {"input": text, "lang": "en",
                                      "voice": "female", "seed": 42})


def run(*, wav_path: Path | None = None, transcript: str | None = None,
        output_root: Path, case_id: str = "manual") -> dict:
    """Choose WAV for full pipeline or transcript for text-only ablation.

    One unique run directory per invocation; never overwrites V1 artifacts.
    """
    if (wav_path is None) == (transcript is None):
        raise ValueError("Provide exactly one of wav_path or transcript")
    safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", case_id)[:60] or "manual"
    run_name = (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S_%fZ")
                + "_" + safe_id + "_" + uuid.uuid4().hex[:8])
    run_dir = output_root / run_name
    run_dir.mkdir(parents=True, exist_ok=False)
    trace_path = run_dir / "report.json"
    report = {
        "version": "p3-modular-v2", "case_id": case_id,
        "mode": "full" if wav_path is not None else "text_only",
        "run_directory": str(run_dir), "status": "running", "stages": {},
        "prompt_version": "context-grounded-v2",
        "prompt": REASONING_PROMPT_V2,
        "started_utc": datetime.now(timezone.utc).isoformat(),
    }
    trace_write(trace_path, report)
    begun = time.perf_counter()
    try:
        if wav_path is not None:
            wav_path = Path(wav_path).resolve(strict=True)
            report["input_file"] = str(wav_path)
            report["input_audio"] = pcm16_wav_info(wav_path)
            t = time.perf_counter()
            transcript, meta = asr(wav_path)
            report["stages"]["asr"] = {"seconds": time.perf_counter() - t, **meta}
            report["transcript"] = transcript
            trace_write(trace_path, report)
        else:
            transcript = (transcript or "").strip()
            if not transcript:
                raise ValueError("Transcript cannot be empty")
            report["transcript"] = transcript

        t = time.perf_counter()
        answer, meta = reason(transcript)
        report["stages"]["reasoning"] = {"seconds": time.perf_counter() - t, **meta}
        report["answer"] = answer
        report["answer_words"] = len(answer.split())
        report["response_length_violation"] = len(answer.split()) > 25
        trace_write(trace_path, report)

        if wav_path is not None:
            t = time.perf_counter()
            wav_bytes = synthesize(answer)
            output_file = run_dir / "reply.wav"
            output_file.write_bytes(wav_bytes)
            output_info = output_wav_info(output_file)
            report["stages"]["tts"] = {"seconds": time.perf_counter() - t,
                                         "output": str(output_file), **output_info}
            trace_write(trace_path, report)

        report["total_s"] = time.perf_counter() - begun
        report["status"] = "ok"
        trace_write(trace_path, report)
        return report
    except Exception as exc:
        report["total_s"] = time.perf_counter() - begun
        report["status"] = "failed"
        report["error"] = {"type": type(exc).__name__, "message": str(exc)}
        trace_write(trace_path, report)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--wav", type=Path, help="16-kHz mono PCM16 input")
    source.add_argument("--transcript", help="Run reasoning only, without ASR/TTS")
    parser.add_argument("--case-id", default="manual")
    parser.add_argument("--output-root", type=Path,
                        default=Path("results/p3/v2"))
    args = parser.parse_args()
    report = run(wav_path=args.wav, transcript=args.transcript,
                 output_root=args.output_root, case_id=args.case_id)
    print(json.dumps({k: report.get(k) for k in
                      ("status", "mode", "case_id", "transcript", "answer",
                       "total_s", "run_directory", "response_length_violation")},
                     indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
