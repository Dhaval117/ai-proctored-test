/**
 * useNetworkCheck.ts — Story 2.3
 *
 * Encapsulates all network-related checks for the final wizard step:
 *   1. Latency probing  — fires N pings to /api/ping, records RTTs
 *   2. Session creation — POST /api/sessions/create
 *   3. Session verify   — POST /api/sessions/{id}/verify
 *
 * Each phase has its own status field so the UI can reflect progress
 * independently for each step.
 */

import { useState, useCallback } from 'react'
import { api } from './api'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckStatus = 'idle' | 'running' | 'success' | 'error'

export interface LatencyResult {
  /** Individual RTT samples in milliseconds */
  samples:   number[]
  /** Arithmetic mean of all samples, rounded to nearest ms */
  avgMs:     number
  /** Qualitative label based on average */
  quality:   'excellent' | 'good' | 'fair' | 'poor'
}

export interface NetworkCheckState {
  latencyStatus:   CheckStatus
  latencyResult:   LatencyResult | null
  verifyStatus:    CheckStatus
  /** User-visible error message from the most recent failure */
  errorMessage:    string | null
  /** true once all phases have completed successfully */
  allDone:         boolean
}

export interface NetworkCheckActions {
  runAll: (sessionId: string, referencePhoto: string) => Promise<void>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PING_URL       = '/api/ping'
const PING_SAMPLES   = 5
const PING_DELAY_MS  = 150   // brief gap between pings to avoid burst

// ── Latency quality thresholds (ms) ──────────────────────────────────────────

function classifyLatency(avgMs: number): LatencyResult['quality'] {
  if (avgMs <  80) return 'excellent'
  if (avgMs < 200) return 'good'
  if (avgMs < 500) return 'fair'
  return 'poor'
}

// ── Latency probe ─────────────────────────────────────────────────────────────

async function measureLatency(
  onSample: (sample: number, idx: number) => void,
): Promise<LatencyResult> {
  const samples: number[] = []

  for (let i = 0; i < PING_SAMPLES; i++) {
    const t0 = performance.now()
    try {
      await fetch(PING_URL, { method: 'GET', cache: 'no-store' })
    } catch {
      // Network failure — record a sentinel high value
      samples.push(9999)
      onSample(9999, i)
      continue
    }
    const rtt = Math.round(performance.now() - t0)
    samples.push(rtt)
    onSample(rtt, i)

    if (i < PING_SAMPLES - 1) {
      await new Promise(r => setTimeout(r, PING_DELAY_MS))
    }
  }

  const avgMs  = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length)
  return { samples, avgMs, quality: classifyLatency(avgMs) }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNetworkCheck(): NetworkCheckState & NetworkCheckActions {
  const [latencyStatus, setLatencyStatus] = useState<CheckStatus>('idle')
  const [latencyResult, setLatencyResult] = useState<LatencyResult | null>(null)
  const [pingSamples,   setPingSamples]   = useState<number[]>([])  // live samples for animation

  const [verifyStatus, setVerifyStatus] = useState<CheckStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [allDone,      setAllDone]      = useState(false)

  const runAll = useCallback(async (
    sessionId: string,
    referencePhoto: string,
  ) => {
    setErrorMessage(null)
    setAllDone(false)
    setPingSamples([])

    // ── Phase 1: Latency ─────────────────────────────────────────────────────

    setLatencyStatus('running')
    let result: LatencyResult
    try {
      result = await measureLatency((sample, idx) => {
        setPingSamples(prev => {
          const next = [...prev]
          next[idx] = sample
          return next
        })
      })
      setLatencyResult(result)
      setLatencyStatus('success')
    } catch (err) {
      setLatencyStatus('error')
      setErrorMessage('Unable to reach the server. Check your internet connection.')
      return
    }

    // ── Phase 2: Verify session (upload reference photo) ────────────────────

    setVerifyStatus('running')
    try {
      await api.verifySession(sessionId, { reference_photo: referencePhoto })
      setVerifyStatus('success')
      setAllDone(true)
    } catch (err) {
      setVerifyStatus('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to verify session.',
      )
    }
  }, [])

  return {
    latencyStatus,
    latencyResult,
    verifyStatus,
    errorMessage,
    allDone,
    runAll,
    // expose live samples for the animated latency bar
    _pingSamples: pingSamples,
  } as NetworkCheckState & NetworkCheckActions & { _pingSamples: number[] }
}
