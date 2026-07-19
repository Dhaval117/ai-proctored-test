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
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Title1,
  Title3,
  Text,
  Button,
  Spinner,
  Badge,
  tokens,
} from '@fluentui/react-components'
import {
  Camera20Regular,
  Mic20Regular,
  Person20Regular,
  Wifi2Regular,
  CheckmarkCircle20Filled,
  DismissCircle20Filled,
  ArrowRight20Filled,
  ArrowLeft20Regular,
  ArrowCounterclockwise20Regular,
  Play20Filled,
  ShieldCheckmark24Filled,
} from '@fluentui/react-icons'

import { useMediaCheck } from '../hooks/useMediaCheck'
import { useNetworkCheck, type CheckStatus } from '../lib/useNetworkCheck'
import { validateReferencePhoto, ensureFaceApiModelsLoaded } from '../lib/photoValidation'
import { SETUP_STORAGE_KEY, type CandidateFormData } from './SetupPage'
import { ThemeToggle } from '../components/ThemeToggle'
import { useSystemCheckStyles } from './SystemCheckPage.styles'

export const PHOTO_STORAGE_KEY = 'proctor_photo'

type Step = 'camera' | 'microphone' | 'photo' | 'network'

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'camera', label: 'Camera', icon: <Camera20Regular /> },
  { id: 'microphone', label: 'Microphone', icon: <Mic20Regular /> },
  { id: 'photo', label: 'Photo', icon: <Person20Regular /> },
  { id: 'network', label: 'Network', icon: <Wifi2Regular /> },
]

function VolumeBar({ level }: { level: number }) {
  const styles = useSystemCheckStyles()
  const bars = 24
  const filled = Math.round((level / 100) * bars)

  return (
    <div className={styles.volumeBarContainer} aria-label={`Volume level: ${level}%`}>
      {Array.from({ length: bars }, (_, i) => {
        const active = i < filled
        const hue = active ? Math.max(0, 120 - i * 5) : 0
        const heightPct = 20 + (i / bars) * 80
        return (
          <div
            key={i}
            className={styles.volumeBarItem}
            style={{
              height: `${heightPct}%`,
              background: active ? `hsl(${hue} 75% 42%)` : tokens.colorNeutralBackground3,
            }}
          />
        )
      })}
    </div>
  )
}

function StatusIcon({ state }: { state: string }) {
  const styles = useSystemCheckStyles()
  if (state === 'pending' || state === 'running')
    return <Spinner size="extra-tiny" />
  if (state === 'granted' || state === 'success')
    return <CheckmarkCircle20Filled className={styles.statusSuccess} />
  if (state === 'denied' || state === 'error')
    return <DismissCircle20Filled className={styles.statusError} />
  return null
}

function HandshakeRow({
  label,
  status,
  detail,
}: {
  label: string
  status: CheckStatus
  detail?: string
}) {
  const styles = useSystemCheckStyles()
  const rowClass =
    status === 'success'
      ? `${styles.handshakeRow} ${styles.handshakeRowSuccess}`
      : status === 'error'
        ? `${styles.handshakeRow} ${styles.handshakeRowError}`
        : `${styles.handshakeRow} ${styles.handshakeRowNeutral}`

  return (
    <div className={rowClass}>
      <StatusIcon state={status} />
      <div className={styles.handshakeContentBox}>
        <Text className={styles.handshakeText}>{label}</Text>
        {detail && <Text className={styles.handshakeDetail}>{detail}</Text>}
      </div>
    </div>
  )
}

function CardHeaderSection({
  icon,
  title,
  subtitle,
  statusState,
  badge,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  statusState?: string
  badge?: React.ReactNode
}) {
  const styles = useSystemCheckStyles()
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionIconBox}>{icon}</div>
      <div className={styles.sectionTitleBox}>
        <Title3 className={styles.sectionTitle}>{title}</Title3>
        <Text className={styles.sectionSubtitle}>{subtitle}</Text>
      </div>
      {statusState && <StatusIcon state={statusState} />}
      {badge}
    </div>
  )
}

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
              {isDone && <CheckmarkCircle20Filled className={styles.stepCheckIcon} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const QUALITY_CONFIG = {
  excellent: { color: tokens.colorPaletteGreenForeground1, label: 'Excellent', bg: tokens.colorPaletteGreenBackground1 },
  good: { color: tokens.colorPaletteGreenForeground2, label: 'Good', bg: tokens.colorPaletteGreenBackground1 },
  fair: { color: tokens.colorPaletteYellowForeground1, label: 'Fair', bg: tokens.colorPaletteYellowBackground1 },
  poor: { color: tokens.colorPaletteRedForeground1, label: 'Poor', bg: tokens.colorPaletteRedBackground1 },
} as const

export default function SystemCheckPage() {
  const styles = useSystemCheckStyles()
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

  useEffect(() => {
    const saved = sessionStorage.getItem(SETUP_STORAGE_KEY)
    if (!saved) navigate('/', { replace: true })
  }, [navigate])

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
    const rawSetup = sessionStorage.getItem(SETUP_STORAGE_KEY)
    const photo = sessionStorage.getItem(PHOTO_STORAGE_KEY)
    if (!rawSetup || !photo) return

    const candidate = JSON.parse(rawSetup) as CandidateFormData
    await networkCheck.runAll(candidate, photo)
  }, [networkCheck])

  useEffect(() => {
    if (currentStep === 'network' && networkCheck.latencyStatus === 'idle') {
      startNetworkCheck()
    }
  }, [currentStep, networkCheck.latencyStatus, startNetworkCheck])

  const handleStartExam = useCallback(() => {
    if (!networkCheck.sessionId) return
    stopAll()
    navigate(`/exam/${networkCheck.sessionId}`)
  }, [navigate, networkCheck.sessionId, stopAll])

  return (
    <div className={`${styles.pageContainer} animate-fade-in`}>
      <div className={styles.topToggle}>
        <ThemeToggle />
      </div>

      <div className={styles.headerWrapper}>
        <div className={styles.headerIconBox}>
          <ShieldCheckmark24Filled />
        </div>
        <Title1 className={styles.headerTitle}>System Check</Title1>
        <Text className={styles.headerSubtitle}>
          Verify your hardware and connection before starting the exam.
        </Text>
      </div>

      <StepProgress current={currentStep} />

      {/* STEP 1: Camera */}
      {currentStep === 'camera' && (
        <Card className={`${styles.card} animate-fade-in shadow-lg`}>
          <CardHeaderSection
            icon={<Camera20Regular />}
            title="Camera Check"
            subtitle="Allow camera access to continue"
            statusState={cameraState}
          />

          <div className={styles.cameraPreviewBox}>
            <video
              ref={videoRef}
              id="camera-preview"
              autoPlay
              playsInline
              muted
              className={styles.videoFull}
              style={{ display: cameraState === 'granted' ? 'block' : 'none' }}
            />

            {cameraState !== 'granted' && (
              <div className={styles.cameraOverlay}>
                <Camera20Regular className={styles.cameraIconLarge} />
                {cameraState === 'idle' && (
                  <Text className={styles.overlayTextNeutral}>
                    Click below to enable your camera
                  </Text>
                )}
                {cameraState === 'pending' && (
                  <Text className={styles.overlayTextNeutral}>
                    Waiting for camera permission…
                  </Text>
                )}
                {(cameraState === 'denied' || cameraState === 'error') && (
                  <Text className={styles.overlayTextError}>
                    Camera access was blocked. Please allow it in your browser settings.
                  </Text>
                )}
              </div>
            )}

            {cameraState === 'granted' && (
              <div className={styles.liveBadge}>
                <span className="pulse-dot" />
                <span className={styles.liveBadgeText}>LIVE</span>
              </div>
            )}
          </div>

          {(cameraState === 'idle' || cameraState === 'denied' || cameraState === 'error') && (
            <Button
              id="btn-enable-camera"
              appearance="primary"
              size="large"
              className={styles.fullWidthBtn}
              onClick={requestCamera}
              icon={<Camera20Regular />}
            >
              {cameraState === 'idle' ? 'Enable Camera' : 'Retry Camera Access'}
            </Button>
          )}
          {cameraState === 'pending' && (
            <Button id="btn-camera-waiting" appearance="primary" size="large" className={styles.fullWidthBtn} disabled icon={<Spinner size="extra-tiny" />}>
              Waiting for permission…
            </Button>
          )}
          {cameraState === 'granted' && (
            <Button
              id="btn-camera-next"
              appearance="primary"
              size="large"
              className={styles.fullWidthBtn}
              onClick={handleCameraNext}
              icon={<ArrowRight20Filled />}
              iconPosition="after"
            >
              Camera Ready — Continue
            </Button>
          )}
        </Card>
      )}

      {/* STEP 2: Microphone */}
      {currentStep === 'microphone' && (
        <Card className={`${styles.card} animate-fade-in shadow-lg`}>
          <CardHeaderSection
            icon={<Mic20Regular />}
            title="Microphone Check"
            subtitle="Speak to verify your microphone is working"
            statusState={micState}
          />

          <div className={styles.micBox}>
            {micState === 'granted' ? (
              <>
                <div className={styles.wFull}>
                  <VolumeBar level={volumeLevel} />
                </div>
                <Text className={styles.overlayTextNeutral}>
                  {volumeLevel < 5
                    ? 'Speak into your microphone to test…'
                    : volumeLevel < 35
                      ? '🎤 Detecting voice…'
                      : '✅ Microphone is working!'}
                </Text>
                <div className={styles.volumeBadge}>
                  <span className={styles.volumeBadgeLabel}>Volume</span>
                  <span
                    className={styles.volumeBadgeValue}
                    style={{
                      color:
                        volumeLevel > 35
                          ? tokens.colorPaletteGreenForeground1
                          : volumeLevel > 10
                            ? tokens.colorPaletteYellowForeground1
                            : tokens.colorNeutralForeground3,
                    }}
                  >
                    {volumeLevel}%
                  </span>
                </div>
              </>
            ) : micState === 'idle' ? (
              <>
                <Mic20Regular className={styles.micIconLarge} />
                <Text className={styles.overlayTextNeutral}>
                  Click the button below to test your microphone
                </Text>
              </>
            ) : micState === 'pending' ? (
              <>
                <Spinner size="medium" />
                <Text className={styles.overlayTextNeutral}>
                  Waiting for microphone permission…
                </Text>
              </>
            ) : (
              <>
                <DismissCircle20Filled className={styles.micIconError} />
                <Text className={styles.overlayTextError}>
                  Microphone access was blocked. Please allow access in your browser settings.
                </Text>
              </>
            )}
          </div>

          {(micState === 'idle' || micState === 'denied' || micState === 'error') && (
            <Button
              id="btn-enable-mic"
              appearance="primary"
              size="large"
              className={styles.fullWidthBtn}
              onClick={requestMic}
              icon={<Mic20Regular />}
            >
              {micState === 'idle' ? 'Enable Microphone' : 'Retry Microphone Access'}
            </Button>
          )}
          {micState === 'pending' && (
            <Button id="btn-mic-waiting" appearance="primary" size="large" className={styles.fullWidthBtn} disabled icon={<Spinner size="extra-tiny" />}>
              Waiting for permission…
            </Button>
          )}
          {micState === 'granted' && (
            <Button
              id="btn-mic-next"
              appearance="primary"
              size="large"
              className={styles.fullWidthBtn}
              onClick={handleMicNext}
              disabled={volumeLevel === 0}
              icon={volumeLevel > 0 ? <ArrowRight20Filled /> : undefined}
              iconPosition="after"
            >
              {volumeLevel === 0 ? 'Say something to verify…' : 'Microphone Ready — Continue'}
            </Button>
          )}
        </Card>
      )}

      {/* STEP 3: Photo Capture */}
      {currentStep === 'photo' && (
        <Card className={`${styles.card} animate-fade-in shadow-lg`}>
          <CardHeaderSection
            icon={<Person20Regular />}
            title="Reference Photo"
            subtitle="Used for identity verification during the exam"
            badge={
              photoPreview ? (
                <Badge appearance="filled" color="success">
                  Captured ✓
                </Badge>
              ) : undefined
            }
          />

          <div
            className={`${styles.photoPreviewBox} ${photoPreview ? styles.photoPreviewBoxCaptured : styles.photoPreviewBoxIdle
              }`}
          >
            {photoPreview ? (
              <img
                id="photo-preview"
                src={photoPreview}
                alt="Reference portrait"
                className={styles.videoFull}
              />
            ) : (
              <video
                ref={videoRef}
                id="photo-camera-preview"
                autoPlay
                playsInline
                muted
                className={styles.videoFull}
              />
            )}

            {!photoPreview && (
              <div className={styles.photoGuideOverlay}>
                <div className={styles.photoOvalGuide} />
              </div>
            )}

            {photoPreview && (
              <div className={styles.photoCapturedBadge}>
                <CheckmarkCircle20Filled className={styles.statusSuccess} />
                <span className={styles.photoCapturedBadgeText}>Captured</span>
              </div>
            )}
          </div>

          {photoError && (
            <div className={styles.photoErrorBox}>
              <DismissCircle20Filled className={styles.statusError} />
              <div>
                <Text className={styles.photoErrorTitle}>Photo Rejected</Text>
                <Text className={styles.photoErrorText}>{photoError}</Text>
              </div>
            </div>
          )}

          {!photoPreview && (
            <ul className={styles.tipsList}>
              {['Centre your face inside the oval guide', 'Ensure the room is well-lit', 'Remove hats or other face coverings'].map((tip) => (
                <li key={tip} className={styles.tipsListItem}>
                  <span className={styles.tipsListBullet}>›</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}

          {!photoPreview ? (
            <Button
              id="btn-capture-photo"
              appearance="primary"
              size="large"
              className={styles.fullWidthBtn}
              onClick={handleCapture}
              disabled={isValidatingPhoto}
              icon={isValidatingPhoto ? <Spinner size="extra-tiny" /> : <Person20Regular />}
            >
              {isValidatingPhoto ? 'Checking Photo & Alignment…' : 'Capture Reference Photo'}
            </Button>
          ) : (
            <div className={styles.photoActionRow}>
              <Button id="btn-retake-photo" appearance="secondary" size="large" className={styles.flexBtn} onClick={handleRetakePhoto} icon={<ArrowCounterclockwise20Regular />}>
                Retake
              </Button>
              <Button id="btn-photo-next" appearance="primary" size="large" className={styles.flexBtn} onClick={handlePhotoNext} icon={<ArrowRight20Filled />} iconPosition="after">
                Use This Photo
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 4: Network & Backend Handshake */}
      {currentStep === 'network' && (
        <Card className={`${styles.card} animate-fade-in shadow-lg`}>
          <CardHeaderSection
            icon={<Wifi2Regular />}
            title="Connection & Setup"
            subtitle="Checking your internet and registering your session"
          />

          <div className={styles.networkBox}>
            <div className={styles.networkHeaderRow}>
              <Text className={styles.networkHeaderTitle}>Network Latency</Text>
              {networkCheck.latencyStatus === 'running' && (
                <Text className={styles.networkRunningText}>
                  Measuring… ({networkCheck._pingSamples.length}/5)
                </Text>
              )}
              {networkCheck.latencyStatus === 'success' &&
                networkCheck.latencyResult &&
                (() => {
                  const q = networkCheck.latencyResult.quality
                  const cfg = QUALITY_CONFIG[q]
                  return (
                    <span
                      className={styles.networkQualityBadge}
                      style={{
                        background: cfg.bg,
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </span>
                  )
                })()}
            </div>

            <div className={styles.pingBarsContainer}>
              {Array.from({ length: 5 }, (_, i) => {
                const sample = networkCheck._pingSamples[i]
                const hasSample = sample !== undefined
                const heightPct = hasSample ? Math.min(100, Math.max(8, 100 - (Math.min(sample, 500) / 500) * 92)) : 0
                const isGood = hasSample && sample < 200
                return (
                  <div key={i} className={styles.pingBarCol}>
                    <div className={styles.pingBarWrapper}>
                      <div
                        className={styles.pingBarFill}
                        style={{
                          height: hasSample ? `${heightPct}%` : '8px',
                          background: hasSample
                            ? isGood
                              ? tokens.colorPaletteGreenForeground1
                              : tokens.colorPaletteYellowForeground1
                            : tokens.colorNeutralBackground3,
                        }}
                      />
                    </div>
                    <span
                      className={styles.pingBarValue}
                      style={{
                        color: hasSample ? tokens.colorNeutralForeground3 : tokens.colorNeutralForeground4,
                      }}
                    >
                      {hasSample ? `${sample}ms` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>

            {networkCheck.latencyResult && (
              <div className={styles.avgRttRow}>
                <Text className={styles.avgRttLabel}>Average RTT</Text>
                <Text
                  className={styles.avgRttValue}
                  style={{
                    color: QUALITY_CONFIG[networkCheck.latencyResult.quality].color,
                  }}
                >
                  {networkCheck.latencyResult.avgMs} ms
                </Text>
              </div>
            )}
          </div>

          <div className={styles.handshakeContainer}>
            <HandshakeRow
              label="Register Candidate"
              status={networkCheck.createStatus}
              detail={
                networkCheck.createStatus === 'running'
                  ? 'Creating exam session…'
                  : networkCheck.createStatus === 'success'
                    ? 'Session registered successfully'
                    : networkCheck.createStatus === 'error'
                      ? 'Failed to register session'
                      : 'Waiting…'
              }
            />
            <HandshakeRow
              label="Upload Reference Photo"
              status={networkCheck.verifyStatus}
              detail={
                networkCheck.verifyStatus === 'running'
                  ? 'Uploading your photo…'
                  : networkCheck.verifyStatus === 'success'
                    ? 'Identity verified — session is ACTIVE'
                    : networkCheck.verifyStatus === 'error'
                      ? 'Photo upload failed'
                      : 'Waiting for session registration…'
              }
            />
          </div>

          {networkCheck.errorMessage && (
            <div className={styles.networkErrorBox}>
              <DismissCircle20Filled className={styles.statusError} />
              <div>
                <Text className={styles.photoErrorTitle}>Connection Error</Text>
                <Text className={styles.photoErrorText}>{networkCheck.errorMessage}</Text>
              </div>
            </div>
          )}

          {networkCheck.allDone ? (
            <Button
              id="btn-start-exam"
              appearance="primary"
              size="large"
              className={styles.fullWidthBtn}
              onClick={handleStartExam}
              icon={<Play20Filled />}
            >
              Start Exam
            </Button>
          ) : networkCheck.errorMessage ? (
            <Button
              id="btn-retry-network"
              appearance="secondary"
              size="large"
              className={styles.fullWidthBtn}
              onClick={startNetworkCheck}
              icon={<ArrowCounterclockwise20Regular />}
            >
              Retry
            </Button>
          ) : (
            <Button id="btn-network-running" appearance="primary" size="large" className={styles.fullWidthBtn} disabled icon={<Spinner size="extra-tiny" />}>
              Checking…
            </Button>
          )}
        </Card>
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
        Back to candidate form
      </Button>
    </div>
  )
}
