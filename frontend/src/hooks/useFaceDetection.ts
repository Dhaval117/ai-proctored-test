import * as faceapi from '@vladmandic/face-api'
import { useEffect, useRef, useState } from 'react'
import { PHOTO_STORAGE_KEY } from '../utils/constants'
import type { ViolationType, SeverityLevel } from '../lib/api'

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  reportViolation: (type: ViolationType, severity: SeverityLevel, snapshot?: string) => void
) {
  const [isModelsLoaded, setIsModelsLoaded] = useState(false)
  const [refDescriptor, setRefDescriptor] = useState<Float32Array | null>(null)

  // Track consecutive seconds without a face
  const noFaceCountRef = useRef(0)
  // Track if we've recently reported a violation to prevent spamming
  const lastReportTimeRef = useRef<number | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ])

        if (!mounted) return
        setIsModelsLoaded(true)

        // Load reference descriptor
        const photoDataUrl = sessionStorage.getItem(PHOTO_STORAGE_KEY)
        if (photoDataUrl) {
          const img = new Image()
          img.src = photoDataUrl
          await new Promise((resolve) => { img.onload = resolve })

          const detections = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor()

          if (mounted && detections) {
            setRefDescriptor(detections.descriptor)
          } else {
            console.error("Could not find a face in the reference photo.")
          }
        }
      } catch (err) {
        console.error("Failed to initialize Face-API:", err)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!isModelsLoaded || !videoRef.current || !refDescriptor) return

    const interval = setInterval(async () => {
      const video = videoRef.current
      if (!video || video.paused || video.ended) return

      // Throttle violation reporting (e.g. max 1 per 5 seconds)
      const now = Date.now()
      if (lastReportTimeRef.current !== null && now - lastReportTimeRef.current < 5000) return

      try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors()

        if (detections.length === 0) {
          noFaceCountRef.current += 1
          if (noFaceCountRef.current >= 3) {
            reportViolation('NO_FACE', 'LOW')
            lastReportTimeRef.current = Date.now()
            noFaceCountRef.current = 0 // reset after reporting
          }
        } else {
          noFaceCountRef.current = 0

          if (detections.length > 1) {
            const snapshot = captureSnapshot(video)
            reportViolation('MULTI_FACE', 'HIGH', snapshot)
            lastReportTimeRef.current = Date.now()
            return
          }

          // 1 Face, check identity
          const face = detections[0]
          const distance = faceapi.euclideanDistance(face.descriptor, refDescriptor)

          // Using 0.5 as threshold for stricter matching
          if (distance > 0.5) {
            const snapshot = captureSnapshot(video)
            reportViolation('FACE_MISMATCH', 'HIGH', snapshot)
            lastReportTimeRef.current = Date.now()
          }
        }
      } catch (err) {
        console.error("Face detection error:", err)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isModelsLoaded, videoRef, refDescriptor, reportViolation])

  return { isModelsLoaded, hasRefDescriptor: !!refDescriptor }
}

function captureSnapshot(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  }
  return canvas.toDataURL('image/jpeg', 0.7)
}
