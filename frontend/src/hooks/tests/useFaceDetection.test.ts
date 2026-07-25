import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useFaceDetection } from "../useFaceDetection"

// Mock face-api
const {
  mockLoadFromUri,
  mockDetectSingleFace,
  mockDetectAllFaces,
  mockEuclideanDistance
} = vi.hoisted(() => {
  return {
    mockLoadFromUri: vi.fn().mockResolvedValue(undefined),
    mockDetectSingleFace: vi.fn(),
    mockDetectAllFaces: vi.fn(),
    mockEuclideanDistance: vi.fn(),
  }
})

vi.mock('@vladmandic/face-api', () => {
  return {
    nets: {
      tinyFaceDetector: { loadFromUri: mockLoadFromUri },
      faceLandmark68Net: { loadFromUri: mockLoadFromUri },
      faceRecognitionNet: { loadFromUri: mockLoadFromUri },
    },
    TinyFaceDetectorOptions: vi.fn(),
    detectSingleFace: mockDetectSingleFace,
    detectAllFaces: mockDetectAllFaces,
    euclideanDistance: mockEuclideanDistance,
  }
})

describe('useFaceDetection', () => {
  let videoRef: { current: HTMLVideoElement }
  let reportViolation: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock sessionStorage
    Storage.prototype.getItem = vi.fn().mockReturnValue('data:image/png;base64,mockphoto')
    
    // Mock Image loading
    globalThis.Image = class {
      onload: () => void = () => {}
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    } as any

    // Mock HTMLVideoElement
    videoRef = {
      current: {
        paused: false,
        ended: false,
        videoWidth: 320,
        videoHeight: 240,
      } as HTMLVideoElement
    }

    // Mock Canvas
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }) as any
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mocksnapshot')

    reportViolation = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes and loads reference descriptor', async () => {
    const mockRefDescriptor = new Float32Array([0.1, 0.2, 0.3])
    
    // Setup detectSingleFace chain
    const mockWithFaceDescriptor = vi.fn().mockResolvedValue({ descriptor: mockRefDescriptor })
    const mockWithFaceLandmarks = vi.fn().mockReturnValue({ withFaceDescriptor: mockWithFaceDescriptor })
    mockDetectSingleFace.mockReturnValue({ withFaceLandmarks: mockWithFaceLandmarks })

    const { result } = renderHook(() => useFaceDetection(videoRef as any, reportViolation as any))

    expect(result.current.isModelsLoaded).toBe(false)

    // Wait for async load to finish
    await waitFor(() => {
      expect(result.current.isModelsLoaded).toBe(true)
    })

    expect(mockLoadFromUri).toHaveBeenCalledTimes(3)
    expect(result.current.hasRefDescriptor).toBe(true)
  })

  it.skip('triggers NO_FACE violation after 3 consecutive intervals', async () => {
    // Setup reference descriptor
    const mockWithFaceDescriptor = vi.fn().mockResolvedValue({ descriptor: new Float32Array([0.1]) })
    mockDetectSingleFace.mockReturnValue({ withFaceLandmarks: vi.fn().mockReturnValue({ withFaceDescriptor: mockWithFaceDescriptor }) })
    
    // Setup detectAllFaces chain returning 0 faces
    const mockWithFaceDescriptors = vi.fn().mockResolvedValue([])
    mockDetectAllFaces.mockReturnValue({ withFaceLandmarks: vi.fn().mockReturnValue({ withFaceDescriptors: mockWithFaceDescriptors }) })

    const { result } = renderHook(() => useFaceDetection(videoRef as any, reportViolation as any))

    await waitFor(() => expect(result.current.hasRefDescriptor).toBe(true))

    vi.useFakeTimers()
    // Advance timers by 3.5 seconds asynchronously to flush promises
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })
    vi.useRealTimers()

    expect(reportViolation).toHaveBeenCalledWith('NO_FACE', 'LOW')
  })

  it.skip('triggers MULTI_FACE violation when > 1 face is detected', async () => {
    // Setup reference descriptor
    const mockWithFaceDescriptor = vi.fn().mockResolvedValue({ descriptor: new Float32Array([0.1]) })
    mockDetectSingleFace.mockReturnValue({ withFaceLandmarks: vi.fn().mockReturnValue({ withFaceDescriptor: mockWithFaceDescriptor }) })
    
    // Setup detectAllFaces chain returning 2 faces
    const mockWithFaceDescriptors = vi.fn().mockResolvedValue([
      { descriptor: new Float32Array([0.1]) },
      { descriptor: new Float32Array([0.2]) }
    ])
    mockDetectAllFaces.mockReturnValue({ withFaceLandmarks: vi.fn().mockReturnValue({ withFaceDescriptors: mockWithFaceDescriptors }) })

    const { result } = renderHook(() => useFaceDetection(videoRef as any, reportViolation as any))

    await waitFor(() => expect(result.current.hasRefDescriptor).toBe(true))

    vi.useFakeTimers()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    vi.useRealTimers()

    expect(reportViolation).toHaveBeenCalledWith('MULTI_FACE', 'HIGH', 'data:image/jpeg;base64,mocksnapshot')
  })

  it.skip('triggers FACE_MISMATCH violation when distance > 0.5', async () => {
    // Setup reference descriptor
    const mockWithFaceDescriptor = vi.fn().mockResolvedValue({ descriptor: new Float32Array([0.1]) })
    mockDetectSingleFace.mockReturnValue({ withFaceLandmarks: vi.fn().mockReturnValue({ withFaceDescriptor: mockWithFaceDescriptor }) })
    
    // Setup detectAllFaces chain returning 1 face
    const mockWithFaceDescriptors = vi.fn().mockResolvedValue([
      { descriptor: new Float32Array([0.9]) }
    ])
    mockDetectAllFaces.mockReturnValue({ withFaceLandmarks: vi.fn().mockReturnValue({ withFaceDescriptors: mockWithFaceDescriptors }) })
    
    // Mock euclidean distance to return 0.6 (violation)
    mockEuclideanDistance.mockReturnValue(0.6)

    const { result } = renderHook(() => useFaceDetection(videoRef as any, reportViolation as any))

    await waitFor(() => expect(result.current.hasRefDescriptor).toBe(true))

    vi.useFakeTimers()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    vi.useRealTimers()

    expect(reportViolation).toHaveBeenCalledWith('FACE_MISMATCH', 'HIGH', 'data:image/jpeg;base64,mocksnapshot')
  })

  it('does not trigger violation when face matches (distance <= 0.5)', async () => {
    // Setup reference descriptor
    const mockWithFaceDescriptor = vi.fn().mockResolvedValue({ descriptor: new Float32Array([0.1]) })
    mockDetectSingleFace.mockReturnValue({ withFaceLandmarks: vi.fn().mockReturnValue({ withFaceDescriptor: mockWithFaceDescriptor }) })
    
    // Setup detectAllFaces chain returning 1 face
    const mockWithFaceDescriptors = vi.fn().mockResolvedValue([
      { descriptor: new Float32Array([0.11]) }
    ])
    mockDetectAllFaces.mockReturnValue({ withFaceLandmarks: vi.fn().mockReturnValue({ withFaceDescriptors: mockWithFaceDescriptors }) })
    
    // Mock euclidean distance to return 0.2 (no violation)
    mockEuclideanDistance.mockReturnValue(0.2)

    const { result } = renderHook(() => useFaceDetection(videoRef as any, reportViolation as any))

    await waitFor(() => expect(result.current.hasRefDescriptor).toBe(true))

    vi.useFakeTimers()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    vi.useRealTimers()

    expect(reportViolation).not.toHaveBeenCalled()
  })
})
