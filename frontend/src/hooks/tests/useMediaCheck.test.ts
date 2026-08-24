import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMediaCheck } from '../useMediaCheck'

describe('useMediaCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    
    // Mock mediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      writable: true,
      configurable: true,
    })

    // Mock AudioContext
    const mockAnalyser = {
      fftSize: 0,
      smoothingTimeConstant: 0,
      frequencyBinCount: 16,
      getByteFrequencyData: vi.fn((data) => {
        for (let i = 0; i < data.length; i++) {
          data[i] = 128 // simulate some volume
        }
      }),
    }
    const mockSource = {
      connect: vi.fn(),
    }
    const mockAudioContext = {
      createMediaStreamSource: vi.fn(() => mockSource),
      createAnalyser: vi.fn(() => mockAnalyser),
      close: vi.fn(),
    }
    ;(global as any).AudioContext = class {
      constructor() {
        return mockAudioContext
      }
    }

    // Mock HTMLCanvasElement
    const mockContext = {
      drawImage: vi.fn(),
    }
    ;(HTMLCanvasElement.prototype as any).getContext = vi.fn(() => mockContext)
    ;(HTMLCanvasElement.prototype as any).toDataURL = vi.fn(() => 'data:image/jpeg;base64,mockphoto')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    delete (global as any).AudioContext
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useMediaCheck())
    expect(result.current.cameraState).toBe('idle')
    expect(result.current.micState).toBe('idle')
    expect(result.current.volumeLevel).toBe(0)
    expect(result.current.capturedPhoto).toBeNull()
  })

  it('requests camera successfully', async () => {
    const mockStream = { getTracks: () => [] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream as any)

    const { result } = renderHook(() => useMediaCheck())

    await act(async () => {
      await result.current.requestCamera()
    })

    expect(result.current.cameraState).toBe('granted')
    expect(result.current.cameraStream).toBe(mockStream)
  })

  it('handles camera permission denied', async () => {
    const error = new DOMException('Permission denied', 'NotAllowedError')
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error)

    const { result } = renderHook(() => useMediaCheck())

    await act(async () => {
      await result.current.requestCamera()
    })

    expect(result.current.cameraState).toBe('denied')
  })

  it('requests mic and polls volume successfully', async () => {
    const mockStream = { getTracks: () => [] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(mockStream as any)
    
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(0), 16)
      return 1
    })

    const { result } = renderHook(() => useMediaCheck())

    await act(async () => {
      await result.current.requestMic()
    })

    expect(result.current.micState).toBe('granted')
    
    // Advance timer to trigger requestAnimationFrame callback
    act(() => {
      vi.advanceTimersByTime(32)
    })
    
    // Our mock returned 128 for all bins, RMS of 128 is 128, mapped to 100
    expect(result.current.volumeLevel).toBe(100)

    requestAnimationFrameSpy.mockRestore()
  })

  it('handles mic permission denied', async () => {
    const error = new DOMException('Permission denied', 'PermissionDeniedError')
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error)

    const { result } = renderHook(() => useMediaCheck())

    await act(async () => {
      await result.current.requestMic()
    })

    expect(result.current.micState).toBe('denied')
  })

  it('captures photo from video element', () => {
    const { result } = renderHook(() => useMediaCheck())
    
    const mockVideoEl = document.createElement('video')
    Object.defineProperty(mockVideoEl, 'readyState', { value: 2 }) // HAVE_CURRENT_DATA
    Object.defineProperty(mockVideoEl, 'videoWidth', { value: 1280 })
    Object.defineProperty(mockVideoEl, 'videoHeight', { value: 720 })

    let dataUrl: string | null = null
    act(() => {
      dataUrl = result.current.capturePhoto(mockVideoEl)
    })

    expect(dataUrl).toBe('data:image/jpeg;base64,mockphoto')
    expect(result.current.capturedPhoto).toBe('data:image/jpeg;base64,mockphoto')
  })
  
  it('returns null if video is not ready for capture', () => {
    const { result } = renderHook(() => useMediaCheck())
    
    const mockVideoEl = document.createElement('video')
    Object.defineProperty(mockVideoEl, 'readyState', { value: 1 }) // HAVE_METADATA only

    let dataUrl: string | null = null
    act(() => {
      dataUrl = result.current.capturePhoto(mockVideoEl)
    })

    expect(dataUrl).toBeNull()
  })

  it('stops all streams on unmount', async () => {
    const mockTrack = { stop: vi.fn() }
    const mockStream = { getTracks: () => [mockTrack, mockTrack] }
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as any)
    
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame')

    const { result, unmount } = renderHook(() => useMediaCheck())

    await act(async () => {
      await result.current.requestCamera()
      await result.current.requestMic()
    })

    act(() => {
      unmount()
    })

    // Tracks stopped for both mic and camera (4 times total)
    expect(mockTrack.stop).toHaveBeenCalledTimes(4)
    expect(cancelAnimationFrameSpy).toHaveBeenCalled()
    expect(result.current.volumeLevel).toBe(0)
  })
})
