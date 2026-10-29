
from prismlab.vision.vision_api import build_vision_payload, generate_vision
from prismlab.vision.vision_io import read_clipboard_image, read_file_image


def main() -> None:
    print("\n=== PRISMLAB VISION ===")
    print("1. Enter / drag image path")
    print("2. Use copied image from clipboard")

    choice = input("\nChoose (1/2): ").strip()
    if choice == "1":
        path = input("Enter or drag image path: ").strip()
        image_bytes, mime = read_file_image(path)
    elif choice == "2":
        image_bytes, mime = read_clipboard_image()
    else:
        raise ValueError("Choose 1 or 2")

    prompt = input("Ask about the image: ").strip()
    if not prompt:
        prompt = "Describe this image. Do not guess unreadable text."

    print(f"\n[IMAGE] {mime}, {len(image_bytes):,} bytes")
    payload = build_vision_payload(prompt, image_bytes, mime)
    answer = generate_vision(payload)
    print("\n=== LFM3-VL RESPONSE ===")
    print(answer)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError) as exc:
        raise SystemExit(f"[ERROR] {exc}") from None