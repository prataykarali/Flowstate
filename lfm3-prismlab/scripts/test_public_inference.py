#!/usr/bin/env python3
import base64
import json
import subprocess
import time

def get_token():
    out = subprocess.check_output(["curl", "-s", "https://prismlab-playground-rho.vercel.app/api/session"]).decode()
    return json.loads(out)["token"]

token = get_token()

def call_api(payload):
    cmd = [
        "curl", "-s", "-S",
        "--resolve", "pratay-karali-aspire-a515-58gm.tailc51468.ts.net:443:176.58.90.145",
        "https://pratay-karali-aspire-a515-58gm.tailc51468.ts.net/local-api/execute",
        "-H", "Content-Type: application/json",
        "-H", "Authorization: Bearer " + token,
        "-H", "Origin: https://prismlab-playground-rho.vercel.app",
        "-d", "@-"
    ]
    t0 = time.time()
    proc = subprocess.run(cmd, input=json.dumps(payload).encode(), capture_output=True)
    dt = time.time() - t0
    out = proc.stdout.decode()
    try:
        data = json.loads(out)
        if "status" not in data and "detail" in data:
            print("API Detail/Error:", data["detail"])
        return data, dt
    except Exception as exc:
        print("Raw stdout:", repr(out))
        print("Raw stderr:", repr(proc.stderr.decode()))
        return {"status": "error", "error": str(exc), "raw": out}, dt

print("=== 1. Text Model (LFM3-1.7B) ===")
res, dt = call_api({"task": "chat", "model": "text", "prompt": "Name three primary colors.", "max_tokens": 32})
print("Status:", res.get("status"), "| Latency:", f"{dt:.2f}s", "| Route:", res.get("route"))
print("Output:", repr(res.get("output")))

print("\n=== 2. Vision Model (LFM3-VL-2B) ===")
with open("data/p4/colors.png", "rb") as f:
    img_b64 = base64.b64encode(f.read()).decode()
res, dt = call_api({
    "task": "ocr", "model": "vision",
    "prompt": "List the colors in the image from left to right.",
    "image": {"mime": "image/png", "data_base64": img_b64},
    "max_tokens": 48
})
print("Status:", res.get("status"), "| Latency:", f"{dt:.2f}s", "| Route:", res.get("route"))
print("Output:", repr(res.get("output")))

print("\n=== 3. Audio Model (LFM3-Audio-2B) ===")
with open("data/p4/question.wav", "rb") as f:
    aud_b64 = base64.b64encode(f.read()).decode()
res, dt = call_api({
    "task": "audio_qa", "model": "audio",
    "prompt": "Answer the question spoken in the audio.",
    "audio": {"mime": "audio/wav", "data_base64": aud_b64},
    "max_tokens": 48
})
print("Status:", res.get("status"), "| Latency:", f"{dt:.2f}s", "| Route:", res.get("route"))
print("Output:", repr(res.get("output")))

print("\n=== 4. Omni Model (LFM3-Omni-2B) ===")
res, dt = call_api({
    "task": "chat", "model": "omni",
    "prompt": "What does multimodal AI mean?",
    "max_tokens": 48
})
print("Status:", res.get("status"), "| Latency:", f"{dt:.2f}s", "| Route:", res.get("route"))
print("Output:", repr(res.get("output")))

print("\n=== 5. d1 Model (d1-2B Decision) ===")
res, dt = call_api({
    "task": "decision", "model": "d1",
    "prompt": "User asks: Which fruit is yellow and curved?",
    "decision_question": {
        "instructions": "Select the correct fruit.",
        "criteria": {"A": "Apple", "B": "Banana", "C": "Cherry", "D": "Date"}
    }
})
print("Status:", res.get("status"), "| Latency:", f"{dt:.2f}s", "| Route:", res.get("route"))
print("Output:", repr(res.get("output")))

print("\n=== 6. d1_omni Model (d1-Omni-2B Decision) ===")
res, dt = call_api({
    "task": "decision", "model": "d1_omni",
    "prompt": "Identify the primary topic of discussion.",
    "decision_question": {
        "instructions": "Classify the topic.",
        "criteria": {"A": "Technology", "B": "Cooking", "C": "Sports"}
    }
})
print("Status:", res.get("status"), "| Latency:", f"{dt:.2f}s", "| Route:", res.get("route"))
print("Output:", repr(res.get("output")))
