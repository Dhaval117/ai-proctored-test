/**
 * AdminPage.tsx — Story 5.1: Admin Sessions List (Refactored to Fluent UI v9)
 *
 * Full admin dashboard displaying all candidate exam sessions, risk summaries,
 * real-time filtering, search, and KPI analytics.
 */
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  Title1,
  Text,
  Input,
  Select,
  Button,
  Spinner,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from '@fluentui/react-components'
import {
  Board24Filled,
  Search20Regular,
  Filter20Regular,
  ArrowCounterclockwise20Regular,
  DocumentText20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  CheckmarkCircle20Filled,
  Warning20Filled,
} from '@fluentui/react-icons'
import { api, type AdminSessionSummary } from '../lib/api'
import { ThemeToggle } from '../components/ThemeToggle'
import { CreateExamModal } from '../components/CreateExamModal'
import { useAdminStyles } from "./styles/AdminPage.styles"
import { useCommonStyles } from "./styles/common.styles"
import { ADMIN_PAGE_SIZE } from '../utils/constants'

export default function AdminPage() {
  const styles = useAdminStyles()
  const commonStyles = useCommonStyles()
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)

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
        page_size: ADMIN_PAGE_SIZE,
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSessions()
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge appearance="filled" color="success" icon={<CheckmarkCircle20Filled />}>
            Completed
          </Badge>
        )
      case 'SUSPENDED':
        return (
          <Badge appearance="filled" color="danger" icon={<Warning20Filled />}>
            Suspended
          </Badge>
        )
      case 'ACTIVE':
        return (
          <Badge appearance="tint" color="brand">
            <span className="pulse-dot" /> Active
          </Badge>
        )
      default:
        return (
          <Badge appearance="outline" color="subtle">
            Setup
          </Badge>
        )
    }
  }

  const getRiskScoreBadge = (score: number) => {
    if (score >= 40) {
      return (
        <Badge appearance="filled" color="danger">
          {score} (High)
        </Badge>
      )
    }
    if (score >= 15) {
      return (
        <Badge appearance="tint" color="warning">
          {score} (Medium)
        </Badge>
      )
    }
    return (
      <Badge appearance="tint" color="success">
        {score} (Low)
      </Badge>
    )
  }

  return (
    <div className={`${commonStyles.pageContainer} animate-fade-in`}>
      <div className={commonStyles.topToggle}>
        <ThemeToggle />
      </div>

      <div className={styles.mainWrapper}>
        {/* Header */}
        <div className={styles.headerRow}>
          <div className="flex items-center gap-3.5">
            <div className={styles.headerIconBox}>
              <Board24Filled className={styles.iconMd} />
            </div>
            <div>
              <Title1 className={styles.headerTitle}>Admin Portal - Exam Sessions</Title1>
              <Text className={styles.headerSubtitle}>
                Monitor candidates, proctoring violations, and risk summaries
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CreateExamModal onSuccess={fetchSessions} />
            <Button
              appearance="secondary"
              size="medium"
              icon={<ArrowCounterclockwise20Regular />}
              onClick={() => fetchSessions()}
              disabled={isLoading}
              className={styles.refreshBtn}
            >
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className={`${styles.filterCard} shadow-sm`}>
          <form onSubmit={handleSearchSubmit} className={styles.filterForm}>
            {/* Search Input */}
            <div className="md:col-span-2">
              <Input
                contentBefore={<Search20Regular />}
                size="large"
                placeholder="Search candidate by name or email..."
                value={searchQuery}
                onChange={(_, data) => setSearchQuery(data.value)}
                className={commonStyles.wFull}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                size="large"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className={commonStyles.wFull}
              >
                <option value="">All Exam Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="SETUP">SETUP</option>
              </Select>
            </div>

            {/* Language Filter */}
            <div className="flex gap-2">
              <Input
                size="large"
                placeholder="Filter Language (e.g. Python)"
                value={languageFilter}
                onChange={(_, data) => setLanguageFilter(data.value)}
                onBlur={() => {
                  setPage(1)
                  fetchSessions()
                }}
                className={commonStyles.wFull}
              />
              <Button type="submit" appearance="primary" size="large" icon={<Filter20Regular />} title="Apply Filters" />
            </div>
          </form>
        </Card>

        {/* Error State */}
        {error && (
          <div className={styles.errorAlert}>
            <span>{error}</span>
            <Button appearance="subtle" size="small" onClick={fetchSessions} className={styles.retryBtn}>
              Retry
            </Button>
          </div>
        )}

        {/* Table Card */}
        <Card className={`${styles.tableCard} shadow-md overflow-hidden`}>
          <div className={styles.tableContainer}>
            <Table aria-label="Admin sessions list" className={commonStyles.wFull}>
              <TableHeader className={styles.tableHeader}>
                <TableRow>
                  <TableHeaderCell className={styles.tableHeaderCellCandidate}>Candidate</TableHeaderCell>
                  <TableHeaderCell className={styles.tableHeaderCellLanguage}>Language / Exp</TableHeaderCell>
                  <TableHeaderCell className={styles.tableHeaderCellCompact}>Status</TableHeaderCell>
                  <TableHeaderCell className={styles.tableHeaderCellCompact}>Violations</TableHeaderCell>
                  <TableHeaderCell className={styles.tableHeaderCellCompact}>Created At</TableHeaderCell>
                  <TableHeaderCell className={styles.tableHeaderCellCompact}>Average Score</TableHeaderCell>
                  <TableHeaderCell className={styles.tableHeaderCellActions}>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody id='table-body-unique'>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className={styles.tableCellEmpty}>
                      <div className="flex flex-col items-center gap-3">
                        <Spinner size="medium" />
                        <Text className="text-neutral-500">Loading candidate exam sessions...</Text>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className={styles.tableCellEmpty}>
                      <Text className="text-neutral-500">
                        No candidate sessions found matching the selected filters.
                      </Text>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((s) => (
                    <TableRow key={s.session_id} className={styles.tableRow}>
                      <TableCell className={styles.tableCellCandidate}>
                        <div>
                          <Text className={styles.candidateNameText}>{s.candidate_name}</Text>
                          <Text className={styles.candidateEmailText}>
                            {s.candidate_email}
                          </Text>
                        </div>
                      </TableCell>

                      <TableCell className={styles.tableCell}>
                        <div>
                          <Text className={styles.languageText}>{s.language}</Text>
                          {s.language !== "Resume Based" && (
                            <Text className={styles.expText}>
                              {s.experience_years} yrs exp
                            </Text>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className={styles.tableCell}>{getStatusBadge(s.status)}</TableCell>

                      <TableCell className={styles.violationsCell}>
                        <span className={s.violation_count > 0 ? styles.violationsHighlight : styles.violationsNormal}>
                          {s.violation_count}
                        </span>
                        <span className={styles.violationsMax}> / 3</span>
                      </TableCell>

                      <TableCell className={styles.dateCell}>
                        {new Date(s.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>

                      <TableCell className={styles.tableCell}>
                        {s.average_score !== undefined && s.average_score !== null ? `${s.average_score}/10` : '-'}
                      </TableCell>

                      <TableCell>
                        <Link to={`/admin/sessions/${s.session_id}`} className={commonStyles.linkNoUnderline}>
                          <Button appearance="secondary" size="small" icon={<DocumentText20Regular />} className={styles.actionBtn}>
                            View Report
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className={styles.paginationFooter}>
            <Text className={styles.paginationText}>
              Showing <strong className={styles.paginationStrong}>{sessions.length}</strong> of{' '}
              <strong className={styles.paginationStrong}>{totalCount}</strong> sessions
            </Text>

            <div className="flex items-center gap-2">
              <Button
                size="small"
                appearance="subtle"
                icon={<ChevronLeft20Regular />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              />
              <Text className={styles.pageIndicator}>
                Page {page} / {totalPages}
              </Text>
              <Button
                size="small"
                appearance="subtle"
                icon={<ChevronRight20Regular />}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
