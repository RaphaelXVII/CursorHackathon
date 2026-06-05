# Using Gemini generative API to decompose character prompts into per-layer descriptions.
import google.generativeai as genai
import json, os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-2.5-flash")

# Layers for the model to generate
LAYER_SCHEMA = {
    "style": "str",
    "base_face": "str",
    "left_eye": "str",
    "right_eye": "str",
    "hair_back": "str",
    "hair_front": "str",
    "mouth": "str",
    "outfit": "str",
    "accessories": ["str"]
}

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
  style       - overall art style tags, e.g. "anime, cel-shaded, soft lighting, pastel palette"
  base_face   - skin tone, face shape, neutral forward-facing expression; no hair, no background
  left_eye    - iris color, pupil shape (round/slit/star), lash density, eye shape (almond/round/fox)
  right_eye   - same traits as left_eye (mirror)
  hair_back   - length (shoulder/waist/hip), color, highlight color, strand flow direction, volume
  hair_front  - bang style (straight/side-swept/wispy), color, front strand framing detail
  mouth       - lip color, lip shape, expression (slight smile/neutral/open), teeth visible or not
  outfit      - garment type, collar style, fabric color and texture, any trims or emblems
  accessories - JSON array of short tag strings for isolated items, e.g. ["cat ears, white fur", "ribbon bow, red"]

Respond ONLY with valid JSON matching this schema: {json.dumps(LAYER_SCHEMA)}
No markdown, no backticks, just raw JSON."""

    response = model.generate_content(f"{system}\n\nUser prompt: {user_prompt}")
    raw = response.text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(raw)
