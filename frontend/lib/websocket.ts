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
          this._open()
        }, this.backoff)
        this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }
}

export const trackingSocket = new TrackingSocket()
