#!/usr/bin/env python3
"""
P0: Production Latency Waterfall Instrumentation.
Measures the complete request lifecycle across client, network, and gateway:
- Click time
- Session token fetch
- CORS / OPTIONS preflights
- SSE stream connection (TTFB)
- First token chunk arriving
- First character visible in DOM
- Final result chunk arriving
- Stream close
- UI completion
Correlates with backend trace metrics.
"""
import json
import time
from playwright.sync_api import sync_playwright

VERCEL_URL = "https://prismlab-playground-rho.vercel.app"

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
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()

    # Capture CDP network events for microsecond precision
    client = context.new_cdp_session(page)
    client.send("Network.enable")

    net_events = []
    
    def on_request(params):
        url = params.get("request", {}).get("url", "")
        if "local-api" in url or "api/session" in url or "api/league" in url:
            net_events.append({
                "type": "requestWillBeSent",
                "req_id": params.get("requestId"),
                "url": url,
                "method": params.get("request", {}).get("method"),
                "timestamp": params.get("timestamp"),
                "wallTime": params.get("wallTime")
            })

    def on_response(params):
        url = params.get("response", {}).get("url", "")
        if "local-api" in url or "api/session" in url or "api/league" in url:
            timing = params.get("response", {}).get("timing", {})
            net_events.append({
                "type": "responseReceived",
                "req_id": params.get("requestId"),
                "url": url,
                "status": params.get("response", {}).get("status"),
                "headers": params.get("response", {}).get("headers"),
                "timing": timing,
                "timestamp": params.get("timestamp")
            })

    def on_data(params):
        net_events.append({
            "type": "dataReceived",
            "req_id": params.get("requestId"),
            "dataLength": params.get("dataLength"),
            "timestamp": params.get("timestamp")
        })

    def on_finished(params):
        net_events.append({
            "type": "loadingFinished",
            "req_id": params.get("requestId"),
            "timestamp": params.get("timestamp")
        })

    client.on("Network.requestWillBeSent", on_request)
    client.on("Network.responseReceived", on_response)
    client.on("Network.dataReceived", on_data)
    client.on("Network.loadingFinished", on_finished)

    print("Navigating to production:", f"{VERCEL_URL}/#chat")
    page.goto(f"{VERCEL_URL}/#chat", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)

    # Instrument page with performance observer for DOM mutations
    page.evaluate("""
        window.__waterfall = {
            clicks: [],
            domFirstToken: null,
            domCompleted: null
        };
        const observer = new MutationObserver((mutations) => {
            const streamEl = document.querySelector('.chat-stream-draft, .chat-message--model');
            if (streamEl && streamEl.innerText.trim().length > 0 && !window.__waterfall.domFirstToken) {
                window.__waterfall.domFirstToken = performance.now();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    """)

    input_box = page.locator("textarea").first
    input_box.fill("Explain gravity in 10 words.")

    print("\n--- INITIATING SINGLE TEST REQUEST (PRISM PURE TEXT) ---")
    
    t0_wall = time.time()
    t0_perf = page.evaluate("performance.now()")
    
    # Click Send
    page.locator(".chat-send-button, button:has-text('Send')").first.click()

    # Wait for the model bubble to appear and finish
    print("Waiting for model response in DOM...")
    page.wait_for_selector(".chat-message--model", timeout=40000)
    t_end_perf = page.evaluate("performance.now()")
    t_end_wall = time.time()

    waterfall_js = page.evaluate("window.__waterfall")
    
    total_browser_ms = t_end_perf - t0_perf
    dom_first_token_ms = (waterfall_js["domFirstToken"] - t0_perf) if waterfall_js["domFirstToken"] else None

    print(f"\nTotal Browser Wall Time: {total_browser_ms:.2f} ms ({total_browser_ms/1000:.2f} s)")
    if dom_first_token_ms:
        print(f"Time to First Visible Token in DOM: {dom_first_token_ms:.2f} ms ({dom_first_token_ms/1000:.2f} s)")

    # Print out chronological network events for this request
    print("\n--- CHRONOLOGICAL NETWORK TIMING TRACE ---")
    base_ts = None
    for ev in net_events:
        ts = ev.get("timestamp", 0)
        if base_ts is None:
            base_ts = ts
        rel_ms = (ts - base_ts) * 1000
        t_type = ev["type"]
        if t_type == "requestWillBeSent":
            print(f"[{rel_ms:>8.1f} ms] REQUEST SENT: {ev['method']} {ev['url'][:80]}")
        elif t_type == "responseReceived":
            print(f"[{rel_ms:>8.1f} ms] RESPONSE HEADERS ({ev['status']}): {ev['url'][:80]}")
        elif t_type == "dataReceived":
            print(f"[{rel_ms:>8.1f} ms] DATA CHUNK: {ev['dataLength']} bytes")
        elif t_type == "loadingFinished":
            print(f"[{rel_ms:>8.1f} ms] STREAM FINISHED / CLOSED")

    # Get the text of the model output
    replies = page.locator(".chat-message--model").all_inner_texts()
    print("\nOutput text:", replies[-1] if replies else "NONE")

    browser.close()
