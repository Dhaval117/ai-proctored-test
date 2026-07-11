/**
 * AdminPage.tsx — Story 5.1: Admin Sessions List
 *
 * Full admin dashboard displaying all candidate exam sessions, risk summaries,
 * real-time filtering, search, and KPI analytics.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
} from 'lucide-react'
import { api, type AdminSessionSummary } from '../lib/api'

export default function AdminPage() {
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [languageFilter, setLanguageFilter] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.getAdminSessions({
        status: statusFilter || undefined,
        language: languageFilter || undefined,
        search: searchQuery || undefined,
        page,
        page_size: pageSize,
      })
      setSessions(res.sessions)
      setTotalCount(res.total)
    } catch (err: any) {
      console.error('Failed to fetch admin sessions:', err)
      setError(err?.message || 'Failed to load sessions list')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [page, statusFilter, languageFilter])

  // Handle Search submit / debounce
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSessions()
  }

  // Calculate quick KPI summaries from loaded page / counts
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
            <CheckCircle className="h-3.5 w-3.5" /> Completed
          </span>
        )
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <ShieldAlert className="h-3.5 w-3.5" /> Suspended
          </span>
        )
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" /> Active
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-700 text-surface-300 border border-surface-600">
            <Clock className="h-3.5 w-3.5" /> Setup
          </span>
        )
    }
  }

  const getRiskScoreBadge = (score: number) => {
    if (score >= 40) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
          <AlertTriangle className="h-3 w-3" /> {score} (High)
        </span>
      )
    }
    if (score >= 15) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          {score} (Medium)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-400 border border-green-500/30">
        {score} (Low)
      </span>
    )
  }

  return (
    <div className="min-h-dvh gradient-bg p-6 md:p-10 animate-fade-in text-surface-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 border border-purple-500/40">
              <LayoutDashboard className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Portal — Exam Sessions</h1>
              <p className="text-xs text-surface-400">
                Story 5.1: Monitor candidates, proctoring violations, and risk summaries
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchSessions()}
            className="btn-secondary flex items-center gap-2 self-start md:self-auto text-xs px-4 py-2 cursor-pointer"
            title="Refresh sessions list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Filter Bar */}
        <div className="glass-card p-4 mb-6 border border-surface-700/80">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search candidate by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-900/80 border border-surface-700 text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-900/80 border border-surface-700 text-sm focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">All Exam Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="SETUP">SETUP</option>
              </select>
            </div>

            {/* Language Filter */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Filter Language (e.g. Python)"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                onBlur={() => {
                  setPage(1)
                  fetchSessions()
                }}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-900/80 border border-surface-700 text-sm focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                type="submit"
                className="btn-primary px-4 py-2 text-xs flex items-center gap-1 cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchSessions} className="underline text-xs">Retry</button>
          </div>
        )}

        {/* Table Card */}
        <div className="glass-card overflow-hidden border border-surface-700/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-700/80 bg-surface-900/50 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Candidate</th>
                  <th className="py-3.5 px-4">Language / Exp</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Violations</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-4">Created At</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/80 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-surface-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-400" />
                      Loading candidate exam sessions...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-surface-400">
                      No candidate sessions found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr
                      key={s.session_id}
                      className="hover:bg-surface-800/40 transition-colors"
                    >
                      {/* Candidate info */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-surface-100">{s.candidate_name}</div>
                        <div className="text-xs text-surface-400 font-mono">{s.candidate_email}</div>
                      </td>

                      {/* Language / Exp */}
                      <td className="py-4 px-4">
                        <span className="font-medium text-brand-300">{s.language}</span>
                        <span className="text-xs text-surface-400 block">{s.experience_years} yrs exp</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">{getStatusBadge(s.status)}</td>

                      {/* Violations */}
                      <td className="py-4 px-4 font-mono">
                        <span className={s.violation_count > 0 ? 'text-yellow-400 font-bold' : 'text-surface-400'}>
                          {s.violation_count}
                        </span>
                        <span className="text-surface-500"> / 3</span>
                      </td>

                      {/* Risk Score */}
                      <td className="py-4 px-4">{getRiskScoreBadge(s.risk_score)}</td>

                      {/* Created At */}
                      <td className="py-4 px-4 text-xs text-surface-400">
                        {new Date(s.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/admin/sessions/${s.session_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-brand-300 border border-surface-700 transition-colors"
                          title="View Candidate Report"
                        >
                          <FileText className="h-3.5 w-3.5" /> View Report
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700/80 bg-surface-900/30 text-xs text-surface-400">
            <div>
              Showing <span className="font-semibold text-surface-200">{sessions.length}</span> of{' '}
              <span className="font-semibold text-surface-200">{totalCount}</span> sessions
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-surface-700 hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold text-surface-300">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1.5 rounded-lg border border-surface-700 hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
