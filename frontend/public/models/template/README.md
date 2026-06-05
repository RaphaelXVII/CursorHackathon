# Live2D template rig

Drop your template Live2D model files here so `/generate` can swap in the generated atlas texture.

Required entry file:

```
model.model3.json
*.moc3
texture_00.png   (replaced automatically on each generation)
```

The backend also checks `frontend/public/models/template/` if this folder is empty.

Once added, `POST /generate` returns:

```json
{ "model_url": "http://localhost:8000/output/<run_id>/live2d/model.model3.json" }
```

Without a template, `model_url` falls back to the raw `atlas.png` (Live2D canvas will not load until a rig is added).
