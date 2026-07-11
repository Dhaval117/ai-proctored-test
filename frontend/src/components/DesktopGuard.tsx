/**
 * DesktopGuard.tsx
 *
 * Story 2.1: Blocks any viewport narrower than 1024px (tablet / mobile).
 * The exam requires a wide screen for the camera feed + answer panel layout.
 *
 * Uses a window resize listener to reactively update on orientation changes.
 */

import { useEffect, useState } from 'react'
import { Monitor, AlertTriangle } from 'lucide-react'

const MINIMUM_WIDTH = 1024

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

interface DesktopGuardProps {
  children: React.ReactNode
}

export default function DesktopGuard({ children }: DesktopGuardProps) {
  const width = useWindowWidth()

  if (width >= MINIMUM_WIDTH) {
    return <>{children}</>
  }

  return (
    <div
      id="desktop-guard-screen"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-8 gradient-bg"
    >
      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="glass-card relative z-10 max-w-sm w-full p-8 text-center animate-fade-in">
        {/* Icon */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <Monitor className="h-10 w-10 text-amber-400" strokeWidth={1.5} />
          <AlertTriangle
            className="absolute -right-2 -top-2 h-5 w-5 text-amber-400"
            strokeWidth={2}
          />
        </div>

        {/* Heading */}
        <h1 className="mb-3 text-2xl font-bold tracking-tight">
          Desktop Required
        </h1>

        {/* Body */}
        <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--color-surface-400)' }}>
          The ProctorAI examination system requires a desktop or laptop
          with a minimum screen width of{' '}
          <span className="font-semibold" style={{ color: 'var(--color-surface-200)' }}>
            {MINIMUM_WIDTH}px
          </span>
          .
        </p>

        {/* Current width indicator */}
        <div className="rounded-lg border p-3 mb-6"
          style={{ borderColor: 'var(--color-surface-700)', background: 'var(--color-surface-800)' }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-surface-400)' }}>
            Current screen width
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-brand-400)' }}>
            {width}px
          </p>
        </div>

        {/* Steps */}
        <ul className="space-y-2 text-left text-sm" style={{ color: 'var(--color-surface-400)' }}>
          {[
            'Switch to a desktop or laptop computer',
            'Ensure your browser window is fully maximised',
            'Disable browser zoom-out that reduces effective width',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <span className="mt-1 h-4 w-4 flex-shrink-0 text-amber-400">›</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
