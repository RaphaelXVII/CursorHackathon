import google.generativeai as genai
import json, os

genai.configure(api_key=os.environ["GEMINI_API_KEY"])
model = genai.GenerativeModel("gemini-2.5-flash")

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
    response = model.generate_content(
        f"""You are an art director for VTuber character design.
Decompose the user's character description into per-layer art prompts.
Respond ONLY with valid JSON matching this schema: {json.dumps(LAYER_SCHEMA)}
No markdown, no backticks, just raw JSON.
Keep style consistent across all layers. Be specific about colors and shapes.

User prompt: {user_prompt}"""
    )
    raw = response.text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(raw)
