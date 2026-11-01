
"""P6.6a: curate six recorded P6 results for public replay."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "results/p6"
DEST = SOURCE / "public_replays"

# Explicitly approved controlled research examples only.
EXAMPLES = (
    (
        "text",
        "411987b057fd499598db36a3b0ad67de.json",
        "Router versus executor",
        None,
    ),
    (
        "vision",
        "f0c269b5303c4b1b8cdc476363988429_vision.json",
        "Robotics poster OCR",
        "ROBOTICS OPEN LAB",
    ),
    (
        "audio",
        "96cfc014dcb945599e02b57e49f8929f_audio.json",
        "Controlled speech transcription",
        None,
    ),
    (
        "d1",
        "dd389970a2dc4935867f33d662878158_decision.json",
        "Billing classification",
        "billing",
    ),
    (
        "d1_omni",
        "7bd925d623ca481faaa6c67727d63df5_decision.json",
        "Spoken shipping classification",
        "shipping",
    ),
    (
        "omni",
        "89d6efbf3cf5455fbb6786ca51415fc4_omni.json",
        "Audio-visual rightmost challenge",
        "Blue",
    ),
)


def prediction(value):
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        return value.get("predicted_route")
    return None


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    exported = 0

    for slug, filename, title, expected in EXAMPLES:
        path = SOURCE / filename

        if not path.is_file():
            print(f"SKIP {slug}: source file missing")
            continue

        raw = json.loads(
            path.read_text(encoding="utf-8")
        )

        if raw.get("status") != "completed":
            print(f"SKIP {slug}: not completed")
            continue

        output = raw.get("output")

        if isinstance(output, str):
            if len(output) > 1000:
                print(f"SKIP {slug}: response too long")
                continue

        elif isinstance(output, dict):
            allowed = {
                "predicted_route",
                "confidence",
                "probabilities",
                "human_review_required",
                "external_action_executed",
                "exploratory_gate_passed",
            }
            output = {
                k: v
                for k, v in output.items()
                if k in allowed
            }

        else:
            print(f"SKIP {slug}: unsupported output")
            continue

        observed = prediction(output)

        evaluation = (
            None if expected is None else {
                "expected": expected,
                "correct": (
                    str(observed).casefold().strip(" .!")
                    == expected.casefold()
                ),
                "scope": (
                    "Single controlled example; "
                    "not an accuracy estimate"
                ),
            }
        )

        public = {
            "slug": slug,
            "mode": "recorded_replay",
            "title": title,
            "source_request_id": raw.get("request_id"),
            "route": raw.get("route", []),
            "status": "completed",
            "output": output,
            "metrics": {
                k: raw.get(k)
                for k in (
                    "total_latency_s",
                    "ttft_s",
                    "tokens_per_second",
                )
            },
            "trace": [
                {
                    k: step.get(k)
                    for k in (
                        "stage",
                        "status",
                        "model",
                        "latency_s",
                        "ttft_s",
                    )
                }
                for step in raw.get("trace", [])
                if isinstance(step, dict)
            ],
            "evaluation": evaluation,
            "limitations": (
                "Local single-run measurement; "
                "not a controlled cross-model speed ranking"
            ),
        }

        target = DEST / f"{slug}.json"
        target.write_text(
            json.dumps(
                public, indent=2, ensure_ascii=False
            ),
            encoding="utf-8",
        )

        print(
            f"EXPORT {slug}: "
            f"{len(public['trace'])} stages"
        )
        exported += 1

    print(
        f"Exported {exported}/{len(EXAMPLES)} "
        f"curated replays -> {DEST}"
    )


if __name__ == "__main__":
    main()
