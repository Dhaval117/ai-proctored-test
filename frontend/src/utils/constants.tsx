import React from 'react'
import {
  Camera20Regular,
  Mic20Regular,
  Person20Regular,
  Wifi2Regular,
} from '@fluentui/react-icons'
import { tokens } from '@fluentui/react-components'

// --- Setup Page Constants ---

export const TECH_CHIPS = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'C++',
  'Go',
  'Rust',
  'React',
  'Node.js',
  'System Design',
]

export const EXPERIENCE_OPTIONS = [
  { label: '< 1 yr', value: 0 },
  { label: '1–2 yrs', value: 1 },
  { label: '3–5 yrs', value: 3 },
  { label: '6–10 yrs', value: 6 },
  { label: '10+ yrs', value: 10 },
]

export const SETUP_STORAGE_KEY = 'proctor_setup_data'

// --- System Check Page Constants ---

export const PHOTO_STORAGE_KEY = 'proctor_photo'

export type SystemCheckStep = 'camera' | 'microphone' | 'photo' | 'network'

export const SYSTEM_CHECK_STEPS: { id: SystemCheckStep; label: string; icon: React.ReactNode }[] = [
  { id: 'camera', label: 'Camera', icon: <Camera20Regular /> },
  { id: 'microphone', label: 'Microphone', icon: <Mic20Regular /> },
  { id: 'photo', label: 'Photo', icon: <Person20Regular /> },
  { id: 'network', label: 'Network', icon: <Wifi2Regular /> },
]
export const QUALITY_CONFIG = {
  excellent: { color: tokens.colorPaletteGreenForeground1, label: 'Excellent', bg: tokens.colorPaletteGreenBackground1 },
  good: { color: tokens.colorPaletteGreenForeground2, label: 'Good', bg: tokens.colorPaletteGreenBackground1 },
  fair: { color: tokens.colorPaletteYellowForeground1, label: 'Fair', bg: tokens.colorPaletteYellowBackground1 },
  poor: { color: tokens.colorPaletteRedForeground1, label: 'Poor', bg: tokens.colorPaletteRedBackground1 },
}

// --- Admin Page Constants ---

export const ADMIN_PAGE_SIZE = 10
