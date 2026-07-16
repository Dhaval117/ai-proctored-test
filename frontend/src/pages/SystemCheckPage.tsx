/**
 * SystemCheckPage.tsx — Story 2.2 + 2.3
 *
 * Four-step system check wizard:
 *   Step 1 — Camera:      Request webcam permission + live preview
 *   Step 2 — Microphone:  Request mic permission + Web Audio API volume bar
 *   Step 3 — Photo:       Capture reference portrait from webcam
 *   Step 4 — Network:     Ping latency check + session create + verify handshake
 *
 * On completion, stores the base64 reference photo in sessionStorage
 * and navigates to /exam/{session_id}.
 *
 * If candidate data is missing from sessionStorage (direct navigation),
 * redirects back to the setup page.
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera,
  Mic,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  RefreshCw,
  User,
  ArrowLeft,
  Wifi,
  AlertCircle,
  Play,
} from 'lucide-react'

import { useMediaCheck } from '../hooks/useMediaCheck'
import { useNetworkCheck } from '../lib/useNetworkCheck'
import type { CheckStatus } from '../lib/useNetworkCheck'
import { validateReferencePhoto, ensureFaceApiModelsLoaded } from '../lib/photoValidation'
import { SETUP_STORAGE_KEY, type CandidateFormData } from './SetupPage'

export const PHOTO_STORAGE_KEY = 'proctor_photo'

// ── Step definitions ──────────────────────────────────────────────────────────

type Step = 'camera' | 'microphone' | 'photo' | 'network'

const STEPS: { id: Step; label: string }[] = [
  { id: 'camera',     label: 'Camera'      },
  { id: 'microphone', label: 'Microphone'  },
  { id: 'photo',      label: 'Photo'       },
  { id: 'network',    label: 'Network'     },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function VolumeBar({ level }: { level: number }) {
  const bars   = 24
  const filled = Math.round((level / 100) * bars)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '48px' }}
      aria-label={`Volume level: ${level}%`}>
      {Array.from({ length: bars }, (_, i) => {
        const active   = i < filled
        const hue      = active ? Math.max(0, 120 - i * 5) : 0
        const heightPct = 20 + (i / bars) * 80
        return (
          <div
            key={i}
            style={{
              flex:       1,
              height:     `${heightPct}%`,
              borderRadius: '3px',
              background: active
                ? `hsl(${hue} 75% 52%)`
                : 'var(--color-surface-700)',
              transition: 'background 60ms ease',
            }}
          />
        )
      })}
    </div>
  )
}

function StatusIcon({ state }: { state: string }) {
  if (state === 'pending' || state === 'running')
    return <Loader2    style={{ width: '18px', height: '18px', color: 'var(--color-brand-400)' }} className="animate-spin" />
  if (state === 'granted' || state === 'success')
    return <CheckCircle2 style={{ width: '18px', height: '18px', color: 'var(--color-success)' }} />
  if (state === 'denied' || state === 'error')
    return <XCircle    style={{ width: '18px', height: '18px', color: 'var(--color-danger)' }} />
  return null
}

/** Small icon+label pill for each backend handshake phase */
function HandshakeRow({
  label,
  status,
  detail,
}: {
  label:  string
  status: CheckStatus
  detail?: string
}) {
  const color =
    status === 'success' ? 'var(--color-success)'
    : status === 'error' ? 'var(--color-danger)'
    : status === 'running' ? 'var(--color-brand-400)'
    : 'var(--color-surface-400)'

  return (
    <div style={{
      display:    'flex', alignItems: 'center', gap: '12px',
      padding:    '12px 16px',
      borderRadius: '10px',
      background: 'var(--color-surface-800)',
      border:     `1px solid ${status === 'success' ? 'hsl(145 65% 42% / 0.25)' : status === 'error' ? 'hsl(0 70% 55% / 0.25)' : 'var(--color-surface-700)'}`,
      transition: 'border-color 300ms ease',
    }}>
      <StatusIcon state={status} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color }}>{label}</p>
        {detail && (
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-surface-400)', marginTop: '2px' }}>{detail}</p>
        )}
      </div>
    </div>
  )
}

// ── Card icon header ──────────────────────────────────────────────────────────

function CardHeader({
  icon: Icon,
  title,
  subtitle,
  statusState,
  badge,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  statusState?: string
  badge?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
      <div style={{
        width: '38px', height: '38px', borderRadius: '10px',
        background: 'hsl(230 65% 52% / 0.12)',
        border: '1px solid hsl(230 65% 52% / 0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon style={{ width: '18px', height: '18px', color: 'var(--color-brand-400)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-surface-400)', margin: 0 }}>{subtitle}</p>
      </div>
      {statusState && <StatusIcon state={statusState} />}
      {badge}
    </div>
  )
}

// ── Step progress header ──────────────────────────────────────────────────────

function StepProgress({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.id === current)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
      {/* Pill track */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {STEPS.map((s, i) => {
          const isDone   = i < idx
          const isActive = i === idx
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width:        isActive ? '32px' : '10px',
                height:       '10px',
                borderRadius: '9999px',
                background:   isDone
                  ? 'var(--color-success)'
                  : isActive
                  ? 'var(--color-brand-500)'
                  : 'var(--color-surface-700)',
                transition:   'all 350ms cubic-bezier(0.4,0,0.2,1)',
                boxShadow:    isActive ? 'var(--glow-brand)' : 'none',
              }} />
              {i < STEPS.length - 1 && (
                <div style={{
                  width: '36px', height: '2px', borderRadius: '9999px',
                  background: isDone ? 'var(--color-success)' : 'var(--color-surface-700)',
                  transition: 'background 350ms ease',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
        {STEPS.map((s, i) => {
          const isDone   = i < idx
          const isActive = i === idx
          // Width calculation: 32px active pill + 36px connector + 8px gap per step
          const stepWidth = i < STEPS.length - 1 ? '76px' : '42px'
          return (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: stepWidth }}>
              <span style={{
                fontSize: '0.6875rem', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: isActive
                  ? 'var(--color-surface-50)'
                  : isDone
                  ? 'var(--color-success)'
                  : 'var(--color-surface-600)',
                whiteSpace: 'nowrap',
              }}>
                {s.label}
              </span>
              {isDone && (
                <CheckCircle2 style={{ width: '12px', height: '12px', marginTop: '3px', color: 'var(--color-success)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Latency quality helpers ───────────────────────────────────────────────────

const QUALITY_CONFIG = {
  excellent: { color: 'var(--color-success)',  label: 'Excellent', bg: 'hsl(145 65% 14%)' },
  good:      { color: 'hsl(145 65% 52%)',      label: 'Good',      bg: 'hsl(145 65% 10%)' },
  fair:      { color: 'var(--color-warning)',  label: 'Fair',      bg: 'hsl(38 90% 12%)'  },
  poor:      { color: 'var(--color-danger)',   label: 'Poor',      bg: 'hsl(0 70% 12%)'   },
} as const

// ── Main component ────────────────────────────────────────────────────────────

export default function SystemCheckPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const {
    cameraState, micState, volumeLevel, cameraStream,
    requestCamera, requestMic, capturePhoto, stopAll,
  } = useMediaCheck()

  const networkCheck = useNetworkCheck() as ReturnType<typeof useNetworkCheck> & { _pingSamples: number[] }

  const [currentStep,       setCurrentStep]       = useState<Step>('camera')
  const [photoPreview,      setPhotoPreview]      = useState<string | null>(null)
  const [photoError,        setPhotoError]        = useState<string | null>(null)
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false)

  // ── Guard: redirect if setup data missing ─────────────────────────────────

  useEffect(() => {
    const saved = sessionStorage.getItem(SETUP_STORAGE_KEY)
    if (!saved) navigate('/', { replace: true })
  }, [navigate])

  // ── Preload face-api models when entering Step 3 ──────────────────────────

  useEffect(() => {
    if (currentStep === 'photo') {
      ensureFaceApiModelsLoaded().catch(err => console.error('Failed to preload face-api models:', err))
    }
  }, [currentStep])

  // ── Attach camera stream to whichever <video> is currently mounted ────────

  useEffect(() => {
    const video = videoRef.current
    if (!video || !cameraStream) return
    if (video.srcObject !== cameraStream) {
      video.srcObject = cameraStream
    }
  }, [cameraStream, currentStep, photoPreview])

  // ── Step navigation ───────────────────────────────────────────────────────

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
        setPhotoError(validation.reason || 'Reference photo rejected. Please align your face inside the oval guide and ensure clear lighting.')
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

  // ── Network check: kick off all phases ────────────────────────────────────

  const startNetworkCheck = useCallback(async () => {
    const rawSetup = sessionStorage.getItem(SETUP_STORAGE_KEY)
    const photo    = sessionStorage.getItem(PHOTO_STORAGE_KEY)
    if (!rawSetup || !photo) return

    const candidate = JSON.parse(rawSetup) as CandidateFormData
    await networkCheck.runAll(candidate, photo)
  }, [networkCheck])

  // Auto-start once Step 4 mounts
  useEffect(() => {
    if (currentStep === 'network' && networkCheck.latencyStatus === 'idle') {
      startNetworkCheck()
    }
  }, [currentStep, networkCheck.latencyStatus, startNetworkCheck])

  // Navigate to exam once all done
  const handleStartExam = useCallback(() => {
    if (!networkCheck.sessionId) return
    stopAll()
    navigate(`/exam/${networkCheck.sessionId}`)
  }, [navigate, networkCheck.sessionId, stopAll])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-dvh gradient-bg animate-fade-in"
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px 24px',
      }}
    >
      {/* ── Page header ── */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '18px',
          background: 'hsl(145 65% 14%)',
          border:     '1px solid hsl(145 65% 42% / 0.35)',
          display:    'flex', alignItems: 'center', justifyContent: 'center',
          margin:     '0 auto 16px',
        }}>
          <ShieldCheck style={{ width: '28px', height: '28px', color: 'var(--color-success)' }} strokeWidth={1.5} />
        </div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '8px' }}>System Check</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', maxWidth: '360px', margin: '0 auto' }}>
          Verify your hardware and connection before starting the exam.
        </p>
      </div>

      {/* ── Step progress ── */}
      <StepProgress current={currentStep} />

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1: Camera
          ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 'camera' && (
        <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
          <CardHeader
            icon={Camera}
            title="Camera Check"
            subtitle="Allow camera access to continue"
            statusState={cameraState}
          />

          {/* Preview box */}
          <div style={{
            position: 'relative', aspectRatio: '16/9',
            borderRadius: '14px', overflow: 'hidden',
            background: 'var(--color-surface-900)',
            border:     '1px solid var(--color-surface-700)',
            marginBottom: '24px',
          }}>
            <video
              ref={videoRef}
              id="camera-preview"
              autoPlay playsInline muted
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraState === 'granted' ? 'block' : 'none' }}
            />

            {cameraState !== 'granted' && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px',
              }}>
                <Camera style={{ width: '48px', height: '48px', color: 'var(--color-surface-600)' }} strokeWidth={1} />
                {cameraState === 'idle' && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textAlign: 'center' }}>
                    Click below to enable your camera
                  </p>
                )}
                {cameraState === 'pending' && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', textAlign: 'center' }}>
                    Waiting for camera permission…
                  </p>
                )}
                {(cameraState === 'denied' || cameraState === 'error') && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-danger)', textAlign: 'center' }}>
                    Camera access was blocked. Please allow it in your browser settings.
                  </p>
                )}
              </div>
            )}

            {cameraState === 'granted' && (
              <div style={{
                position: 'absolute', top: '12px', left: '12px',
                display: 'flex', alignItems: 'center', gap: '7px',
                background: 'hsl(0 0% 0% / 0.65)',
                backdropFilter: 'blur(6px)',
                borderRadius: '9999px', padding: '5px 10px',
              }}>
                <span className="pulse-dot" />
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'white', letterSpacing: '0.08em' }}>LIVE</span>
              </div>
            )}
          </div>

          {(cameraState === 'idle' || cameraState === 'denied' || cameraState === 'error') && (
            <button id="btn-enable-camera" className="btn-primary" style={{ width: '100%' }} onClick={requestCamera}>
              <Camera style={{ width: '16px', height: '16px' }} />
              {cameraState === 'idle' ? 'Enable Camera' : 'Retry Camera Access'}
            </button>
          )}
          {cameraState === 'pending' && (
            <button id="btn-camera-waiting" className="btn-primary" style={{ width: '100%' }} disabled>
              <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
              Waiting for permission…
            </button>
          )}
          {cameraState === 'granted' && (
            <button id="btn-camera-next" className="btn-primary" style={{ width: '100%' }} onClick={handleCameraNext}>
              Camera Ready — Continue
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2: Microphone
          ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 'microphone' && (
        <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
          <CardHeader
            icon={Mic}
            title="Microphone Check"
            subtitle="Speak to verify your microphone is working"
            statusState={micState}
          />

          <div style={{
            borderRadius: '14px', background: 'var(--color-surface-900)',
            border: '1px solid var(--color-surface-700)',
            padding: '28px 24px', marginBottom: '24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
            minHeight: '148px', justifyContent: 'center',
          }}>
            {micState === 'granted' ? (
              <>
                <div style={{ width: '100%' }}><VolumeBar level={volumeLevel} /></div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)', margin: 0 }}>
                  {volumeLevel < 5
                    ? 'Speak into your microphone to test…'
                    : volumeLevel < 35
                    ? '🎤 Detecting voice…'
                    : '✅ Microphone is working!'}
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'var(--color-surface-800)',
                  border: '1px solid var(--color-surface-700)',
                  borderRadius: '9999px', padding: '6px 14px',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-surface-400)' }}>Volume</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 700,
                    color: volumeLevel > 35 ? 'var(--color-success)' : volumeLevel > 10 ? 'var(--color-warning)' : 'var(--color-surface-400)',
                    minWidth: '3.5ch', textAlign: 'right', transition: 'color 200ms ease',
                  }}>
                    {volumeLevel}%
                  </span>
                </div>
              </>
            ) : micState === 'idle' ? (
              <>
                <Mic style={{ width: '40px', height: '40px', color: 'var(--color-surface-600)' }} strokeWidth={1} />
                <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>Click the button below to test your microphone</p>
              </>
            ) : micState === 'pending' ? (
              <>
                <Loader2 style={{ width: '40px', height: '40px', color: 'var(--color-brand-400)' }} strokeWidth={1} className="animate-spin" />
                <p style={{ fontSize: '0.875rem', color: 'var(--color-surface-400)' }}>Waiting for microphone permission…</p>
              </>
            ) : (
              <>
                <XCircle style={{ width: '40px', height: '40px', color: 'var(--color-danger)' }} strokeWidth={1} />
                <p style={{ fontSize: '0.875rem', color: 'var(--color-danger)', textAlign: 'center' }}>
                  Microphone access was blocked. Please allow access in your browser settings.
                </p>
              </>
            )}
          </div>

          {(micState === 'idle' || micState === 'denied' || micState === 'error') && (
            <button id="btn-enable-mic" className="btn-primary" style={{ width: '100%' }} onClick={requestMic}>
              <Mic style={{ width: '16px', height: '16px' }} />
              {micState === 'idle' ? 'Enable Microphone' : 'Retry Microphone Access'}
            </button>
          )}
          {micState === 'pending' && (
            <button id="btn-mic-waiting" className="btn-primary" style={{ width: '100%' }} disabled>
              <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
              Waiting for permission…
            </button>
          )}
          {micState === 'granted' && (
            <button id="btn-mic-next" className="btn-primary" style={{ width: '100%' }}
              onClick={handleMicNext} disabled={volumeLevel === 0}>
              {volumeLevel === 0 ? 'Say something to verify…' : 'Microphone Ready — Continue'}
              {volumeLevel > 0 && <ChevronRight style={{ width: '16px', height: '16px' }} />}
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 3: Photo Capture
          ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 'photo' && (
        <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
          <CardHeader
            icon={User}
            title="Reference Photo"
            subtitle="Used for identity verification during the exam"
            badge={photoPreview ? <span className="badge badge-success">Captured ✓</span> : undefined}
          />

          {/* Preview box */}
          <div style={{
            position: 'relative', aspectRatio: '4/3',
            borderRadius: '14px', overflow: 'hidden',
            background: 'var(--color-surface-900)',
            border: photoPreview
              ? '2px solid hsl(145 65% 42% / 0.6)'
              : '1px solid var(--color-surface-700)',
            marginBottom: '16px',
            transition: 'border-color 300ms ease',
          }}>
            {photoPreview ? (
              <img
                id="photo-preview"
                src={photoPreview}
                alt="Reference portrait"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <video
                ref={videoRef}
                id="photo-camera-preview"
                autoPlay playsInline muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}

            {/* Face oval guide */}
            {!photoPreview && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: '38%', height: '70%', borderRadius: '50%',
                  border: '2px dashed hsl(230 65% 60% / 0.85)',
                  boxShadow: '0 0 0 9999px hsl(0 0% 0% / 0.3)',
                }} />
              </div>
            )}

            {/* Captured chip — bottom-right, does NOT cover photo */}
            {photoPreview && (
              <div style={{
                position: 'absolute', bottom: '12px', right: '12px',
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'hsl(145 65% 10% / 0.90)',
                border: '1px solid hsl(145 65% 42% / 0.5)',
                borderRadius: '9999px', padding: '5px 12px',
                backdropFilter: 'blur(6px)',
              }}>
                <CheckCircle2 style={{ width: '14px', height: '14px', color: 'var(--color-success)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-success)' }}>Captured</span>
              </div>
            )}
          </div>

          {photoError && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'hsl(0 70% 12%)', border: '1px solid hsl(0 70% 35% / 0.5)',
              borderRadius: '10px', padding: '12px 14px', marginBottom: '16px',
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--color-danger)', flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                  Photo Rejected
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(0 70% 65%)' }}>
                  {photoError}
                </p>
              </div>
            </div>
          )}

          {!photoPreview && (
            <ul style={{ marginBottom: '20px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                'Centre your face inside the oval guide',
                'Ensure the room is well-lit',
                'Remove hats or other face coverings',
              ].map(tip => (
                <li key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8125rem', color: 'var(--color-surface-400)' }}>
                  <span style={{ color: 'var(--color-brand-400)', flexShrink: 0, lineHeight: 1.6 }}>›</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}

          {!photoPreview ? (
            <button
              id="btn-capture-photo"
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={handleCapture}
              disabled={isValidatingPhoto}
            >
              {isValidatingPhoto ? (
                <>
                  <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
                  Checking Photo & Alignment…
                </>
              ) : (
                <>
                  <Camera style={{ width: '16px', height: '16px' }} />
                  Capture Reference Photo
                </>
              )}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button id="btn-retake-photo" className="btn-secondary" style={{ flex: 1 }} onClick={handleRetakePhoto}>
                <RefreshCw style={{ width: '16px', height: '16px' }} />
                Retake
              </button>
              <button id="btn-photo-next" className="btn-primary" style={{ flex: 1 }} onClick={handlePhotoNext}>
                Use This Photo
                <ChevronRight style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 4: Network & Backend Handshake
          ══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 'network' && (
        <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', padding: '32px' }}>
          <CardHeader
            icon={Wifi}
            title="Connection & Setup"
            subtitle="Checking your internet and registering your session"
          />

          {/* ── Latency section ── */}
          <div style={{
            borderRadius: '14px', background: 'var(--color-surface-900)',
            border: '1px solid var(--color-surface-700)',
            padding: '20px 20px 16px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-surface-200)' }}>
                Network Latency
              </span>
              {networkCheck.latencyStatus === 'running' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-brand-400)' }}>
                  Measuring… ({networkCheck._pingSamples.length}/5)
                </span>
              )}
              {networkCheck.latencyStatus === 'success' && networkCheck.latencyResult && (() => {
                const q = networkCheck.latencyResult.quality
                const cfg = QUALITY_CONFIG[q]
                return (
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: cfg.bg, color: cfg.color,
                    border: `1px solid ${cfg.color}40`,
                    borderRadius: '9999px', padding: '3px 10px',
                  }}>
                    {cfg.label}
                  </span>
                )
              })()}
            </div>

            {/* Live ping bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '48px', marginBottom: '12px' }}>
              {Array.from({ length: 5 }, (_, i) => {
                const sample = networkCheck._pingSamples[i]
                const hasSample = sample !== undefined
                const heightPct = hasSample
                  ? Math.min(100, Math.max(8, 100 - (Math.min(sample, 500) / 500) * 92))
                  : 0
                const isGood = hasSample && sample < 200
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '100%', height: '36px',
                      display: 'flex', alignItems: 'flex-end',
                    }}>
                      <div style={{
                        width: '100%', borderRadius: '4px',
                        height: hasSample ? `${heightPct}%` : '8px',
                        background: hasSample
                          ? (isGood ? 'var(--color-success)' : 'var(--color-warning)')
                          : 'var(--color-surface-700)',
                        transition: 'height 300ms ease, background 300ms ease',
                        minHeight: '4px',
                      }} />
                    </div>
                    <span style={{
                      fontSize: '0.625rem', fontFamily: 'var(--font-mono)',
                      color: hasSample ? 'var(--color-surface-400)' : 'var(--color-surface-700)',
                    }}>
                      {hasSample ? `${sample}ms` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Average result */}
            {networkCheck.latencyResult && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-surface-700)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-surface-400)' }}>Average RTT</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700,
                  color: QUALITY_CONFIG[networkCheck.latencyResult.quality].color,
                }}>
                  {networkCheck.latencyResult.avgMs} ms
                </span>
              </div>
            )}
          </div>

          {/* ── Handshake rows ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <HandshakeRow
              label="Register Candidate"
              status={networkCheck.createStatus}
              detail={
                networkCheck.createStatus === 'running' ? 'Creating exam session…'
                : networkCheck.createStatus === 'success' ? 'Session registered successfully'
                : networkCheck.createStatus === 'error' ? 'Failed to register session'
                : 'Waiting…'
              }
            />
            <HandshakeRow
              label="Upload Reference Photo"
              status={networkCheck.verifyStatus}
              detail={
                networkCheck.verifyStatus === 'running' ? 'Uploading your photo…'
                : networkCheck.verifyStatus === 'success' ? 'Identity verified — session is ACTIVE'
                : networkCheck.verifyStatus === 'error' ? 'Photo upload failed'
                : 'Waiting for session registration…'
              }
            />
          </div>

          {/* ── Error banner ── */}
          {networkCheck.errorMessage && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              background: 'hsl(0 70% 12%)', border: '1px solid hsl(0 70% 35% / 0.5)',
              borderRadius: '10px', padding: '12px 14px', marginBottom: '20px',
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--color-danger)', flexShrink: 0, marginTop: '1px' }} />
              <div>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                  Connection Error
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(0 70% 65%)' }}>
                  {networkCheck.errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          {networkCheck.allDone ? (
            <button id="btn-start-exam" className="btn-primary" style={{ width: '100%' }} onClick={handleStartExam}>
              <Play style={{ width: '16px', height: '16px' }} />
              Start Exam
            </button>
          ) : networkCheck.errorMessage ? (
            <button id="btn-retry-network" className="btn-secondary" style={{ width: '100%' }} onClick={startNetworkCheck}>
              <RefreshCw style={{ width: '16px', height: '16px' }} />
              Retry
            </button>
          ) : (
            <button id="btn-network-running" className="btn-primary" style={{ width: '100%' }} disabled>
              <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
              Checking…
            </button>
          )}
        </div>
      )}

      {/* ── Back link ── */}
      <button
        id="btn-back-to-setup"
        type="button"
        style={{
          marginTop: '24px', display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '0.875rem', color: 'var(--color-surface-400)',
          background: 'none', border: 'none', cursor: 'pointer',
          transition: 'color var(--transition-fast)', padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-surface-200)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-surface-400)')}
        onClick={() => { stopAll(); navigate('/') }}
      >
        <ArrowLeft style={{ width: '14px', height: '14px' }} />
        Back to candidate form
      </button>
    </div>
  )
}
