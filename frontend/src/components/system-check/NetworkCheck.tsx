import React from 'react'
import { Card, Text, Button, Spinner, tokens } from '@fluentui/react-components'
import { Wifi2Regular, DismissCircle20Filled, ArrowCounterclockwise20Regular, Play20Filled } from '@fluentui/react-icons'
import { useSystemCheckStyles } from '../../pages/styles/SystemCheckPage.styles'
import { useCommonStyles } from '../../pages/styles/common.styles'
import { CardHeaderSection, HandshakeRow } from './SystemCheckShared'
import type { useNetworkCheck } from '../../lib/useNetworkCheck'
import { QUALITY_CONFIG } from '../../utils/constants'

export interface NetworkCheckProps {
  networkCheck: ReturnType<typeof useNetworkCheck> & { _pingSamples: number[] }
  startNetworkCheck: () => void
  handleStartExam: () => void
}

export function NetworkCheck({
  networkCheck,
  startNetworkCheck,
  handleStartExam,
}: NetworkCheckProps) {
  const styles = useSystemCheckStyles()
  const commonStyles = useCommonStyles()

  return (
    <Card className={`${commonStyles.mainCard} animate-fade-in shadow-lg`}>
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
          className={commonStyles.fullWidthButton}
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
          className={commonStyles.fullWidthButton}
          onClick={startNetworkCheck}
          icon={<ArrowCounterclockwise20Regular />}
        >
          Retry
        </Button>
      ) : (
        <Button
          id="btn-network-running"
          appearance="primary"
          size="large"
          className={commonStyles.fullWidthButton}
          disabled
          icon={<Spinner size="extra-tiny" />}
        >
          Checking…
        </Button>
      )}
    </Card>
  )
}
