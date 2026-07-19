import { renderHook, act, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProctor } from './useProctor'
import { api } from '../lib/api'

// Mock the API module
vi.mock('../lib/api', () => ({
  api: {
    logEvent: vi.fn(),
    getProctoringConfig: vi.fn().mockResolvedValue({
      proctoring_enabled: true,
      allow_toggle: true,
    }),
  },
}))

describe('useProctor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getProctoringConfig).mockResolvedValue({
      proctoring_enabled: true,
      allow_toggle: true,
    })
  })

  it('initializes with default state', async () => {
    const { result } = renderHook(() => useProctor('session-123'))
    
    await waitFor(() => {
      expect(result.current.violationCount).toBe(0)
      expect(result.current.maxViolations).toBe(3)
      expect(result.current.status).toBe('ACTIVE')
      expect(result.current.showWarningModal).toBe(false)
    })
  })

  it('fetches proctoring config on mount', async () => {
    const { result } = renderHook(() => useProctor('session-123'))

    await waitFor(() => {
      expect(result.current.proctoringEnabled).toBe(true)
      expect(result.current.allowToggle).toBe(true)
    })
  })

  it('disallows toggle when allow_toggle is false from server', async () => {
    vi.mocked(api.getProctoringConfig).mockResolvedValue({
      proctoring_enabled: true,
      allow_toggle: false,
    })

    const { result } = renderHook(() => useProctor('session-123'))

    await waitFor(() => {
      expect(result.current.allowToggle).toBe(false)
      expect(result.current.isPaused).toBe(false)
    })

    await act(async () => {
      result.current.setIsPaused(true)
    })

    // Should remain false because allowToggle is false
    expect(result.current.isPaused).toBe(false)
  })

  it('pauses and ignores violations when proctoring_enabled is false from server', async () => {
    vi.mocked(api.getProctoringConfig).mockResolvedValue({
      proctoring_enabled: false,
      allow_toggle: false,
    })

    const { result } = renderHook(() => useProctor('session-123'))

    await waitFor(() => {
      expect(result.current.proctoringEnabled).toBe(false)
      expect(result.current.isPaused).toBe(true)
    })

    await act(async () => {
      window.dispatchEvent(new Event('blur'))
    })

    expect(api.logEvent).not.toHaveBeenCalled()
  })

  it('triggers TAB_SWITCH on window blur', async () => {
    const mockedLogEvent = vi.mocked(api.logEvent).mockResolvedValue({
      violation_count: 1,
      max_violations: 3,
      session_status: 'ACTIVE',
      warning_message: 'Warning: Window blur'
    })

    renderHook(() => useProctor('session-123'))

    await act(async () => {
      window.dispatchEvent(new Event('blur'))
    })

    await waitFor(() => {
      expect(mockedLogEvent).toHaveBeenCalledWith('session-123', {
        event_type: 'TAB_SWITCH',
        severity: 'MEDIUM'
      })
    })
  })

  it('triggers COPY_PASTE violation', async () => {
    const mockedLogEvent = vi.mocked(api.logEvent).mockResolvedValue({
      violation_count: 1,
      max_violations: 3,
      session_status: 'ACTIVE',
      warning_message: 'Warning: Copying not allowed'
    })

    renderHook(() => useProctor('session-123'))

    await act(async () => {
      fireEvent(document, new Event('copy'))
    })

    expect(mockedLogEvent).toHaveBeenCalledWith('session-123', {
      event_type: 'COPY_PASTE',
      severity: 'MEDIUM'
    })
  })

  it('triggers DEV_TOOLS on F12 keydown', async () => {
    const mockedLogEvent = vi.mocked(api.logEvent).mockResolvedValue({
      violation_count: 1,
      max_violations: 3,
      session_status: 'ACTIVE',
      warning_message: 'Warning: Developer tools'
    })

    renderHook(() => useProctor('session-123'))

    await act(async () => {
      fireEvent.keyDown(document, { key: 'F12', code: 'F12' })
    })

    expect(mockedLogEvent).toHaveBeenCalledWith('session-123', {
      event_type: 'DEV_TOOLS',
      severity: 'HIGH'
    })
  })

  it.skip('transitions to SUSPENDED status and stops logging', async () => {
    const mockedLogEvent = vi.mocked(api.logEvent).mockResolvedValue({
      violation_count: 3,
      max_violations: 3,
      session_status: 'SUSPENDED',
      warning_message: null
    })

    const { result } = renderHook(() => useProctor('session-123'))

    await act(async () => {
      fireEvent(document, new Event('copy'))
    })

    await waitFor(() => {
      expect(result.current.status).toBe('SUSPENDED')
    }, { timeout: 2000 })

    // Subsequent events should be ignored
    await act(async () => {
      fireEvent(window, new Event('blur'))
    })

    // Still only called once because it is suspended
    expect(mockedLogEvent).toHaveBeenCalledTimes(1)
  })

  it('debounces rapid events', async () => {
    vi.mocked(api.logEvent).mockResolvedValue({
      violation_count: 1,
      max_violations: 3,
      session_status: 'ACTIVE',
      warning_message: null
    })

    renderHook(() => useProctor('session-123'))

    await act(async () => {
      // Fire multiple events in quick succession
      window.dispatchEvent(new Event('blur'))
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      // Should only log once due to DEBOUNCE_MS
      expect(api.logEvent).toHaveBeenCalledTimes(1)
    })
  })
})
