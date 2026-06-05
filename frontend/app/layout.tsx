import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PromptTuber',
  description: 'Generate a Live2D VTuber avatar from a text prompt',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body className={inter.className}>
        <Script src="/live2dcubismcore.min.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  )
}
