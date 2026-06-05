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
