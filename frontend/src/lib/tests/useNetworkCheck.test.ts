import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useNetworkCheck } from '../useNetworkCheck'
import { api } from '../api'

vi.mock('../api', () => ({
  api: {
    verifySession: vi.fn(),
  },
}))

describe('useNetworkCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useNetworkCheck())
    expect(result.current.latencyStatus).toBe('idle')
    expect(result.current.verifyStatus).toBe('idle')
    expect(result.current.allDone).toBe(false)
  })

  it('runs successfully through both phases', async () => {
    // Mock ping responses
    let pingCallCount = 0
    ;(global.fetch as any).mockImplementation(() => {
      pingCallCount++
      // advance performance.now() so rtt is measurable
      return Promise.resolve({ ok: true })
    })
    
    // Mock performance.now to simulate latency
    const originalNow = performance.now
    let nowValue = 1000
    performance.now = vi.fn(() => {
      nowValue += 20 // 20ms fake latency
      return nowValue
    })
    
    vi.mocked(api.verifySession).mockResolvedValueOnce({ status: 'active' } as any)

    const { result } = renderHook(() => useNetworkCheck())

    let promise: Promise<void>
    act(() => {
      promise = result.current.runAll('test-session-id', 'data:image/jpeg;base64,photo')
    })

    // Advance through the 5 pings and delays (150ms delay each)
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(200)
      }
    })
    
    await act(async () => {
      await promise
    })

    expect(result.current.latencyStatus).toBe('success')
    expect(result.current.latencyResult?.quality).toBe('excellent')
    expect(result.current.verifyStatus).toBe('success')
    expect(result.current.allDone).toBe(true)
    
    performance.now = originalNow
  })

  it('handles ping errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useNetworkCheck())

    let promise: Promise<void>
    act(() => {
      promise = result.current.runAll('session-id', 'photo')
    })

    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(200)
      }
    })

    await act(async () => {
      await promise
    })

    // Average of 5 * 9999 is 9999 which is 'poor'
    expect(result.current.latencyStatus).toBe('success') // It succeeds latency check but with poor quality
    expect(result.current.latencyResult?.quality).toBe('poor')
  })
  
  it('handles verify error', async () => {
    ;(global.fetch as any).mockResolvedValue({ ok: true })
    vi.mocked(api.verifySession).mockRejectedValueOnce(new Error('Verify failed'))
    
    const { result } = renderHook(() => useNetworkCheck())

    let promise: Promise<void>
    act(() => {
      promise = result.current.runAll('session-id', 'photo')
    })

    await act(async () => {
      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(200)
      }
    })

    await act(async () => {
      await promise
    })

    expect(result.current.verifyStatus).toBe('error')
    expect(result.current.errorMessage).toBe('Verify failed')
    expect(result.current.allDone).toBe(false)
  })
})
