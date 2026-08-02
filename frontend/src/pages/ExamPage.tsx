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
  Title2,
  Text,
  Button,
  Badge,
  Title3,
  Spinner,
} from '@fluentui/react-components'
import {
  LockClosed24Filled,
  Camera20Regular,
  CheckmarkCircle24Filled,
  DismissCircle24Regular,
} from '@fluentui/react-icons'

import { useProctor } from '../hooks/useProctor'
import { useFaceDetection } from '../hooks/useFaceDetection'
import { ExamDashboard } from '../components/ExamDashboard'
import { ThemeToggle } from '../components/ThemeToggle'
import { ProctoringWarningDialog } from '../components/ProctoringWarningDialog'
import { useExamStyles } from "./styles/ExamPage.styles"
import { useCommonStyles } from "./styles/common.styles"

export default function ExamPage() {
  const styles = useExamStyles()
  const commonStyles = useCommonStyles()
  const { id: sessionId } = useParams<{ id: string }>()

  const {
    status,
    setStatus,
    violationCount,
    maxViolations,
    showWarningModal,
    warningMessage,
    isPaused,
    setIsPaused,
    allowToggle,
    isLoadingConfig,
    error,
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
      <div className={`${commonStyles.pageContainer} animate-fade-in`}>
        <div className={commonStyles.topToggle}>
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

  if (isLoadingConfig) {
    return (
      <div className={`${commonStyles.pageContainer} animate-fade-in`}>
        <div className={commonStyles.topToggle}>
          <ThemeToggle />
        </div>
        <div className="flex flex-col items-center justify-center gap-4 py-12" style={{ height: '100vh' }}>
          <Spinner size="huge" />
          <Text className="text-neutral-500 font-medium">Loading session...</Text>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${commonStyles.pageContainer} animate-fade-in`}>
        <div className={commonStyles.topToggle}>
          <ThemeToggle />
        </div>
        <Card className={`${styles.suspendedCard} shadow-lg`} style={{ marginTop: '20vh' }}>
          <div className="flex justify-center mb-4 text-red-500">
            <DismissCircle24Regular className="w-12 h-12" />
          </div>
          <Title1 className={styles.suspendedTitle} style={{ color: 'var(--colorPaletteRedForeground1)' }}>
            Session Invalid
          </Title1>
          <Text className={styles.suspendedText}>
            {error}
          </Text>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className={`${commonStyles.pageContainer} animate-fade-in`}>
        <div className={commonStyles.topToggle}>
          <ThemeToggle />
        </div>

        {status !== 'COMPLETED' && (
          <Card className={`${styles.floatingProctoring} shadow-md`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>AI Face Detection:</span>
                <Badge appearance="tint" color={isModelsLoaded ? 'success' : 'warning'}>
                  {isModelsLoaded ? (hasRefDescriptor ? 'Active (Monitoring)' : 'Active (No Ref Photo)') : 'Loading Models...'}
                </Badge>
              </div>

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
                  Proctoring: {isPaused ? 'PAUSED' : 'ACTIVE'}
                </Button>
              ) : (
                <Badge
                  appearance="tint"
                  color={proctoringEnabled ? 'success' : 'warning'}
                >
                  Proctoring: {!proctoringEnabled ? 'DISABLED' : 'ACTIVE'}
                </Badge>
              )}
            </div>
          </Card>
        )}
        <div className={styles.mainWrapper}>
          {/* Main Dashboard area */}
          {status === 'COMPLETED' ? (
            <Card className={`${styles.completeBox} animate-fade-in shadow-md`}>
              <div className={styles.completeIconBox}>
                <CheckmarkCircle24Filled className={styles.iconLg} />
              </div>
              <Title2 className={styles.completeTitle}>Exam Complete</Title2>
              <Text className={styles.completeText}>
                Thank you for completing the interview. Your results have been saved.
              </Text>
            </Card>
          ) : (
            <ExamDashboard sessionId={sessionId!} onExamComplete={() => setStatus('COMPLETED')} />
          )}
        </div>
      </div>

      {/* PiP Camera Feed */}
      {status !== 'COMPLETED' && (
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
      )}

      {/* Full-Screen Warning Modal Overlay (Fluent UI Dialog) */}
      <ProctoringWarningDialog
        open={showWarningModal}
        warningMessage={warningMessage}
        violationCount={violationCount}
        maxViolations={maxViolations}
        onDismiss={dismissWarning}
      />
    </>
  )
}
