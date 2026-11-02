#!/usr/bin/env python3
"""PrismLab P7.1: fetch ONLY six official HF config.json files (not weights).

Run inside lfm3-prismlab:
  python3 experiments/p7/p7_1_architecture_audit.py
  python3 experiments/p7/p7_1_architecture_audit.py --offline
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "results" / "p7" / "architecture"
REPORT_PATH = PROJECT_ROOT / "docs" / "p7" / "p7_1_config_inventory.md"
MODELS = {
    "text": "LiquidAI/LFM3-1.7B",
    "vision": "LiquidAI/LFM3-VL-2B",
    "audio": "LiquidAI/LFM3-Audio-2B",
    "omni": "LiquidAI/LFM3-Omni-2B",
    "d1": "LiquidAI/d1-2B",
    "d1_omni": "LiquidAI/d1-Omni-2B",
}
INTERESTING = (
    "model_type", "architectures", "hidden_size", "num_hidden_layers",
    "n_layer", "layer_types", "layer_type", "layer_pattern", "attn_layers",
    "conv_layers", "num_attention_heads", "num_key_value_heads", "sliding_window",
    "rope", "kernel", "image_size", "patch_size", "vocab_size", "max_position",
    "audio", "vision", "text_config", "sampling_rate", "num_frames",
)
MAX_CONFIG_BYTES = 2_000_000


def config_url(repo_id: str) -> str:
    return f"https://huggingface.co/{quote(repo_id, safe='/')}/resolve/main/config.json"


def read_config(repo_id: str, cached_path: Path, offline: bool) -> bytes:
    if offline:
        if not cached_path.is_file():
            raise FileNotFoundError(f"Not cached yet: {cached_path}")
        return cached_path.read_bytes()
    req = Request(config_url(repo_id), headers={"User-Agent": "PrismLab-P7-ArchitectureAudit/1.0"})
    with urlopen(req, timeout=30) as r:
        data = r.read(MAX_CONFIG_BYTES + 1)
    if len(data) > MAX_CONFIG_BYTES:
        raise ValueError(f"Config exceeds {MAX_CONFIG_BYTES} bytes: {repo_id}")
    cached_path.parent.mkdir(parents=True, exist_ok=True)
    cached_path.write_bytes(data)
    return data


def extract_fields(obj: object, prefix: str = "") -> dict[str, object]:
    """Report fields actually present. Do not hallucinate absent config details."""
    found: dict[str, object] = {}
    if not isinstance(obj, dict):
        return found
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            found.update(extract_fields(value, path))
        elif any(term in key.lower() for term in INTERESTING):
            if isinstance(value, list):
                found[path] = {"list_length": len(value), "preview": value[:30]}
            elif isinstance(value, (str, float, int, bool)) or value is None:
                found[path] = value
            else:
                found[path] = f"unsupported_value_type:{type(value).__name__}"
    return found


def run(offline: bool = False) -> list[dict[str, object]]:
    OUT = OUTPUT_DIR
    OUT.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, object]] = []
    for alias, repo_id in MODELS.items():
        cached = OUT / f"{alias}_config.json"
        try:
            raw = read_config(repo_id, cached, offline)
            conf = json.loads(raw)
            if not isinstance(conf, dict):
                raise ValueError("Expected top-level JSON object")
            entry = {
                "alias": alias,
                "model_id": repo_id,
                "source_url": config_url(repo_id),
                "sha256": hashlib.sha256(raw).hexdigest(),
                "status": "OK",
                "fields": extract_fields(conf),
            }
            print(f"[OK]   {alias:<8} {repo_id:<25} fields={len(entry['fields']):>3}")
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as ex:
            entry = {"alias": alias, "model_id": repo_id,
                     "source_url": config_url(repo_id),
                     "status": "ERROR", "error": f"{type(ex).__name__}: {ex}", "fields": {}}
            print(f"[FAIL] {alias:<8} {type(ex).__name__}: {ex}")
        rows.append(entry)

    snapshot = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "method": "config.json-only; no model weights downloaded; fields are observed, not inferred",
        "models": rows,
    }
    (OUT / "inventory.json").write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = ["# P7.1 — Six-model config inventory", "",
             "Generated from official Hugging Face `config.json` files. This inventory is not a complete architecture proof.", "",
             "| Alias | Model | Status | Config SHA256 | Observed field count |", "|---|---|---|---|---:|"]
    for x in rows:
        lines.append(f"| `{x['alias']}` | `{x['model_id']}` | {x['status']} | `{x.get('sha256', '—')}` | {len(x['fields'])} |")
    lines += ["", "## Observed configuration fields", "",
              "Fields below are extracted directly from model configs. Missing data means **not observed**, not absent from the architecture.", ""]
    for x in rows:
        lines.extend([f"### {x['alias']} — `{x['model_id']}`", "", f"Source: {x['source_url']}", ""])
        if x["status"] != "OK":
            lines.extend([f"**Fetch error:** `{x.get('error', 'unknown')}`", ""])
            continue
        for key, value in x["fields"].items():
            lines.append(f"- `{key}`: `{json.dumps(value, ensure_ascii=False)}`")
        lines.append("")
    lines += ["## Evidence policy", "", "- OFFICIAL: manufacturer/model-card documentation",
              "- OBSERVED: fields in archived `config.json`, runtime tensor metadata, or source implementation",
              "- INFERRED: hypotheses requiring a validation experiment", "",
              "Do not treat layer-count summaries as execution order unless verified in model source/config.", ""]
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nSaved {OUT / 'inventory.json'}")
    print(f"Saved {REPORT_PATH}")
    print(f"Models retrieved: {sum(x['status']=='OK' for x in rows)}/6")
    return rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true", help="Read previously fetched configs only")
    args = parser.parse_args()
    run(args.offline)
