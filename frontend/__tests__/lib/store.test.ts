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
