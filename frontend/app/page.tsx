'use client'

import dynamic from 'next/dynamic'
import PromptInput from '@/components/PromptInput'

const Live2DCanvas = dynamic(
  () => import('@/components/Live2DCanvas'),
  { ssr: false, loading: () => <div className="flex-1 bg-[#0d0d1a]" /> }
)

export default function Page() {
  return (
    <main className="flex h-screen">
      <aside className="w-80 flex-shrink-0 flex flex-col">
        <PromptInput />
      </aside>
      <section className="flex-1 relative">
        <Live2DCanvas />
      </section>
    </main>
  )
}
