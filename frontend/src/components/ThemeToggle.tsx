import React from 'react'
import {
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItemRadio,
  Button,
  Tooltip,
  makeStyles,
} from '@fluentui/react-components'
import {
  WeatherSunny20Regular,
  WeatherMoon20Regular,
  Desktop20Regular,
} from '@fluentui/react-icons'
import { useTheme, type ThemeMode } from '../context/ThemeContext'

const useStyles = makeStyles({
  toggleBtn: {
    fontWeight: 600,
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
  },
})

export const ThemeToggle: React.FC = () => {
  const styles = useStyles()
  const { themeMode, setThemeMode, resolvedTheme } = useTheme()

  const getIcon = () => {
    if (themeMode === 'light') return <WeatherSunny20Regular />
    if (themeMode === 'dark') return <WeatherMoon20Regular />
    return resolvedTheme === 'dark' ? <WeatherMoon20Regular /> : <WeatherSunny20Regular />
  }

  const getLabel = () => {
    if (themeMode === 'light') return 'Light'
    if (themeMode === 'dark') return 'Dark'
    return 'System'
  }

  return (
    <Menu
      checkedValues={{ theme: [themeMode] }}
      onCheckedValueChange={(_, data) => {
        const selected = data.checkedItems[0] as ThemeMode
        if (selected) setThemeMode(selected)
      }}
    >
      <MenuTrigger disableButtonEnhancement>
        <Tooltip content="Change theme (Light / Dark / System)" relationship="label">
          <Button
            appearance="subtle"
            icon={getIcon()}
            className={styles.toggleBtn}
          >
            {getLabel()}
          </Button>
        </Tooltip>
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItemRadio name="theme" value="light" icon={<WeatherSunny20Regular />}>
            Light
          </MenuItemRadio>
          <MenuItemRadio name="theme" value="dark" icon={<WeatherMoon20Regular />}>
            Dark
          </MenuItemRadio>
          <MenuItemRadio name="theme" value="system" icon={<Desktop20Regular />}>
            System (Auto)
          </MenuItemRadio>
        </MenuList>
      </MenuPopover>
    </Menu >
  )
}
