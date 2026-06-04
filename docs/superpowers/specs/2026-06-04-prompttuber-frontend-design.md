# PromptTuber Frontend Design

**Date:** 2026-06-04  
**Scope:** Next.js frontend (Person B — Frontend + Tracking)

---

## Overview

A Next.js 14 (App Router) frontend for PromptTuber. Users type a character description, hit Generate, and watch their Live2D VTuber avatar come to life. Face tracking is enabled via a toggle that connects to a backend WebSocket stream.

**Visual style:** Dark VTuber aesthetic — deep purples, blues, neon accents.  
**Layout:** Two-column — controls/prompt on the left, avatar canvas on the right.  
**Generation UX:** Step-by-step progress display (Decomposing → Generating layers → Assembling).  
**State management:** Zustand.

---

## File Structure

```
frontend/
├── app/
│   ├── page.tsx              # Two-column layout shell
│   └── layout.tsx            # Dark VTuber theme, global CSS
├── components/
│   ├── Live2DCanvas.tsx      # pixi-live2d-display wrapper (dynamic import, no SSR)
│   ├── PromptInput.tsx       # Textarea + Generate button + step progress
│   └── WebcamToggle.tsx      # Enable/disable tracking button + WS status
├── lib/
│   ├── store.ts              # Zustand store (generation + tracking slices)
│   └── websocket.ts          # WS singleton client
└── public/
    └── models/               # Placeholder for .moc3 template rig
```

---

## Zustand Store

```ts
// generation slice
generation: {
  status: 'idle' | 'decomposing' | 'generating_layers' | 'assembling' | 'done' | 'error'
  modelUrl: string | null
  errorMessage: string | null
}

// tracking slice
tracking: {
  isActive: boolean
  isConnected: boolean
  params: Record<string, number>  // Live2D parameter map, updated ~30fps
}
```

---

## Components

### `app/page.tsx`
Layout shell only. Renders a two-column CSS grid: `<PromptInput>` on the left, `<Live2DCanvas>` on the right. Reads nothing from the store directly — all logic lives in child components.

### `components/PromptInput.tsx`
- Textarea for character description
- Generate button — calls `POST http://localhost:8000/generate` with `{ prompt }`, drives `generation.status` through the pipeline stages
- Step-progress UI shown while status is not `idle`/`done`:
  1. Decomposing prompt with Claude
  2. Generating character layers
  3. Assembling Live2D model
- Since `POST /generate` is a single blocking call (no streaming), step transitions are **time-based simulations** — each step advances on a timer (~3s, ~20s, ~5s) while the request is in-flight. On response, jump directly to `done`.
- `<WebcamToggle>` rendered at the bottom of this panel
- Error message shown inline below the Generate button on failure

### `components/Live2DCanvas.tsx`
- Loaded with `dynamic(..., { ssr: false })` — pixi-live2d-display requires `window`
- Mounts a PixiJS application and loads the Live2D `.moc3` model
- Watches `tracking.params` from the store and applies values to the model each frame
- Watches `generation.modelUrl` — reloads model when it changes
- Shows a pulsing purple placeholder ring while no model is loaded

### `components/WebcamToggle.tsx`
- Single button rendered inside `PromptInput`'s controls panel
- Calls `trackingSocket.connect()` / `.disconnect()` from `lib/websocket.ts`
- Shows a pulsing green dot when `tracking.isConnected`
- Shows "Reconnecting…" badge when `isActive` but not `isConnected`

### `lib/websocket.ts`
- Singleton WS class connecting to `ws://localhost:8000/ws/tracking`
- On message: parses JSON param object, writes to `tracking.params` in the Zustand store
- On disconnect: sets `isConnected: false`, retries with exponential backoff (1s → 2s → 4s, cap 10s)
- Exports: `trackingSocket.connect()`, `trackingSocket.disconnect()`

---

## Backend Contract

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/generate` | POST | `{ prompt: string }` | `{ model_url: string }` |
| `/ws/tracking` | WS | — | `{ ParamAngleX, ParamAngleY, ParamAngleZ, ParamEyeLOpen, ParamEyeROpen, ParamMouthOpenY, ParamBrowLY, ParamBrowRY, ParamEyeBallX, ParamEyeBallY }` at ~30fps |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| `POST /generate` fails | Set `status: 'error'`, show message inline, re-enable Generate button |
| Backend unreachable | Show "Could not reach backend — is it running on port 8000?" |
| WS disconnect | Set `isConnected: false`, show "Reconnecting…", auto-retry with backoff |
| No model loaded | Live2DCanvas shows placeholder; incoming tracking params are silently ignored |
| SSR / window access | `Live2DCanvas` always loaded with `dynamic(..., { ssr: false })` |

---

## Styling

- Framework: Tailwind CSS
- Color palette: `#0d0d1a` background, `#b066ff` primary purple, `#6699ff` accent blue, white text
- Neon glow effects via `box-shadow` on active elements
- Font: system sans-serif or Inter
