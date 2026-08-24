import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NetworkCheck } from '../NetworkCheck'

describe('NetworkCheck', () => {
  it('renders idle state as checking', () => {
    const startNetworkCheck = vi.fn()
    render(
      <NetworkCheck
        networkCheck={{ latencyStatus: 'idle', _pingSamples: [] } as any}
        startNetworkCheck={startNetworkCheck}
        handleStartExam={vi.fn()}
      />
    )
    const btn = screen.getByText(/Checking…/i)
    expect(btn).toBeInTheDocument()
  })

  it('renders running state with latency text', () => {
    render(
      <NetworkCheck
        networkCheck={{ latencyStatus: 'running', _pingSamples: [100] } as any}
        startNetworkCheck={vi.fn()}
        handleStartExam={vi.fn()}
      />
    )
    expect(screen.getByText(/Measuring…/i)).toBeInTheDocument()
  })

  it('renders success state and start exam button', () => {
    const handleStartExam = vi.fn()
    render(
      <NetworkCheck
        networkCheck={{ latencyStatus: 'success', latencyResult: { quality: 'good', avgMs: 50 }, allDone: true, verifyStatus: 'success', _pingSamples: [50, 45, 60] } as any}
        startNetworkCheck={vi.fn()}
        handleStartExam={handleStartExam}
      />
    )
    
    const btn = screen.getByText(/Start Exam/i)
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleStartExam).toHaveBeenCalled()
  })

  it('renders warning state', () => {
    render(
      <NetworkCheck
        networkCheck={{ latencyStatus: 'success', latencyResult: { quality: 'poor', avgMs: 350 }, _pingSamples: [300, 400] } as any}
        startNetworkCheck={vi.fn()}
        handleStartExam={vi.fn()}
      />
    )
    expect(screen.getByText(/Poor/i)).toBeInTheDocument()
  })

  it('renders error state and retry button', () => {
    const startNetworkCheck = vi.fn()
    render(
      <NetworkCheck
        networkCheck={{ errorMessage: 'Connection failed', _pingSamples: [] } as any}
        startNetworkCheck={startNetworkCheck}
        handleStartExam={vi.fn()}
      />
    )
    expect(screen.getByText(/Connection failed/i)).toBeInTheDocument()
    
    const btn = screen.getByText(/Retry/i)
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(startNetworkCheck).toHaveBeenCalled()
  })
})
