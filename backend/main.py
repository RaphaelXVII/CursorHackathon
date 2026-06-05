import asyncio
import json
import os
import shutil
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from generation.atlas import build_atlas
from generation.decompose import decompose_prompt
from generation.generate_layers import generate_layers

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

APP_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = APP_DIR / "output"
TEMPLATE_DIR = APP_DIR / "models" / "template"
FRONTEND_MODELS_DIR = APP_DIR.parent / "frontend" / "public" / "models" / "template"
PUBLIC_BASE_URL = os.environ.get("BACKEND_PUBLIC_URL", "http://localhost:8000")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="PromptTuber API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/output", StaticFiles(directory=str(OUTPUT_DIR)), name="output")


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1)


class GenerateResponse(BaseModel):
    model_url: str
    atlas_url: str
    run_id: str


NEUTRAL_TRACKING_PARAMS = {
    "ParamAngleX": 0.0,
    "ParamAngleY": 0.0,
    "ParamAngleZ": 0.0,
    "ParamEyeLOpen": 1.0,
    "ParamEyeROpen": 1.0,
    "ParamMouthOpenY": 0.0,
    "ParamBrowLY": 0.0,
    "ParamBrowRY": 0.0,
    "ParamEyeBallX": 0.0,
    "ParamEyeBallY": 0.0,
}


def _resolve_template_dir() -> Path | None:
    for candidate in (TEMPLATE_DIR, FRONTEND_MODELS_DIR):
        model3 = candidate / "model.model3.json"
        if model3.exists():
            return candidate
    return None


def _prepare_model_url(run_id: str, run_dir: Path, atlas_path: Path) -> str:
    """Copy a Live2D template rig and swap in the generated atlas texture."""
    template_dir = _resolve_template_dir()
    if template_dir is None:
        return f"{PUBLIC_BASE_URL}/output/{run_id}/atlas.png"

    live2d_dir = run_dir / "live2d"
    if live2d_dir.exists():
        shutil.rmtree(live2d_dir)
    shutil.copytree(template_dir, live2d_dir)

    model3_path = live2d_dir / "model.model3.json"
    with open(model3_path, encoding="utf-8") as f:
        model3 = json.load(f)

    textures = model3.get("FileReferences", {}).get("Textures", [])
    texture_name = textures[0] if textures else "texture_00.png"
    shutil.copy(atlas_path, live2d_dir / texture_name)

    return f"{PUBLIC_BASE_URL}/output/{run_id}/live2d/model.model3.json"


@app.post("/generate", response_model=GenerateResponse)
def generate(body: GenerateRequest):
    run_id = uuid.uuid4().hex[:8]
    run_dir = OUTPUT_DIR / run_id
    layers_dir = run_dir / "layers"
    layers_dir.mkdir(parents=True, exist_ok=True)

    try:
        manifest = decompose_prompt(body.prompt)
        layer_paths = generate_layers(manifest, str(layers_dir))
        if not layer_paths:
            raise HTTPException(status_code=500, detail="No layers were generated")

        atlas_path = Path(build_atlas(layer_paths, str(run_dir / "atlas.png")))
        model_url = _prepare_model_url(run_id, run_dir, atlas_path)
        atlas_url = f"{PUBLIC_BASE_URL}/output/{run_id}/atlas.png"

        return GenerateResponse(model_url=model_url, atlas_url=atlas_url, run_id=run_id)
    except HTTPException:
        raise
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Missing API key: {e}") from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws/tracking")
async def tracking_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_text(json.dumps(NEUTRAL_TRACKING_PARAMS))
            await asyncio.sleep(1 / 30)
    except WebSocketDisconnect:
        pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
