"""Regenerate lightweight photo previews. Requires Pillow; no site build step."""

from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "assets/images"
GALLERY = IMAGES / "places/web"
THUMBNAILS = IMAGES / "places/thumbnails"


def preview(source, destination, width, height):
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((width, height), Image.Resampling.LANCZOS)
        # Re-encode without camera metadata; source files remain untouched.
        image.save(destination, "WEBP", quality=70, method=6)
        return image.size


def main():
    THUMBNAILS.mkdir(parents=True, exist_ok=True)
    sources = sorted(GALLERY.glob("*.jpg"))
    print(f"Full gallery: {sum(path.stat().st_size for path in sources):,} bytes")
    for edge in (480, 800):
        total = 0
        for source in sources:
            destination = THUMBNAILS / f"{source.stem}-{edge}.webp"
            preview(source, destination, edge, edge)
            total += destination.stat().st_size
        print(f"{edge}px previews: {total:,} bytes across {len(sources)} photos")
    for width in (160, 400):
        destination = IMAGES / f"portrait-{width}.webp"
        preview(IMAGES / "portrait.jpg", destination, width, width * 2)
        print(f"Portrait {width}px: {destination.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
