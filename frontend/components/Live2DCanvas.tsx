'use client'
import { useEffect, useRef } from 'react'
import { useStore } from '@/lib/store'
export default function Live2DCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appRef       = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef     = useRef<any>(null)
  const paramsRef    = useRef<Record<string, number>>({})

  const modelUrl = useStore((s) => s.modelUrl)
  const params   = useStore((s) => s.params)

  useEffect(() => { paramsRef.current = params }, [params])

  useEffect(() => {
    if (!containerRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any
    let cancelled = false

    async function init() {
      const PIXI = await import('pixi.js')
      if (cancelled) return
      await import('pixi-live2d-display/cubism4')
      if (cancelled) return

      const container = containerRef.current!
      const { width, height } = container.getBoundingClientRect()

      const opts = {
        width: width || 800,
        height: height || 600,
        backgroundAlpha: 0,
        antialias: true,
      }

      try {
        app = new PIXI.Application(opts)
      } catch {
        app = new PIXI.Application({ ...opts, forceCanvas: true })
      }
      if (cancelled) { app.destroy(true); return }
      container.appendChild(app.view as HTMLCanvasElement)
      appRef.current = app

      const resizeObserver = new ResizeObserver(() => {
        if (!app) return
        const { width: w, height: h } = container.getBoundingClientRect()
        app.renderer.resize(w, h)
      })
      resizeObserver.observe(container)

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
      app?.destroy(true, { children: true })
      appRef.current  = null
      modelRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!appRef.current || !modelUrl) return
    const app = appRef.current

    async function loadModel() {
      const { Live2DModel } = await import('pixi-live2d-display/cubism4')

      if (modelRef.current) {
        app.stage.removeChild(modelRef.current)
        modelRef.current.destroy()
        modelRef.current = null
      }

      const model = await Live2DModel.from(modelUrl!, { ticker: app.ticker })
      const { width, height } = app.screen
      model.x = width / 2
      model.y = height / 2
      model.anchor.set(0.5, 0.5)
      const scaleX = width / model.internalModel.originalWidth
      const scaleY = height / model.internalModel.originalHeight
      model.scale.set(Math.min(scaleX, scaleY) * 0.8)
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
