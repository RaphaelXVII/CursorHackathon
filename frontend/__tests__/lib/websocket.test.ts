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
