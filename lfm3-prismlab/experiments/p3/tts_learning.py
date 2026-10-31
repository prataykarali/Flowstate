
import json
import time
import wave
from pathlib import Path
from urllib.request import Request, urlopen

# 1. Configuration
url = "http://127.0.0.1:8082/tts"
output = Path("results/p3/tts/python_voice.wav")
output.parent.mkdir(parents=True, exist_ok=True)

payload = {
    "input": "PrismLab is testing local speech generation.",
    "lang": "en",
    "voice": "female",
    "seed": 42
}

# 2. Make the HTTP request
request = Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST"
)

start = time.perf_counter()

with urlopen(request, timeout=180) as response:
    audio_bytes = response.read()

latency = time.perf_counter() - start

# 3. Save generated audio
output.write_bytes(audio_bytes)

# 4. Inspect WAV metadata
with wave.open(str(output), "rb") as wav:
    duration = wav.getnframes() / wav.getframerate()
    sample_rate = wav.getframerate()

# 5. Calculate real-time factor
rtf = latency / duration

print(f"Generation latency: {latency:.2f}s")
print(f"Speech duration: {duration:.2f}s")
print(f"Sample rate: {sample_rate} Hz")
print(f"RTF: {rtf:.2f}")
