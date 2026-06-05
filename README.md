# PromptTuber

Generate a fully rigged Live2D VTuber avatar from a single text prompt, with real-time face tracking out of the box.

## Overview

PromptTuber collapses the traditional VTuber creation pipeline (artist commission, layer separation, Live2D rigging, tracking setup) into one step. A user describes their character in natural language, and the system generates a working Live2D model with face tracking in seconds, not weeks.

**Hackathon MVP Flow:**
Prompt → Generate Layered Artwork → Load onto Template Rig → Face Track → Live VTuber

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                 │
│  ├── Prompt input UI                                │
│  ├── pixi-live2d-display (model renderer)           │
│  └── WebSocket client (receives tracking params)    │
└──────────────┬──────────────────────┬───────────────┘
               │ HTTP (generation)    │ WS (tracking)
┌──────────────▼──────────────────────▼───────────────┐
│  Backend (Python / FastAPI)                          │
│  ├── Generation Pipeline                            │
│  │   ├── Claude API (prompt → layer manifest)       │
│  │   ├── fal.ai API (manifest → layer PNGs)         │
│  │   └── Template mask system                       │
│  ├── Tracking Service                               │
│  │   ├── MediaPipe Face Landmarker (478 landmarks)  │
│  │   └── Landmark → Live2D parameter mapping        │
│  └── WebSocket server (broadcasts at ~30fps)        │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer         | Technology                        | Purpose                                      |
|---------------|-----------------------------------|----------------------------------------------|
| Frontend      | Next.js                          | UI, prompt input, webcam toggle               |
| 2D Rendering  | pixi-live2d-display + PixiJS     | Renders Live2D .moc3 models in the browser    |
| Backend       | Python, FastAPI                  | API server, WebSocket, orchestration          |
| Face Tracking | MediaPipe Face Landmarker        | Webcam → 478 facial landmarks in real time    |
| LLM           | Claude API (Anthropic)           | Decomposes user prompt into per-layer descriptions |
| Image Gen     | fal.ai (fast-sdxl)               | Generates per-layer character artwork at 512×512              |
| Transport     | WebSocket (Starlette)            | Streams tracking parameters to frontend       |

## Generation Pipeline

The core novel component. Turns a text prompt into a usable Live2D texture atlas.

### Step 1: Prompt Decomposition (Claude API)

The user's prompt is sent to Claude with a structured output schema. Claude acts as an "art director," decomposing a high-level description into per-layer prompts with consistent style directives.

```
Input:  "anime girl with silver hair, fox ears, red hoodie"

Output: {
  "style": "anime, cel-shaded, soft lighting",
  "base_face": "oval face, fair skin, soft shading",
  "left_eye": "large green eye, thick lashes",
  "right_eye": "large green eye, thick lashes",
  "hair_back": "long silver hair, behind shoulders",
  "hair_front": "silver bangs, wispy, covering forehead partially",
  "mouth": "small pink lips, neutral expression",
  "outfit": "red hoodie, drawstrings, slightly oversized",
  "accessories": ["fox ears, silver fur, inner pink"]
}
```

### Step 2: Template-Guided Image Generation

Pre-built silhouette masks define the shape and position of each layer type (face, eyes, hair, mouth, body). The image generation API fills each mask region according to its layer prompt, producing transparent PNGs with proper overlap zones.

Template masks guarantee that every generated character is structurally compatible with the pre-built rig.

### Step 3: Auto-Rig via Template

Generated textures are assembled into a texture atlas and swapped onto a pre-built .moc3 rig template. The rig already contains deformation meshes and Live2D parameter mappings, so no manual rigging is needed.

## Face Tracking

MediaPipe provides facial landmarks which are mapped to Live2D parameters:

| MediaPipe Output       | Live2D Parameter             |
|------------------------|------------------------------|
| Head X/Y/Z rotation    | ParamAngleX / Y / Z          |
| Eye openness (L/R)     | ParamEyeLOpen / ParamEyeROpen|
| Mouth open ratio       | ParamMouthOpenY              |
| Eyebrow height (L/R)   | ParamBrowLY / ParamBrowRY    |
| Iris position          | ParamEyeBallX / ParamEyeBallY|

Parameters are broadcast over WebSocket at ~30fps to the frontend renderer.

## Project Structure

```
prompttuber/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Main UI (prompt input + canvas + webcam toggle)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── Live2DCanvas.tsx      # pixi-live2d-display wrapper
│   │   ├── PromptInput.tsx       # Text input for character description
│   │   └── WebcamToggle.tsx      # Start/stop tracking
│   ├── lib/
│   │   └── websocket.ts          # WS client for tracking params
│   ├── public/
│   │   └── models/               # Template .moc3 rigs and default textures
│   └── package.json
├── backend/
│   ├── main.py                   # FastAPI app entry point
│   ├── generation/
│   │   ├── decompose.py          # Claude API: prompt → layer manifest
│   │   ├── generate_layers.py    # fal.ai API: manifest → per-layer PNGs
│   │   ├── templates/            # Silhouette masks for each layer type
│   │   └── atlas.py              # Assembles layers into texture atlas
│   ├── tracking/
│   │   ├── face_tracker.py       # MediaPipe webcam processing
│   │   └── param_mapper.py       # Landmarks → Live2D parameter values
│   ├── ws/
│   │   └── server.py             # WebSocket broadcast logic
│   └── requirements.txt
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Webcam
- API keys: Gemini (decompose), fal.ai (layer images)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
export ANTHROPIC_API_KEY=your_key_here
export FAL_KEY=your_key_here

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## Team Split

**Person A: Generation Pipeline (Backend + AI)**
- Claude API integration for prompt decomposition
- fal.ai API integration for layer generation
- Template mask system design
- Texture atlas assembly
- `/generate` API endpoint

**Person B: Frontend + Tracking**
- Next.js UI (prompt input, canvas, webcam controls)
- pixi-live2d-display integration and model loading
- MediaPipe tracking service
- WebSocket client/server for parameter streaming
- Template .moc3 rig sourcing/setup

**Integration point:** Person A produces a texture atlas (set of PNGs). Person B's renderer loads that atlas onto the template rig. Define the atlas format and file naming convention early.

## Future Enhancements (Post-MVP)

- Live editing: re-prompt to modify individual layers without regenerating the full character
- Style presets: anime, chibi, realistic, pixel art
- Expression presets: smile, wink, surprised (beyond tracking)
- Export: download the generated model for use in VTube Studio or OBS
- Multi-pose support: half-body, full-body, bust-only templates
- Voice integration: lip sync from microphone audio
