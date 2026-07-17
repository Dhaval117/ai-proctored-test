/**
 * ExamPage.tsx — Story 3.1
 * Main exam interface: camera + question + voice recording.
 * Includes Browser Event Proctoring.
 */
import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Mic, AlertTriangle, Lock, Camera } from 'lucide-react'
import { useProctor } from '../hooks/useProctor'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { ExamDashboard } from '../components/ExamDashboard'

export default function ExamPage() {
  const { id: sessionId } = useParams<{ id: string }>()
  
  const { 
    status, 
    violationCount, 
    maxViolations, 
    showWarningModal, 
    warningMessage, 
    isPaused,
    setIsPaused,
    allowToggle,
    proctoringEnabled,
    dismissWarning,
    handleViolation
  } = useProctor(sessionId)

  const videoRef = useRef<HTMLVideoElement>(null)
  const { isModelsLoaded, hasRefDescriptor } = useFaceDetection(videoRef, handleViolation)

  // Start webcam
  useEffect(() => {
    let stream: MediaStream | null = null
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        console.error('Failed to access camera:', err)
      }
    }
    startCamera()
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  // Prevent Escape key from dismissing the modal natively (if applicable)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showWarningModal && e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true })
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true })
  }, [showWarningModal])

  if (status === 'SUSPENDED') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-8 bg-red-950/20 animate-fade-in text-center">
        <div className="glass-card max-w-lg w-full p-10 text-center" style={{ border: '1px solid var(--color-danger)' }}>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10"
            style={{ border: '1px solid var(--color-danger)' }}>
            <Lock className="h-10 w-10 text-red-500" strokeWidth={1.5} />
          </div>
          <h1 className="mb-4 text-3xl font-bold text-red-500">Exam Suspended</h1>
          <p className="mb-6 text-sm" style={{ color: 'var(--color-surface-300)' }}>
            Your exam session has been locked due to repeated proctoring violations (exceeded {maxViolations} warnings).
          </p>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
            This incident has been logged. Please contact your administrator for further instructions.
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-dvh flex-col items-center justify-center p-8 gradient-bg animate-fade-in relative">
        <div className="glass-card max-w-md w-full p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: 'hsl(230 65% 20%)', border: '1px solid var(--color-brand-500)' }}>
            <Mic className="h-8 w-8" style={{ color: 'var(--color-brand-400)' }} strokeWidth={1.5} />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Examination</h1>
          <p className="mb-8 text-sm" style={{ color: 'var(--color-surface-400)' }}>
            AI-powered verbal interview in progress
          </p>
          
          <div className="mb-4 flex items-center justify-center gap-3 text-sm font-mono">
            <span className="text-yellow-500">
              Violations: {violationCount} / {maxViolations}
            </span>
            {allowToggle ? (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-2.5 py-0.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                  isPaused
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30'
                    : 'bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30'
                }`}
                title="Click to Pause/Resume Proctoring Checks during development"
              >
                Proctoring: {isPaused ? 'PAUSED (DEV)' : 'ACTIVE'}
              </button>
            ) : (
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                  !proctoringEnabled
                    ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                    : 'bg-green-500/20 text-green-300 border-green-500/40'
                }`}
              >
                Proctoring: {!proctoringEnabled ? 'DISABLED (SERVER)' : 'ACTIVE'}
              </span>
            )}
          </div>

          <ExamDashboard sessionId={sessionId!} />
          
          <div className="mt-8 text-xs text-left" style={{ color: 'var(--color-surface-400)' }}>
            <p>Try the following to test proctoring:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Switch away to another tab</li>
              <li>Try to Copy or Paste text</li>
              <li>Right-click or press F12</li>
            </ul>
            <p className="mt-4">
              AI Face Detection status:{' '}
              <span className={isModelsLoaded ? "text-green-400" : "text-yellow-400"}>
                {isModelsLoaded ? (hasRefDescriptor ? 'Active (Monitoring)' : 'Active (No Ref Photo)') : 'Loading Models...'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* PiP Camera Feed */}
      <div className="fixed bottom-8 right-8 z-40 overflow-hidden rounded-full shadow-2xl border-4" 
        style={{ width: 160, height: 160, borderColor: 'var(--color-surface-700)', backgroundColor: 'var(--color-surface-900)' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* Loading overlay for models */}
        {(!isModelsLoaded || !hasRefDescriptor) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-xs text-white">
            <Camera className="h-5 w-5 mb-1 animate-pulse" />
            <span className="px-2 text-center">Loading AI...</span>
          </div>
        )}
      </div>

      {/* Full-Screen Warning Modal Overlay */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-md w-full p-8 text-center animate-slide-up" style={{ border: '1px solid var(--color-warning)' }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-500/10"
              style={{ border: '1px solid var(--color-warning)' }}>
              <AlertTriangle className="h-8 w-8 text-yellow-500" strokeWidth={1.5} />
            </div>
            <h2 className="mb-2 text-xl font-bold text-yellow-500">Proctoring Warning</h2>
            
            <p className="mb-6 text-sm" style={{ color: 'var(--color-surface-300)' }}>
              {warningMessage || 'A proctoring violation was detected.'}
            </p>
            
            <div className="mb-8 font-mono text-sm bg-yellow-500/10 p-3 rounded border border-yellow-500/20 text-yellow-400">
              Warning {violationCount} of {maxViolations}
            </div>

            <button 
              className="btn-primary w-full bg-yellow-600 hover:bg-yellow-500 border-none text-white" 
              onClick={dismissWarning}
            >
              I Understand — Return to Exam
            </button>
          </div>
        </div>
      )}
    </>
  )
}
