# PromptTuber Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PromptTuber frontend — a Next.js 16.2.7 app where users generate a Live2D VTuber avatar from a text prompt and optionally enable real-time face tracking.

**Architecture:** Next.js 16.2.7 App Router with Zustand for state, Tailwind CSS for styling, and pixi-live2d-display for rendering the Live2D model in the browser. A WebSocket singleton streams face-tracking parameters from the backend at ~30fps and applies them to the live model each tick.

**Tech Stack:** Next.js 16.2.7, TypeScript, Zustand, Tailwind CSS, pixi.js v7, pixi-live2d-display, Jest

---

## File Map

| File | Responsibility |
|---|---|
| `frontend/app/layout.tsx` | Root layout: dark theme, Inter font, Live2D Cubism Core script |
| `frontend/app/page.tsx` | Two-column layout shell (controls left, canvas right) |
| `frontend/app/globals.css` | CSS custom properties for brand colors |
| `frontend/lib/store.ts` | Zustand store: generation + tracking state slices |
| `frontend/lib/websocket.ts` | Singleton WS client with exponential backoff reconnect |
| `frontend/components/PromptInput.tsx` | Textarea, Generate button, step progress, error state |
| `frontend/components/WebcamToggle.tsx` | Enable/disable tracking button + connection status dot |
| `frontend/components/Live2DCanvas.tsx` | pixi-live2d-display wrapper, no SSR |
| `frontend/__tests__/lib/store.test.ts` | Unit tests for Zustand store actions |
| `frontend/__tests__/lib/websocket.test.ts` | Unit tests for WS connect/disconnect/reconnect logic |

---

### Task 1: Scaffold project + install dependencies

**Files:**
- Create: `frontend/` (via create-next-app)
- Create: `frontend/jest.config.js`

- [ ] **Step 1: Scaffold Next.js app**

Run from the repo root:
```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --eslint \
  --yes
```

Expected: `frontend/` created with `app/`, `public/`, `package.json`, `tsconfig.json`.

- [ ] **Step 2: Install runtime dependencies**

```bash
cd frontend
npm install zustand pixi.js@^7 pixi-live2d-display
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install --save-dev jest jest-environment-jsdom @types/jest
```

- [ ] **Step 4: Create jest.config.js**

Create `frontend/jest.config.js`:
```js
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
})
```

- [ ] **Step 5: Add test script to package.json**

In `frontend/package.json`, add to `"scripts"`:
```json
"test": "jest --passWithNoTests"
```

- [ ] **Step 6: Place Live2D Cubism Core (manual)**

Download the Live2D Cubism SDK for Web from https://www.live2d.com/en/sdk/download/web/
Extract and copy `Core/live2dcubismcore.min.js` to `frontend/public/live2dcubismcore.min.js`.

This requires accepting the Live2D license — cannot be automated.

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:3000` loads with no console errors.

- [ ] **Step 8: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: scaffold Next.js 16 frontend with deps and jest config"
```

---

### Task 2: Global styles + layout.tsx

**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Set up globals.css**

Replace `frontend/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0d0d1a;
  --purple: #b066ff;
  --blue: #6699ff;
}

html, body {
  height: 100%;
  overflow: hidden;
  background-color: var(--bg);
  color: white;
}
```

- [ ] **Step 2: Implement layout.tsx**

Replace `frontend/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PromptTuber',
  description: 'Generate a Live2D VTuber avatar from a text prompt',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script src="/live2dcubismcore.min.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify dark background**

```bash
npm run dev
```

Open `http://localhost:3000`. Background must be `#0d0d1a` (dark navy, near-black).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/globals.css frontend/app/layout.tsx
git commit -m "feat: dark VTuber theme globals and root layout"
```

---

### Task 3: page.tsx — two-column layout shell

**Files:**
- Modify: `frontend/app/page.tsx`
- Create: `frontend/components/PromptInput.tsx` (placeholder)
- Create: `frontend/components/Live2DCanvas.tsx` (placeholder)

- [ ] **Step 1: Create placeholder PromptInput**

Create `frontend/components/PromptInput.tsx`:
```tsx
'use client'
export default function PromptInput() {
  return <div className="p-4 text-white/30 text-sm">PromptInput placeholder</div>
}
```

- [ ] **Step 2: Create placeholder Live2DCanvas**

Create `frontend/components/Live2DCanvas.tsx`:
```tsx
'use client'
export default function Live2DCanvas() {
  return (
    <div className="w-full h-full flex items-center justify-center text-white/20 text-sm">
      Canvas placeholder
    </div>
  )
}
```

- [ ] **Step 3: Implement page.tsx**

Replace `frontend/app/page.tsx`:
```tsx
import dynamic from 'next/dynamic'
import PromptInput from '@/components/PromptInput'

const Live2DCanvas = dynamic(
  () => import('@/components/Live2DCanvas'),
  { ssr: false, loading: () => <div className="flex-1 bg-[#0d0d1a]" /> }
)

export default function Page() {
  return (
    <main className="flex h-screen">
      <aside className="w-80 flex-shrink-0 border-r border-[#b066ff]/20 flex flex-col">
        <PromptInput />
      </aside>
      <section className="flex-1 relative">
        <Live2DCanvas />
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Verify two-column layout**

```bash
npm run dev
```

Open `http://localhost:3000`. Should see a narrow dark left panel with a purple border on the right edge, and a wider right area.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/page.tsx frontend/components/PromptInput.tsx frontend/components/Live2DCanvas.tsx
git commit -m "feat: two-column layout shell with placeholder components"
```

---

### Task 4: Zustand store (TDD)

**Files:**
- Create: `frontend/lib/store.ts`
- Create: `frontend/__tests__/lib/store.test.ts`

- [ ] **Step 1: Create test directory**

```bash
mkdir -p frontend/__tests__/lib
```

- [ ] **Step 2: Write failing tests**

Create `frontend/__tests__/lib/store.test.ts`:
```ts
import { useStore } from '@/lib/store'

const initialState = {
  status: 'idle' as const,
  modelUrl: null,
  errorMessage: null,
  isActive: false,
  isConnected: false,
  params: {} as Record<string, number>,
}

beforeEach(() => {
  useStore.setState(initialState)
})

describe('generation slice', () => {
  test('setStatus updates status', () => {
    useStore.getState().setStatus('decomposing')
    expect(useStore.getState().status).toBe('decomposing')
  })

  test('setModelUrl sets url and transitions to done', () => {
    useStore.getState().setModelUrl('http://localhost:8000/models/char.moc3')
    expect(useStore.getState().modelUrl).toBe('http://localhost:8000/models/char.moc3')
    expect(useStore.getState().status).toBe('done')
  })

  test('setError sets status to error with message', () => {
    useStore.getState().setError('backend offline')
    expect(useStore.getState().status).toBe('error')
    expect(useStore.getState().errorMessage).toBe('backend offline')
  })

  test('reset returns generation to idle', () => {
    useStore.getState().setModelUrl('http://localhost:8000/models/char.moc3')
    useStore.getState().reset()
    expect(useStore.getState().status).toBe('idle')
    expect(useStore.getState().modelUrl).toBeNull()
    expect(useStore.getState().errorMessage).toBeNull()
  })
})

describe('tracking slice', () => {
  test('setActive updates isActive', () => {
    useStore.getState().setActive(true)
    expect(useStore.getState().isActive).toBe(true)
  })

  test('setConnected updates isConnected', () => {
    useStore.getState().setConnected(true)
    expect(useStore.getState().isConnected).toBe(true)
  })

  test('setParams replaces params map', () => {
    useStore.getState().setParams({ ParamAngleX: 15, ParamEyeLOpen: 0.8 })
    expect(useStore.getState().params.ParamAngleX).toBe(15)
    expect(useStore.getState().params.ParamEyeLOpen).toBe(0.8)
  })
})
```

- [ ] **Step 3: Run tests — expect failure**

```bash
cd frontend && npm test -- __tests__/lib/store.test.ts
```

Expected: `Cannot find module '@/lib/store'`

- [ ] **Step 4: Implement store**

Create `frontend/lib/store.ts`:
```ts
import { create } from 'zustand'

export type GenerationStatus =
  | 'idle'
  | 'decomposing'
  | 'generating_layers'
  | 'assembling'
  | 'done'
  | 'error'

interface State {
  status: GenerationStatus
  modelUrl: string | null
  errorMessage: string | null
  setStatus: (status: GenerationStatus) => void
  setModelUrl: (url: string) => void
  setError: (message: string) => void
  reset: () => void

  isActive: boolean
  isConnected: boolean
  params: Record<string, number>
  setActive: (active: boolean) => void
  setConnected: (connected: boolean) => void
  setParams: (params: Record<string, number>) => void
}

export const useStore = create<State>((set) => ({
  status: 'idle',
  modelUrl: null,
  errorMessage: null,
  setStatus: (status) => set({ status }),
  setModelUrl: (url) => set({ modelUrl: url, status: 'done' }),
  setError: (message) => set({ status: 'error', errorMessage: message }),
  reset: () => set({ status: 'idle', modelUrl: null, errorMessage: null }),

  isActive: false,
  isConnected: false,
  params: {},
  setActive: (isActive) => set({ isActive }),
  setConnected: (isConnected) => set({ isConnected }),
  setParams: (params) => set({ params }),
}))
```

- [ ] **Step 5: Run tests — expect all pass**

```bash
npm test -- __tests__/lib/store.test.ts
```

Expected:
```
PASS __tests__/lib/store.test.ts
  generation slice
    ✓ setStatus updates status
    ✓ setModelUrl sets url and transitions to done
    ✓ setError sets status to error with message
    ✓ reset returns generation to idle
  tracking slice
    ✓ setActive updates isActive
    ✓ setConnected updates isConnected
    ✓ setParams replaces params map

Tests: 7 passed
```

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/store.ts frontend/__tests__/lib/store.test.ts
git commit -m "feat: Zustand store with generation and tracking slices"
```

---

### Task 5: WebSocket client (TDD)

**Files:**
- Create: `frontend/lib/websocket.ts`
- Create: `frontend/__tests__/lib/websocket.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/__tests__/lib/websocket.test.ts`:
```ts
import { useStore } from '@/lib/store'
import { trackingSocket } from '@/lib/websocket'

// Mocks WebSocket before any test runs.
// trackingSocket only calls `new WebSocket(...)` inside connect(), not at import time,
// so setting the global here (before test execution) is sufficient.
class MockWebSocket {
  url: string
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  close = jest.fn(() => { this.onclose?.() })
  constructor(url: string) {
    this.url = url
    latestMock = this
  }
}

let latestMock: MockWebSocket | null = null
;(globalThis as any).WebSocket = MockWebSocket

beforeEach(() => {
  jest.useFakeTimers()
  latestMock = null
  useStore.setState({
    status: 'idle', modelUrl: null, errorMessage: null,
    isActive: false, isConnected: false, params: {},
  })
})

afterEach(() => {
  trackingSocket.disconnect()
  jest.useRealTimers()
})

test('connect opens WebSocket to correct URL', () => {
  trackingSocket.connect()
  expect(useStore.getState().isActive).toBe(true)
  expect(latestMock?.url).toBe('ws://localhost:8000/ws/tracking')
})

test('onopen sets isConnected true', () => {
  trackingSocket.connect()
  latestMock!.onopen?.()
  expect(useStore.getState().isConnected).toBe(true)
})

test('onmessage writes params to store', () => {
  trackingSocket.connect()
  latestMock!.onopen?.()
  latestMock!.onmessage?.({ data: JSON.stringify({ ParamAngleX: 10, ParamEyeLOpen: 0.9 }) })
  expect(useStore.getState().params.ParamAngleX).toBe(10)
  expect(useStore.getState().params.ParamEyeLOpen).toBe(0.9)
})

test('disconnect sets isActive and isConnected to false', () => {
  trackingSocket.connect()
  latestMock!.onopen?.()
  trackingSocket.disconnect()
  expect(useStore.getState().isActive).toBe(false)
  expect(useStore.getState().isConnected).toBe(false)
})

test('reconnects after onclose when shouldConnect is true', () => {
  trackingSocket.connect()
  latestMock!.onopen?.()
  const first = latestMock
  first!.onclose?.()                          // manually trigger unexpected close
  expect(useStore.getState().isConnected).toBe(false)
  jest.advanceTimersByTime(1100)              // initial backoff = 1000ms
  expect(latestMock).not.toBe(first)          // a new WebSocket was opened
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- __tests__/lib/websocket.test.ts
```

Expected: `Cannot find module '@/lib/websocket'`

- [ ] **Step 3: Implement websocket.ts**

Create `frontend/lib/websocket.ts`:
```ts
import { useStore } from './store'

const WS_URL = 'ws://localhost:8000/ws/tracking'
const MAX_BACKOFF_MS = 10_000

class TrackingSocket {
  private ws: WebSocket | null = null
  private backoff = 1_000
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private shouldConnect = false

  connect() {
    this.shouldConnect = true
    useStore.getState().setActive(true)
    this._open()
  }

  disconnect() {
    this.shouldConnect = false
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    useStore.getState().setActive(false)
    useStore.getState().setConnected(false)
    this.backoff = 1_000
  }

  private _open() {
    if (!this.shouldConnect) return
    const ws = new WebSocket(WS_URL)
    this.ws = ws

    ws.onopen = () => {
      this.backoff = 1_000
      useStore.getState().setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const params = JSON.parse(event.data) as Record<string, number>
        useStore.getState().setParams(params)
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      useStore.getState().setConnected(false)
      if (this.shouldConnect) {
        this.retryTimer = setTimeout(() => {
          this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS)
          this._open()
        }, this.backoff)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }
}

export const trackingSocket = new TrackingSocket()
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test -- __tests__/lib/websocket.test.ts
```

Expected:
```
PASS __tests__/lib/websocket.test.ts
  ✓ connect opens WebSocket to correct URL
  ✓ onopen sets isConnected true
  ✓ onmessage writes params to store
  ✓ disconnect sets isActive and isConnected to false
  ✓ reconnects after onclose when shouldConnect is true

Tests: 5 passed
```

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/websocket.ts frontend/__tests__/lib/websocket.test.ts
git commit -m "feat: WebSocket singleton with exponential backoff reconnect"
```

---

### Task 6: WebcamToggle.tsx

**Files:**
- Modify: `frontend/components/WebcamToggle.tsx` (new file, not placeholder — it wasn't created yet)

- [ ] **Step 1: Implement WebcamToggle**

Create `frontend/components/WebcamToggle.tsx`:
```tsx
'use client'
import { trackingSocket } from '@/lib/websocket'
import { useStore } from '@/lib/store'

export default function WebcamToggle() {
  const isActive = useStore((s) => s.isActive)
  const isConnected = useStore((s) => s.isConnected)

  const handleToggle = () => {
    if (isActive) {
      trackingSocket.disconnect()
    } else {
      trackingSocket.connect()
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
        border transition-all duration-200 w-full justify-center
        ${isActive
          ? 'border-[#b066ff] bg-[#b066ff]/10 text-[#b066ff]'
          : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40 hover:text-white/80'
        }
      `}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isConnected
            ? 'bg-green-400 shadow-[0_0_6px_#4ade80] animate-pulse'
            : isActive
            ? 'bg-yellow-400 animate-pulse'
            : 'bg-white/20'
        }`}
      />
      {isActive ? (isConnected ? 'Tracking On' : 'Reconnecting…') : 'Enable Tracking'}
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/WebcamToggle.tsx
git commit -m "feat: WebcamToggle with connect/disconnect and status indicator"
```

---

### Task 7: PromptInput.tsx

**Files:**
- Modify: `frontend/components/PromptInput.tsx` (replace placeholder)

- [ ] **Step 1: Implement PromptInput**

Replace `frontend/components/PromptInput.tsx`:
```tsx
'use client'
import { useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import WebcamToggle from './WebcamToggle'

const STEPS = [
  { key: 'decomposing',        label: 'Decomposing prompt with Claude' },
  { key: 'generating_layers',  label: 'Generating character layers' },
  { key: 'assembling',         label: 'Assembling Live2D model' },
] as const

// Time-based step simulation — POST /generate is a single blocking call with no streaming.
// Steps advance on timers; on response the status jumps directly to done/error.
const STEP_DURATIONS_MS = [3_000, 20_000, 5_000]

const ACTIVE_STATUSES = new Set(['decomposing', 'generating_layers', 'assembling'])

export default function PromptInput() {
  const [prompt, setPrompt] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const status      = useStore((s) => s.status)
  const errorMessage = useStore((s) => s.errorMessage)
  const setStatus   = useStore((s) => s.setStatus)
  const setModelUrl = useStore((s) => s.setModelUrl)
  const setError    = useStore((s) => s.setError)
  const reset       = useStore((s) => s.reset)

  const isGenerating     = ACTIVE_STATUSES.has(status)
  const currentStepIndex = STEPS.findIndex((s) => s.key === status)

  async function handleGenerate() {
    if (!prompt.trim() || isGenerating) return

    reset()
    setStatus('decomposing')

    let stepIdx = 0
    const advance = () => {
      stepIdx++
      if (stepIdx < STEPS.length) {
        setStatus(STEPS[stepIdx].key)
        timerRef.current = setTimeout(advance, STEP_DURATIONS_MS[stepIdx])
      }
    }
    timerRef.current = setTimeout(advance, STEP_DURATIONS_MS[0])

    try {
      const res = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (timerRef.current) clearTimeout(timerRef.current)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setError(text || `Server error ${res.status}`)
        return
      }

      const data = (await res.json()) as { model_url: string }
      setModelUrl(data.model_url)
    } catch {
      if (timerRef.current) clearTimeout(timerRef.current)
      setError('Could not reach backend — is it running on port 8000?')
    }
  }

  return (
    <div className="flex flex-col h-full p-5 gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#b066ff] shadow-[0_0_8px_#b066ff]" />
        <span className="text-[#b066ff] text-xs font-semibold tracking-widest uppercase">
          PromptTuber
        </span>
      </div>

      {/* Prompt input */}
      <div className="flex flex-col gap-2">
        <label className="text-white/50 text-xs uppercase tracking-wider">
          Describe your character
        </label>
        <textarea
          className="
            w-full h-32 p-3 rounded-lg text-sm text-white resize-none
            bg-white/5 border border-[#b066ff]/20
            placeholder-white/20 focus:outline-none focus:border-[#b066ff]/60
            transition-colors disabled:opacity-40
          "
          placeholder="anime girl with silver hair, fox ears, red hoodie…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="
          w-full py-2.5 rounded-lg text-sm font-bold tracking-widest uppercase
          transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
          bg-gradient-to-r from-[#b066ff] to-[#6699ff] text-white
          hover:shadow-[0_0_16px_rgba(176,102,255,0.5)]
          disabled:hover:shadow-none
        "
      >
        {isGenerating ? 'Generating…' : 'Generate'}
      </button>

      {/* Step progress */}
      {isGenerating && (
        <div className="flex flex-col gap-2">
          {STEPS.map((step, i) => {
            const isDone   = i < currentStepIndex
            const isActive = i === currentStepIndex
            return (
              <div
                key={step.key}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg border text-xs
                  transition-all duration-300
                  ${isActive
                    ? 'border-[#b066ff]/50 bg-[#b066ff]/10 text-white'
                    : isDone
                    ? 'border-green-500/30 bg-green-500/5 text-green-400'
                    : 'border-white/5 bg-white/[0.02] text-white/25'
                  }
                `}
              >
                <span
                  className={`w-2 h-2 flex-shrink-0 rounded-full ${
                    isActive ? 'bg-[#b066ff] shadow-[0_0_6px_#b066ff] animate-pulse'
                    : isDone  ? 'bg-green-400'
                    : 'bg-white/10'
                  }`}
                />
                {step.label}
              </div>
            )
          })}
        </div>
      )}

      {/* Error */}
      {status === 'error' && errorMessage && (
        <div className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          {errorMessage}
        </div>
      )}

      <div className="flex-1" />

      <WebcamToggle />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- PromptTuber header with purple glow dot
- Dark textarea with placeholder text
- Generate button (disabled until text entered)
- Webcam toggle at the bottom

Type a prompt → button enables. Click Generate with backend down → error message appears after network timeout.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/PromptInput.tsx
git commit -m "feat: PromptInput with generate flow, step progress, and error handling"
```

---

### Task 8: Live2DCanvas.tsx

**Files:**
- Modify: `frontend/components/Live2DCanvas.tsx` (replace placeholder)

- [ ] **Step 1: Implement Live2DCanvas**

Replace `frontend/components/Live2DCanvas.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'

export default function Live2DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef       = useRef<import('pixi.js').Application | null>(null)
  const modelRef     = useRef<import('pixi-live2d-display').Live2DModel | null>(null)
  // Ref keeps latest params available to the ticker without re-registering it
  const paramsRef    = useRef<Record<string, number>>({})

  const modelUrl = useStore((s) => s.modelUrl)
  const params   = useStore((s) => s.params)

  useEffect(() => { paramsRef.current = params }, [params])

  // Init Pixi once on mount
  useEffect(() => {
    if (!containerRef.current) return
    let app: import('pixi.js').Application

    async function init() {
      const PIXI           = await import('pixi.js')
      const { Live2DModel } = await import('pixi-live2d-display')

      // Required once so Live2D motion updates run each tick
      Live2DModel.registerTicker(PIXI.Ticker)

      app = new PIXI.Application({
        resizeTo: containerRef.current!,
        backgroundAlpha: 0,
        antialias: true,
      })
      containerRef.current!.appendChild(app.view as HTMLCanvasElement)
      appRef.current = app

      app.ticker.add(() => {
        const model = modelRef.current
        if (!model) return
        Object.entries(paramsRef.current).forEach(([id, value]) => {
          model.internalModel.coreModel.setParameterValueById(id, value)
        })
      })
    }

    init()

    return () => {
      app?.destroy(true)
      appRef.current  = null
      modelRef.current = null
    }
  }, [])

  // Reload model when modelUrl changes
  useEffect(() => {
    if (!appRef.current || !modelUrl) return
    const app = appRef.current

    async function loadModel() {
      const { Live2DModel } = await import('pixi-live2d-display')

      if (modelRef.current) {
        app.stage.removeChild(modelRef.current)
        modelRef.current.destroy()
        modelRef.current = null
      }

      const model = await Live2DModel.from(modelUrl!)
      const { width, height } = app.screen
      model.x = width / 2
      model.y = height / 2
      model.anchor.set(0.5, 0.5)
      model.scale.set(
        (Math.min(width, height) / model.internalModel.originalWidth) * 0.8
      )
      app.stage.addChild(model)
      modelRef.current = model
    }

    loadModel()
  }, [modelUrl])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {!modelUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full border border-[#b066ff]/30 animate-pulse" />
          <div className="absolute w-32 h-32 rounded-full border border-[#b066ff]/20 animate-pulse [animation-delay:300ms]" />
          <div className="absolute w-16 h-16 rounded-full border border-[#b066ff]/10 animate-pulse [animation-delay:600ms]" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify placeholder renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Right column should show three concentric pulsing purple rings.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/Live2DCanvas.tsx
git commit -m "feat: Live2DCanvas with Pixi init, model loading, tracking params via ticker"
```

---

### Task 9: Full test suite + smoke test

**Files:** none

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npm test
```

Expected:
```
PASS __tests__/lib/store.test.ts (7 tests)
PASS __tests__/lib/websocket.test.ts (5 tests)

Test Suites: 2 passed, 2 total
Tests:       12 passed, 12 total
```

- [ ] **Step 2: Smoke test UI**

```bash
npm run dev
```

Verify these in the browser at `http://localhost:3000`:

1. Dark navy background, narrow left panel with purple border
2. PromptTuber header with glowing purple dot
3. Textarea + disabled Generate button
4. Type a prompt → Generate button enables (purple gradient)
5. Click Generate → step-progress rows appear, button shows "Generating…"
6. After network timeout (backend down) → red error box appears: "Could not reach backend — is it running on port 8000?"
7. "Enable Tracking" button at bottom; clicking shows "Reconnecting…" with yellow dot
8. Right panel: three concentric pulsing purple rings

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: PromptTuber frontend MVP complete"
```

---

## Integration Notes (for when backend is ready)

**`POST /generate` response:** must include `model_url` pointing to a `.moc3` file accessible from the browser. All textures referenced by the `.moc3` must also be served with CORS headers if cross-origin.

**`ws://localhost:8000/ws/tracking` messages:** each frame must be a JSON object with these keys:

```json
{
  "ParamAngleX": 0,
  "ParamAngleY": 0,
  "ParamAngleZ": 0,
  "ParamEyeLOpen": 1,
  "ParamEyeROpen": 1,
  "ParamMouthOpenY": 0,
  "ParamBrowLY": 0,
  "ParamBrowRY": 0,
  "ParamEyeBallX": 0,
  "ParamEyeBallY": 0
}
```

Angle params range from ~-30 to 30. Open/close params range from 0 to 1.
