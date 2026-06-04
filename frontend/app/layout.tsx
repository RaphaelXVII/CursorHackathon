import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PromptTuber',
  description: 'Generate a Live2D VTuber avatar from a text prompt',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script src="/live2dcubismcore.min.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  )
}
