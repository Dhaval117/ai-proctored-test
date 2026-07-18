/**
 * SetupPage.tsx — Story 2.2
 *
 * Candidate information form. Collects:
 *   - Full name
 *   - Email address
 *   - Programming language / technology
 *   - Years of experience
 *
 * On submit, stores values in sessionStorage so SystemCheckPage can read them.
 * (Actual API call to /api/sessions/create happens in Story 2.3 after network check.)
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, ChevronRight, User, Mail, Code2, BarChart2 } from 'lucide-react'

// Popular technologies shown as quick-pick chips
const TECH_CHIPS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Django',
  'FastAPI', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes',
  'AWS', 'Git', 'MongoDB', 'Go', 'Rust',
]

const EXPERIENCE_OPTIONS = [
  { label: '< 1 year', value: 0 },
  { label: '1–2 years', value: 1 },
  { label: '3–5 years', value: 3 },
  { label: '5–8 years', value: 5 },
  { label: '8+ years', value: 8 },
]

export interface CandidateFormData {
  name: string
  email: string
  language: string
  experience_years: number
}

export const SETUP_STORAGE_KEY = 'proctor_setup'

export default function SetupPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState<CandidateFormData>({
    name: '',
    email: '',
    language: '',
    experience_years: 1,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CandidateFormData, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = 'Full name is required.'
    else if (form.name.trim().length < 2) next.name = 'Name must be at least 2 characters.'
    if (!form.email.trim()) next.email = 'Email address is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = 'Enter a valid email address.'
    if (!form.language.trim()) next.language = 'Select or type a technology.'
    if (form.experience_years < 0) next.experience_years = 'Select your experience level.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    // Persist to sessionStorage — picked up by SystemCheckPage
    sessionStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(form))

    // Brief simulated delay for UX feel
    await new Promise(r => setTimeout(r, 300))
    navigate('/check')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function setField<K extends keyof CandidateFormData>(key: K, val: CandidateFormData[K]) {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }))
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-dvh gradient-bg flex flex-col items-center justify-center p-6 sm:p-10 animate-fade-in">
      {/* Header */}
      <div className="mb-2 text-center">
        <div className="flex items-center justify-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: 'var(--color-brand-500)', boxShadow: 'var(--glow-brand)' }}>
            <Cpu className="h-7 w-7 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="gradient-text text-4xl font-bold tracking-tight">ProctorAI</h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-surface-400)' }}>
          AI-Powered Verbal Examination Platform
        </p>
      </div>

      {/* Card */}
      <div className="glass-card w-full max-w-lg pt-3 sm:pt-4 px-8 sm:px-10 pb-3 sm:pb-4">
        <h2 className="mb-1 text-xl font-bold">Candidate Information</h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--color-surface-400)' }}>
          Please fill in your details to begin the system check.
        </p>

        <form id="setup-form" onSubmit={handleSubmit} noValidate className="space-y-7">

          {/* Full Name */}
          <div className="form-field">
            <label htmlFor="setup-name" className="mb-2 flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-surface-200)' }}>
              <User className="h-3.5 w-3.5" />
              Full Name
            </label>
            <input
              id="setup-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Alex Johnson"
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              className={`input-field ${errors.name ? 'error' : ''}`}
            />
            {errors.name && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div className="form-field">
            <label htmlFor="setup-email" className="mb-2 flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-surface-200)' }}>
              <Mail className="h-3.5 w-3.5" />
              Email Address
            </label>
            <input
              id="setup-email"
              type="email"
              autoComplete="email"
              placeholder="alex@example.com"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              className={`input-field ${errors.email ? 'error' : ''}`}
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.email}</p>
            )}
          </div>

          {/* Technology */}
          <div className="form-field">
            <label htmlFor="setup-language" className="mb-2 flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-surface-200)' }}>
              <Code2 className="h-3.5 w-3.5" />
              Technology / Language
            </label>
            <input
              id="setup-language"
              type="text"
              placeholder="e.g. Python, React, Docker…"
              value={form.language}
              onChange={e => setField('language', e.target.value)}
              className={`input-field ${errors.language ? 'error' : ''}`}
            />
            {errors.language && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{errors.language}</p>
            )}
            {/* Quick-pick chips */}
            <div className="flex flex-wrap gap-2" style={{ marginTop: '8px' }}>
              {TECH_CHIPS.map(tech => (
                <button
                  key={tech}
                  type="button"
                  id={`chip-${tech.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => setField('language', tech)}
                  className="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all"
                  style={
                    form.language === tech
                      ? {
                        background: 'var(--color-brand-500)',
                        borderColor: 'var(--color-brand-500)',
                        color: 'white',
                      }
                      : {
                        background: 'transparent',
                        borderColor: 'var(--color-surface-600)',
                        color: 'var(--color-surface-400)',
                      }
                  }
                >
                  {tech}
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="form-field">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--color-surface-200)' }}>
              <BarChart2 className="h-3.5 w-3.5" />
              Years of Experience
            </label>
            <div className="grid grid-cols-5 gap-2.5" style={{ marginTop: '8px' }}>
              {EXPERIENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  id={`exp-${opt.value}`}
                  onClick={() => setField('experience_years', opt.value)}
                  className="rounded-lg border py-2 text-center text-xs font-semibold transition-all"
                  style={
                    form.experience_years === opt.value
                      ? {
                        background: 'hsl(230 65% 52% / 0.2)',
                        borderColor: 'var(--color-brand-500)',
                        color: 'var(--color-brand-300)',
                      }
                      : {
                        background: 'var(--color-surface-800)',
                        borderColor: 'var(--color-surface-700)',
                        color: 'var(--color-surface-400)',
                      }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-0">
            <button
              id="setup-submit"
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? 'Saving…' : 'Continue to System Check'}
              {!submitting && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </form>
      </div>

      {/* Footer note */}
      <p className="mt-1 text-center text-xs" style={{ color: 'var(--color-surface-400)' }}>
        Your information is used solely for this examination session.
      </p>
    </div>
  )
}
