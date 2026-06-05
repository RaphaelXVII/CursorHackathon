import json
import os
import time

import requests
from PIL import Image, ImageDraw

FAL_MODEL = os.environ.get("FAL_MODEL", "fal-ai/fast-sdxl")
FAL_RUN_URL = f"https://fal.run/{FAL_MODEL}"
FAL_QUEUE_URL = f"https://queue.fal.run/{FAL_MODEL}"

LAYER_KEYS = [
    "base_face", "left_eye", "right_eye",
    "hair_back", "hair_front", "mouth", "outfit",
]

# Layer regions on the 512x512 canvas — used by atlas.py for placement.
MASK_REGIONS = {
    "base_face": [(156, 100, 356, 380)],
    "left_eye": [(156, 140, 256, 200)],
    "right_eye": [(256, 140, 356, 200)],
    "hair_back": [(100, 50, 412, 300)],
    "hair_front": [(130, 50, 382, 180)],
    "mouth": [(196, 280, 316, 340)],
    "outfit": [(100, 360, 412, 512)],
}


def create_placeholder_masks(templates_dir: str):
    os.makedirs(templates_dir, exist_ok=True)
    for name, rects in MASK_REGIONS.items():
        path = os.path.join(templates_dir, f"{name}.png")
        if not os.path.exists(path):
            img = Image.new("L", (512, 512), 0)
            draw = ImageDraw.Draw(img)
            for rect in rects:
                draw.ellipse(rect, fill=255)
            img.save(path)
            print(f"Created mask: {path}")


def _build_prompt(layer_name: str, style: str, description: str) -> tuple[str, str]:
    if layer_name.startswith("accessory_"):
        prompt = (
            f"{style}, {description}, "
            f"isolated anime VTuber accessory only, single item, "
            f"no character body, no face, plain white background, clean edges"
        )
        negative_prompt = (
            "full character, body, face, torso, background scenery, "
            "multiple items, blurry, low quality"
        )
    else:
        prompt = (
            f"{style}, {description}, "
            f"anime VTuber character part, isolated element, "
            f"plain white background, clean edges, no scenery"
        )
        negative_prompt = "background scenery, multiple characters, full body, blurry, low quality"

    return prompt, negative_prompt


def _fal_key() -> str:
    key = os.environ.get("FAL_KEY") or os.environ.get("FAL_API_KEY")
    if not key:
        raise RuntimeError("FAL_KEY is not set")
    return key


def _fal_headers() -> dict[str, str]:
    return {
        "Authorization": f"Key {_fal_key()}",
        "Content-Type": "application/json",
    }


def _fal_payload(prompt: str, negative_prompt: str) -> dict:
    return {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "image_size": {"width": 512, "height": 512},
        "format": "png",
        "num_images": 1,
    }


def _fal_error_message(response: requests.Response) -> str:
    try:
        body = response.json()
        if isinstance(body, dict) and "detail" in body:
            return str(body["detail"])
    except json.JSONDecodeError:
        pass
    return response.text or f"HTTP {response.status_code}"


def _image_url_from_result(result: dict) -> str:
    images = result.get("images")
    if not images:
        payload = result.get("response") or result.get("data") or {}
        images = payload.get("images") if isinstance(payload, dict) else None
    if not images:
        raise RuntimeError(f"fal.ai returned no images: {result}")
    return images[0]["url"]


def _download_image(url: str) -> bytes:
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return response.content


def _call_fal_sync(prompt: str, negative_prompt: str) -> bytes | None:
    response = requests.post(
        FAL_RUN_URL,
        headers=_fal_headers(),
        json=_fal_payload(prompt, negative_prompt),
        timeout=180,
    )
    if response.status_code == 200:
        return _download_image(_image_url_from_result(response.json()))
    if response.status_code in {401, 403, 402, 422}:
        raise RuntimeError(f"fal.ai error: {_fal_error_message(response)}")
    return None


def _call_fal_queue(prompt: str, negative_prompt: str) -> bytes:
    submit = requests.post(
        FAL_QUEUE_URL,
        headers=_fal_headers(),
        json=_fal_payload(prompt, negative_prompt),
        timeout=60,
    )
    if submit.status_code not in {200, 202}:
        raise RuntimeError(f"fal.ai queue submit failed: {_fal_error_message(submit)}")

    body = submit.json()
    request_id = body.get("request_id")
    if not request_id:
        if "images" in body:
            return _download_image(_image_url_from_result(body))
        raise RuntimeError(f"fal.ai queue submit missing request_id: {body}")

    status_url = f"{FAL_QUEUE_URL}/requests/{request_id}/status"
    result_url = f"{FAL_QUEUE_URL}/requests/{request_id}"

    for _ in range(120):
        status_response = requests.get(
            status_url,
            headers=_fal_headers(),
            timeout=30,
        )
        if status_response.status_code != 200:
            raise RuntimeError(
                f"fal.ai status check failed: {_fal_error_message(status_response)}"
            )

        status_body = status_response.json()
        state = status_body.get("status")
        if state == "COMPLETED":
            result_response = requests.get(
                result_url,
                headers=_fal_headers(),
                timeout=60,
            )
            if result_response.status_code != 200:
                raise RuntimeError(
                    f"fal.ai result fetch failed: {_fal_error_message(result_response)}"
                )
            result_body = result_response.json()
            payload = result_body.get("response") or result_body
            return _download_image(_image_url_from_result(payload))

        if state in {"FAILED", "CANCELLED"}:
            raise RuntimeError(f"fal.ai generation {state.lower()}: {status_body}")

        time.sleep(1)

    raise RuntimeError("fal.ai generation timed out waiting for queue result")


def _call_fal_api(layer_name: str, prompt: str, negative_prompt: str) -> bytes:
    last_error = ""
    for attempt in range(2):
        try:
            image_bytes = _call_fal_sync(prompt, negative_prompt)
            if image_bytes is not None:
                return image_bytes
            return _call_fal_queue(prompt, negative_prompt)
        except RuntimeError as exc:
            last_error = str(exc)
            if attempt == 0:
                print(f"  Retry {layer_name} ({exc})...")

    raise RuntimeError(f"fal.ai error on {layer_name}: {last_error}")


def generate_layer(layer_name: str, manifest: dict, output_dir: str) -> str:
    style = manifest.get("style", "anime, cel-shaded")
    description = manifest.get(layer_name, "")
    prompt, negative_prompt = _build_prompt(layer_name, style, description)

    print(f"  Generating {layer_name}...")

    image_bytes = _call_fal_api(layer_name, prompt, negative_prompt)

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{layer_name}.png")
    with open(output_path, "wb") as f:
        f.write(image_bytes)

    print(f"  ✓ Saved {output_path}")
    return output_path


def generate_layers(manifest: dict, output_dir: str) -> dict:
    templates_dir = os.path.join(os.path.dirname(__file__), "templates")
    create_placeholder_masks(templates_dir)

    paths = {}
    for layer in LAYER_KEYS:
        if layer not in manifest:
            print(f"  Skipping {layer} (not in manifest)")
            continue
        try:
            paths[layer] = generate_layer(layer, manifest, output_dir)
        except RuntimeError as e:
            print(f"  ✗ Failed {layer}: {e}")

    for i, accessory in enumerate(manifest.get("accessories", [])):
        acc_name = f"accessory_{i}"
        acc_manifest = {"style": manifest.get("style", ""), acc_name: accessory}
        try:
            paths[acc_name] = generate_layer(acc_name, acc_manifest, output_dir)
        except RuntimeError as e:
            print(f"  ✗ Failed {acc_name}: {e}")

    return paths
