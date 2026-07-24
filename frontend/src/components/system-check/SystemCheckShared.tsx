import React from 'react'
import { Text, Spinner, tokens } from '@fluentui/react-components'
import { CheckmarkCircle20Filled, DismissCircle20Filled } from '@fluentui/react-icons'
import { useSystemCheckStyles } from '../../pages/styles/SystemCheckPage.styles'
import { type CheckStatus } from '../../lib/useNetworkCheck'

export function VolumeBar({ level }: { level: number }) {
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

export function StatusIcon({ state }: { state: string }) {
  const styles = useSystemCheckStyles()
  if (state === 'pending' || state === 'running')
    return <Spinner size="extra-tiny" />
  if (state === 'granted' || state === 'success')
    return <CheckmarkCircle20Filled className={styles.statusSuccess} />
  if (state === 'denied' || state === 'error')
    return <DismissCircle20Filled className={styles.statusError} />
  return null
}

export function HandshakeRow({
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

export function CardHeaderSection({
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
        <Text className={styles.sectionTitle}>{title}</Text>
        <Text className={styles.sectionSubtitle} size={200}>{subtitle}</Text>
      </div>
      {statusState && <StatusIcon state={statusState} />}
      {badge}
    </div>
  )
}
