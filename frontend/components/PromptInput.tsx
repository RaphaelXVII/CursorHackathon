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
