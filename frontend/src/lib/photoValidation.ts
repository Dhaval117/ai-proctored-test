/**
 * photoValidation.ts — Reference Photo Quality and Alignment Verification
 *
 * Validates that a reference photo captured during system check:
 * 1. Has exactly one face detected (`detectAllFaces`).
 * 2. Has sufficient detection confidence (`score >= 0.65`).
 * 3. Is aligned properly within the oval guide (`width: 38%`, `height: 70%`, centered).
 * 4. Is clear (adequate lighting and not blurry via Laplacian variance).
 */

import * as faceapi from '@vladmandic/face-api'

export interface PhotoValidationResult {
  valid: boolean
  reason?: string
}

let modelsLoadedPromise: Promise<void> | null = null

/**
 * Preload and ensure face-api models are loaded before detection.
 */
export async function ensureFaceApiModelsLoaded(): Promise<void> {
  if (modelsLoadedPromise) {
    return modelsLoadedPromise
  }
  modelsLoadedPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
  ]).then(() => {
    // Models loaded
  }).catch((err) => {
    modelsLoadedPromise = null
    throw err
  })
  return modelsLoadedPromise
}

/**
 * Checks image pixel clarity: brightness and Laplacian variance (blurriness).
 */
export function checkImageClarity(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  width: number,
  height: number
): { clear: boolean; reason?: string } {
  if (width <= 0 || height <= 0) {
    return { clear: true }
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { clear: true }
  }

  ctx.drawImage(input, 0, 0, width, height)
  let imageData: ImageData
  try {
    imageData = ctx.getImageData(0, 0, width, height)
  } catch (e) {
    // In cross-origin or mocked environments where getImageData fails, assume clear
    return { clear: true }
  }

  const data = imageData.data
  const totalPixels = width * height
  if (totalPixels === 0) {
    return { clear: true }
  }

  // 1. Check average brightness
  let totalBrightness = 0
  for (let i = 0; i < data.length; i += 4) {
    // Grayscale luminance formula
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    totalBrightness += gray
  }
  const avgBrightness = totalBrightness / totalPixels

  if (avgBrightness < 30) {
    return { clear: false, reason: 'Photo is too dark. Please improve room lighting.' }
  }
  if (avgBrightness > 245) {
    return { clear: false, reason: 'Photo is overexposed. Please avoid harsh direct lighting.' }
  }

  // 2. Compute Laplacian variance to detect blurriness
  // Convert grayscale into a 2D-accessible array
  const grayArray = new Float32Array(totalPixels)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    grayArray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  let sumL = 0
  let sumLSq = 0
  let count = 0

  for (let y = 1; y < height - 1; y += 2) {
    const rowOffset = y * width
    for (let x = 1; x < width - 1; x += 2) {
      const idx = rowOffset + x
      const l =
        4 * grayArray[idx] -
        grayArray[idx - 1] -
        grayArray[idx + 1] -
        grayArray[idx - width] -
        grayArray[idx + width]
      sumL += l
      sumLSq += l * l
      count++
    }
  }

  if (count > 0) {
    const mean = sumL / count
    const variance = sumLSq / count - mean * mean
    if (variance < 50) {
      return {
        clear: false,
        reason: 'Photo is blurry or out of focus. Please hold still and ensure your camera lens is clean.',
      }
    }
  }

  return { clear: true }
}

/**
 * Validates whether the reference photo has a single, clear face aligned inside the oval guide.
 */
export async function validateReferencePhoto(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<PhotoValidationResult> {
  const width =
    input instanceof HTMLVideoElement ? input.videoWidth || 640 : input.width || 640
  const height =
    input instanceof HTMLVideoElement ? input.videoHeight || 480 : input.height || 480

  try {
    await ensureFaceApiModelsLoaded()
  } catch (err) {
    console.error('[validateReferencePhoto] Failed to load face-api models:', err)
    return {
      valid: false,
      reason: 'Failed to initialize face detection models. Please check your network connection.',
    }
  }

  const detections = await faceapi
    .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()

  if (detections.length === 0) {
    return {
      valid: false,
      reason:
        'No face detected in the photo. Please make sure your face is clearly visible inside the oval guide.',
    }
  }

  if (detections.length > 1) {
    return {
      valid: false,
      reason:
        'Multiple faces detected. Please ensure only you are visible inside the oval guide.',
    }
  }

  const detection = detections[0]
  if (detection.detection.score < 0.65) {
    return {
      valid: false,
      reason:
        'Face is not clear or poorly lit. Please ensure adequate lighting and look directly at the camera.',
    }
  }

  // Oval guide alignment check
  // Oval guide geometry: center (0.5W, 0.5H), width 38% (rx = 0.19W), height 70% (ry = 0.35H)
  const box = detection.detection.box
  const ovalCenterX = width * 0.5
  const ovalCenterY = height * 0.5
  const ovalRadiusX = width * 0.19
  const ovalRadiusY = height * 0.35

  const faceCenterX = box.x + box.width / 2
  const faceCenterY = box.y + box.height / 2

  const normalizedX = (faceCenterX - ovalCenterX) / ovalRadiusX
  const normalizedY = (faceCenterY - ovalCenterY) / ovalRadiusY
  const ellipseDistSq = normalizedX * normalizedX + normalizedY * normalizedY

  if (ellipseDistSq > 0.85) {
    return {
      valid: false,
      reason:
        'Face is not centered within the oval guide. Please align your face directly inside the oval.',
    }
  }

  if (box.width < width * 0.15 || box.height < height * 0.20) {
    return {
      valid: false,
      reason: 'Face is too small. Please move closer so your face fills the oval guide.',
    }
  }

  if (box.width > width * 0.45 || box.height > height * 0.80) {
    return {
      valid: false,
      reason:
        'Face is too close to the camera or extends outside the oval guide. Please move back slightly.',
    }
  }

  // Clarity checks (brightness + blurriness)
  const clarity = checkImageClarity(input, width, height)
  if (!clarity.clear) {
    return {
      valid: false,
      reason: clarity.reason,
    }
  }

  return { valid: true }
}
