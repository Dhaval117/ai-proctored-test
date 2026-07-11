/**
 * useMediaCheck.ts — Story 2.2
 *
 * Custom hook that manages:
 *   - Camera permission + live MediaStream
 *   - Microphone permission + Web Audio API volume level (0–100)
 *   - One-shot canvas snapshot → base64 data URL
 *
 * Streams are automatically stopped when the component unmounts
 * (or when stopAll() is called explicitly).
 */

import { useRef, useState, useCallback, useEffect } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

export type PermissionState = 'idle' | 'pending' | 'granted' | 'denied' | 'error'

export interface MediaCheckState {
  cameraState:  PermissionState
  micState:     PermissionState
  /** Real-time audio volume 0–100 (updated ~30fps while mic is active) */
  volumeLevel:  number
  /** Base64 data URL set after capturePhoto() succeeds */
  capturedPhoto: string | null
  cameraStream: MediaStream | null
}

export interface MediaCheckActions {
  requestCamera:  () => Promise<void>
  requestMic:     () => Promise<void>
  capturePhoto:   (videoEl: HTMLVideoElement) => string | null
  stopAll:        () => void
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMediaCheck(): MediaCheckState & MediaCheckActions {
  const [cameraState,    setCameraState]    = useState<PermissionState>('idle')
  const [micState,       setMicState]       = useState<PermissionState>('idle')
  const [volumeLevel,    setVolumeLevel]    = useState(0)
  const [capturedPhoto,  setCapturedPhoto]  = useState<string | null>(null)
  const [cameraStream,   setCameraStream]   = useState<MediaStream | null>(null)

  const cameraStreamRef = useRef<MediaStream | null>(null)
  const micStreamRef    = useRef<MediaStream | null>(null)
  const audioCtxRef     = useRef<AudioContext | null>(null)
  const analyserRef     = useRef<AnalyserNode | null>(null)
  const rafRef          = useRef<number | null>(null)

  // ── Camera ──────────────────────────────────────────────────────────────

  const requestCamera = useCallback(async () => {
    setCameraState('pending')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      cameraStreamRef.current = stream
      setCameraStream(stream)
      setCameraState('granted')
    } catch (err) {
      const isPermission =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setCameraState(isPermission ? 'denied' : 'error')
      console.error('[useMediaCheck] Camera error:', err)
    }
  }, [])

  // ── Microphone + Web Audio API volume meter ──────────────────────────────

  const startVolumePolling = useCallback((stream: MediaStream) => {
    const ctx      = new AudioContext()
    const source   = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize        = 256
    analyser.smoothingTimeConstant = 0.75
    source.connect(analyser)

    audioCtxRef.current  = ctx
    analyserRef.current  = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)

    const poll = () => {
      analyser.getByteFrequencyData(data)
      // RMS-style average of frequency bins
      const sum = data.reduce((acc, v) => acc + v * v, 0)
      const rms = Math.sqrt(sum / data.length)
      // Map ~0–128 range to 0–100
      setVolumeLevel(Math.min(100, Math.round((rms / 128) * 100)))
      rafRef.current = requestAnimationFrame(poll)
    }
    rafRef.current = requestAnimationFrame(poll)
  }, [])

  const requestMic = useCallback(async () => {
    setMicState('pending')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      })
      micStreamRef.current = stream
      setMicState('granted')
      startVolumePolling(stream)
    } catch (err) {
      const isPermission =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      setMicState(isPermission ? 'denied' : 'error')
      console.error('[useMediaCheck] Microphone error:', err)
    }
  }, [startVolumePolling])

  // ── Photo capture ────────────────────────────────────────────────────────

  /**
   * Draws a single frame from a <video> element onto a hidden canvas
   * and returns a base64 JPEG data URL. Returns null if video not ready.
   */
  const capturePhoto = useCallback((videoEl: HTMLVideoElement): string | null => {
    if (!videoEl || videoEl.readyState < 2) return null

    const canvas  = document.createElement('canvas')
    canvas.width  = videoEl.videoWidth  || 640
    canvas.height = videoEl.videoHeight || 480

    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setCapturedPhoto(dataUrl)
    return dataUrl
  }, [])

  // ── Cleanup ──────────────────────────────────────────────────────────────

  const stopAll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    audioCtxRef.current?.close()
    audioCtxRef.current  = null
    analyserRef.current  = null

    cameraStreamRef.current?.getTracks().forEach(t => t.stop())
    cameraStreamRef.current = null
    setCameraStream(null)

    micStreamRef.current?.getTracks().forEach(t => t.stop())
    micStreamRef.current = null

    setVolumeLevel(0)
  }, [])

  // Stop streams when component unmounts
  useEffect(() => stopAll, [stopAll])

  return {
    cameraState,
    micState,
    volumeLevel,
    capturedPhoto,
    cameraStream,
    requestCamera,
    requestMic,
    capturePhoto,
    stopAll,
  }
}
