/**
 * DesktopGuard.tsx (Refactored to Fluent UI v9)
 *
 * Story 2.1: Blocks any viewport narrower than 1024px (tablet / mobile).
 * The exam requires a wide screen for the camera feed + answer panel layout.
 */

import React, { useEffect, useState } from 'react'
import { Card, Title1, Text, tokens, makeStyles, shorthands } from '@fluentui/react-components'
import { Desktop24Filled, Warning20Filled } from '@fluentui/react-icons'

const MINIMUM_WIDTH = 1024

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return width
}

const useStyles = makeStyles({
  screenOverlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('24px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  card: {
    maxWidth: '448px',
    width: '100%',
    ...shorthands.padding('32px'),
    textAlign: 'center',
    ...shorthands.borderRadius(tokens.borderRadiusXLarge),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  iconBox: {
    position: 'relative',
    width: '72px',
    height: '72px',
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorPaletteYellowBackground1,
    color: tokens.colorPaletteYellowForeground1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.margin('0', 'auto', '20px', 'auto'),
  },
  mainIcon: {
    width: '36px',
    height: '36px',
  },
  warningIcon: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '24px',
    height: '24px',
    color: tokens.colorPaletteYellowForeground1,
  },
  title: {
    display: 'block',
    fontWeight: 800,
    marginBottom: '12px',
  },
  subtitle: {
    display: 'block',
    color: tokens.colorNeutralForeground2,
    marginBottom: '24px',
    fontSize: '14px',
  },
  boldText: {
    color: tokens.colorNeutralForeground1,
  },
  widthBox: {
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    marginBottom: '24px',
  },
  widthBoxLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground4,
    marginBottom: '4px',
  },
  widthBoxValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 800,
    color: tokens.colorBrandForeground1,
  },
  list: {
    listStyleType: 'none',
    ...shorthands.padding(0),
    ...shorthands.gap('10px'),
    display: 'flex',
    flexDirection: 'column',
  },
  listItem: {
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  listBullet: {
    color: tokens.colorPaletteYellowForeground1,
    fontWeight: 700,
  },
})

interface DesktopGuardProps {
  children: React.ReactNode
}

export default function DesktopGuard({ children }: DesktopGuardProps) {
  const styles = useStyles()
  const width = useWindowWidth()

  if (width >= MINIMUM_WIDTH) {
    return <>{children}</>
  }

  return (
    <div id="desktop-guard-screen" className={styles.screenOverlay}>
      <Card className={styles.card}>
        <div className={styles.iconBox}>
          <Desktop24Filled className={styles.mainIcon} />
          <Warning20Filled className={styles.warningIcon} />
        </div>

        <Title1 className={styles.title}>
          Desktop Required
        </Title1>

        <Text className={styles.subtitle}>
          The ProctorAI examination system requires a desktop or laptop with a minimum screen width of{' '}
          <strong className={styles.boldText}>{MINIMUM_WIDTH}px</strong>.
        </Text>

        <div className={styles.widthBox}>
          <Text className={styles.widthBoxLabel}>
            Current Screen Width
          </Text>
          <Text className={styles.widthBoxValue}>
            {width}px
          </Text>
        </div>

        <ul className={styles.list}>
          {[
            'Switch to a desktop or laptop computer',
            'Ensure your browser window is fully maximised',
            'Disable browser zoom-out that reduces effective width',
          ].map((tip) => (
            <li key={tip} className={styles.listItem}>
              <span className={styles.listBullet}>›</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
