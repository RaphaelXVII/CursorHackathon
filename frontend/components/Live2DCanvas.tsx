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

      // autoFocus would make the head follow the mouse, fighting webcam tracking
      const model = await Live2DModel.from(modelUrl!, {
        ticker: app.ticker,
        autoFocus: false,
        autoHitTest: false,
      })

      // Disable auto eye-blink: it overwrites ParamEyeLOpen/ROpen every frame
      model.internalModel.eyeBlink = undefined

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const coreModel = model.internalModel.coreModel as any

      // Arm tracking emits Haru-style values (ParamArmLA/RA, -10..10). Different
      // rigs name/segment their arms differently (e.g. Natori uses ParamArmAL01..),
      // so remap onto whichever of these params the model actually has, scaled to
      // each param's own range.
      // `invert` flips min/max for rigs whose arm params run opposite to Haru's.
      // Naming schemes: Haru/Hiyori (ParamArmLA), Natori (ParamArmAL01..),
      // Mao (ParamArmLA01..), Ren (ParamArmL01..)
      const ARM_CANDIDATES: Record<string, { id: string; invert?: boolean }[]> = {
        ParamArmLA: [
          { id: 'ParamArmLA' },
          { id: 'ParamArmAL01', invert: true },
          { id: 'ParamArmAL02', invert: true },
          { id: 'ParamArmLA01' },
          { id: 'ParamArmLA02' },
          { id: 'ParamArmL01' },
          { id: 'ParamArmL02' },
        ],
        ParamArmRA: [
          { id: 'ParamArmRA' },
          { id: 'ParamArmAR01', invert: true },
          { id: 'ParamArmAR02', invert: true },
          { id: 'ParamArmRA01' },
          { id: 'ParamArmRA02' },
          { id: 'ParamArmR01' },
          { id: 'ParamArmR02' },
        ],
      }
      const raw = coreModel._model
      const ids: string[] = Array.from(raw?.parameters?.ids ?? [])
      const mins: number[] = Array.from(raw?.parameters?.minimumValues ?? [])
      const maxs: number[] = Array.from(raw?.parameters?.maximumValues ?? [])
      const armTargets: Record<string, { id: string; min: number; max: number; invert: boolean }[]> = {}
      Object.entries(ARM_CANDIDATES).forEach(([source, candidates]) => {
        armTargets[source] = candidates.flatMap(({ id, invert }) => {
          const i = ids.indexOf(id)
          return i === -1 ? [] : [{ id, min: mins[i], max: maxs[i], invert: invert ?? false }]
        })
      })

      // Apply tracking params after the motion update but before physics,
      // so they aren't overwritten and physics (hair sway) reacts to them
      model.internalModel.on('afterMotionUpdate', () => {
        Object.entries(paramsRef.current).forEach(([id, value]) => {
          const targets = armTargets[id]
          if (targets && targets.length > 0) {
            const t = (value + 10) / 20
            targets.forEach(({ id: targetId, min, max, invert }) => {
              const tt = invert ? 1 - t : t
              coreModel.setParameterValueById(targetId, min + tt * (max - min))
            })
          } else {
            coreModel.setParameterValueById(id, value)
          }
        })
      })

      // Framing: zoom past "fit to screen" and shift the model's center down
      // so the view focuses on head and torso
      const SCALE_MULT = 1.7
      const Y_FACTOR = 0.85

      const { width, height } = app.screen
      model.x = width / 2
      model.y = height * Y_FACTOR
      model.anchor.set(0.5, 0.5)
      const scaleX = width / model.internalModel.originalWidth
      const scaleY = height / model.internalModel.originalHeight
      model.scale.set(Math.min(scaleX, scaleY) * SCALE_MULT)
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
