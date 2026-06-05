'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
export default function Live2DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appRef       = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef     = useRef<any>(null)
  // Ref keeps latest params available to the ticker without re-registering it
  const paramsRef    = useRef<Record<string, number>>({})

  const modelUrl = useStore((s) => s.modelUrl)
  const params   = useStore((s) => s.params)

  useEffect(() => { paramsRef.current = params }, [params])

  // Init Pixi once on mount
  useEffect(() => {
    if (!containerRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any
    let cancelled = false

    async function init() {
      const PIXI           = await import('pixi.js')
      if (cancelled) return
      const { Live2DModel } = await import('pixi-live2d-display')
      if (cancelled) return

      // Required once so Live2D motion updates run each tick
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Live2DModel.registerTicker(PIXI.Ticker as any)

      app = new PIXI.Application({
        resizeTo: containerRef.current!,
        backgroundAlpha: 0,
        antialias: true,
      })
      if (cancelled) { app.destroy(true); return }
      containerRef.current!.appendChild(app.view as HTMLCanvasElement)
      appRef.current = app

      app.ticker.add(() => {
        const model = modelRef.current
        if (!model) return
        Object.entries(paramsRef.current).forEach(([id, value]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(model.internalModel.coreModel as any).setParameterValueById(id, value)
        })
      })
    }

    init()

    return () => {
      cancelled = true
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
