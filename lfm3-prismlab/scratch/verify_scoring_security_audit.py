#!/usr/bin/env python3
"""
PrismLab S5-H: Final Scoring Security & Cryptographic Proof Verification Suite.

Validates the six required security criteria against production Vercel:
1. Ordinary signed Chat receipts cannot be submitted as trivia_correct, story_turn, or story_complete.
2. Activity eligibility, model identity, visitor ownership, and state validation are server-authoritative.
3. Cross-activity receipt reuse is rejected with HTTP 403.
4. Existing Supabase points are strictly preserved without mutation or reset.
"""
import base64
import json
import secrets
import sys
import time
import urllib.request
import urllib.error

VERCEL_URL = "https://prismlab-playground-rho.vercel.app"
GATEWAY_URL = "http://127.0.0.1:8000"

def get_standings():
    req = urllib.request.Request(f"{VERCEL_URL}/api/league/standings", headers={"Cache-Control": "no-cache"})
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)

def get_session_token():
    req = urllib.request.Request(f"{VERCEL_URL}/api/session")
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)["token"]

def post_json(url, data, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.load(resp)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {"error": "HTTP Error"}

def decode_receipt_payload(receipt):
    parts = receipt.split(".")
    payload_json = base64.urlsafe_b64decode(parts[0] + "=" * (-len(parts[0]) % 4))
    return json.loads(payload_json)

def main():
    print("=" * 70)
    print("PRISMLAB S5-H: PRODUCTION SCORING SECURITY AUDIT")
    print(f"Target Vercel: {VERCEL_URL}")
    print(f"Target Gateway: {GATEWAY_URL}")
    print("=" * 70)

    # 1. Verify baseline scores in Supabase
    standings_before = get_standings()
    standings_map = {m["model_id"]: m for m in standings_before["standings"]}
    pure_before = standings_map.get("text", {})
    echo_before = standings_map.get("audio", {})
    
    print("\n[Baseline Standings]")
    print(f"  Prism Pure (text): Total={pure_before.get('total_points')}, Chat={pure_before.get('chat_points')}, Story={pure_before.get('story_points')}, Trivia={pure_before.get('trivia_points')}")
    print(f"  Echo (audio):       Total={echo_before.get('total_points')}, Chat={echo_before.get('chat_points')}, Story={echo_before.get('story_points')}, Trivia={echo_before.get('trivia_points')}")
    
    init_pure_total = pure_before.get('total_points', 0)
    init_echo_total = echo_before.get('total_points', 0)
    init_pure_story = pure_before.get('story_points', 0)
    init_echo_trivia = echo_before.get('trivia_points', 0)
    print(f"  ✓ Recorded baseline Supabase scores (Pure Total={init_pure_total}, Story={init_pure_story}; Echo Total={init_echo_total}, Trivia={init_echo_trivia}).")

    token = get_session_token()
    print("  ✓ Authenticated session token obtained from Vercel.")

    # 2. Obtain authentic Chat receipt from gateway
    print("\n[Stage 1] Obtaining authentic signed Chat receipt (no active activity)...")
    code, resp = post_json(f"{GATEWAY_URL}/local-api/execute", {
        "model": "text",
        "task": "chat",
        "prompt": "Hello world",
        "max_tokens": 16
    }, token=token)
    assert code == 200, f"Chat inference failed: {resp}"
    chat_receipt = resp.get("activity_receipt")
    assert chat_receipt, "Missing activity_receipt on chat response"
    chat_payload = decode_receipt_payload(chat_receipt)
    print(f"  ✓ Chat receipt generated: req={chat_payload['req'][:12]}..., act='{chat_payload['act']}', mod='{chat_payload['mod']}', vis={chat_payload['vis'][:8]}...")
    assert chat_payload["act"] == "chat", f"Expected act='chat', got '{chat_payload['act']}'"

    # 3. Negative Tests: Ordinary Chat receipt submitted for high-value activities
    print("\n[Stage 2] Negative Tests: Testing Chat receipt spoofing attempts...")

    # Test 1A: Chat receipt as trivia_correct (+100 pts)
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"hack_trivia_{secrets.token_hex(6)}",
        "visitor_id": chat_payload["vis"],
        "model_id": "text",
        "activity_type": "trivia_correct",
        "points": 100,
        "source_receipt_id": f"spoof_{secrets.token_hex(4)}",
        "activity_receipt": chat_receipt
    })
    print(f"  Test 1A: Chat receipt submitted as trivia_correct -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Ordinary Chat receipt rejected for trivia_correct (HTTP 403).")

    # Test 1B: Chat receipt as story_turn (+1 pt)
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"hack_turn_{secrets.token_hex(6)}",
        "visitor_id": chat_payload["vis"],
        "model_id": "text",
        "activity_type": "story_turn",
        "points": 1,
        "source_receipt_id": f"spoof_{secrets.token_hex(4)}",
        "activity_receipt": chat_receipt
    })
    print(f"  Test 1B: Chat receipt submitted as story_turn -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Ordinary Chat receipt rejected for story_turn (HTTP 403).")

    # Test 1C: Chat receipt as story_complete (+10 pts)
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"hack_complete_{secrets.token_hex(6)}",
        "visitor_id": chat_payload["vis"],
        "model_id": "text",
        "activity_type": "story_complete",
        "points": 10,
        "source_receipt_id": f"spoof_{secrets.token_hex(4)}",
        "activity_receipt": chat_receipt
    })
    print(f"  Test 1C: Chat receipt submitted as story_complete -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Ordinary Chat receipt rejected for story_complete (HTTP 403).")

    # Test 1D: Model mismatch attack (submitting Pure's chat receipt for Echo)
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"hack_model_{secrets.token_hex(6)}",
        "visitor_id": chat_payload["vis"],
        "model_id": "audio",
        "activity_type": "chat",
        "points": 4,
        "source_receipt_id": f"spoof_{secrets.token_hex(4)}",
        "activity_receipt": chat_receipt
    })
    print(f"  Test 1D: Model mismatch (claim audio with text receipt) -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Model identity mismatch rejected (HTTP 403).")

    # Test 1E: Visitor ownership spoofing attack
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"hack_vis_{secrets.token_hex(6)}",
        "visitor_id": "attacker_imposter_0000000000000000",
        "model_id": "text",
        "activity_type": "chat",
        "points": 4,
        "source_receipt_id": f"spoof_{secrets.token_hex(4)}",
        "activity_receipt": chat_receipt
    })
    print(f"  Test 1E: Visitor spoofing (claim imposter ID) -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Visitor ownership mismatch rejected (HTTP 403).")

    # 4. Generate authentic Trivia receipt from gateway
    print("\n[Stage 3] Generating authentic signed Trivia receipt (active TRIVIA session)...")
    trivia_sess = f"sec_trivia_{secrets.token_hex(6)}"
    code, s_resp = post_json(f"{GATEWAY_URL}/local-api/activity/start", {
        "activity_type": "TRIVIA",
        "session_id": trivia_sess
    }, token=token)
    assert code == 200, f"Trivia session start failed: {s_resp}"

    code, resp = post_json(f"{GATEWAY_URL}/local-api/execute", {
        "model": "audio",
        "task": "chat",
        "prompt": "Answer B.",
        "max_tokens": 16,
        "activity_session_id": trivia_sess
    }, token=token)
    assert code == 200, f"Trivia inference failed: {resp}"
    trivia_receipt = resp.get("activity_receipt")
    assert trivia_receipt, "Missing activity_receipt on trivia response"
    trivia_payload = decode_receipt_payload(trivia_receipt)
    print(f"  ✓ Trivia receipt generated: req={trivia_payload['req'][:12]}..., act='{trivia_payload['act']}', mod='{trivia_payload['mod']}'")
    assert trivia_payload["act"] == "trivia", f"Expected act='trivia', got '{trivia_payload['act']}'"

    post_json(f"{GATEWAY_URL}/local-api/activity/stop", {"session_id": trivia_sess}, token=token)

    # 5. Negative Tests: Cross-Activity Reuse of Trivia receipt
    print("\n[Stage 4] Negative Tests: Testing Trivia receipt cross-activity reuse...")

    # Test 2A: Trivia receipt as general chat
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"reuse_chat_{secrets.token_hex(6)}",
        "visitor_id": trivia_payload["vis"],
        "model_id": "audio",
        "activity_type": "chat",
        "points": 4,
        "source_receipt_id": f"reuse_{secrets.token_hex(4)}",
        "activity_receipt": trivia_receipt
    })
    print(f"  Test 2A: Trivia receipt submitted as chat -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Trivia receipt rejected for chat (HTTP 403).")

    # Test 2B: Trivia receipt as story_turn
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"reuse_story_{secrets.token_hex(6)}",
        "visitor_id": trivia_payload["vis"],
        "model_id": "audio",
        "activity_type": "story_turn",
        "points": 1,
        "source_receipt_id": f"reuse_{secrets.token_hex(4)}",
        "activity_receipt": trivia_receipt
    })
    print(f"  Test 2B: Trivia receipt submitted as story_turn -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Trivia receipt rejected for story_turn (HTTP 403).")

    # 6. Generate authentic Story receipt from gateway
    print("\n[Stage 5] Generating authentic signed Story receipt (active STORY session)...")
    story_sess = f"sec_story_{secrets.token_hex(6)}"
    code, s_resp = post_json(f"{GATEWAY_URL}/local-api/activity/start", {
        "activity_type": "STORY",
        "session_id": story_sess
    }, token=token)
    assert code == 200, f"Story session start failed: {s_resp}"

    code, resp = post_json(f"{GATEWAY_URL}/local-api/execute", {
        "model": "text",
        "task": "chat",
        "prompt": "Chapter 1",
        "max_tokens": 16,
        "activity_session_id": story_sess,
        "checkpoint": {"turn_index": 1, "activity_type": "STORY"}
    }, token=token)
    assert code == 200, f"Story inference failed: {resp}"
    story_receipt = resp.get("activity_receipt")
    assert story_receipt, "Missing activity_receipt on story response"
    story_payload = decode_receipt_payload(story_receipt)
    print(f"  ✓ Story receipt generated: req={story_payload['req'][:12]}..., act='{story_payload['act']}', mod='{story_payload['mod']}', ctx='{story_payload['ctx']}'")
    assert story_payload["act"] == "story", f"Expected act='story', got '{story_payload['act']}'"

    post_json(f"{GATEWAY_URL}/local-api/activity/stop", {"session_id": story_sess}, token=token)

    # 7. Negative Tests: Cross-Activity Reuse of Story receipt
    print("\n[Stage 6] Negative Tests: Testing Story receipt cross-activity reuse...")

    # Test 3A: Story receipt as trivia_correct
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"reuse_story_trivia_{secrets.token_hex(6)}",
        "visitor_id": story_payload["vis"],
        "model_id": "text",
        "activity_type": "trivia_correct",
        "points": 100,
        "source_receipt_id": f"reuse_{secrets.token_hex(4)}",
        "activity_receipt": story_receipt
    })
    print(f"  Test 3A: Story receipt submitted as trivia_correct -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Story receipt rejected for trivia_correct (HTTP 403).")

    # Test 3B: Story receipt as general chat
    code, res = post_json(f"{VERCEL_URL}/api/league/event", {
        "event_id": f"reuse_story_chat_{secrets.token_hex(6)}",
        "visitor_id": story_payload["vis"],
        "model_id": "text",
        "activity_type": "chat",
        "points": 4,
        "source_receipt_id": f"reuse_{secrets.token_hex(4)}",
        "activity_receipt": story_receipt
    })
    print(f"  Test 3B: Story receipt submitted as chat -> HTTP {code}: {res.get('error')}")
    assert code == 403, f"Expected 403, got {code}: {res}"
    print("  ✓ PASS: Story receipt rejected for chat (HTTP 403).")

    # 8. Verify Standings after all attacks
    print("\n[Stage 7] Verifying database standings after all negative security tests...")
    standings_after = get_standings()
    standings_map_after = {m["model_id"]: m for m in standings_after["standings"]}
    pure_after = standings_map_after.get("text", {})
    echo_after = standings_map_after.get("audio", {})

    print(f"  Prism Pure (text): Total={pure_after.get('total_points')}, Chat={pure_after.get('chat_points')}, Story={pure_after.get('story_points')}, Trivia={pure_after.get('trivia_points')}")
    print(f"  Echo (audio):       Total={echo_after.get('total_points')}, Chat={echo_after.get('chat_points')}, Story={echo_after.get('story_points')}, Trivia={echo_after.get('trivia_points')}")

    assert pure_after.get("total_points") == init_pure_total, f"LEAK DETECTED: Pure total changed from {init_pure_total} to {pure_after.get('total_points')}!"
    assert echo_after.get("total_points") == init_echo_total, f"LEAK DETECTED: Echo total changed from {init_echo_total} to {echo_after.get('total_points')}!"
    assert pure_after.get("story_points") == init_pure_story, f"LEAK DETECTED: Pure story changed from {init_pure_story} to {pure_after.get('story_points')}!"
    assert echo_after.get("trivia_points") == init_echo_trivia, f"LEAK DETECTED: Echo trivia changed from {init_echo_trivia} to {echo_after.get('trivia_points')}!"
    print("  ✓ Database integrity 100% verified: Zero unauthorized points awarded, zero score drift.")

    print("\n" + "=" * 70)
    print("ALL 10 SECURITY VALIDATION GATES PASSED (100% PASS)")
    print("=" * 70)

if __name__ == "__main__":
    main()
