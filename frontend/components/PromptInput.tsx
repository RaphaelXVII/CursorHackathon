'use client'
import { useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import WebcamToggle from './WebcamToggle'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AlertCircle } from 'lucide-react'

const STEPS = [
  { key: 'decomposing',       label: 'Decomposing prompt with Claude' },
  { key: 'generating_layers', label: 'Generating character layers' },
  { key: 'assembling',        label: 'Assembling Live2D model' },
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
    <Card className="flex flex-col h-full rounded-none border-0 border-r border-[#b066ff]/15 bg-[#b066ff]/[0.04]">
      <CardHeader className="pb-4 border-b border-[#b066ff]/12">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#b066ff] shadow-[0_0_8px_#b066ff]" />
          <span className="text-[#b066ff] text-xs font-semibold tracking-widest uppercase">PromptTuber</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-4">Generate a Live2D VTuber from a text prompt</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1 overflow-y-auto py-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="prompt" className="text-white/60">Character prompt</Label>
          <Textarea
            id="prompt"
            className="h-28 resize-none bg-white/[0.03] border-[#b066ff]/25 placeholder:text-white/20 focus-visible:ring-[#b066ff]/50 focus-visible:border-[#b066ff]/50"
            placeholder="anime girl with silver hair, fox ears, red hoodie…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <p className="text-[11px] text-muted-foreground">Be specific — style, colors, features.</p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full bg-gradient-to-r from-[#b066ff] to-[#6699ff] hover:shadow-[0_0_16px_rgba(176,102,255,0.5)] transition-shadow border-0"
        >
          {isGenerating ? 'Generating…' : 'Generate avatar'}
        </Button>

        {isGenerating && (
          <>
            <Separator className="bg-white/[0.06]" />
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground font-medium tracking-wider uppercase">Progress</span>
              {STEPS.map((step, i) => {
                const isDone   = i < currentStepIndex
                const isActive = i === currentStepIndex
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs transition-all duration-300 ${
                      isActive ? 'border-[#b066ff]/50 bg-[#b066ff]/10 text-white'
                      : isDone  ? 'border-green-500/30 bg-green-500/5 text-green-400'
                      : 'border-white/5 bg-white/[0.02] text-white/25'
                    }`}
                  >
                    <span className={`w-2 h-2 flex-shrink-0 rounded-full ${
                      isActive ? 'bg-[#b066ff] shadow-[0_0_6px_#b066ff] animate-pulse'
                      : isDone  ? 'bg-green-400'
                      : 'bg-white/10'
                    }`} />
                    <span className="flex-1">{step.label}</span>
                    {isActive && (
                      <Badge variant="secondary" className="bg-[#b066ff]/20 text-[#b066ff] border-0 text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {status === 'error' && errorMessage && (
          <Alert variant="destructive" className="border-red-500/30 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400 text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="border-t border-[#b066ff]/12 py-4">
        <WebcamToggle />
      </CardFooter>
    </Card>
  )
}
