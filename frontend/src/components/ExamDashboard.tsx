import { useEffect, useState } from 'react'
import {
  Card,
  Title2,
  Title3,
  Text,
  Textarea,
  Button,
  Badge,
  Spinner,
  tokens,
} from '@fluentui/react-components'
import {
  Mic20Filled,
  RecordStop20Filled,
  Send20Filled,
  Speaker220Regular,
  CheckmarkCircle24Filled,
} from '@fluentui/react-icons'
import { useSpeech } from '../hooks/useSpeech'
import { useExamDashboardStyles } from "./styles/ExamDashboard.styles"

interface ExamDashboardProps {
  sessionId: string
}

export function ExamDashboard({ sessionId }: ExamDashboardProps) {
  const styles = useExamDashboardStyles()
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isFollowUp, setIsFollowUp] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [examComplete, setExamComplete] = useState(false)

  const {
    isSpeaking,
    isListening,
    transcript,
    error: speechError,
    speak,
    startRecording,
    stopRecording,
    setTranscript,
  } = useSpeech()

  const fetchNextQuestion = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/sessions/${sessionId}/next-question`)
      if (!res.ok) throw new Error('Failed to fetch next question')
      const data = await res.json()

      setCurrentQuestion(data.question_text)
      setQuestionNumber(data.main_question_number)
      setIsFollowUp(data.is_follow_up)
      if (data.total_main_questions) {
        setTotalQuestions(data.total_main_questions)
      }

      speak(data.question_text)
    } catch (err) {
      console.error(err)
      setCurrentQuestion('Error: Could not load the next question. Please ensure the backend is running or refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNextQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const handleSubmit = async () => {
    if (!transcript.trim()) return

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/sessions/${sessionId}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: '00000000-0000-0000-0000-000000000000',
          transcribed_text: transcript,
        }),
      })

      if (!res.ok) throw new Error('Failed to submit answer')
      const data = await res.json()

      if (data.next_action === 'EXAM_COMPLETE') {
        setExamComplete(true)
      } else {
        setTranscript('')
        await fetchNextQuestion()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (examComplete) {
    return (
      <div className={`${styles.completeBox} animate-fade-in`}>
        <div className={styles.completeIconBox}>
          <CheckmarkCircle24Filled className={styles.iconLg} />
        </div>
        <Title2 className={styles.completeTitle}>Exam Complete</Title2>
        <Text className={styles.completeText}>
          Thank you for completing the interview. Your results have been saved.
        </Text>
      </div>
    )
  }

  return (
    <div className={`${styles.dashboardContainer} animate-fade-in`}>
      {speechError && (
        <div className={styles.speechErrorBox}>
          {speechError}
        </div>
      )}

      {/* Question Card */}
      <Card className={`${styles.questionCard} shadow-md`}>
        {isSpeaking && (
          <div className={styles.speakingProgressBar} />
        )}

        <div className={styles.questionHeaderRow}>
          <div className={styles.badgesGroup}>
            <Badge appearance="tint" color="brand">
              Question {questionNumber} / {totalQuestions || 5}
            </Badge>
            {isFollowUp && (
              <Badge appearance="tint" color="important">
                Follow-up
              </Badge>
            )}
          </div>

          <Button
            appearance="subtle"
            icon={<Speaker220Regular style={{ color: isSpeaking ? tokens.colorBrandForeground1 : tokens.colorNeutralForeground3 }} />}
            onClick={() => speak(currentQuestion)}
            disabled={isSpeaking || isLoading}
            title="Repeat Question"
          />
        </div>

        <Text className={styles.questionTitle}>
          {isLoading ? (
            <span className={styles.loadingRow}>
              <Spinner size="tiny" /> Loading next question...
            </span>
          ) : (
            currentQuestion
          )}
        </Text>
      </Card>

      {/* Transcription Area */}
      <Card className={`${styles.transcriptionCard} shadow-md`}>
        {isListening && (
          <div className={styles.recordingBadge}>
            <span className="pulse-dot" /> RECORDING
          </div>
        )}

        <div className={styles.yourAnswerWrapper}>
          <Text className={styles.yourAnswerLabel}>Your Answer</Text>
        </div>

        <Textarea
          value={transcript}
          onChange={(_, data) => setTranscript(data.value)}
          placeholder={isListening ? 'Listening...' : "Click 'Start Recording' or type your answer here..."}
          size="large"
          disabled={isLoading || isSubmitting}
          className={styles.textareaFull}
        />

        <div className={styles.actionsRow}>
          <div className={styles.recordBtnsGroup}>
            {!isListening ? (
              <Button
                appearance="secondary"
                size="large"
                icon={<Mic20Filled />}
                onClick={startRecording}
                disabled={isLoading || isSubmitting || isSpeaking}
                className={styles.actionBtn}
              >
                Start Recording
              </Button>
            ) : (
              <Button
                appearance="primary"
                size="large"
                icon={<RecordStop20Filled />}
                onClick={stopRecording}
                className={styles.actionBtn}
              >
                Stop Recording
              </Button>
            )}
          </div>

          <Button
            appearance="primary"
            size="large"
            icon={isSubmitting ? <Spinner size="extra-tiny" /> : <Send20Filled />}
            onClick={handleSubmit}
            disabled={!transcript.trim() || isLoading || isSubmitting || isListening}
            className={styles.actionBtn}
          >
            Submit Answer
          </Button>
        </div>
      </Card>
    </div>
  )
}
