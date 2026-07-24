/**
 * SetupPage.tsx — Story 2.2 (Refactored to Fluent UI v9)
 *
 * Candidate information form. Collects:
 *   - Full name
 *   - Email address
 *   - Programming language / technology
 *   - Years of experience
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Title1,
  Title3,
  Text,
  Input,
  Button,
  Field,
  Tooltip,
} from '@fluentui/react-components'
import {
  Person20Regular,
  Mail20Regular,
  Code20Regular,
  DataBarHorizontal20Regular,
  ArrowRight20Filled,
  Desktop24Filled,
} from '@fluentui/react-icons'
import { ThemeToggle } from '../components/ThemeToggle'
import { useSetupStyles } from "./styles/SetupPage.styles"
import { useCommonStyles } from "./styles/common.styles"

const TECH_CHIPS = [
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

const EXPERIENCE_OPTIONS = [
  { label: '< 1 yr', value: 0 },
  { label: '1–2 yrs', value: 1 },
  { label: '3–5 yrs', value: 3 },
  { label: '6–10 yrs', value: 6 },
  { label: '10+ yrs', value: 10 },
]

export const SETUP_STORAGE_KEY = 'proctor_setup_data'

export interface CandidateFormData {
  name: string
  email: string
  language: string
  experience_years: number
}

type FormData = CandidateFormData

interface FormErrors {
  name?: string
  email?: string
  language?: string
  experience_years?: string
}

export default function SetupPage() {
  const styles = useSetupStyles()
  const commonStyles = useCommonStyles()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    language: '',
    experience_years: 1,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const isFormValid =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.language.trim().length > 0 &&
    form.experience_years >= 0

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.name.trim()) next.name = 'Full name is required'
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Enter a valid email address'
    }
    if (!form.language.trim()) next.language = 'Select or enter your primary technology'
    if (form.experience_years < 0) next.experience_years = 'Select years of experience'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      sessionStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(form))
      sessionStorage.setItem('setup_name', form.name.trim())
      sessionStorage.setItem('setup_email', form.email.trim())
      sessionStorage.setItem('setup_language', form.language.trim())
      sessionStorage.setItem('setup_experience', String(form.experience_years))

      navigate('/check')
    } finally {
      setSubmitting(false)
    }
  }

  const submitButton = (
    <Button
      id="setup-submit"
      type={!isFormValid && !submitting ? 'button' : 'submit'}
      appearance="primary"
      size="large"
      disabled={!isFormValid || submitting}
      icon={!submitting ? <ArrowRight20Filled /> : undefined}
      iconPosition="after"
      className={commonStyles.fullWidthButton}
    >
      {submitting ? 'Saving…' : 'Continue to System Check'}
    </Button>
  )

  return (
    <div className={commonStyles.pageContainer}>
      <div className={commonStyles.topToggle}>
        <ThemeToggle />
      </div>

      {/* Header */}
      <div className={commonStyles.headerBox}>
        <div className={commonStyles.logoRow}>
          <div className={commonStyles.logoIconBox}>
            <Desktop24Filled className={commonStyles.logoIcon} />
          </div>
          <Title1 align="center">ProctorAI</Title1>
        </div>
        <Text className={commonStyles.subtext}>
          AI-Powered Verbal Examination Platform
        </Text>
      </div>

      {/* Main Card */}
      <Card className={commonStyles.mainCard}>
        <div className={styles.cardHeaderBox}>
          <Title3 className={styles.cardTitle}>Candidate Information</Title3>
          <Text size={300} className={styles.cardSubtitle}>
            Please fill in your details to begin the system check.
          </Text>
        </div>

        <form id="setup-form" onSubmit={handleSubmit} noValidate className={styles.form}>
          {/* Full Name */}
          <Field
            required
            label={
              <span className={styles.fieldLabelSpan}>
                <Person20Regular /> Full Name
              </span>
            }
          >
            <Input
              id="setup-name"
              size="large"
              autoComplete="name"
              placeholder="e.g. Alex Johnson"
              value={form.name}
              onChange={(_, data) => setField('name', data.value)}
            />
          </Field>

          {/* Email */}
          <Field
            required
            label={
              <span id="unique-to" className={styles.fieldLabelSpan}>
                <Mail20Regular /> Email Address
              </span>
            }
          >
            <Input
              id="setup-email"
              type="email"
              size="large"
              autoComplete="email"
              placeholder="alex@example.com"
              value={form.email}
              onChange={(_, data) => setField('email', data.value)}
            />
          </Field>

          {/* Technology */}
          <Field
            required
            label={
              <span className={styles.fieldLabelSpan}>
                <Code20Regular /> Technology / Language
              </span>
            }
          >
            <Input
              id="setup-language"
              size="large"
              placeholder="e.g. Python, React, Docker…"
              value={form.language}
              onChange={(_, data) => setField('language', data.value)}
            />
            {/* Quick-pick chips */}
            <div className={styles.chipsContainer}>
              {TECH_CHIPS.map((tech) => (
                <Button
                  key={tech}
                  type="button"
                  id={`chip-${tech.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  size="small"
                  shape="circular"
                  appearance={form.language === tech ? 'primary' : 'subtle'}
                  onClick={() => setField('language', tech)}
                >
                  {tech}
                </Button>
              ))}
            </div>
          </Field>

          {/* Experience */}
          <Field
            required
            label={
              <span className={styles.fieldLabelSpan}>
                <DataBarHorizontal20Regular /> Years of Experience
              </span>
            }
          >
            <div className={styles.expGrid}>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  id={`exp-${opt.value}`}
                  size="medium"
                  appearance={form.experience_years === opt.value ? 'primary' : 'outline'}
                  onClick={() => setField('experience_years', opt.value)}
                  className={form.experience_years === opt.value ? styles.expBtnActive : styles.expBtn}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </Field>

          {/* Submit */}
          <div className={styles.submitContainer}>
            {!isFormValid && !submitting ? (
              <Tooltip content="Please fill in all required fields to continue" relationship="label">
                <div className={commonStyles.wFull}>{submitButton}</div>
              </Tooltip>
            ) : (
              submitButton
            )}
          </div>
        </form>
      </Card>

      {/* Footer note */}
      <Text size={200} align="center" className={styles.footerNote}>
        Your information is used solely for this examination session.
      </Text>
    </div>
  )
}
