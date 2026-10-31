import argparse
import asyncio
import base64
import json
import shutil
import time
from contextlib import suppress

from websockets.asyncio.client import connect

DEFAULT_URL = "ws://127.0.0.1:8082/v1/realtime?intent=transcription"


async def live_asr(url: str, seconds: float, audio_source: str) -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is missing: sudo apt install ffmpeg")

    async with connect(url, open_timeout=30, max_size=None) as ws:
        hello = json.loads(await asyncio.wait_for(ws.recv(), timeout=30))
        if hello.get("type") == "error":
            raise RuntimeError(str(hello.get("error", {}).get("message", hello)))
        if hello.get("type") != "session.created":
            raise RuntimeError(f"Expected session.created, got: {hello}")

        audio = hello.get("session", {}).get("audio", {})
        rate = audio.get("input", {}).get("format", {}).get("rate")
        if not isinstance(rate, int) or rate <= 0:
            raise RuntimeError(f"No valid input sample rate in session: {audio}")

        print(f"[connected] input={rate} Hz PCM16 mono")
        await ws.send(json.dumps({
            "type": "session.update",
            "session": {
                "type": "transcription",
                "audio": {"input": {"transcription": {"language": "en"}}},
            },
        }))

        done = asyncio.Event()
        result = {"error": None, "transcript": "", "first_delta_at": None}

        async def receive() -> None:
            try:
                async for message in ws:
                    ev = json.loads(message)
                    kind = ev.get("type", "")
                    if kind == "session.updated":
                        print("[ready] transcription session configured")
                    elif kind == "conversation.item.input_audio_transcription.delta":
                        if result["first_delta_at"] is None:
                            result["first_delta_at"] = time.perf_counter()
                        print(ev.get("delta", ""), end="", flush=True)
                    elif kind == "conversation.item.input_audio_transcription.completed":
                        result["transcript"] = ev.get("transcript", "")
                        print("\n\nFINAL TRANSCRIPT:", result["transcript"])
                        done.set()
                        return
                    elif kind == "error":
                        result["error"] = ev.get("error", {}).get("message", str(ev))
                        done.set()
                        return
            except Exception as exc:
                result["error"] = str(exc)
                done.set()

        reader = asyncio.create_task(receive())
        command = [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-f", "pulse", "-i", audio_source,
            "-ac", "1", "-ar", str(rate),
            "-c:a", "pcm_s16le", "-f", "s16le", "pipe:1",
        ]
        process = await asyncio.create_subprocess_exec(
            *command, stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # A fixed duration makes the first experiment repeatable and ensures
        # the microphone process is cleaned up even when the inference is slow.
        nbytes_target = int(seconds * rate * 2)
        chunk_bytes = max(2, (rate // 10) * 2)  # roughly 100 ms, 16-bit mono
        sent_bytes = 0
        t_start = time.perf_counter()
        print(f"[recording] Speak for {seconds:g} seconds ...")
        try:
            while sent_bytes < nbytes_target:
                 if result["error"]:
                    raise RuntimeError(result["error"])
                chunk = await asyncio.wait_for(
                    process.stdout.read(min(chunk_bytes, nbytes_target - sent_bytes)),
                    timeout=10,
                )
                if not chunk:
                    break
                await ws.send(json.dumps({
                    "type": "input_audio_buffer.append",
                    "audio": base64.b64encode(chunk).decode("ascii"),
                }))
                sent_bytes += len(chunk)
        finally:
            if process.returncode is None:
                process.terminate()
            with suppress(ProcessLookupError):
                await asyncio.wait_for(process.wait(), timeout=5)

        if not sent_bytes:
            error_output = (await process.stderr.read()).decode(errors="replace")
            raise RuntimeError(f"Microphone produced no audio. ffmpeg said: {error_output}")

        t_commit = time.perf_counter()
        print(f"\n[sent] {sent_bytes / (2 * rate):.2f}s audio; finishing ASR ...")
        await ws.send(json.dumps({"type": "input_audio_buffer.commit", "final": True}))
        try:
            await asyncio.wait_for(done.wait(), timeout=180)
        finally:
            reader.cancel()
            with suppress(asyncio.CancelledError):
                await reader

        if result["error"]:
            raise RuntimeError(result["error"])
        print(f"[timing] capture+send: {t_commit - t_start:.2f}s; "
              f"finalization: {time.perf_counter() - t_commit:.2f}s")
        if result["first_delta_at"] is not None:
            print(f"[timing] first partial text relative to commit: "
                  f"{result['first_delta_at'] - t_commit:+.2f}s")
        print("[note] A partial transcript is not guaranteed by this checkpoint.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Stream microphone audio to LFM3-Audio")
    parser.add_argument("--seconds", type=float, default=12,
                        help="microphone duration in seconds (default 12)")
    parser.add_argument("--url", default=DEFAULT_URL,
                        help="llama.cpp realtime WebSocket URL")
    parser.add_argument("--source", default="default",
                        help="PulseAudio microphone source name (default: default)")
    args = parser.parse_args()
    if args.seconds <= 0 or args.seconds > 120:
        parser.error("--seconds must be between 0 and 120")
    try:
        asyncio.run(live_asr(args.url, args.seconds, args.source))
    except (OSError, RuntimeError, TimeoutError) as exc:
        print(f"\nERROR: {exc}")
        print("Check that llama-server is listening on port 8082 and supports /v1/realtime.")
        raise SystemExit(1)
    except KeyboardInterrupt:
        print("\nInterrupted. Rerun for a complete ASR turn.")