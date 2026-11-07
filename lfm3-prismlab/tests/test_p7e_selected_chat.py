"""Selected character chat input and one-worker admission contracts."""
import base64
import os
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

from prismlab.api_server import app
from prismlab.live_api import LIVE_LOCK
from prismlab.multimodal_api import decode_media, parse_payload


def test_selected_model_and_video_are_preserved():
    clip = b"\x00\x00\x00\x10ftypisom"
    payload = {
        "task": "video_qa", "model": "vision", "prompt": "What changes?",
        "video": {"mime": "video/mp4", "data_base64": base64.b64encode(clip).decode()},
        "required_media": ["video"],
    }
    task, prompt, media, selected, model = parse_payload(payload)
    assert (task, prompt, selected, model) == ("video_qa", "What changes?", {"video"}, "vision")
    assert media["video"][0] == clip


def test_video_signature_rejects_non_mp4_bytes():
    try:
        decode_media({"mime": "video/mp4", "data_base64": base64.b64encode(b"not a video").decode()}, "video")
    except HTTPException as error:
        assert error.status_code == 422
    else:
        raise AssertionError("Non-MP4 bytes were accepted")


def test_one_lock_blocks_text_and_selected_media_routes():
    with patch.dict(os.environ, {"PRISMLAB_LIVE_ENABLED": "1", "PRISMLAB_LIVE_TOKEN": "test-only"}):
        with TestClient(app) as client:
            assert LIVE_LOCK.acquire(blocking=False)
            try:
                headers = {"x-prismlab-token": "test-only"}
                text = client.post("/api/v1/live/text", headers=headers, json={"prompt": "hello"})
                selected = client.post("/api/v1/live/execute", headers=headers, json={"task": "chat", "model": "vision", "prompt": "hello"})
                assert text.status_code == 409
                assert selected.status_code == 409
            finally:
                LIVE_LOCK.release()
