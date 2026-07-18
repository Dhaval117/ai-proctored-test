import { useEffect, useState } from 'react'
import { Mic, Square, Send, Loader2, Volume2, CheckCircle } from 'lucide-react'
import { useSpeech } from '../hooks/useSpeech'

interface ExamDashboardProps {
  sessionId: string
}

export function ExamDashboard({ sessionId }: ExamDashboardProps) {
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
    setTranscript
  } = useSpeech()

  // Fetch the next question
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

      // Auto-speak the question
      speak(data.question_text)
    } catch (err) {
      console.error(err)
      setCurrentQuestion('Error: Could not load the next question. Please ensure the backend is running or refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
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
          question_id: '00000000-0000-0000-0000-000000000000', // We don't strictly use this in LangGraph logic yet
          transcribed_text: transcript
        })
      })

      if (!res.ok) throw new Error('Failed to submit answer')
      const data = await res.json()

      if (data.next_action === 'EXAM_COMPLETE') {
        setExamComplete(true)
      } else {
        // Fetch the next question
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
      <div className="flex flex-col items-center justify-center p-8 animate-fade-in text-center mt-10">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Exam Complete</h2>
        <p className="text-surface-300">
          Thank you for completing the interview. Your results have been saved.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-fade-in">
      {speechError && (
        <div className="mb-4 p-3 bg-red-950 border border-red-900 text-red-400 rounded-lg text-sm">
          {speechError}
        </div>
      )}

      {/* Question Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden">
        {/* Subtle speaking indicator */}
        {isSpeaking && (
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 animate-pulse" />
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="badge badge-primary">
              Question {questionNumber} / {totalQuestions}
            </span>
            {isFollowUp && (
              <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Follow-up
              </span>
            )}
          </div>

          <button
            onClick={() => speak(currentQuestion)}
            disabled={isSpeaking || isLoading}
            className="p-2 rounded-full hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
            title="Repeat Question"
          >
            {isSpeaking ? <Volume2 className="h-5 w-5 animate-pulse text-brand-400" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>

        <h3 className="text-xl font-medium leading-relaxed">
          {isLoading ? (
            <div className="flex items-center gap-3 text-surface-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading next question...
            </div>
          ) : (
            currentQuestion
          )}
        </h3>
      </div>

      {/* Transcription Area */}
      <div className="glass-card p-6 border-brand-500/30 border transition-all duration-300 relative">
        {isListening && (
          <div className="absolute top-0 right-0 p-4">
            <div className="flex items-center gap-2 text-red-500 text-xs font-medium animate-pulse">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              RECORDING
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-medium text-surface-300">Your Answer</h4>
        </div>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={isListening ? "Listening..." : "Click 'Start Recording' or type your answer here..."}
          className="w-full h-32 bg-surface-900/50 border border-surface-700 rounded-lg p-4 text-white placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors resize-none"
          disabled={isLoading || isSubmitting}
        />

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-3">
            {!isListening ? (
              <button
                onClick={startRecording}
                disabled={isLoading || isSubmitting || isSpeaking}
                className="btn-primary bg-surface-800 hover:bg-surface-700 text-white flex items-center gap-2"
              >
                <Mic className="h-4 w-4" /> Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="btn-primary bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 flex items-center gap-2"
              >
                <Square className="h-4 w-4" /> Stop Recording
              </button>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!transcript.trim() || isLoading || isSubmitting || isListening}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  )
}
