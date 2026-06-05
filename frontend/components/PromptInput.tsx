'use client'
import { useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import WebcamToggle from './WebcamToggle'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react'

const STEPS = [
  { key: 'decomposing',       label: 'Decomposing prompt with Claude', icon: '1' },
  { key: 'generating_layers', label: 'Generating character layers',    icon: '2' },
  { key: 'assembling',        label: 'Assembling Live2D model',        icon: '3' },
] as const

const STEP_DURATIONS_MS = [3_000, 20_000, 5_000]
const ACTIVE_STATUSES = new Set(['decomposing', 'generating_layers', 'assembling'])

export default function PromptInput() {
  const [prompt, setPrompt] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const status       = useStore((s) => s.status)
  const errorMessage = useStore((s) => s.errorMessage)
  const setStatus    = useStore((s) => s.setStatus)
  const setModelUrl  = useStore((s) => s.setModelUrl)
  const setError     = useStore((s) => s.setError)
  const reset        = useStore((s) => s.reset)

  const isGenerating     = ACTIVE_STATUSES.has(status)
  const isDone           = status === 'done'
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
    <Card className="flex flex-col h-full rounded-none border-0 border-r border-[#b066ff]/25 bg-[#1a1028]/80">
      <CardHeader className="pb-4 border-b border-[#b066ff]/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#b066ff] shadow-[0_0_8px_#b066ff]" />
          <span className="text-[#b066ff] text-xs font-semibold tracking-widest uppercase">PromptTuber</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-4">Generate a Live2D VTuber from a text prompt</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-5 justify-center flex-1 overflow-y-auto py-6 px-5">
        {/* Prompt input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="prompt" className="text-white/70 text-sm font-medium">Character prompt</Label>
          <Textarea
            id="prompt"
            className="h-32 resize-none bg-white/[0.06] border-[#b066ff]/20 placeholder:text-white/25 focus-visible:ring-[#b066ff]/40 focus-visible:border-[#b066ff]/40 text-sm leading-relaxed"
            placeholder="anime girl with silver hair, fox ears, red hoodie, cheerful expression, detailed eyes..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <p className="text-[11px] text-white/30">Be specific — style, colors, features, expression.</p>
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full h-10 bg-gradient-to-r from-[#b066ff] to-[#6699ff] hover:shadow-[0_0_20px_rgba(176,102,255,0.4)] transition-all duration-300 border-0 font-medium"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate avatar
            </>
          )}
        </Button>

        {/* Pipeline steps — always visible */}
        <div className="flex flex-col gap-1 mt-1">
          <span className="text-[10px] text-white/30 font-medium tracking-wider uppercase mb-2">Pipeline</span>
          {STEPS.map((step, i) => {
            const isDoneStep = isDone || (isGenerating && i < currentStepIndex)
            const isActive   = isGenerating && i === currentStepIndex
            const isPending  = !isDoneStep && !isActive

            return (
              <div key={step.key} className="relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className={`absolute left-[13px] top-[28px] w-[2px] h-[12px] transition-colors duration-500 ${
                    isDoneStep ? 'bg-green-500/40' : isActive ? 'bg-[#b066ff]/30' : 'bg-white/[0.06]'
                  }`} />
                )}
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${
                    isActive  ? 'bg-[#b066ff]/[0.08] border border-[#b066ff]/30'
                    : isDoneStep ? 'bg-green-500/[0.05] border border-green-500/20'
                    : 'bg-transparent border border-transparent'
                  }`}
                >
                  {/* Step indicator */}
                  <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold transition-all duration-500 ${
                    isActive  ? 'bg-[#b066ff]/20 text-[#b066ff] border border-[#b066ff]/40 shadow-[0_0_10px_rgba(176,102,255,0.3)]'
                    : isDoneStep ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : 'bg-white/[0.04] text-white/20 border border-white/[0.08]'
                  }`}>
                    {isDoneStep ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      step.icon
                    )}
                  </div>

                  {/* Step text */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className={`text-xs transition-colors duration-300 ${
                      isActive  ? 'text-white font-medium'
                      : isDoneStep ? 'text-green-400/80'
                      : 'text-white/25'
                    }`}>
                      {step.label}
                    </span>
                    {isActive && (
                      <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#b066ff] to-[#6699ff] animate-[shimmer_2s_ease-in-out_infinite] w-2/3" />
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  {isActive && (
                    <span className="text-[10px] text-[#b066ff] font-medium">Running</span>
                  )}
                  {isDoneStep && isPending === false && i < currentStepIndex && (
                    <span className="text-[10px] text-green-400/60">Done</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Success state */}
        {isDone && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-500/[0.08] border border-green-500/25">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400 font-medium">Avatar generated successfully</span>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && errorMessage && (
          <Alert variant="destructive" className="border-red-500/30 bg-red-500/[0.08]">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400 text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="border-t border-[#b066ff]/20 py-4 px-5">
        <WebcamToggle />
      </CardFooter>
    </Card>
  )
}
