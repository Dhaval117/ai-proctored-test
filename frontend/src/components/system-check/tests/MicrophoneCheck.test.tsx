import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MicrophoneCheck } from '../MicrophoneCheck'

describe('MicrophoneCheck', () => {
  it('renders request mic button when state is prompt', () => {
    const requestMic = vi.fn()
    render(
      <MicrophoneCheck
        micState="idle"
        volumeLevel={0}
        requestMic={requestMic}
        handleMicNext={vi.fn()}
      />
    )
    const btn = screen.getByText(/Enable Microphone/i)
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(requestMic).toHaveBeenCalled()
  })

  it('renders volume bar and next button when granted', () => {
    const handleMicNext = vi.fn()
    render(
      <MicrophoneCheck
        micState="granted"
        volumeLevel={50}
        requestMic={vi.fn()}
        handleMicNext={handleMicNext}
      />
    )
    expect(screen.getByText(/Microphone is working!/i)).toBeInTheDocument()
    
    // Test clicking the next button
    const nextBtn = screen.getByText(/Microphone Ready — Continue/i)
    expect(nextBtn).toBeInTheDocument()
    fireEvent.click(nextBtn)
    expect(handleMicNext).toHaveBeenCalled()
  })

  it('renders error state when denied', () => {
    render(
      <MicrophoneCheck
        micState="denied"
        volumeLevel={0}
        requestMic={vi.fn()}
        handleMicNext={vi.fn()}
      />
    )
    expect(screen.getByText(/Microphone access was blocked/i)).toBeInTheDocument()
  })
})
