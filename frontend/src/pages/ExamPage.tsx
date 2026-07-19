/**
 * ExamPage.tsx — Story 3.1 (Refactored to Fluent UI v9)
 * Main exam interface: camera + question + voice recording.
 * Includes Browser Event Proctoring and Fluent UI Dialog warning overlay.
 */
import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Card,
  Title1,
  Text,
  Button,
  Badge,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
} from '@fluentui/react-components'
import {
  Mic24Filled,
  Warning24Filled,
  LockClosed24Filled,
  Camera20Regular,
} from '@fluentui/react-icons'

import { useProctor } from '../hooks/useProctor'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { ExamDashboard } from '../components/ExamDashboard'
import { ThemeToggle } from '../components/ThemeToggle'
import { useExamStyles } from './ExamPage.styles'

export default function ExamPage() {
  const styles = useExamStyles()
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
    handleViolation,
  } = useProctor(sessionId)

  const videoRef = useRef<HTMLVideoElement>(null)
  const { isModelsLoaded, hasRefDescriptor } = useFaceDetection(videoRef, handleViolation)

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
        stream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

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
      <div className={`${styles.pageContainer} animate-fade-in`}>
        <div className={styles.topToggle}>
          <ThemeToggle />
        </div>

        <Card className={`${styles.suspendedCard} shadow-lg`}>
          <div className={styles.suspendedIconBox}>
            <LockClosed24Filled className={styles.iconMd} />
          </div>
          <Title1 className={styles.suspendedTitle}>
            Exam Suspended
          </Title1>
          <Text className={styles.suspendedText}>
            Your exam session has been locked due to repeated proctoring violations (exceeded {maxViolations} warnings).
          </Text>
          <div className={styles.suspendedNotice}>
            This incident has been logged. Please contact your administrator for further instructions.
          </div>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className={`${styles.pageContainer} animate-fade-in`}>
        <div className={styles.topToggle}>
          <ThemeToggle />
        </div>

        <div className={styles.mainWrapper}>
          {/* Header Card */}
          <Card className={`${styles.headerCard} shadow-md`}>
            <div className={styles.headerIconBox}>
              <Mic24Filled className={styles.iconSm} />
            </div>
            <Title1 className={styles.headerTitle}>Examination</Title1>
            <Text className={styles.headerSubtitle}>
              AI-powered verbal interview in progress
            </Text>

            <div className={styles.badgesRow}>
              <Badge appearance="filled" color={violationCount > 0 ? 'warning' : 'subtle'} size="large">
                Violations: {violationCount} / {maxViolations}
              </Badge>
              {allowToggle ? (
                <Button
                  size="small"
                  appearance={isPaused ? 'outline' : 'secondary'}
                  onClick={() => setIsPaused(!isPaused)}
                  title="Click to Pause/Resume Proctoring Checks during development"
                  className={styles.proctoringBtn}
                >
                  Proctoring: {isPaused ? 'PAUSED (DEV)' : 'ACTIVE'}
                </Button>
              ) : (
                <Badge
                  appearance="tint"
                  color={proctoringEnabled ? 'success' : 'warning'}
                  size="large"
                >
                  Proctoring: {!proctoringEnabled ? 'DISABLED (SERVER)' : 'ACTIVE'}
                </Badge>
              )}
            </div>
          </Card>

          {/* Main Dashboard area */}
          <ExamDashboard sessionId={sessionId!} />

          <div className={styles.testProctoringBox}>
            <Text className={styles.testProctoringTitle}>Try the following to test proctoring:</Text>
            <ul className={styles.testProctoringList}>
              <li>Switch away to another tab</li>
              <li>Try to Copy or Paste text</li>
              <li>Right-click or press F12</li>
            </ul>
            <div className={styles.testProctoringFooter}>
              <span>AI Face Detection status:</span>
              <Badge appearance="tint" color={isModelsLoaded ? 'success' : 'warning'}>
                {isModelsLoaded ? (hasRefDescriptor ? 'Active (Monitoring)' : 'Active (No Ref Photo)') : 'Loading Models...'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* PiP Camera Feed */}
      <div className={`${styles.pipContainer} shadow-2xl`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.pipVideo}
        />
        {(!isModelsLoaded || !hasRefDescriptor) && (
          <div className={styles.pipOverlay}>
            <Camera20Regular className={styles.iconXs} />
            <span className="px-2 text-center">Loading AI...</span>
          </div>
        )}
      </div>

      {/* Full-Screen Warning Modal Overlay (Fluent UI Dialog) */}
      <Dialog open={showWarningModal} modalType="alert">
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody>
            <div className={styles.dialogIconBox}>
              <Warning24Filled className={styles.iconLg} />
            </div>
            <DialogTitle className={styles.dialogTitle}>
              Proctoring Warning
            </DialogTitle>
            <DialogContent>
              <Text className={styles.dialogText}>
                {warningMessage || 'A proctoring violation was detected.'}
              </Text>

              <div className={styles.dialogBadge}>
                Warning {violationCount} of {maxViolations}
              </div>
            </DialogContent>
            <DialogActions className={styles.dialogActions}>
              <Button
                appearance="primary"
                size="large"
                className={styles.dialogBtn}
                onClick={dismissWarning}
              >
                I Understand — Return to Exam
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  )
}
