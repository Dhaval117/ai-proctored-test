import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateReferencePhoto, checkImageClarity, ensureFaceApiModelsLoaded } from "../photoValidation"

// Mock face-api
const { mockLoadFromUri, mockDetectAllFaces } = vi.hoisted(() => {
  return {
    mockLoadFromUri: vi.fn().mockResolvedValue(undefined),
    mockDetectAllFaces: vi.fn(),
  }
})

vi.mock('@vladmandic/face-api', () => {
  return {
    nets: {
      tinyFaceDetector: { loadFromUri: mockLoadFromUri },
      faceLandmark68Net: { loadFromUri: mockLoadFromUri },
    },
    TinyFaceDetectorOptions: vi.fn(),
    detectAllFaces: mockDetectAllFaces,
  }
})

describe('photoValidation', () => {
  let mockVideo: HTMLVideoElement

  beforeEach(() => {
    vi.clearAllMocks()
    mockVideo = {
      videoWidth: 640,
      videoHeight: 480,
    } as HTMLVideoElement
  })

  describe('ensureFaceApiModelsLoaded', () => {
    it('loads models from /models', async () => {
      await ensureFaceApiModelsLoaded()
      expect(mockLoadFromUri).toHaveBeenCalledWith('/models')
    })
  })

  describe('validateReferencePhoto', () => {
    it('rejects when no face is detected', async () => {
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: vi.fn().mockResolvedValue([]),
      })

      const res = await validateReferencePhoto(mockVideo)
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('No face detected')
    })

    it('rejects when multiple faces are detected', async () => {
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: vi.fn().mockResolvedValue([
          { detection: { score: 0.9, box: { x: 200, y: 150, width: 150, height: 200 } } },
          { detection: { score: 0.85, box: { x: 50, y: 50, width: 100, height: 120 } } },
        ]),
      })

      const res = await validateReferencePhoto(mockVideo)
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('Multiple faces detected')
    })

    it('rejects when face detection score is below 0.65', async () => {
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: vi.fn().mockResolvedValue([
          { detection: { score: 0.5, box: { x: 245, y: 140, width: 150, height: 200 } } },
        ]),
      })

      const res = await validateReferencePhoto(mockVideo)
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('not clear or poorly lit')
    })

    it('rejects when face is not centered within the oval guide', async () => {
      // Oval center is (320, 240). Put face far to the left (e.g., center at 100, 240)
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: vi.fn().mockResolvedValue([
          { detection: { score: 0.9, box: { x: 25, y: 140, width: 150, height: 200 } } },
        ]),
      })

      const res = await validateReferencePhoto(mockVideo)
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('not centered within the oval guide')
    })

    it('rejects when face is too small for the oval guide', async () => {
      // Centered at (320, 240) but tiny width (50px < 640 * 0.15 = 96px)
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: vi.fn().mockResolvedValue([
          { detection: { score: 0.9, box: { x: 295, y: 200, width: 50, height: 80 } } },
        ]),
      })

      const res = await validateReferencePhoto(mockVideo)
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('too small')
    })

    it('rejects when face is too close / large for the oval guide', async () => {
      // Centered at (320, 240) but huge width (350px > 640 * 0.45 = 288px)
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: vi.fn().mockResolvedValue([
          { detection: { score: 0.9, box: { x: 145, y: 40, width: 350, height: 400 } } },
        ]),
      })

      const res = await validateReferencePhoto(mockVideo)
      expect(res.valid).toBe(false)
      expect(res.reason).toContain('too close to the camera or extends outside')
    })

    it('passes when single clear centered face fits inside the oval guide', async () => {
      // Centered at (320, 240), width 160, height 220
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: vi.fn().mockResolvedValue([
          { detection: { score: 0.92, box: { x: 240, y: 130, width: 160, height: 220 } } },
        ]),
      })

      const res = await validateReferencePhoto(mockVideo)
      expect(res.valid).toBe(true)
    })
  })

  describe('checkImageClarity', () => {
    let mockContext: any
    let mockCanvas: any

    beforeEach(() => {
      mockContext = {
        drawImage: vi.fn(),
        getImageData: vi.fn(),
      }
      mockCanvas = {
        width: 640,
        height: 480,
        getContext: vi.fn().mockReturnValue(mockContext),
      }
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return mockCanvas as any
        return document.createElement(tag)
      })
    })

    it('rejects dark photos', () => {
      const data = new Uint8ClampedArray(640 * 480 * 4)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 10     // R
        data[i + 1] = 10 // G
        data[i + 2] = 10 // B
        data[i + 3] = 255
      }
      mockContext.getImageData.mockReturnValue({ data })

      const res = checkImageClarity(mockVideo, 640, 480)
      expect(res.clear).toBe(false)
      expect(res.reason).toContain('too dark')
    })

    it('rejects overexposed photos', () => {
      const data = new Uint8ClampedArray(640 * 480 * 4)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 250     // R
        data[i + 1] = 250 // G
        data[i + 2] = 250 // B
        data[i + 3] = 255
      }
      mockContext.getImageData.mockReturnValue({ data })

      const res = checkImageClarity(mockVideo, 640, 480)
      expect(res.clear).toBe(false)
      expect(res.reason).toContain('overexposed')
    })

    it('rejects blurry photos (low Laplacian variance)', () => {
      const data = new Uint8ClampedArray(640 * 480 * 4)
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 128     // R
        data[i + 1] = 128 // G
        data[i + 2] = 128 // B
        data[i + 3] = 255
      }
      mockContext.getImageData.mockReturnValue({ data })

      const res = checkImageClarity(mockVideo, 640, 480)
      expect(res.clear).toBe(false)
      expect(res.reason).toContain('blurry or out of focus')
    })
  })
})
