import React from 'react'
import { Card, Text, Button, Spinner, Badge } from '@fluentui/react-components'
import { Person20Regular, DismissCircle20Filled, CheckmarkCircle20Filled, ArrowCounterclockwise20Regular, ArrowRight20Filled } from '@fluentui/react-icons'
import { useSystemCheckStyles } from '../../pages/styles/SystemCheckPage.styles'
import { useCommonStyles } from '../../pages/styles/common.styles'
import { CardHeaderSection } from './SystemCheckShared'

export interface PhotoCheckProps {
  photoPreview: string | null
  photoError: string | null
  isValidatingPhoto: boolean
  videoRef: React.RefObject<HTMLVideoElement>
  handleCapture: () => void
  handleRetakePhoto: () => void
  handlePhotoNext: () => void
}

export function PhotoCheck({
  photoPreview,
  photoError,
  isValidatingPhoto,
  videoRef,
  handleCapture,
  handleRetakePhoto,
  handlePhotoNext,
}: PhotoCheckProps) {
  const styles = useSystemCheckStyles()
  const commonStyles = useCommonStyles()

  return (
    <Card className={`${commonStyles.mainCard} animate-fade-in shadow-lg`}>
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
        className={`${styles.photoPreviewBox} ${
          photoPreview ? styles.photoPreviewBoxCaptured : styles.photoPreviewBoxIdle
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
          className={commonStyles.fullWidthButton}
          onClick={handleCapture}
          disabled={isValidatingPhoto}
          icon={isValidatingPhoto ? <Spinner size="extra-tiny" /> : <Person20Regular />}
        >
          {isValidatingPhoto ? 'Checking Photo & Alignment…' : 'Capture Reference Photo'}
        </Button>
      ) : (
        <div className={styles.photoActionRow}>
          <Button
            id="btn-retake-photo"
            appearance="secondary"
            size="large"
            className={styles.flexBtn}
            onClick={handleRetakePhoto}
            icon={<ArrowCounterclockwise20Regular />}
          >
            Retake
          </Button>
          <Button
            id="btn-photo-next"
            appearance="primary"
            size="large"
            className={styles.flexBtn}
            onClick={handlePhotoNext}
            icon={<ArrowRight20Filled />}
            iconPosition="after"
          >
            Use This Photo
          </Button>
        </div>
      )}
    </Card>
  )
}
