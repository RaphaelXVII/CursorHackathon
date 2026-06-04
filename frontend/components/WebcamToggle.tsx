'use client'
import { trackingSocket } from '@/lib/websocket'
import { useStore } from '@/lib/store'

export default function WebcamToggle() {
  const isActive = useStore((s) => s.isActive)
  const isConnected = useStore((s) => s.isConnected)

  const handleToggle = () => {
    if (isActive) {
      trackingSocket.disconnect()
    } else {
      trackingSocket.connect()
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
        border transition-all duration-200 w-full justify-center
        ${isActive
          ? 'border-[#b066ff] bg-[#b066ff]/10 text-[#b066ff]'
          : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40 hover:text-white/80'
        }
      `}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isConnected
            ? 'bg-green-400 shadow-[0_0_6px_#4ade80] animate-pulse'
            : isActive
            ? 'bg-yellow-400 animate-pulse'
            : 'bg-white/20'
        }`}
      />
      {isActive ? (isConnected ? 'Tracking On' : 'Reconnecting…') : 'Enable Tracking'}
    </button>
  )
}
