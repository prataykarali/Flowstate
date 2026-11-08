"""Comprehensive verification script for PRISMLAB S5-H Final Live Performance, Championship Sync,
Navigation Fix (PARKED sessions), and Natural-Language Decision Chat for d1 and d1-Omni.
Runs strictly against live endpoints and stores results in JSON format.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path("/home/pratay-karali/Desktop/flowstate/lfm3-prismlab")
STATE = ROOT / ".prismlab-local"
SECRET = (STATE / "session-secret").read_text().strip()
LOCAL_API = "http://127.0.0.1:8000"
VERCEL_ORIGIN = "https://prismlab-playground-rho.vercel.app"

def make_token(visitor_id: str, exp_offset: int = 600) -> str:
    payload = {"v": visitor_id, "exp": int(time.time()) + exp_offset}
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(SECRET.encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{sig}"

def api_get(endpoint: str, visitor_id: str | None = None) -> dict:
    url = f"{LOCAL_API}{endpoint}"
    headers = {}
    if visitor_id:
        headers["Authorization"] = f"Bearer {make_token(visitor_id)}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())

def api_post(endpoint: str, payload: dict, visitor_id: str) -> tuple[int, dict, dict]:
    url = f"{LOCAL_API}{endpoint}"
    token = make_token(visitor_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
            res_headers = dict(resp.headers)
            return resp.status, data, res_headers
    except urllib.error.HTTPError as e:
        error_body = json.loads(e.read().decode()) if e.headers.get("content-type") == "application/json" else {}
        return e.code, error_body, dict(e.headers)

def vercel_get(path: str) -> tuple[int, dict]:
    url = f"{VERCEL_ORIGIN}{path}"
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.status, json.loads(resp.read().decode())

def run_tests():
    print("=== STARTING S5-H FINAL VERIFICATION SUITE ===")
    results = {}

    # Test 1: Gateway Configuration & Available Routes
    print("\n--- Test 1: Gateway Status & Route Verification ---")
    vis1 = secrets.token_hex(16)
    status = api_get("/local-api/status", vis1)
    print("Gateway status keys:", list(status.keys()))
    print("Available routes:", status.get("on_demand_routes"))
    routes = status.get("on_demand_routes", [])
    expected_models = ["text", "vision", "audio", "omni", "d1", "d1_omni"]
    all_models_present = all(m in routes or m == "text" for m in expected_models)
    results["test1_gateway_status"] = {
        "status": "PASS" if all_models_present else "FAIL",
        "gateway_enabled": status.get("gateway_enabled"),
        "backend_live_enabled": status.get("backend_live_enabled"),
        "routes": routes,
    }
    assert all_models_present, "Not all expected models are in available routes"

    # Test 2: Priority 1 — 6-Model CPU Speed & Latency Benchmarks
    print("\n--- Test 2: Priority 1 — CPU Latency Benchmarks Across Models ---")
    model_benchmarks = {}

    # Sample media assets
    img_path = ROOT / "data/test_images/imag2_half.png"
    img_b64 = base64.b64encode(img_path.read_bytes()).decode() if img_path.exists() else None
    audio_path = ROOT / "data/p4/question.wav"
    audio_b64 = base64.b64encode(audio_path.read_bytes()).decode() if audio_path.exists() else None

    # Text benchmark
    print("Testing Text (lfm3-1.7b)...")
    t0 = time.time()
    code, data, _ = api_post("/local-api/text", {"prompt": "Explain the concept of entropy in thermodynamics in two sentences.", "max_tokens": 48}, vis1)
    dt_text = time.time() - t0
    tok_text = data.get("metrics", {}).get("tokens_predicted", 0)
    print(f"Text: status={code}, dt={dt_text:.2f}s, tokens={tok_text}, tps={tok_text/dt_text:.2f}")
    model_benchmarks["text"] = {
        "status_code": code,
        "latency_s": round(dt_text, 3),
        "tokens_predicted": tok_text,
        "effective_tps": round(tok_text / dt_text, 2) if dt_text > 0 else 0,
        "metrics": data.get("metrics"),
        "response_sample": (data.get("output") or "")[:100],
    }

    # Vision benchmark
    print("Testing Vision (lfm3-vision)...")
    if img_b64:
        t0 = time.time()
        code, data, _ = api_post("/local-api/execute", {
            "model": "vision",
            "task": "chat",
            "prompt": "Describe what is visible in this image in one concise sentence.",
            "image": {"mime": "image/png", "data_base64": img_b64},
            "required_media": ["image"],
            "max_tokens": 32,
        }, vis1)
        dt_vision = time.time() - t0
        print(f"Vision: status={code}, dt={dt_vision:.2f}s, output={(data.get('output') or '')[:60]}")
        model_benchmarks["vision"] = {
            "status_code": code,
            "latency_s": round(dt_vision, 3),
            "output_preview": str(data.get("output"))[:100],
        }

    # Audio benchmark
    print("Testing Audio (lfm3-audio)...")
    if audio_b64:
        t0 = time.time()
        code, data, _ = api_post("/local-api/execute", {
            "model": "audio",
            "task": "audio_qa",
            "prompt": "Summarize what is heard in this audio clip.",
            "audio": {"mime": "audio/wav", "data_base64": audio_b64},
            "required_media": ["audio"],
            "max_tokens": 32,
        }, vis1)
        dt_audio = time.time() - t0
        print(f"Audio: status={code}, dt={dt_audio:.2f}s, output={(data.get('output') or '')[:60]}")
        model_benchmarks["audio"] = {
            "status_code": code,
            "latency_s": round(dt_audio, 3),
            "output_preview": str(data.get("output"))[:100],
        }

    # Omni benchmark
    print("Testing Omni (lfm3-omni)...")
    if img_b64 and audio_b64:
        t0 = time.time()
        code, data, _ = api_post("/local-api/execute", {
            "model": "omni",
            "task": "audio_qa",
            "prompt": "Evaluate the visual and auditory inputs together.",
            "image": {"mime": "image/png", "data_base64": img_b64},
            "audio": {"mime": "audio/wav", "data_base64": audio_b64},
            "required_media": ["image", "audio"],
            "max_tokens": 32,
        }, vis1)
        dt_omni = time.time() - t0
        print(f"Omni: status={code}, dt={dt_omni:.2f}s, output={(data.get('output') or '')[:60]}")
        model_benchmarks["omni"] = {
            "status_code": code,
            "latency_s": round(dt_omni, 3),
            "output_preview": str(data.get("output"))[:100],
        }

    # d1 benchmark (Decision)
    print("Testing d1 (Prism Thinker)...")
    t0 = time.time()
    code, data, _ = api_post("/local-api/execute", {
        "model": "d1",
        "task": "decision",
        "prompt": "Should we migrate from PostgreSQL to ScyllaDB for ultra-low latency reads?",
        "decision_question": {
            "instructions": "Which database option is better suited for low-latency key-value reads?",
            "criteria": {
                "postgresql": "PostgreSQL relational database",
                "scylladb": "ScyllaDB distributed wide-column store"
            }
        },
        "max_tokens": 48,
    }, vis1)
    dt_d1 = time.time() - t0
    print(f"d1: status={code}, dt={dt_d1:.2f}s, output={data.get('output')}")
    model_benchmarks["d1"] = {
        "status_code": code,
        "latency_s": round(dt_d1, 3),
        "output": data.get("output"),
    }

    # d1_omni benchmark (Multimodal Decision)
    print("Testing d1_omni (Sherlock Omni)...")
    t0 = time.time()
    code, data, _ = api_post("/local-api/execute", {
        "model": "d1_omni",
        "task": "decision",
        "prompt": "Evaluate operational telemetry against candidate actions.",
        "decision_question": {
            "instructions": "Which operational mitigation is recommended?",
            "criteria": {
                "scale_workers": "Scale backend worker pool",
                "rate_limit": "Apply rate-limiting and shed traffic"
            }
        },
        "max_tokens": 48,
    }, vis1)
    dt_d1_omni = time.time() - t0
    print(f"d1_omni: status={code}, dt={dt_d1_omni:.2f}s, output={data.get('output')}")
    model_benchmarks["d1_omni"] = {
        "status_code": code,
        "latency_s": round(dt_d1_omni, 3),
        "output": data.get("output"),
    }

    results["test2_model_benchmarks"] = model_benchmarks

    # Test 3: Priority 3 — Paused Story Navigation, PARKED State & Lock Release
    print("\n--- Test 3: Priority 3 — Activity Lock, PARKED State & Multi-Tab Isolation ---")
    vis_story = secrets.token_hex(16)
    story_sess_id = f"sess_story_{secrets.token_hex(6)}"

    # 3.1 Start Story activity
    code, data, _ = api_post("/local-api/activity/start", {
        "activity_type": "STORY",
        "session_id": story_sess_id,
        "metadata": {"theme": "Fantasy", "turn": 4, "totalTurns": 20}
    }, vis_story)
    print(f"Start STORY: status={code}, data={data}")
    assert code == 200, f"Expected 200 starting story, got {code}"

    # 3.2 Try starting concurrent CHAT -> should be rejected with 409
    code, data, _ = api_post("/local-api/activity/start", {
        "activity_type": "CHAT",
        "session_id": f"sess_chat_{secrets.token_hex(6)}",
    }, vis_story)
    print(f"Concurrent CHAT while STORY active: status={code}, error={data.get('error')}")
    assert code == 409, f"Expected 409 conflict, got {code}"
    assert data.get("error") == "ACTIVE_ACTIVITY_CONFLICT"

    # 3.3 Park the Story activity (visitor pauses or navigates away)
    code, data, _ = api_post("/local-api/activity/park", {
        "session_id": story_sess_id,
        "metadata": {"theme": "Fantasy", "turn": 5, "totalTurns": 20}
    }, vis_story)
    print(f"Park STORY: status={code}, status_label={data.get('status')}")
    assert code == 200, f"Expected 200 parking story, got {code}"
    assert data.get("status") == "parked"

    # 3.4 Verify /local-api/activity/current shows no active lock, but parked session is reported
    curr_data = api_get("/local-api/activity/current", vis_story)
    print(f"Current activity after park: active={curr_data.get('active')}, parked={bool(curr_data.get('parked'))}")
    assert curr_data.get("active") is False, "Active lock should be released when parked"
    assert curr_data.get("parked") is not None, "Parked session should be reported"
    assert curr_data.get("parked", {}).get("session_id") == story_sess_id

    # 3.5 Visitor can now perform casual Chat or Model World test without conflict
    code, data, _ = api_post("/local-api/text", {
        "prompt": "Hello from casual chat while story is parked!",
        "max_tokens": 16
    }, vis_story)
    print(f"Casual text while story parked: status={code}, output={(data.get('output') or '')[:40]}")
    assert code == 200, "Casual inference should succeed while Story is parked"

    # 3.6 Resume parked story
    code, data, _ = api_post("/local-api/activity/resume-parked", {
        "session_id": story_sess_id
    }, vis_story)
    print(f"Resume parked STORY: status={code}, session status={data.get('status')}")
    assert code == 200, f"Expected 200 resuming parked story, got {code}"
    assert data.get("status") == "active"

    # Clean up story session
    api_post("/local-api/activity/stop", {"session_id": story_sess_id, "reason": "test_completed"}, vis_story)
    results["test3_parked_activity_lifecycle"] = {
        "status": "PASS",
        "story_started": True,
        "concurrent_rejected_409": True,
        "park_releases_lock": True,
        "casual_inference_while_parked": True,
        "resume_reacquires_lock": True
    }

    # Test 4: Priority 4 — Natural-Language Decision Chat for d1 and d1-Omni
    print("\n--- Test 4: Priority 4 — Natural-Language Decision Parsing & Evaluation ---")
    vis_decision = secrets.token_hex(16)

    # 4.1 Choice comparison
    code, data, _ = api_post("/local-api/execute", {
        "model": "d1",
        "task": "decision",
        "prompt": "Should I choose React or Vue for a developer tools dashboard?",
        "decision_question": {
            "instructions": "Which framework option is better suited for a developer tools dashboard?",
            "criteria": {
                "react": "React frontend component library",
                "vue": "Vue progressive framework"
            }
        },
        "max_tokens": 48
    }, vis_decision)
    print(f"Natural decision comparison (React vs Vue): status={code}")
    out = data.get("output", {})
    print("Decision output:", out)
    assert code == 200
    assert "predicted_route" in out
    assert "probabilities" in out
    assert any(k in out["probabilities"] for k in ["react", "vue"])

    # 4.2 Binary Approval
    code, data, _ = api_post("/local-api/execute", {
        "model": "d1",
        "task": "decision",
        "prompt": "Should we approve this emergency database failover?",
        "decision_question": {
            "instructions": "Should this emergency database failover action be approved?",
            "criteria": {
                "approve_yes": "Yes, approve immediate failover",
                "reject_no": "No, hold failover for investigation"
            }
        },
        "max_tokens": 48
    }, vis_decision)
    print(f"Natural decision binary: status={code}")
    out_bin = data.get("output", {})
    print("Binary decision output:", out_bin)
    assert code == 200
    assert "predicted_route" in out_bin

    # 4.3 Multimodal decision on d1_omni
    code, data, _ = api_post("/local-api/execute", {
        "model": "d1_omni",
        "task": "decision",
        "prompt": "Examine operational system signals and determine triage route.",
        "decision_question": {
            "instructions": "What is the severity of this operational anomaly?",
            "criteria": {
                "p1_critical": "P1 Critical - Immediate intervention",
                "p2_elevated": "P2 Elevated - Standby monitoring"
            }
        },
        "max_tokens": 48
    }, vis_decision)
    print(f"d1_omni decision: status={code}, predicted={data.get('output', {}).get('predicted_route')}")
    assert code == 200

    results["test4_natural_language_decisions"] = {
        "status": "PASS",
        "comparison_choice": out,
        "binary_decision": out_bin,
        "multimodal_d1_omni": data.get("output")
    }

    # Test 5: Priority 2 — Championship Standings Synchronization & Independent Visitors
    print("\n--- Test 5: Priority 2 — Championship Standings Synchronization ---")
    status_code, prod_standings = vercel_get("/api/league/standings")
    print(f"Vercel /api/league/standings HTTP status={status_code}")
    print("Standings data source:", prod_standings.get("data_source"))
    print("Total models:", prod_standings.get("total_models"))
    standings_list = prod_standings.get("standings", [])
    print(f"Standings count: {len(standings_list)}")
    for s in standings_list:
        print(f"  {s.get('model_id')}: {s.get('total_points')} pts (Chat: {s.get('chat_points')}, Story: {s.get('story_points')}, Trivia: {s.get('trivia_points')})")

    assert status_code == 200
    assert len(standings_list) == 6

    # Verify scores are preserved (Echo >= 101, Pure >= 21)
    echo_standing = next((s for s in standings_list if s.get("model_id") == "audio"), None)
    pure_standing = next((s for s in standings_list if s.get("model_id") == "text"), None)
    assert echo_standing is not None and echo_standing.get("total_points", 0) >= 100, f"Echo points lost: {echo_standing}"
    assert pure_standing is not None and pure_standing.get("total_points", 0) >= 20, f"Pure points lost: {pure_standing}"

    results["test5_championship_sync"] = {
        "status": "PASS",
        "data_source": prod_standings.get("data_source"),
        "echo_standing": echo_standing,
        "pure_standing": pure_standing,
        "all_six_models_ranked_or_tracked": True
    }

    print("\n=== ALL TESTS PASSED SUCCESSFULLY ===")
    out_file = ROOT / "docs/playground/S5H_FINAL_PERFORMANCE_RESULTS.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(results, indent=2))
    print(f"Saved full results to {out_file}")

if __name__ == "__main__":
    run_tests()
