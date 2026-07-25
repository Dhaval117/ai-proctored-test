import React from 'react'
import { Card, Text, Button, Spinner } from '@fluentui/react-components'
import { Camera20Regular, ArrowRight20Filled } from '@fluentui/react-icons'
import { useSystemCheckStyles } from '../../pages/styles/SystemCheckPage.styles'
import { useCommonStyles } from '../../pages/styles/common.styles'
import { CardHeaderSection } from './SystemCheckShared'

export interface CameraCheckProps {
  cameraState: 'idle' | 'pending' | 'granted' | 'denied' | 'error'
  videoRef: React.RefObject<HTMLVideoElement>
  requestCamera: () => void
  handleCameraNext: () => void
}

export function CameraCheck({
  cameraState,
  videoRef,
  requestCamera,
  handleCameraNext,
}: CameraCheckProps) {
  const styles = useSystemCheckStyles()
  const commonStyles = useCommonStyles()

  return (
    <Card className={`${commonStyles.mainCard} animate-fade-in shadow-lg`}>
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
          className={commonStyles.fullWidthButton}
          onClick={requestCamera}
          icon={<Camera20Regular />}
        >
          {cameraState === 'idle' ? 'Enable Camera' : 'Retry Camera Access'}
        </Button>
      )}
      {cameraState === 'pending' && (
        <Button
          id="btn-camera-waiting"
          appearance="primary"
          size="large"
          className={commonStyles.fullWidthButton}
          disabled
          icon={<Spinner size="extra-tiny" />}
        >
          Waiting for permission…
        </Button>
      )}
      {cameraState === 'granted' && (
        <Button
          id="btn-camera-next"
          appearance="primary"
          size="large"
          className={commonStyles.fullWidthButton}
          onClick={handleCameraNext}
          icon={<ArrowRight20Filled />}
          iconPosition="after"
        >
          Camera Ready — Continue
        </Button>
      )}
    </Card>
  )
}
