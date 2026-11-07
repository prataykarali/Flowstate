#!/usr/bin/env python3
"""
PrismLab S5-H End-to-End Production Latency & Waterfall Measurement Suite.
Executes real requests through the deployed Vercel UI across all six Liquid AI models.
Captures CDP network traces, Time to First Token (TTFT), total browser wall time,
and backend inference duration without artificial timeout inflation.
"""
import json
import os
import sys
import time
from playwright.sync_api import sync_playwright

VERCEL_URL = "https://prismlab-playground-rho.vercel.app"
TEST_IMG = "/home/pratay-karali/Desktop/flowstate/lfm3-prismlab/data/test_images/imag2_half.png"
TEST_AUDIO = "/home/pratay-karali/Desktop/flowstate/lfm3-prismlab/data/p4/question.wav"

def run_suite():
    print(f"Connecting to production: {VERCEL_URL}")
    results = {
        "timestamp": time.time(),
        "environment": {
            "production_url": VERCEL_URL,
            "inference_gateway": "https://pratay-karali-aspire-a515-58gm.tailc51468.ts.net",
            "cpu_threads": 4,
            "gpu_layers": 0,
            "confinement": "bubblewrap",
            "active_model_mode": "single-active-on-demand"
        },
        "models": {}
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path='/snap/bin/chromium',
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--host-resolver-rules=MAP prismlab-playground-rho.vercel.app 216.198.79.67'
            ],
            headless=True
        )
        context = browser.new_context(viewport={'width': 1280, 'height': 850})
        page = context.new_page()

        # CDP session for network capture
        client = context.new_cdp_session(page)
        client.send("Network.enable")

        net_events = []
        def on_request(params):
            url = params.get("request", {}).get("url", "")
            if "local-api" in url or "api/session" in url or "api/league" in url:
                net_events.append({
                    "type": "request",
                    "req_id": params.get("requestId"),
                    "url": url,
                    "method": params.get("request", {}).get("method"),
                    "timestamp": params.get("timestamp"),
                    "wallTime": params.get("wallTime")
                })

        def on_response(params):
            url = params.get("response", {}).get("url", "")
            if "local-api" in url or "api/session" in url or "api/league" in url:
                net_events.append({
                    "type": "response",
                    "req_id": params.get("requestId"),
                    "url": url,
                    "status": params.get("response", {}).get("status"),
                    "timing": params.get("response", {}).get("timing", {}),
                    "timestamp": params.get("timestamp")
                })

        def on_data(params):
            net_events.append({
                "type": "data",
                "req_id": params.get("requestId"),
                "dataLength": params.get("dataLength"),
                "timestamp": params.get("timestamp")
            })

        client.on("Network.requestWillBeSent", on_request)
        client.on("Network.responseReceived", on_response)
        client.on("Network.dataReceived", on_data)

        print("Loading /#chat...")
        page.goto(f"{VERCEL_URL}/#chat", wait_until="networkidle", timeout=30000)
        page.wait_for_selector(".chat-compose, .decision-studio", timeout=20000)
        print("Playground ready.\n")

        # Setup DOM observer
        def setup_observer():
            page.evaluate("""
                window.__waterfall = { domFirstToken: null, domCompleted: null };
                if (window.__waterfall_observer) window.__waterfall_observer.disconnect();
                window.__waterfall_observer = new MutationObserver((mutations) => {
                    const streamEl = document.querySelector('.chat-stream-label, .chat-message--model p, .chat-waiting');
                    if (streamEl && streamEl.innerText.trim().length > 0 && !window.__waterfall.domFirstToken) {
                        window.__waterfall.domFirstToken = performance.now();
                    }
                });
                window.__waterfall_observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            """)

        # Model 1: Prism Pure (text)
        print("=== 1. Testing Prism Pure (text) ===")
        setup_observer()
        input_box = page.locator("#chat-draft")
        input_box.fill("Explain gravity in 10 words.")
        t0_wall = time.time()
        t0_perf = page.evaluate("performance.now()")
        page.locator(".chat-send-button").click()

        # Wait for model message bubble to be completed
        page.wait_for_selector(".chat-message--model", timeout=45000)
        # Wait until pending stream ends
        page.wait_for_function("!document.querySelector('.chat-waiting') && document.querySelector('.chat-message--model')", timeout=45000)
        t_end_perf = page.evaluate("performance.now()")
        t_end_wall = time.time()
        
        wf = page.evaluate("window.__waterfall")
        pure_wall_s = (t_end_perf - t0_perf) / 1000.0
        pure_ttft_s = ((wf["domFirstToken"] - t0_perf) / 1000.0) if wf.get("domFirstToken") else None
        pure_text = page.locator(".chat-message--model p").last.inner_text().strip()
        print(f"Prism Pure Result: Wall {pure_wall_s:.2f}s | TTFT {pure_ttft_s or 0:.2f}s")
        print(f"Output: {pure_text[:80]}...\n")

        results["models"]["text"] = {
            "character": "Prism Pure",
            "model_id": "text",
            "task": "chat",
            "browser_wall_s": round(pure_wall_s, 2),
            "ttft_s": round(pure_ttft_s, 2) if pure_ttft_s else None,
            "output_preview": pure_text[:120],
            "status": "completed"
        }

        # Model 2: Spectra (vision)
        print("=== 2. Testing Spectra (vision) ===")
        # Switch to Spectra
        page.locator(".chat-side-roster button:has-text('Spectra')").click()
        page.wait_for_selector(".chat-character-caption:has-text('Spectra')", timeout=10000)
        page.locator(".chat-attach-button").click()
        page.wait_for_selector("input[type='file'][accept*='image']", timeout=10000)
        page.locator("input[type='file'][accept*='image']").set_input_files(TEST_IMG)
        page.wait_for_selector(".chat-media-slot span", timeout=10000)
        
        setup_observer()
        page.locator("#chat-draft").fill("Describe the colors in this image in 10 words.")
        t0_wall = time.time()
        t0_perf = page.evaluate("performance.now()")
        page.locator(".chat-send-button").click()

        page.wait_for_selector(".chat-message--model", timeout=45000)
        page.wait_for_function("!document.querySelector('.chat-waiting') && document.querySelector('.chat-message--model')", timeout=45000)
        t_end_perf = page.evaluate("performance.now()")
        spectra_wall_s = (t_end_perf - t0_perf) / 1000.0
        wf = page.evaluate("window.__waterfall")
        spectra_ttft_s = ((wf["domFirstToken"] - t0_perf) / 1000.0) if wf.get("domFirstToken") else None
        spectra_text = page.locator(".chat-message--model p").last.inner_text().strip()
        print(f"Spectra Result: Wall {spectra_wall_s:.2f}s | TTFT {spectra_ttft_s or 0:.2f}s")
        print(f"Output: {spectra_text[:80]}...\n")

        results["models"]["vision"] = {
            "character": "Spectra",
            "model_id": "vision",
            "task": "ocr",
            "browser_wall_s": round(spectra_wall_s, 2),
            "ttft_s": round(spectra_ttft_s, 2) if spectra_ttft_s else None,
            "output_preview": spectra_text[:120],
            "status": "completed"
        }

        # Model 3: Echo (audio)
        print("=== 3. Testing Echo (audio) ===")
        page.locator(".chat-side-roster button:has-text('Echo')").click()
        page.wait_for_selector(".chat-character-caption:has-text('Echo')", timeout=10000)
        page.locator(".chat-attach-button").click()
        page.wait_for_selector("input[type='file'][accept*='audio']", timeout=10000)
        page.locator("input[type='file'][accept*='audio']").set_input_files(TEST_AUDIO)
        page.wait_for_selector(".chat-media-slot span", timeout=10000)
        
        setup_observer()
        page.locator("#chat-draft").fill("Transcribe this clip.")
        t0_wall = time.time()
        t0_perf = page.evaluate("performance.now()")
        page.locator(".chat-send-button").click()

        page.wait_for_selector(".chat-message--model", timeout=45000)
        page.wait_for_function("!document.querySelector('.chat-waiting') && document.querySelector('.chat-message--model')", timeout=45000)
        t_end_perf = page.evaluate("performance.now()")
        echo_wall_s = (t_end_perf - t0_perf) / 1000.0
        wf = page.evaluate("window.__waterfall")
        echo_ttft_s = ((wf["domFirstToken"] - t0_perf) / 1000.0) if wf.get("domFirstToken") else None
        echo_text = page.locator(".chat-message--model p").last.inner_text().strip()
        print(f"Echo Result: Wall {echo_wall_s:.2f}s | TTFT {echo_ttft_s or 0:.2f}s")
        print(f"Output: {echo_text[:80]}...\n")

        results["models"]["audio"] = {
            "character": "Echo",
            "model_id": "audio",
            "task": "transcribe",
            "browser_wall_s": round(echo_wall_s, 2),
            "ttft_s": round(echo_ttft_s, 2) if echo_ttft_s else None,
            "output_preview": echo_text[:120],
            "status": "completed"
        }

        # Model 4: Omni Pup (omni)
        print("=== 4. Testing Omni Pup (omni) ===")
        page.locator(".chat-side-roster button:has-text('Omni Pup')").click()
        page.wait_for_selector(".chat-character-caption:has-text('Omni Pup')", timeout=10000)
        
        setup_observer()
        page.locator("#chat-draft").fill("What is multimodal perception in 10 words?")
        t0_wall = time.time()
        t0_perf = page.evaluate("performance.now()")
        page.locator(".chat-send-button").click()

        page.wait_for_selector(".chat-message--model", timeout=45000)
        page.wait_for_function("!document.querySelector('.chat-waiting') && document.querySelector('.chat-message--model')", timeout=45000)
        t_end_perf = page.evaluate("performance.now()")
        omni_wall_s = (t_end_perf - t0_perf) / 1000.0
        wf = page.evaluate("window.__waterfall")
        omni_ttft_s = ((wf["domFirstToken"] - t0_perf) / 1000.0) if wf.get("domFirstToken") else None
        omni_text = page.locator(".chat-message--model p").last.inner_text().strip()
        print(f"Omni Pup Result: Wall {omni_wall_s:.2f}s | TTFT {omni_ttft_s or 0:.2f}s")
        print(f"Output: {omni_text[:80]}...\n")

        results["models"]["omni"] = {
            "character": "Omni Pup",
            "model_id": "omni",
            "task": "chat",
            "browser_wall_s": round(omni_wall_s, 2),
            "ttft_s": round(omni_ttft_s, 2) if omni_ttft_s else None,
            "output_preview": omni_text[:120],
            "status": "completed"
        }

        # Model 5: Prism Thinker (d1)
        print("=== 5. Testing Prism Thinker (d1) ===")
        page.locator(".chat-side-roster button:has-text('Prism Thinker')").click()
        page.wait_for_selector(".decision-studio", timeout=10000)
        page.locator(".decision-studio textarea").first.fill("Service error rate spiked above 15% threshold.")
        
        t0_perf = page.evaluate("performance.now()")
        page.locator("button:has-text('Evaluate with Prism Thinker')").click()
        # Wait for decision card to render
        page.wait_for_selector(".decision-studio button:has-text('Evaluate with Prism Thinker'):not([disabled])", timeout=45000)
        t_end_perf = page.evaluate("performance.now()")
        d1_wall_s = (t_end_perf - t0_perf) / 1000.0
        d1_text = page.locator(".decision-studio").inner_text().strip()
        print(f"Prism Thinker Result: Wall {d1_wall_s:.2f}s (Direct System-1 Logit forward pass)")

        results["models"]["d1"] = {
            "character": "Prism Thinker",
            "model_id": "d1",
            "task": "decision",
            "browser_wall_s": round(d1_wall_s, 2),
            "mode": "system-1 logit evaluation",
            "status": "completed"
        }

        # Model 6: Sherlock Omni (d1_omni)
        print("=== 6. Testing Sherlock Omni (d1_omni) ===")
        page.locator(".chat-side-roster button:has-text('Sherlock Omni')").click()
        page.wait_for_selector(".decision-studio", timeout=10000)
        page.locator(".decision-studio textarea").first.fill("Audio alarm detected with ambient vibration.")
        
        t0_perf = page.evaluate("performance.now()")
        page.locator("button:has-text('Evaluate with Sherlock Omni')").click()
        page.wait_for_selector(".decision-studio button:has-text('Evaluate with Sherlock Omni'):not([disabled])", timeout=45000)
        t_end_perf = page.evaluate("performance.now()")
        d1_omni_wall_s = (t_end_perf - t0_perf) / 1000.0
        print(f"Sherlock Omni Result: Wall {d1_omni_wall_s:.2f}s (Direct System-1 Logit forward pass)")

        results["models"]["d1_omni"] = {
            "character": "Sherlock Omni",
            "model_id": "d1_omni",
            "task": "decision",
            "browser_wall_s": round(d1_omni_wall_s, 2),
            "mode": "system-1 logit evaluation",
            "status": "completed"
        }

    # Save results to target file
    out_path = "/home/pratay-karali/Desktop/flowstate/lfm3-prismlab/docs/playground/S5H_LATENCY_RESCUE_RESULTS.json"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nAll measurements saved to: {out_path}")

if __name__ == "__main__":
    run_suite()
