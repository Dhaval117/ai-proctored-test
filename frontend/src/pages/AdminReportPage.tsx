/**
 * AdminReportPage.tsx — Story 5.2: Admin Exam Report Page
 *
 * Detailed report page for admin review of a specific candidate's session:
 * - Candidate profile & risk metrics
 * - Dialog Q&A Transcript with AI evaluation scores and feedback
 * - Chronological proctoring violation timeline with snapshot evidence
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  FileText,
  Shield,
  Clock,
  Loader2,
  Award,
  MessageSquare,
  Eye,
} from 'lucide-react'
import { api, type SessionReport } from '../lib/api'

export default function AdminReportPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<SessionReport | null>(null)
  const [activeTab, setActiveTab] = useState<'transcript' | 'proctoring'>('transcript')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    api
      .getAdminSessionDetail(id)
      .then((data) => setReport(data))
      .catch((err) => {
        console.error('Failed to load admin session detail:', err)
        setError(err?.message || 'Failed to load session report')
      })
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-dvh gradient-bg flex flex-col items-center justify-center p-8 text-surface-300">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400 mb-3" />
        <span className="text-sm">Loading Candidate Audit Report...</span>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-dvh gradient-bg flex flex-col items-center justify-center p-8 text-center">
        <div className="glass-card max-w-md p-8 border border-red-500/40">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Report Load Error</h2>
          <p className="text-sm text-surface-400 mb-6">{error || 'Session report not found'}</p>
          <Link
            to="/admin"
            className="btn-primary inline-flex items-center gap-2 text-xs px-4 py-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin Sessions
          </Link>
        </div>
      </div>
    )
  }

  const { session, qa_transcript, proctoring_logs } = report

  // Calculate average score across main questions (each 0 to 10)
  const scoredItems = qa_transcript.filter(
    (q) => !q.is_follow_up && q.evaluation_score !== null && q.evaluation_score !== undefined
  )
  const avgScore =
    scoredItems.length > 0
      ? (
          scoredItems.reduce((acc, q) => acc + (q.evaluation_score || 0), 0) / scoredItems.length
        ).toFixed(1)
      : null

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
            <CheckCircle className="h-3.5 w-3.5" /> Completed
          </span>
        )
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <ShieldAlert className="h-3.5 w-3.5" /> Suspended
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Clock className="h-3.5 w-3.5" /> {status}
          </span>
        )
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40">
            HIGH
          </span>
        )
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
            MEDIUM
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-surface-700 text-surface-300 border border-surface-600">
            LOW
          </span>
        )
    }
  }

  return (
    <div className="min-h-dvh gradient-bg p-6 md:p-10 animate-fade-in text-surface-100">
      <div className="max-w-6xl mx-auto">
        {/* Nav Back */}
        <div className="mb-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-surface-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin Sessions List
          </Link>
        </div>

        {/* Candidate & Risk Summary Header Card */}
        <div className="glass-card p-6 md:p-8 mb-6 border border-surface-700/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{session.candidate_name}</h1>
                {getStatusBadge(session.status)}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-surface-300">
                <span>
                  Language: <strong className="text-brand-300">{session.language}</strong>
                </span>
                <span>•</span>
                <span>
                  Experience: <strong>{session.experience_years} years</strong>
                </span>
                <span>•</span>
                <span>
                  Exam Started:{' '}
                  <strong>{new Date(session.created_at).toLocaleString()}</strong>
                </span>
              </div>
            </div>

            {/* Risk & Score Metrics Box */}
            <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-surface-700/80 pt-4 md:pt-0 md:pl-6 text-center">
              <div>
                <div className="text-xs text-surface-400 uppercase font-semibold mb-1">
                  Questions Answered
                </div>
                <div className="text-xl font-bold text-brand-300">
                  {qa_transcript.length} / 5
                </div>
              </div>

              <div>
                <div className="text-xs text-surface-400 uppercase font-semibold mb-1">
                  Avg Score (out of 10)
                </div>
                <div className="text-xl font-bold text-green-400">
                  {avgScore !== null ? `${avgScore} / 10` : 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-xs text-surface-400 uppercase font-semibold mb-1">
                  Risk Score
                </div>
                <div
                  className={`text-xl font-bold ${
                    session.risk_score >= 40
                      ? 'text-red-400'
                      : session.risk_score >= 15
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  {session.risk_score}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-6 border-b border-surface-700/80 pb-3">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'transcript'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                : 'text-surface-400 hover:bg-surface-800/60'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Dialog Transcript ({qa_transcript.length})
          </button>

          <button
            onClick={() => setActiveTab('proctoring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'proctoring'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                : 'text-surface-400 hover:bg-surface-800/60'
            }`}
          >
            <Shield className="h-4 w-4" />
            Proctoring Flag History ({proctoring_logs.length})
          </button>
        </div>

        {/* Tab 1: Dialog Transcript */}
        {activeTab === 'transcript' && (
          <div className="space-y-4">
            {qa_transcript.length === 0 ? (
              <div className="glass-card p-12 text-center text-surface-400">
                No interview questions recorded for this session yet.
              </div>
            ) : (
              qa_transcript.map((qa, i) => (
                <div
                  key={qa.question_id || i}
                  className="glass-card p-6 border border-surface-700/80"
                >
                  <div className="flex items-center justify-between text-xs text-surface-400 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-primary text-xs font-semibold">
                        Question #{qa.sequence_number}
                      </span>
                      {qa.is_follow_up && (
                        <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Follow-up Question
                        </span>
                      )}
                    </div>

                    {qa.evaluation_score !== null && qa.evaluation_score !== undefined && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-300 border border-green-500/30">
                        <Award className="h-3.5 w-3.5 text-green-400" />
                        Score: {qa.evaluation_score} / 10
                      </span>
                    )}
                  </div>

                  {/* AI Question */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1">
                      AI Interviewer Prompt
                    </div>
                    <p className="text-sm font-medium text-surface-100 bg-surface-900/50 p-3.5 rounded-xl border border-surface-800">
                      {qa.question_text}
                    </p>
                  </div>

                  {/* Candidate Transcribed Answer */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-1">
                      Candidate Transcribed Response
                    </div>
                    <div className="pl-4 border-l-2 border-brand-500/60 text-sm text-surface-200 italic bg-surface-900/30 p-3.5 rounded-r-xl">
                      {qa.answer_text ? (
                        `"${qa.answer_text}"`
                      ) : (
                        <span className="text-surface-500 not-italic">(No answer submitted)</span>
                      )}
                    </div>
                  </div>

                  {/* AI Feedback */}
                  {qa.evaluation_feedback && (
                    <div className="mt-3 text-xs bg-brand-500/10 border border-brand-500/30 text-brand-200 p-3.5 rounded-xl">
                      <strong className="text-brand-300 font-semibold block mb-0.5">
                        AI Evaluation & Feedback:
                      </strong>
                      {qa.evaluation_feedback}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Proctoring Timeline */}
        {activeTab === 'proctoring' && (
          <div className="glass-card p-6 border border-surface-700/80">
            <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-400" />
              Chronological Proctoring Log ({proctoring_logs.length} events)
            </h3>

            {proctoring_logs.length === 0 ? (
              <div className="py-12 text-center text-surface-400">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                No proctoring violations recorded during this exam session. Clean session!
              </div>
            ) : (
              <div className="relative border-l-2 border-surface-700 ml-4 space-y-6 pl-6 py-2">
                {proctoring_logs.map((log) => (
                  <div
                    key={log.id}
                    className="relative bg-surface-900/60 p-4 rounded-xl border border-surface-800"
                  >
                    {/* Timeline bullet icon */}
                    <div className="absolute -left-8 top-4 w-4 h-4 rounded-full bg-surface-800 border-2 border-yellow-500" />

                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-yellow-300">
                          {log.event_type}
                        </span>
                        {getSeverityBadge(log.severity)}
                        {log.warning_number && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-800 text-surface-300 border border-surface-700">
                            Warning #{log.warning_number}
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-surface-400">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Screenshot snapshot if present */}
                    {log.snapshot ? (
                      <div className="mt-3">
                        <div className="text-xs text-surface-400 mb-1.5 flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" /> Captured Snapshot Evidence
                        </div>
                        <img
                          src={log.snapshot}
                          alt="Proctoring violation snapshot"
                          className="max-h-48 rounded-lg border border-surface-700 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-surface-500 italic">
                        No snapshot image attached to this event.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
