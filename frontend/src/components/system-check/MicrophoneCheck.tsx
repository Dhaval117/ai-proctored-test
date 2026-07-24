import React from 'react'
import { Card, Text, Button, Spinner, tokens } from '@fluentui/react-components'
import { Mic20Regular, DismissCircle20Filled, ArrowRight20Filled } from '@fluentui/react-icons'
import { useSystemCheckStyles } from '../../pages/styles/SystemCheckPage.styles'
import { useCommonStyles } from '../../pages/styles/common.styles'
import { CardHeaderSection, VolumeBar } from './SystemCheckShared'

export interface MicrophoneCheckProps {
  micState: 'idle' | 'pending' | 'granted' | 'denied' | 'error'
  volumeLevel: number
  requestMic: () => void
  handleMicNext: () => void
}

export function MicrophoneCheck({
  micState,
  volumeLevel,
  requestMic,
  handleMicNext,
}: MicrophoneCheckProps) {
  const styles = useSystemCheckStyles()
  const commonStyles = useCommonStyles()

  return (
    <Card className={`${commonStyles.mainCard} animate-fade-in shadow-lg`}>
      <CardHeaderSection
        icon={<Mic20Regular />}
        title="Microphone Check"
        subtitle="Speak to verify your microphone is working"
        statusState={micState}
      />

      <div className={styles.micBox}>
        {micState === 'granted' ? (
          <>
            <div className={commonStyles.wFull}>
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
          className={commonStyles.fullWidthButton}
          onClick={requestMic}
          icon={<Mic20Regular />}
        >
          {micState === 'idle' ? 'Enable Microphone' : 'Retry Microphone Access'}
        </Button>
      )}
      {micState === 'pending' && (
        <Button
          id="btn-mic-waiting"
          appearance="primary"
          size="large"
          className={commonStyles.fullWidthButton}
          disabled
          icon={<Spinner size="extra-tiny" />}
        >
          Waiting for permission…
        </Button>
      )}
      {micState === 'granted' && (
        <Button
          id="btn-mic-next"
          appearance="primary"
          size="large"
          className={commonStyles.fullWidthButton}
          onClick={handleMicNext}
          disabled={volumeLevel === 0}
          icon={volumeLevel > 0 ? <ArrowRight20Filled /> : undefined}
          iconPosition="after"
        >
          {volumeLevel === 0 ? 'Say something to verify…' : 'Microphone Ready — Continue'}
        </Button>
      )}
    </Card>
  )
}
