import os

from PIL import Image

from generation.generate_layers import LAYER_KEYS, MASK_REGIONS

CANVAS_SIZE = (512, 512)

# Back → front draw order for compositing
DRAW_ORDER = [
    "hair_back",
    "base_face",
    "left_eye",
    "right_eye",
    "mouth",
    "outfit",
    "hair_front",
]


def _remove_white_background(img: Image.Image, threshold: int = 235) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = pixels[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (255, 255, 255, 0)
    return img


def _composite_into_region(atlas: Image.Image, layer: Image.Image, rect: tuple[int, int, int, int]):
    x0, y0, x1, y1 = rect
    target_w = max(1, x1 - x0)
    target_h = max(1, y1 - y0)
    fitted = layer.resize((target_w, target_h), Image.LANCZOS)
    atlas.paste(fitted, (x0, y0), fitted)


def _composite_accessory(atlas: Image.Image, layer: Image.Image):
    max_w = int(CANVAS_SIZE[0] * 0.5)
    max_h = int(CANVAS_SIZE[1] * 0.35)
    layer.thumbnail((max_w, max_h), Image.LANCZOS)
    x = (CANVAS_SIZE[0] - layer.width) // 2
    y = 20
    atlas.paste(layer, (x, y), layer)


def build_atlas(layer_paths: dict[str, str], output_path: str) -> str:
    """Composite generated layer PNGs into a single 512x512 texture atlas."""
    atlas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))

    ordered = [name for name in DRAW_ORDER if name in layer_paths]
    accessories = sorted(name for name in layer_paths if name.startswith("accessory_"))
    ordered.extend(accessories)

    for name in ordered:
        path = layer_paths[name]
        if not os.path.exists(path):
            continue

        layer = _remove_white_background(Image.open(path))

        if name in MASK_REGIONS:
            for rect in MASK_REGIONS[name]:
                _composite_into_region(atlas, layer, rect)
        else:
            _composite_accessory(atlas, layer)

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    atlas.save(output_path)
    return output_path
