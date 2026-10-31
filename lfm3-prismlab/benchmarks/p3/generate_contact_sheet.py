#!/usr/bin/env python3
"""Generate high-resolution PNG previews and a contact sheet for all 7 figures.

Uses google-chrome headless to render SVGs with crisp typography.
Outputs:
- docs/p3/figures/p3_architecture_preview.png
- docs/p3/figures/p3_research_summary_preview.png
- docs/p3/figures/figures_contact_sheet.png
"""
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FIG_DIR = ROOT / "docs/p3/figures"

def render_svg_with_chrome(svg_path, png_path, width=1200, height=860):
    url = f"file://{svg_path.resolve()}"
    cmd = [
        "google-chrome",
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        f"--window-size={width},{height}",
        f"--screenshot={png_path.resolve()}",
        url
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"Rendered {svg_path.name} -> {png_path.name} via headless Chrome")

def main():
    arch_svg = FIG_DIR / "p3_architecture.svg"
    arch_png = FIG_DIR / "p3_architecture_preview.png"
    summary_svg = FIG_DIR / "p3_research_summary.svg"
    summary_png = FIG_DIR / "p3_research_summary_preview.png"

    render_svg_with_chrome(arch_svg, arch_png, width=1100, height=780)
    render_svg_with_chrome(summary_svg, summary_png, width=1100, height=820)

    # 7 figures to assemble
    figures = [
        ("1. Architecture Topologies (SVG Preview)", arch_png),
        ("2. Research Summary Dashboard (SVG Preview)", summary_png),
        ("3. Median Latency Comparison (n=23, 24, 23)", FIG_DIR / "latency_comparison.png"),
        ("4. Modular Stage Breakdown", FIG_DIR / "modular_stage_breakdown.png"),
        ("5. Task Accuracy by Domain Category", FIG_DIR / "accuracy_by_category.png"),
        ("6. Multi-Dimensional Reliability Audit", FIG_DIR / "reliability_comparison.png"),
        ("7. Modular V1 to V2.1 Engineering Delta", FIG_DIR / "v1_to_v21_improvement.png"),
    ]

    thumb_w = 850
    gap = 35
    title_h = 36
    header_h = 90

    loaded = []
    for title, path in figures:
        img = Image.open(path).convert("RGB")
        w, h = img.size
        aspect = h / w
        thumb_h = int(thumb_w * aspect)
        thumb = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        loaded.append((title, thumb, thumb_w, thumb_h))

    row_heights = [
        max(loaded[0][3], loaded[1][3]),
        max(loaded[2][3], loaded[3][3]),
        max(loaded[4][3], loaded[5][3]),
        loaded[6][3]
    ]

    total_w = 2 * thumb_w + 3 * gap
    total_h = header_h + sum(row_heights) + len(row_heights) * (gap + title_h) + gap

    contact = Image.new("RGB", (total_w, total_h), "#F8FAFC")
    draw = ImageDraw.Draw(contact)

    try:
        f_header = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
        f_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        f_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    except:
        f_header = ImageFont.load_default()
        f_sub = ImageFont.load_default()
        f_title = ImageFont.load_default()

    draw.text((gap, 20), "PrismLab P3 Audio Intelligence — Complete Figure Catalog & Contact Sheet", fill="#0F172A", font=f_header)
    draw.text((gap, 56), "Verified visual layout of all 7 research deliverables (2 SVG architecture/summary figures + 5 Python benchmark plots)", fill="#475569", font=f_sub)

    positions = [
        (0, 0), (1, 0),
        (0, 1), (1, 1),
        (0, 2), (1, 2),
        (0, 3)
    ]

    for i, (title, img, tw, th) in enumerate(loaded):
        col, row = positions[i]
        x_pos = gap + col * (thumb_w + gap)
        y_pos = header_h + sum(row_heights[:row]) + row * (gap + title_h)

        # Badge
        draw.rectangle([x_pos, y_pos, x_pos + tw, y_pos + title_h - 8], fill="#FFFFFF", outline="#CBD5E1")
        draw.text((x_pos + 10, y_pos + 6), title, fill="#1E293B", font=f_title)

        # Image
        contact.paste(img, (x_pos, y_pos + title_h))
        draw.rectangle([x_pos, y_pos + title_h, x_pos + tw, y_pos + title_h + th], outline="#CBD5E1", width=1)

    contact_path = FIG_DIR / "figures_contact_sheet.png"
    contact.save(contact_path, quality=92)
    print(f"Generated contact sheet: {contact_path} ({total_w}x{total_h})")

if __name__ == "__main__":
    main()
