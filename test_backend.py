import json
import os
import tempfile


def test_env():
    print("Checking env vars...")
    gemini = os.environ.get("GEMINI_API_KEY")
    fal = os.environ.get("FAL_KEY") or os.environ.get("FAL_API_KEY")
    print(f"✓ GEMINI_API_KEY: {'set' if gemini else 'MISSING'}")
    print(f"✓ FAL_KEY: {'set' if fal else 'MISSING'}")


def test_imports():
    print("Testing imports...")
    import fastapi
    import google.generativeai
    import PIL
    import requests
    print("✓ All imports OK")


def test_gemini():
    print("Testing Gemini decompose...")
    from generation.decompose import decompose_prompt

    result = decompose_prompt("fox girl with silver hair, red hoodie")
    print("✓ Gemini works:")
    print(json.dumps(result, indent=2))


def test_generate_layers():
    print("Testing fal.ai layer generation (single layer)...")
    from generation.generate_layers import generate_layer

    manifest = {
        "style": "anime, cel-shaded, soft lighting",
        "mouth": "small pink lips, neutral expression",
    }
    with tempfile.TemporaryDirectory() as tmp:
        path = generate_layer("mouth", manifest, tmp)
        size = os.path.getsize(path)
        if size <= 0:
            raise RuntimeError("Generated layer PNG is empty")
        print(f"✓ fal.ai works: {path} ({size} bytes)")


def test_atlas():
    print("Testing atlas assembly...")
    from PIL import Image, ImageDraw
    from generation.atlas import build_atlas

    with tempfile.TemporaryDirectory() as tmp:
        for name, color in [("base_face", "pink"), ("mouth", "red")]:
            img = Image.new("RGB", (512, 512), color)
            draw = ImageDraw.Draw(img)
            draw.ellipse((180, 180, 332, 332), fill="white")
            img.save(os.path.join(tmp, f"{name}.png"))

        layer_paths = {
            "base_face": os.path.join(tmp, "base_face.png"),
            "mouth": os.path.join(tmp, "mouth.png"),
        }
        atlas_path = build_atlas(layer_paths, os.path.join(tmp, "atlas.png"))
        size = os.path.getsize(atlas_path)
        if size <= 0:
            raise RuntimeError("Atlas PNG is empty")
        print(f"✓ Atlas works: {atlas_path} ({size} bytes)")


def test_api_health():
    print("Testing FastAPI health endpoint...")
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    res = client.get("/health")
    if res.status_code != 200:
        raise RuntimeError(f"Health check failed: {res.status_code}")
    print("✓ FastAPI health OK")


if __name__ == "__main__":
    test_env()
    test_imports()
    test_gemini()
    test_atlas()
    test_api_health()
    if os.environ.get("SKIP_FAL_TEST") != "1":
        test_generate_layers()
    else:
        print("Skipping fal.ai test (SKIP_FAL_TEST=1)")
    print("\n✓ Backend OK")
