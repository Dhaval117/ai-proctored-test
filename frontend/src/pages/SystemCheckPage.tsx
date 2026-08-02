/**
 * SystemCheckPage.tsx — Story 2.2 + 2.3 (Refactored to Fluent UI v9)
 *
 * Four-step system check wizard:
 *   Step 1 — Camera:      Request webcam permission + live preview
 *   Step 2 — Microphone:  Request mic permission + Web Audio API volume bar
 *   Step 3 — Photo:       Capture reference portrait from webcam
 *   Step 4 — Network:     Ping latency check + session create + verify handshake
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Title1, Text, Button, Spinner, Card } from '@fluentui/react-components'
import { ShieldCheckmark24Filled, ArrowLeft20Regular, DismissCircle24Regular } from '@fluentui/react-icons'

import { useMediaCheck } from '../hooks/useMediaCheck'
import { useNetworkCheck } from '../lib/useNetworkCheck'
import { validateReferencePhoto, ensureFaceApiModelsLoaded } from '../lib/photoValidation'
import { api } from '../lib/api'

import { CameraCheck } from '../components/system-check/CameraCheck'
import { MicrophoneCheck } from '../components/system-check/MicrophoneCheck'
import { PhotoCheck } from '../components/system-check/PhotoCheck'
import { NetworkCheck } from '../components/system-check/NetworkCheck'

import { ThemeToggle } from '../components/ThemeToggle'
import { useSystemCheckStyles } from "./styles/SystemCheckPage.styles"
import { useCommonStyles } from "./styles/common.styles"
import { useExamStyles } from "./styles/ExamPage.styles"
import {
  PHOTO_STORAGE_KEY,
  type SystemCheckStep as Step,
  SYSTEM_CHECK_STEPS as STEPS,
} from '../utils/constants'

function StepProgress({ current }: { current: Step }) {
  const styles = useSystemCheckStyles()
  const idx = STEPS.findIndex((s) => s.id === current)
  return (
    <div className={styles.stepProgressContainer}>
      <div className={styles.stepDotsRow}>
        {STEPS.map((s, i) => {
          const isDone = i < idx
          const isActive = i === idx
          return (
            <div key={s.id} className={styles.stepItemWrapper}>
              <div
                className={
                  isDone
                    ? styles.stepDotDone
                    : isActive
                      ? styles.stepDotActive
                      : styles.stepDotIdle
                }
              />
              {i < STEPS.length - 1 && (
                <div
                  className={isDone ? styles.stepLineDone : styles.stepLineIdle}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.stepLabelsRow}>
        {STEPS.map((s, i) => {
          const isDone = i < idx
          const isActive = i === idx
          const stepWidth = i < STEPS.length - 1 ? '78px' : '48px'
          return (
            <div key={s.id} className={styles.stepLabelBox} style={{ width: stepWidth }}>
              <Text
                className={
                  isActive
                    ? styles.stepLabelActive
                    : isDone
                      ? styles.stepLabelDone
                      : styles.stepLabelIdle
                }
              >
                {s.label}
              </Text>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SystemCheckPage() {
  const styles = useSystemCheckStyles()
  const examStyles = useExamStyles()
  const commonStyles = useCommonStyles()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    cameraState,
    micState,
    volumeLevel,
    cameraStream,
    requestCamera,
    requestMic,
    capturePhoto,
    stopAll,
  } = useMediaCheck()

  const networkCheck = useNetworkCheck() as ReturnType<typeof useNetworkCheck> & { _pingSamples: number[] }

  const [currentStep, setCurrentStep] = useState<Step>('camera')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false)

  const { id: sessionId } = useParams<{ id: string }>()
  const [isValidatingSession, setIsValidatingSession] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setSessionError('Invalid session link.')
      setIsValidatingSession(false)
      return
    }

    const checkSession = async () => {
      try {
        const res = await api.checkSessionValidity(sessionId)
        if (res.status !== 'SETUP') {
          // If the exam is active, completed, or suspended, route them to the exam page
          navigate(`/exam/${sessionId}/take`, { replace: true })
          return
        }
        setIsValidatingSession(false)
      } catch (err: any) {
        setSessionError(err.message || 'This exam link is invalid or has expired.')
        setIsValidatingSession(false)
      }
    }
    checkSession()
  }, [sessionId])

  useEffect(() => {
    if (currentStep === 'photo') {
      ensureFaceApiModelsLoaded().catch((err) => console.error('Failed to preload face-api models:', err))
    }
  }, [currentStep])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !cameraStream) return
    if (video.srcObject !== cameraStream) {
      video.srcObject = cameraStream
    }
  }, [cameraStream, currentStep, photoPreview])

  const handleCameraNext = () => {
    if (cameraState === 'granted') {
      setPhotoError(null)
      setCurrentStep('microphone')
    }
  }

  const handleMicNext = () => {
    if (micState === 'granted') {
      setPhotoError(null)
      setCurrentStep('photo')
    }
  }

  const handleCapture = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    setPhotoError(null)
    setIsValidatingPhoto(true)
    try {
      const validation = await validateReferencePhoto(video)
      if (!validation.valid) {
        setPhotoError(
          validation.reason ||
          'Reference photo rejected. Please align your face inside the oval guide and ensure clear lighting.'
        )
        return
      }
      const dataUrl = capturePhoto(video)
      if (dataUrl) {
        setPhotoPreview(dataUrl)
        sessionStorage.setItem(PHOTO_STORAGE_KEY, dataUrl)
      }
    } catch (err) {
      console.error('[SystemCheckPage] Photo capture/validation error:', err)
      setPhotoError('Failed to validate photo. Please try again.')
    } finally {
      setIsValidatingPhoto(false)
    }
  }, [capturePhoto])

  const handleRetakePhoto = useCallback(() => {
    setPhotoPreview(null)
    setPhotoError(null)
    sessionStorage.removeItem(PHOTO_STORAGE_KEY)
  }, [])

  const handlePhotoNext = useCallback(() => {
    setCurrentStep('network')
  }, [])

  const startNetworkCheck = useCallback(async () => {
    const photo = sessionStorage.getItem(PHOTO_STORAGE_KEY)
    if (!sessionId || !photo) return

    await networkCheck.runAll(sessionId, photo)
  }, [networkCheck, sessionId])

  useEffect(() => {
    if (currentStep === 'network' && networkCheck.latencyStatus === 'idle') {
      startNetworkCheck()
    }
  }, [currentStep, networkCheck.latencyStatus, startNetworkCheck])

  const handleStartExam = useCallback(() => {
    if (!sessionId) return
    stopAll()
    navigate(`/exam/${sessionId}/take`)
  }, [navigate, sessionId, stopAll])

  return (
    <div className={`${commonStyles.pageContainer} animate-fade-in`}>
      <div className={commonStyles.topToggle}>
        <ThemeToggle />
      </div>

      {isValidatingSession ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Spinner size="huge" />
          <Text className="text-neutral-500 font-medium">Validating exam link...</Text>
        </div>
      ) : sessionError ? (
        <Card className={`${examStyles.suspendedCard} shadow-lg`} style={{ marginTop: '20vh' }}>
          <div className="flex justify-center mb-4 text-red-500">
            <DismissCircle24Regular className="w-12 h-12" />
          </div>
          <Title1 className={examStyles.suspendedTitle} style={{ color: 'var(--colorPaletteRedForeground1)' }}>
            Session Invalid
          </Title1>
          <Text className={examStyles.suspendedText}>
            {sessionError}
          </Text>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className={commonStyles.headerBox}>
            <div className={commonStyles.logoRow}>
              <div className={commonStyles.logoIconBox}>
                <ShieldCheckmark24Filled className={commonStyles.logoIcon} />
              </div>
              <Title1 align="center">System Check</Title1>
            </div>
            <Text className={commonStyles.subtext}>
              Verify your hardware and connection before starting the exam.
            </Text>
          </div>

          <StepProgress current={currentStep} />

      {currentStep === 'camera' && (
        <CameraCheck
          cameraState={cameraState}
          videoRef={videoRef}
          requestCamera={requestCamera}
          handleCameraNext={handleCameraNext}
        />
      )}

      {currentStep === 'microphone' && (
        <MicrophoneCheck
          micState={micState}
          volumeLevel={volumeLevel}
          requestMic={requestMic}
          handleMicNext={handleMicNext}
        />
      )}

      {currentStep === 'photo' && (
        <PhotoCheck
          photoPreview={photoPreview}
          photoError={photoError}
          isValidatingPhoto={isValidatingPhoto}
          videoRef={videoRef}
          handleCapture={handleCapture}
          handleRetakePhoto={handleRetakePhoto}
          handlePhotoNext={handlePhotoNext}
        />
      )}

      {currentStep === 'network' && (
        <NetworkCheck
          networkCheck={networkCheck}
          startNetworkCheck={startNetworkCheck}
          handleStartExam={handleStartExam}
        />
      )}

      <Button
        id="btn-back-to-setup"
        appearance="subtle"
        icon={<ArrowLeft20Regular />}
        className={styles.backBtn}
        onClick={() => {
          stopAll()
          navigate('/')
        }}
      >
        Exit Setup
      </Button>
      </>
      )}
    </div>
  )
}
