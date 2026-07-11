import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseSpeechReturn {
  isSpeaking: boolean
  isListening: boolean
  transcript: string
  error: string | null
  speak: (text: string) => void
  startRecording: () => void
  stopRecording: () => void
  setTranscript: (text: string) => void
}

export function useSpeech(): UseSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)

  // Initialize Speech Recognition
  useEffect(() => {
    // @ts-ignore - Vendor prefixes
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      setError('Speech Recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    
    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }
      
      // Update transcript using previous final transcript to allow continuous accumulation
      setTranscript(() => {
        // We only append final results when they happen.
        // Interim results just replace the current interim portion.
        // For simplicity in a robust UI, we can just rebuild the whole string if needed,
        // but since continuous=true, we get an array of all results.
        
        let fullTranscript = ''
        for (let i = 0; i < event.results.length; ++i) {
           fullTranscript += event.results[i][0].transcript
        }
        return fullTranscript
      })
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
      // setError(`Speech recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-Speech is not supported in this browser.')
      return
    }
    
    window.speechSynthesis.cancel() // Stop any current speech
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1.0 // Normal speed
    
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = (e) => {
      console.error('TTS Error', e)
      setIsSpeaking(false)
    }
    
    window.speechSynthesis.speak(utterance)
  }, [])

  const startRecording = useCallback(() => {
    setError(null)
    setTranscript('') // Clear previous transcript when starting fresh
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        // Ignore if already started
      }
    } else {
      // If we swap to Whisper later, this would start the MediaRecorder instead
      setError('Recording mechanism not initialized.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      // If we swap to Whisper later, this would stop the MediaRecorder and send the blob to the server
    }
  }, [])

  return {
    isSpeaking,
    isListening,
    transcript,
    error,
    speak,
    startRecording,
    stopRecording,
    setTranscript
  }
}
