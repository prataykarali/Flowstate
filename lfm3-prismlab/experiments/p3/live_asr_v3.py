#!/usr/bin/env python3
"""PrismLab P3: microphone-to-LFM3-Audio ASR with a low-audio safety gate.

Why HTTP? A recorded WAV lets us verify the exact audio that reaches the model.
The model stays loaded in llama-server (port 8082); this is push-to-talk,
not continuous word-by-word streaming.

No extra Python packages. Requires ffmpeg, a local llama-server, and Python 3.9+.
"""

import argparse
import array
import base64
import json
import math
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SAVE_DIR = ROOT / "data/audio/live"


def api_json(url: str, payload=None, timeout: int = 180) -> dict:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        info = exc.read().decode("utf-8", "replace")
        raise RuntimeError(f"Server returned HTTP {exc.code}: {info[:1500]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Could not connect to llama-server: {exc.reason}") from exc


def server_model(base_url: str) -> str:
    models = api_json(f"{base_url}/v1/models").get("data", [])
    if not models or not models[0].get("id"):
        raise RuntimeError("/v1/models did not return a usable model ID")
    return str(models[0]["id"])


def inspect_wav(wav_path: Path) -> tuple[float, float, float]:
    with wave.open(str(wav_path), "rb") as wav:
        rate = wav.getframerate()
        channels = wav.getnchannels()
        width = wav.getsampwidth()
        frames = wav.getnframes()
        if (rate, channels, width) != (16000, 1, 2):
            raise RuntimeError(
                f"Expected WAV 16kHz/mono/PCM16; got {rate} Hz, "
                f"{channels} channels, {width * 8}-bit samples."
            )
        data = wav.readframes(frames)
    samples = array.array("h")
    samples.frombytes(data)
    if sys.byteorder != "little":
        samples.byteswap()
    # Full-sample RMS and peak; inspect signal level before trusting ASR output.
    if not samples:
        raise RuntimeError("Empty WAV: no audio samples to transcribe")
    rms = math.sqrt(sum(s * s for s in samples) / len(samples)) / 32768.0
    peak = max(abs(s) for s in samples) / 32768.0
    return frames / rate, rms, peak


def record_wav(path: Path, duration: float, source: str) -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg missing. Install with: sudo apt install ffmpeg")
    path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "pulse", "-i", source,
        "-t", str(duration), "-ac", "1", "-ar", "16000",
        "-c:a", "pcm_s16le", str(path),
    ]
    print(f"[recording] Speak for {duration:g} seconds ...", flush=True)
    proc = subprocess.run(command, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {proc.stderr.strip() or '(no error details)'}")


def get_text(reply: dict) -> str:
    choices = reply.get("choices", [])
    if not choices:
        return ""
    content = choices[0].get("message", {}).get("content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return "".join(
            part.get("text", "") for part in content
            if isinstance(part, dict) and part.get("type") in (None, "text")
        ).strip()
    return ""


def transcribe(wav_path: Path, base_url: str, model: str, timeout: int, min_rms: float, force_low_audio: bool) -> None:
    duration, rms, peak = inspect_wav(wav_path)
    print(f"[audio] {wav_path.name}: {duration:.2f}s, 16kHz mono, "
          f"RMS={rms:.6f}, peak={peak:.6f}")
    if rms < min_rms:
        print(f"[gate] RMS is below {min_rms:.6f}. Input is too weak for a reliable ASR test.")
        if not force_low_audio:
            print("[blocked] No transcription attempted; preventing likely fabricated speech.")
            print("[help] Check the active microphone source/mute state; replay the saved WAV.")
            return
        print("[warning] Forcing inference on weak audio — output must NOT be trusted.")
    encoded = base64.b64encode(wav_path.read_bytes()).decode("ascii")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "Perform ASR in English."},
            {"role": "user", "content": [
                {"type": "input_audio", "input_audio": {"data": encoded, "format": "wav"}}
            ]},
        ],
        "temperature": 0,
        "max_tokens": 256,
        "stream": False,
    }
    print("[model] Transcribing ...", flush=True)
    t0 = time.perf_counter()
    reply = api_json(f"{base_url}/v1/chat/completions", payload, timeout)
    elapsed = time.perf_counter() - t0
    transcript = get_text(reply)
    print(f"[result] {transcript or '(EMPTY)'}")
    print(f"[latency] {elapsed:.2f}s inference/request time (recording excluded)")
    if not transcript:
        print("[debug] Server response (truncated):")
        print(json.dumps(reply, ensure_ascii=False, indent=2)[:2500])
        raise RuntimeError("ASR returned an empty transcript. Audio is saved for playback/CLI comparison.")


def main() -> None:
    p = argparse.ArgumentParser(description="PrismLab P3 microphone ASR (push-to-talk)")
    p.add_argument("--file", type=Path, help="Test an existing 16kHz mono PCM16 WAV file")
    p.add_argument("--seconds", type=float, default=8, help="Seconds per recording (default 8)")
    p.add_argument("--source", default="default", help="PulseAudio source name")
    p.add_argument("--url", default="http://127.0.0.1:8082", help="Local llama-server URL")
    p.add_argument("--save-dir", type=Path, default=DEFAULT_SAVE_DIR)
    p.add_argument("--timeout", type=int, default=180, help="Inference request timeout")
    p.add_argument("--min-rms", type=float, default=0.002,
                   help="Reject quiet audio below this RMS (default 0.002; heuristic, not speech VAD)")
    p.add_argument("--force-low-audio", action="store_true",
                   help="Diagnostic only: allow ASR on weak audio; output may be hallucinated")
    p.add_argument("--once", action="store_true", help="Record once instead of looping")
    args = p.parse_args()
    if not 0 < args.seconds <= 120:
        p.error("--seconds must be in (0, 120]")
    if not 0 <= args.min_rms < 1:
        p.error("--min-rms must be in [0, 1)")

    base_url = args.url.rstrip("/")
    try:
        model = server_model(base_url)
        print(f"[connected] {base_url} | model={model}")
        if args.file:
            transcribe(args.file.expanduser(), base_url, model, args.timeout, args.min_rms, args.force_low_audio)
            return
        n = 0
        while True:
            if not args.once:
                answer = input("\nPress Enter to record (q to quit): ").strip().lower()
                if answer in {"q", "quit", "exit"}:
                    break
            n += 1
            stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            audio_path = args.save_dir.expanduser() / f"mic_{stamp}_{n:03d}.wav"
            record_wav(audio_path, args.seconds, args.source)
            transcribe(audio_path, base_url, model, args.timeout, args.min_rms, args.force_low_audio)
            if args.once:
                break
    except (RuntimeError, OSError, KeyboardInterrupt, EOFError) as exc:
        print(f"\n[error] {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
