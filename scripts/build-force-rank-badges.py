from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BADGES = [
    ("01_SLATE.png", "SLATE", "slate", "#d9dde4"),
    ("02_AZURE.png", "AZURE", "azure", "#4aa3ff"),
    ("03_AMBER.png", "AMBER", "amber", "#ffad38"),
    ("04_JADE.png", "JADE", "jade", "#64e592"),
    ("05_AMETHYST.png", "AMETHYST", "amethyst", "#c772ff"),
    ("06_CRIMSON.png", "CRIMSON", "crimson", "#ff5a4e"),
    ("07_ARGENT.png", "ARGENT", "argent", "#e8eef8"),
    ("08_AURUM.png", "AURUM", "aurum", "#ffc84d"),
    ("09_OBSIDIAN.png", "OBSIDIAN", "obsidian", "#b36bff"),
    ("10_ASTRAL_I.png", "ASTRAL I", "astral-1", "#55a9ff"),
    ("11_ASTRAL_II.png", "ASTRAL II", "astral-2", "#6caeff"),
    ("12_ASTRAL_III.png", "ASTRAL III", "astral-3", "#de77ff"),
    ("13_ASTRAL_IV.png", "ASTRAL IV", "astral-4", "#8cdcff"),
    ("14_SINGULARITY.png", "SINGULARITY", "singularity", "#f0b4ff"),
    ("15_EVENT_HORIZONE.png", "EVENT HORIZONE", "event-horizone", "#f8d66d"),
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/bahnschrift.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def fit_badge(source: Image.Image, title: str, accent: str) -> Image.Image:
    source = source.convert("RGBA")
    alpha = source.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"Transparent source for {title}")

    emblem = source.crop(bbox)
    max_width = 416
    max_height = 416
    ratio = min(max_width / emblem.width, max_height / emblem.height)
    size = (max(1, round(emblem.width * ratio)), max(1, round(emblem.height * ratio)))
    emblem = emblem.resize(size, Image.Resampling.LANCZOS)

    output = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    x = (512 - emblem.width) // 2
    y = 12 + (416 - emblem.height) // 2
    output.alpha_composite(emblem, (x, y))

    font_size = 31 if len(title) <= 12 else 27
    font = load_font(font_size)
    draw = ImageDraw.Draw(output)
    text_bbox = draw.textbbox((0, 0), title, font=font, stroke_width=2)
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (512 - text_width) // 2
    draw.text(
        (text_x, 458),
        title,
        font=font,
        fill=accent,
        stroke_width=2,
        stroke_fill="#07101d",
    )
    return output


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(
            "Usage: build-force-rank-badges.py CLEANED_DIR OUTPUT_DIR DIST_DIR"
        )

    cleaned_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    dist_dir = Path(sys.argv[3])
    output_dir.mkdir(parents=True, exist_ok=True)
    dist_dir.mkdir(parents=True, exist_ok=True)

    metadata = {
        "version": 1,
        "canvas": {"width": 512, "height": 512},
        "sheet": {"columns": 5, "rows": 3},
        "badges": [],
    }
    rendered: list[Image.Image] = []

    for index, (filename, title, tier, accent) in enumerate(BADGES):
        source_path = cleaned_dir / filename
        if not source_path.exists():
            raise FileNotFoundError(source_path)
        image = fit_badge(Image.open(source_path), title, accent)
        image.save(output_dir / filename, optimize=True)
        rendered.append(image)
        metadata["badges"].append(
            {
                "index": index + 1,
                "file": filename,
                "title": title,
                "tier": tier,
                "accent": accent,
                "column": index % 5,
                "row": index // 5,
            }
        )

    sheet = Image.new("RGBA", (512 * 5, 512 * 3), (0, 0, 0, 0))
    for index, image in enumerate(rendered):
        sheet.alpha_composite(image, ((index % 5) * 512, (index // 5) * 512))
    sheet.save(output_dir / "rank_badges_sheet.png", optimize=True)

    metadata_path = output_dir / "rank_badges.json"
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=True, indent=2) + "\n", encoding="utf-8"
    )

    zip_path = dist_dir / "force_rank_badges.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for filename, *_ in BADGES:
            archive.write(output_dir / filename, arcname=filename)
        archive.write(output_dir / "rank_badges_sheet.png", arcname="rank_badges_sheet.png")
        archive.write(metadata_path, arcname="rank_badges.json")
    print(zip_path)


if __name__ == "__main__":
    main()
