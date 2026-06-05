# PromptTuber Prompt Improvements — Design Spec

**Date:** 2026-06-04
**Scope:** Improve all three prompt layers in the generation pipeline for female anime VTuber characters.

---

## Goals

- The Gemini decomposition prompt produces rich, layer-aware descriptions from any VTuber character input
- Each fal.ai image generation call uses a per-layer tailored prompt that produces anatomically correct, style-consistent isolated parts
- The full pipeline reliably handles inputs like "cheerful fox girl with silver hair and blue eyes, casual school uniform"

---

## Architecture Overview

The pipeline is unchanged — three files are modified, no new files, no new API calls:

```
User prompt
    ↓
decompose.py  ← improved Gemini system prompt
    ↓ manifest (JSON with per-layer descriptions)
generate_layers.py  ← per-layer _build_prompt() dispatch table
    ↓ per-layer fal.ai calls
atlas.py  (unchanged)
    ↓
Live2D model
```

---

## Section 1: Gemini Decomposition Prompt (`decompose.py`)

### Current state

```
You are an art director for VTuber character design.
Decompose the user's character description into per-layer art prompts.
Respond ONLY with valid JSON matching this schema: {...}
No markdown, no backticks, just raw JSON.
Keep style consistent across all layers. Be specific about colors and shapes.
```

No guidance on what each field should contain; Gemini guesses.

### New prompt

The rewritten system prompt:

1. **Persona lock** — "female anime VTuber, isolated body-part layers for a Live2D rig, cel-shaded anime style"
2. **Per-field instructions** — inline, inside the schema comment:
   - `style`: overall art style tag string, e.g. `"anime, cel-shaded, soft lighting, pastel palette"`
   - `base_face`: skin tone, face shape, neutral forward-facing expression, no hair, no background
   - `left_eye`: iris color, pupil shape (round/slit/star), lash density, eye shape (almond/round/fox)
   - `right_eye`: same as left_eye, mirror description
   - `hair_back`: length (shoulder/waist/hip), color with highlight color, strand flow direction, volume level
   - `hair_front`: bang style (straight/side-swept/wispy), color, front strand framing detail
   - `mouth`: lip color, lip shape, expression (slight smile/neutral/open), teeth visible or not
   - `outfit`: garment type, collar style, fabric color and texture, any emblems or trims
   - `accessories`: list of isolated items (e.g. "cat ears, silver", "ribbon bow, red") — each as a short tag string
3. **Output discipline** — comma-separated image-generation tags per field; consistent color palette across all layers; no scene, no background, no full-body context in any field

### Example output (input: "cheerful fox girl, silver hair, blue eyes, school uniform")

```json
{
  "style": "anime, cel-shaded, clean linework, soft pastel lighting",
  "base_face": "fair skin, soft round face shape, neutral slight smile, no hair, forward-facing",
  "left_eye": "sky blue iris, round pupil, long lashes, slightly upturned almond eye shape",
  "right_eye": "sky blue iris, round pupil, long lashes, slightly upturned almond eye shape",
  "hair_back": "silver white hair, waist length, straight flowing strands, subtle blue highlight, soft sheen",
  "hair_front": "straight silver bangs, side-swept right, front strands framing face, wispy tips",
  "mouth": "soft pink lips, gentle upward curve smile, teeth slightly visible, cheerful expression",
  "outfit": "dark navy sailor school uniform, white collar, red ribbon tie, clean fabric",
  "accessories": ["fox ears, silver white fur, pink inner", "fox tail, silver white, fluffy"]
}
```

---

## Section 2: Per-layer Image Generation Prompts (`generate_layers.py`)

### Current state

`_build_prompt()` uses one generic template for all non-accessory layers:

```python
prompt = f"{style}, {description}, anime VTuber character part, isolated element, plain white background, clean edges, no scenery"
negative_prompt = "background scenery, multiple characters, full body, blurry, low quality"
```

Same template for eyes, hair, face, outfit — no layer-specific quality keywords.

### New approach: dispatch table

Replace `_build_prompt()` with a dict of per-layer template callables. Each template:
- Opens with the shared style string
- Injects the layer description
- Adds layer-specific positive keywords
- Ends with the shared tail: `anime, cel-shaded, clean linework, plain white background, isolated element`
- Has its own targeted negative prompt

#### Per-layer specs

| Layer | Extra positive keywords | Extra negative keywords |
|---|---|---|
| `base_face` | `close-up face portrait, soft skin texture, forward-facing, no hair, no neck` | `hair, body, clothing, background, side profile` |
| `left_eye` | `close-up eye detail, iris texture, catchlight, single eye, no face context` | `face, nose, mouth, multiple eyes, body` |
| `right_eye` | same as left_eye | same as left_eye |
| `hair_back` | `back hair layers, strand flow, volume, no face, no front strands` | `face, front bangs, body, clothing, background` |
| `hair_front` | `front bangs, forehead framing strands, hair highlight, no face visible` | `face, eyes, body, back hair layers, background` |
| `mouth` | `close-up mouth detail, lip texture, subtle expression, no nose, no eyes` | `nose, eyes, face, body, background` |
| `outfit` | `upper body garment, fabric detail, collar, no face, no hands, no background` | `face, hands, skin, background scenery, full body` |
| `accessory_*` | `isolated single accessory item, no character, no body, no face` | `character body, face, torso, background, multiple items` |

All layers share the tail negative: `blurry, low quality, extra limbs, deformed, watermark`.

### Implementation note

`_build_prompt` signature stays the same: `(layer_name, style, description) -> (prompt, negative_prompt)`. The dispatch replaces the `if/else` with a dict lookup, falling back to the current generic template for unknown layer names so nothing breaks if new layer keys are added.

---

## Files Changed

| File | Change |
|---|---|
| `backend/generation/decompose.py` | Rewrite system prompt string in `decompose_prompt()` |
| `backend/generation/generate_layers.py` | Replace `_build_prompt()` if/else with per-layer dispatch table |

No schema changes, no new dependencies, no API changes.

---

## Success Criteria

- Input "cheerful fox girl with silver hair and blue eyes, casual school uniform" produces a Gemini manifest with specific iris color, bang style, and outfit detail in each field
- Each fal.ai layer image shows only the expected body part against a plain white background
- Style (line weight, color palette, shading style) is visually consistent across all generated layers
