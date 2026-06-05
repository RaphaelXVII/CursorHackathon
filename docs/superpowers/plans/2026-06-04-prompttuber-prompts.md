# PromptTuber Prompt Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Gemini decomposition prompt and replace the generic fal.ai `_build_prompt()` with per-layer tailored templates for female anime VTuber generation.

**Architecture:** Two files modified — `decompose.py` gets a richer system prompt with per-field instructions; `generate_layers.py` replaces the single `if/else` prompt builder with a dispatch table keyed on layer name.

**Tech Stack:** Python, google-generativeai (Gemini), fal.ai REST API, Pillow

---

### Task 1: Rewrite Gemini decomposition prompt in `decompose.py`

**Files:**
- Modify: `backend/generation/decompose.py`

- [ ] **Step 1: Replace the system prompt string**

Open `backend/generation/decompose.py` and replace the `model.generate_content(...)` call with:

```python
def decompose_prompt(user_prompt: str) -> dict:
    system = f"""You are an art director for a female anime VTuber character generator.
The character will be rendered as isolated body-part layers on a Live2D rig (cel-shaded anime style).
Decompose the user's description into per-layer image-generation tag strings.

Rules:
- Every field must be comma-separated image-generation tags (no sentences).
- Keep the same color palette and art style across ALL fields.
- No scene, no background, no full-body context in any individual field.
- If the user does not specify a trait, invent a coherent one that fits the overall character.

Field instructions:
  style       – overall art style tags, e.g. "anime, cel-shaded, soft lighting, pastel palette"
  base_face   – skin tone, face shape, neutral forward-facing expression; no hair, no background
  left_eye    – iris color, pupil shape (round/slit/star), lash density, eye shape (almond/round/fox)
  right_eye   – same traits as left_eye (mirror)
  hair_back   – length (shoulder/waist/hip), color, highlight color, strand flow direction, volume
  hair_front  – bang style (straight/side-swept/wispy), color, front strand framing detail
  mouth       – lip color, lip shape, expression (slight smile/neutral/open), teeth visible or not
  outfit      – garment type, collar style, fabric color and texture, any trims or emblems
  accessories – JSON array of short tag strings for isolated items, e.g. ["cat ears, white fur", "ribbon bow, red"]

Respond ONLY with valid JSON matching this schema: {json.dumps(LAYER_SCHEMA)}
No markdown, no backticks, just raw JSON."""

    response = model.generate_content(f"{system}\n\nUser prompt: {user_prompt}")
    raw = response.text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(raw)
```

- [ ] **Step 2: Commit**

```bash
git add backend/generation/decompose.py
git commit -m "feat: rewrite Gemini decomposition prompt with per-field instructions"
```

---

### Task 2: Replace `_build_prompt()` with per-layer dispatch table in `generate_layers.py`

**Files:**
- Modify: `backend/generation/generate_layers.py`

- [ ] **Step 1: Replace `_build_prompt()` with the dispatch table**

Replace the entire `_build_prompt` function with:

```python
_SHARED_TAIL = "anime, cel-shaded, clean linework, plain white background, isolated element"
_SHARED_NEG_TAIL = "blurry, low quality, extra limbs, deformed, watermark"

_LAYER_TEMPLATES = {
    "base_face": {
        "pos": "close-up face portrait, soft skin texture, forward-facing, no hair, no neck",
        "neg": "hair, body, clothing, background, side profile",
    },
    "left_eye": {
        "pos": "close-up eye detail, iris texture, catchlight, single eye, no face context",
        "neg": "face, nose, mouth, multiple eyes, body",
    },
    "right_eye": {
        "pos": "close-up eye detail, iris texture, catchlight, single eye, no face context",
        "neg": "face, nose, mouth, multiple eyes, body",
    },
    "hair_back": {
        "pos": "back hair layers, strand flow, volume, no face, no front strands",
        "neg": "face, front bangs, body, clothing, background",
    },
    "hair_front": {
        "pos": "front bangs, forehead framing strands, hair highlight, no face visible",
        "neg": "face, eyes, body, back hair layers, background",
    },
    "mouth": {
        "pos": "close-up mouth detail, lip texture, subtle expression, no nose, no eyes",
        "neg": "nose, eyes, face, body, background",
    },
    "outfit": {
        "pos": "upper body garment, fabric detail, collar, no face, no hands, no background",
        "neg": "face, hands, skin, background scenery, full body",
    },
}

_ACCESSORY_TEMPLATE = {
    "pos": "isolated single accessory item, no character, no body, no face",
    "neg": "character body, face, torso, background, multiple items",
}

_GENERIC_TEMPLATE = {
    "pos": "anime VTuber character part, isolated element",
    "neg": "background scenery, multiple characters, full body",
}


def _build_prompt(layer_name: str, style: str, description: str) -> tuple[str, str]:
    if layer_name.startswith("accessory_"):
        tmpl = _ACCESSORY_TEMPLATE
    else:
        tmpl = _LAYER_TEMPLATES.get(layer_name, _GENERIC_TEMPLATE)

    prompt = f"{style}, {description}, {tmpl['pos']}, {_SHARED_TAIL}"
    negative_prompt = f"{tmpl['neg']}, {_SHARED_NEG_TAIL}"
    return prompt, negative_prompt
```

- [ ] **Step 2: Commit**

```bash
git add backend/generation/generate_layers.py
git commit -m "feat: replace generic _build_prompt with per-layer dispatch table"
```
