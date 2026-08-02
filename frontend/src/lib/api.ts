/**
 * api.ts — Typed API client for the ProctorAI backend.
 * All calls are relative (Vite proxies /api/* → localhost:8000).
 */

// ─────────────────────────────────────────────
// Types (mirroring backend schemas)
// ─────────────────────────────────────────────

export type ExamStatus = 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED'

export interface CreateSessionRequest {
  name: string
  email: string
  language: string
  experience_years: number
}

export interface CreateSessionResponse {
  session_id: string
  candidate_id: string
  status: ExamStatus
  message: string
}

export interface VerifySessionRequest {
  reference_photo: string   // base64 data URL
}

export interface VerifySessionResponse {
  session_id: string
  status: ExamStatus
  message: string
}

export interface SessionDetail {
  session_id: string
  candidate_id: string
  candidate_name: string
  language: string
  experience_years: number
  status: ExamStatus
  violation_count: number
  risk_score: number
  created_at: string
  completed_at?: string | null
  total_questions: number
}

export type NextAction = 'FOLLOW_UP' | 'NEXT_QUESTION' | 'EXAM_COMPLETE'

export interface QuestionResponse {
  question_id: string
  question_text: string
  is_follow_up: boolean
  question_number: number
  total_main_questions: number
}

export interface SubmitAnswerRequest {
  question_id: string
  transcribed_text: string
}

export interface SubmitAnswerResponse {
  answer_id: string
  evaluation_score: number
  evaluation_feedback: string
  next_action: NextAction
}

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type ViolationType =
  | 'TAB_SWITCH'
  | 'COPY_PASTE'
  | 'DEV_TOOLS'
  | 'NO_FACE'
  | 'MULTI_FACE'
  | 'BACKGROUND_NOISE'
  | 'FACE_MISMATCH'

export interface LogEventRequest {
  event_type: ViolationType
  severity: SeverityLevel
  snapshot?: string | null
}

export interface LogEventResponse {
  violation_count: number
  max_violations: number
  session_status: ExamStatus
  warning_message?: string | null
}

export interface ProctoringConfigResponse {
  proctoring_enabled: boolean
  allow_toggle: boolean
}

export interface QATranscriptItem {
  question_id: string
  sequence_number: number
  question_text: string
  answer_text?: string | null
  is_follow_up: boolean
  evaluation_score?: number | null
  evaluation_feedback?: string | null
  created_at?: string
}

export interface ProctoringLogItem {
  id: string
  event_type: ViolationType
  severity: SeverityLevel
  timestamp: string
  warning_number?: number
  snapshot?: string | null
}

export interface SessionReport {
  session: SessionDetail
  qa_transcript: QATranscriptItem[]
  proctoring_logs: ProctoringLogItem[]
}

// ─────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────

class ApiError extends Error {
  public readonly status: number
  public readonly detail: unknown

  constructor(status: number, detail: unknown, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData?: boolean
): Promise<T> {
  const headers: Record<string, string> = {}
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const token = localStorage.getItem('admin_token')
  if (token && path.startsWith('/api/admin')) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(path, {
    method,
    headers,
    body: isFormData ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/api/admin') && path !== '/api/admin/login') {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin/login'
      throw new ApiError(401, null, 'Session expired. Please log in again.')
    }
    const message =
      data?.detail?.message ?? data?.detail ?? `HTTP ${res.status}`
    throw new ApiError(res.status, data?.detail, message)
  }

  return data as T
}

// ─────────────────────────────────────────────
// Session endpoints
// ─────────────────────────────────────────────

export interface AdminSessionSummary {
  session_id: string
  candidate_name: string
  candidate_email: string
  language: string
  experience_years: number
  status: ExamStatus
  violation_count: number
  risk_score: number
  created_at: string
  completed_at?: string
}

export interface AdminSessionListResponse {
  total: number
  page: number
  page_size: number
  sessions: AdminSessionSummary[]
}

export const api = {
  createAdminSession: (body: any) =>
    request<CreateSessionResponse>('POST', '/api/admin/sessions', body),

  parseResume: (formData: FormData) =>
    request<any>('POST', '/api/admin/parse-resume', formData, true),

  checkSessionValidity: (sessionId: string) =>
    request<any>('GET', `/api/sessions/${sessionId}/verify`),

  verifySession: (sessionId: string, body: VerifySessionRequest) =>
    request<VerifySessionResponse>('POST', `/api/sessions/${sessionId}/verify`, body),

  getSession: (sessionId: string) =>
    request<SessionDetail>('GET', `/api/sessions/${sessionId}`),

  // Admin
  getAdminSessions: (params?: { status?: string; language?: string; search?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.language) query.set('language', params.language)
    if (params?.search) query.set('search', params.search)
    if (params?.page) query.set('page', String(params.page))
    if (params?.page_size) query.set('page_size', String(params.page_size))
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return request<AdminSessionListResponse>('GET', `/api/admin/sessions${queryString}`)
  },

  getAdminSessionDetail: (sessionId: string) =>
    request<SessionReport>('GET', `/api/admin/sessions/${sessionId}`),

  // Exam
  getNextQuestion: (sessionId: string) =>
    request<QuestionResponse>('GET', `/api/sessions/${sessionId}/next-question`),

  submitAnswer: (sessionId: string, body: SubmitAnswerRequest) =>
    request<SubmitAnswerResponse>('POST', `/api/sessions/${sessionId}/submit-answer`, body),

  // Proctoring
  getProctoringConfig: () =>
    request<ProctoringConfigResponse>('GET', '/api/proctoring/config'),

  logEvent: (sessionId: string, body: LogEventRequest) =>
    request<LogEventResponse>('POST', `/api/sessions/${sessionId}/log-event`, body),
}

export { ApiError }
