import { useState, useEffect, useRef, useCallback } from 'react'
import { api, type ViolationType, type SeverityLevel, type ExamStatus } from '../lib/api'

export interface ProctorState {
  violationCount: number
  maxViolations: number
  status: ExamStatus
  warningMessage: string | null
  showWarningModal: boolean
  isPaused: boolean
  proctoringEnabled: boolean
  allowToggle: boolean
}

export interface ProctorActions {
  dismissWarning: () => void
  handleViolation: (type: ViolationType, severity: SeverityLevel, snapshot?: string) => Promise<void>
  setIsPaused: (paused: boolean) => void
}

const DEBOUNCE_MS = 500

export function useProctor(sessionId: string | undefined): ProctorState & ProctorActions {
  const [violationCount, setViolationCount] = useState(0)
  const [maxViolations, setMaxViolations] = useState(3)
  const [status, setStatus] = useState<ExamStatus>('ACTIVE')
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [proctoringEnabled, setProctoringEnabled] = useState(true)
  const [allowToggle, setAllowToggle] = useState(false)
  
  // Default paused to true in development mode unless explicitly unpaused (do not pause in unit tests)
  const [isPaused, setIsPausedState] = useState<boolean>(() => {
    const saved = localStorage.getItem('PAUSE_PROCTORING')
    if (saved !== null) return saved === 'true'
    return Boolean(import.meta.env.DEV && !import.meta.env.TEST)
  })

  // We use refs to avoid re-binding event listeners on every state change
  const isSuspended = useRef(false)
  const lastEventTime = useRef(0)
  const isPausedRef = useRef(isPaused)
  isPausedRef.current = isPaused

  const proctoringEnabledRef = useRef(proctoringEnabled)
  proctoringEnabledRef.current = proctoringEnabled

  const allowToggleRef = useRef(allowToggle)
  allowToggleRef.current = allowToggle

  useEffect(() => {
    let mounted = true
    async function fetchConfig() {
      try {
        const config = await api.getProctoringConfig()
        if (!mounted) return
        setProctoringEnabled(config.proctoring_enabled)
        setAllowToggle(config.allow_toggle)
        if (!config.proctoring_enabled) {
          setIsPausedState(true)
        } else if (!config.allow_toggle) {
          setIsPausedState(false)
          localStorage.removeItem('PAUSE_PROCTORING')
        }
      } catch (err) {
        console.error('Failed to fetch proctoring config:', err)
      }
    }
    fetchConfig()
    return () => {
      mounted = false
    }
  }, [sessionId])

  const setIsPaused = useCallback((paused: boolean) => {
    if (!allowToggleRef.current) return
    setIsPausedState(paused)
    localStorage.setItem('PAUSE_PROCTORING', paused ? 'true' : 'false')
  }, [])

  const handleViolation = useCallback(async (type: ViolationType, severity: SeverityLevel, snapshot?: string) => {
    if (!proctoringEnabledRef.current || isPausedRef.current || !sessionId || isSuspended.current) return

    // Debounce rapid events (e.g. blur followed by visibilitychange)
    const now = Date.now()
    if (now - lastEventTime.current < DEBOUNCE_MS) return
    lastEventTime.current = now

    try {
      const res = await api.logEvent(sessionId, { event_type: type, severity, snapshot })
      
      setViolationCount(res.violation_count)
      setMaxViolations(res.max_violations)
      
      if (res.session_status === 'SUSPENDED') {
        setStatus('SUSPENDED')
        isSuspended.current = true
        setShowWarningModal(false) // Let the suspend screen take over
      } else {
        setWarningMessage(res.warning_message)
        setShowWarningModal(true)
      }
    } catch (err) {
      console.error('Failed to log proctoring event:', err)
    }
  }, [sessionId])

  useEffect(() => {
    if (status === 'SUSPENDED') return

    // 1. Tab Switch / Focus Loss
    const handleVisibilityChange = () => {
      if (isPausedRef.current) return
      if (document.visibilityState === 'hidden') {
        handleViolation('TAB_SWITCH', 'MEDIUM')
      }
    }
    
    const handleBlur = () => {
      if (isPausedRef.current) return
      setTimeout(() => {
        if (!isPausedRef.current && document.visibilityState !== 'hidden') {
          handleViolation('TAB_SWITCH', 'MEDIUM')
        }
      }, 100)
    }

    // 2. Copy/Paste/Cut
    const handleClipboard = (e: ClipboardEvent) => {
      if (isPausedRef.current) return
      e.preventDefault()
      handleViolation('COPY_PASTE', 'MEDIUM')
    }

    // 3. Dev Tools & Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      if (isPausedRef.current) return
      e.preventDefault()
      handleViolation('DEV_TOOLS', 'HIGH')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPausedRef.current) return
      // F12
      if (e.key === 'F12') {
        e.preventDefault()
        handleViolation('DEV_TOOLS', 'HIGH')
      }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
        e.preventDefault()
        handleViolation('DEV_TOOLS', 'HIGH')
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key.toUpperCase() === 'U') {
        e.preventDefault()
        handleViolation('DEV_TOOLS', 'HIGH')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    
    document.addEventListener('copy', handleClipboard)
    document.addEventListener('paste', handleClipboard)
    document.removeEventListener('cut', handleClipboard) // cleanup old if any
    document.addEventListener('cut', handleClipboard)

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      
      document.removeEventListener('copy', handleClipboard)
      document.removeEventListener('paste', handleClipboard)
      document.removeEventListener('cut', handleClipboard)
      
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [status, handleViolation])

  const dismissWarning = () => setShowWarningModal(false)

  return {
    violationCount,
    maxViolations,
    status,
    warningMessage,
    showWarningModal,
    isPaused,
    proctoringEnabled,
    allowToggle,
    dismissWarning,
    handleViolation,
    setIsPaused,
  }
}

