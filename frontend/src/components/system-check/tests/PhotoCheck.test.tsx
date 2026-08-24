import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PhotoCheck } from '../PhotoCheck'

describe('PhotoCheck', () => {
  it('renders capture button when no photo is previewed', () => {
    const handleCapture = vi.fn()
    render(
      <PhotoCheck
        photoPreview={null}
        photoError={null}
        isValidatingPhoto={false}
        videoRef={{ current: null }}
        handleCapture={handleCapture}
        handleRetakePhoto={vi.fn()}
        handlePhotoNext={vi.fn()}
      />
    )
    
    const btn = screen.getByText(/Capture Reference Photo/i)
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(handleCapture).toHaveBeenCalled()
  })

  it('renders loading state when validating photo', () => {
    render(
      <PhotoCheck
        photoPreview={null}
        photoError={null}
        isValidatingPhoto={true}
        videoRef={{ current: null }}
        handleCapture={vi.fn()}
        handleRetakePhoto={vi.fn()}
        handlePhotoNext={vi.fn()}
      />
    )
    
    expect(screen.getByText(/Checking Photo & Alignment…/i)).toBeInTheDocument()
  })

  it('renders photo error message', () => {
    render(
      <PhotoCheck
        photoPreview={null}
        photoError="Face not detected clearly"
        isValidatingPhoto={false}
        videoRef={{ current: null }}
        handleCapture={vi.fn()}
        handleRetakePhoto={vi.fn()}
        handlePhotoNext={vi.fn()}
      />
    )
    
    expect(screen.getByText(/Face not detected clearly/i)).toBeInTheDocument()
  })

  it('renders retake and next buttons when photo is captured successfully', () => {
    const handleRetakePhoto = vi.fn()
    const handlePhotoNext = vi.fn()
    
    render(
      <PhotoCheck
        photoPreview="data:image/jpeg;base64,mock"
        photoError={null}
        isValidatingPhoto={false}
        videoRef={{ current: null }}
        handleCapture={vi.fn()}
        handleRetakePhoto={handleRetakePhoto}
        handlePhotoNext={handlePhotoNext}
      />
    )
    
    const retakeBtn = screen.getByText(/Retake/i)
    const nextBtn = screen.getByText(/Use This Photo/i)
    
    expect(retakeBtn).toBeInTheDocument()
    expect(nextBtn).toBeInTheDocument()
    
    fireEvent.click(retakeBtn)
    expect(handleRetakePhoto).toHaveBeenCalled()
    
    fireEvent.click(nextBtn)
    expect(handlePhotoNext).toHaveBeenCalled()
  })
})
