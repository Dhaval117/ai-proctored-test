/**
 * AdminReportPage.tsx — Story 5.2: Admin Exam Report Page (Refactored to Fluent UI v9)
 *
 * Detailed report page for admin review of a specific candidate's session:
 * - Candidate profile & risk metrics
 * - Dialog Q&A Transcript with AI evaluation scores and feedback
 * - Chronological proctoring violation timeline with snapshot evidence
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Card,
  Title1,
  Title2,
  Title3,
  Text,
  Button,
  Spinner,
  Badge,
  TabList,
  Tab,
  tokens,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components'
import {
  ArrowLeft20Regular,
  Warning24Filled,
  CheckmarkCircle20Filled,
  ShieldCheckmark20Regular,
  Clock20Regular,
  Reward20Filled,
  Chat20Regular,
  Eye20Regular,
} from '@fluentui/react-icons'
import { api, type SessionReport, type QATranscriptItem, type ProctoringLogItem } from '../lib/api'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAdminReportStyles } from './AdminReportPage.styles'

export default function AdminReportPage() {
  const styles = useAdminReportStyles()
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
      <div className={`${styles.loadingBox} animate-fade-in`}>
        <div className={styles.topToggle}>
          <ThemeToggle />
        </div>
        <Spinner size="large" label="Loading Candidate Audit Report..." />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className={`${styles.errorBox} animate-fade-in`}>
        <div className={styles.topToggle}>
          <ThemeToggle />
        </div>
        <Card className={`${styles.errorCard} shadow-md`}>
          <div className={styles.errorIconBox}>
            <Warning24Filled className={styles.iconLg} />
          </div>
          <Title2 className={styles.errorTitle}>Report Load Error</Title2>
          <Text className={styles.errorText}>
            {error || 'Session report not found'}
          </Text>
          <Link to="/admin" className={styles.linkNoUnderline}>
            <Button appearance="primary" size="large" icon={<ArrowLeft20Regular />} className={styles.errorBackBtn}>
              Back to Admin Sessions
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const { session, qa_transcript, proctoring_logs } = report

  const scoredItems = qa_transcript.filter(
    (q: QATranscriptItem) => !q.is_follow_up && q.evaluation_score !== null && q.evaluation_score !== undefined
  )
  const avgScore =
    scoredItems.length > 0
      ? (scoredItems.reduce((acc: number, q: QATranscriptItem) => acc + (q.evaluation_score || 0), 0) / scoredItems.length).toFixed(1)
      : null

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
          <Badge appearance="filled" color="danger" icon={<Warning24Filled />}>
            Suspended
          </Badge>
        )
      default:
        return (
          <Badge appearance="tint" color="brand" icon={<Clock20Regular />}>
            {status}
          </Badge>
        )
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return <Badge appearance="filled" color="danger">HIGH</Badge>
      case 'MEDIUM':
        return <Badge appearance="tint" color="warning">MEDIUM</Badge>
      default:
        return <Badge appearance="outline" color="subtle">LOW</Badge>
    }
  }

  const handleTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    setActiveTab(data.value as 'transcript' | 'proctoring')
  }

  return (
    <div className={`${styles.pageContainer} animate-fade-in`}>
      <div className={styles.topToggle}>
        <ThemeToggle />
      </div>

      <div className={styles.mainWrapper}>
        {/* Nav Back */}
        <div>
          <Link to="/admin" className={styles.linkNoUnderline}>
            <Button appearance="subtle" icon={<ArrowLeft20Regular />} className={styles.backBtn}>
              Back to Admin Sessions List
            </Button>
          </Link>
        </div>

        {/* Candidate & Risk Summary Header Card */}
        <Card className={`${styles.headerCard} shadow-md`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Title1 className={styles.headerTitle}>{session.candidate_name}</Title1>
                {getStatusBadge(session.status)}
              </div>
              <div className={styles.headerMetaRow}>
                <span>
                  Language: <strong className={styles.headerMetaBrand}>{session.language}</strong>
                </span>
                <span>•</span>
                <span>
                  Experience: <strong className={styles.headerMetaValue}>{session.experience_years} years</strong>
                </span>
                <span>•</span>
                <span>
                  Exam Started: <strong className={styles.headerMetaValue}>{new Date(session.created_at).toLocaleString()}</strong>
                </span>
              </div>
            </div>

            {/* Risk & Score Metrics Box */}
            <div className={styles.metricsGrid}>
              <div>
                <Text className={styles.metricLabel}>
                  Questions Answered
                </Text>
                <Text className={styles.metricValueBrand}>
                  {qa_transcript.length} / 5
                </Text>
              </div>

              <div>
                <Text className={styles.metricLabel}>
                  Avg Score (out of 10)
                </Text>
                <Text className={styles.metricValueGreen}>
                  {avgScore !== null ? `${avgScore} / 10` : 'N/A'}
                </Text>
              </div>

              <div>
                <Text className={styles.metricLabel}>
                  Risk Score
                </Text>
                <Text
                  className={styles.metricValueDynamic}
                  style={{
                    color:
                      session.risk_score >= 40
                        ? tokens.colorPaletteRedForeground1
                        : session.risk_score >= 15
                        ? tokens.colorPaletteYellowForeground1
                        : tokens.colorPaletteGreenForeground1,
                  }}
                >
                  {session.risk_score}
                </Text>
              </div>
            </div>
          </div>
        </Card>

        {/* TabList */}
        <div className={styles.tabListWrapper}>
          <TabList selectedValue={activeTab} onTabSelect={handleTabSelect} size="large">
            <Tab value="transcript" icon={<Chat20Regular />}>
              Dialog Transcript ({qa_transcript.length})
            </Tab>
            <Tab value="proctoring" icon={<ShieldCheckmark20Regular />}>
              Proctoring Flag History ({proctoring_logs.length})
            </Tab>
          </TabList>
        </div>

        {/* Tab 1: Dialog Transcript */}
        {activeTab === 'transcript' && (
          <div className="space-y-4">
            {qa_transcript.length === 0 ? (
              <Card className={styles.emptyTranscriptCard}>
                No interview questions recorded for this session yet.
              </Card>
            ) : (
              qa_transcript.map((qa: QATranscriptItem, i: number) => (
                <Card key={qa.question_id || i} className={`${styles.qaCard} shadow-sm`}>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <div className="flex items-center gap-2">
                      <Badge appearance="tint" color="brand">
                        Question #{qa.sequence_number}
                      </Badge>
                      {qa.is_follow_up && (
                        <Badge appearance="tint" color="important">
                          Follow-up Question
                        </Badge>
                      )}
                    </div>

                    {qa.evaluation_score !== null && qa.evaluation_score !== undefined && (
                      <Badge appearance="filled" color="success" icon={<Reward20Filled />}>
                        Score: {qa.evaluation_score} / 10
                      </Badge>
                    )}
                  </div>

                  {/* AI Question */}
                  <div className="mb-4">
                    <Text className={styles.qaSectionLabelBrand}>
                      AI Interviewer Prompt
                    </Text>
                    <div className={styles.qaPromptBox}>
                      {qa.question_text}
                    </div>
                  </div>

                  {/* Candidate Transcribed Answer */}
                  <div className="mb-4">
                    <Text className={styles.qaSectionLabelNeutral}>
                      Candidate Transcribed Response
                    </Text>
                    <div className={styles.qaAnswerBox}>
                      {qa.answer_text ? `"${qa.answer_text}"` : <span className={styles.qaNoAnswerSpan}>(No answer submitted)</span>}
                    </div>
                  </div>

                  {/* AI Feedback */}
                  {qa.evaluation_feedback && (
                    <div className={styles.qaFeedbackBox}>
                      <strong className="block mb-1">AI Evaluation & Feedback:</strong>
                      {qa.evaluation_feedback}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Proctoring Timeline */}
        {activeTab === 'proctoring' && (
          <Card className={`${styles.proctoringCard} shadow-sm`}>
            <div className={styles.proctoringHeaderRow}>
              <ShieldCheckmark20Regular className={styles.proctoringIcon} />
              <Title3 className={styles.proctoringTitle}>Chronological Proctoring Log ({proctoring_logs.length} events)</Title3>
            </div>

            {proctoring_logs.length === 0 ? (
              <div className={styles.proctoringEmptyBox}>
                <CheckmarkCircle20Filled className={styles.proctoringEmptyIcon} />
                <Text className="block text-neutral-500">
                  No proctoring violations recorded during this exam session. Clean session!
                </Text>
              </div>
            ) : (
              <div className={styles.timelineContainer}>
                {proctoring_logs.map((log: ProctoringLogItem) => (
                  <div key={log.id} className={styles.timelineItemCard}>
                    <div className={styles.timelineDot} />

                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={styles.timelineEventType}>
                          {log.event_type}
                        </span>
                        {getSeverityBadge(log.severity)}
                        {log.warning_number && (
                          <Badge appearance="outline" color="subtle">
                            Warning #{log.warning_number}
                          </Badge>
                        )}
                      </div>

                      <Text className={styles.timelineTime}>
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </Text>
                    </div>

                    {log.snapshot ? (
                      <div className="mt-3">
                        <div className={styles.timelineSnapshotLabel}>
                          <Eye20Regular /> Captured Snapshot Evidence
                        </div>
                        <img
                          src={log.snapshot}
                          alt="Proctoring violation snapshot"
                          className={styles.timelineSnapshotImg}
                        />
                      </div>
                    ) : (
                      <Text className={styles.timelineNoSnapshotText}>
                        No snapshot image attached to this event.
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
