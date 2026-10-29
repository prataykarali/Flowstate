import base64
import mimetypes
import os
import shutil
import subprocess
from pathlib import Path

MAX_IMAGE_BYTES = 5 * 1024 * 1024
SUPPORTED = ("image/png", "image/jpeg", "image/webp")


def _validate_image(data: bytes, mime: str | None) -> None:
    if mime not in SUPPORTED:
        raise ValueError(f"Unsupported image MIME type: {mime}")
    if not data:
        raise ValueError("The selected image is empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise ValueError("Image exceeds the 5 MB input limit")


def read_file_image(image_path: str) -> tuple[bytes, str]:
    """Return (image bytes, MIME type) for a local file."""
    path = Path(image_path.strip().strip("\"'")).expanduser()
    if not path.is_file():
        raise FileNotFoundError(path)

    mime, _ = mimetypes.guess_type(path.name)
    data = path.read_bytes()
    _validate_image(data, mime)
    return data, mime


def read_clipboard_image() -> tuple[bytes, str]:
    """Return image pixels copied to the Ubuntu clipboard (Wayland or X11)."""
    if os.environ.get("WAYLAND_DISPLAY") and shutil.which("wl-paste"):
        backend = "wayland"
    elif shutil.which("xclip"):
        backend = "x11"
    elif shutil.which("wl-paste"):
        backend = "wayland"
    else:
        raise RuntimeError("Install wl-clipboard (Wayland) or xclip (X11)")

    if backend == "wayland":
        list_cmd = ["wl-paste", "--list-types"]
    else:
        list_cmd = ["xclip", "-selection", "clipboard", "-t", "TARGETS", "-o"]

    try:
        listed = subprocess.run(
            list_cmd, check=True, capture_output=True, timeout=10
        ).stdout.decode("utf-8", errors="replace")
        available = {line.strip() for line in listed.splitlines()}
        mime = next((kind for kind in SUPPORTED if kind in available), None)
        if mime is None:
            raise ValueError(
                "Clipboard does not contain image pixels. "
                "Copy an actual image or screenshot, not a file path."
            )

        if backend == "wayland":
            read_cmd = ["wl-paste", "--no-newline", "--type", mime]
        else:
            read_cmd = ["xclip", "-selection", "clipboard", "-t", mime, "-o"]

        data = subprocess.run(
            read_cmd, check=True, capture_output=True, timeout=20
        ).stdout
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        raise RuntimeError("Unable to read image pixels from clipboard") from exc

    _validate_image(data, mime)
    return data, mime


def image_to_data_url(data: bytes, mime: str) -> str:
    """Encode image bytes as a data URL suitable for JSON transport."""
    _validate_image(data, mime)
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{encoded}"