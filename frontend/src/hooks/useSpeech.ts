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

  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  // Accumulate final transcripts from the server, 
  // and append the interim one at the end.
  const finalTranscriptRef = useRef<string>('')

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsListening(false)
  }, [])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-Speech is not supported in this browser.')
      return
    }

    window.speechSynthesis.cancel() // Stop any current speech

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    utterance.rate = 1.0 // Normal speed

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = (e) => {
      console.error('TTS Error', e)
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    setTranscript('')
    finalTranscriptRef.current = ''

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Request 16kHz
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      mediaStreamRef.current = stream

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${wsProtocol}//${window.location.host}/api/speech/live`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsListening(true)

        // Start processing audio
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        const audioCtx = new AudioContextClass({ sampleRate: 16000 })
        audioCtxRef.current = audioCtx

        const source = audioCtx.createMediaStreamSource(stream)
        sourceRef.current = source

        const processor = audioCtx.createScriptProcessor(2048, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0)
            ws.send(inputData.buffer) // Send Float32Array underlying buffer
          }
        }

        source.connect(processor)
        processor.connect(audioCtx.destination) // Required for older browsers to keep processor alive
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.is_final) {
            finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + data.text
            setTranscript(finalTranscriptRef.current)
          } else {
            setTranscript((finalTranscriptRef.current ? finalTranscriptRef.current + ' ' : '') + data.text)
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e)
        }
      }

      ws.onerror = (e) => {
        console.error('WebSocket Error', e)
        setError('Lost connection to transcription server.')
        cleanup()
      }

      ws.onclose = () => {
        cleanup()
      }

    } catch (err: any) {
      console.error('Microphone access denied or error:', err)
      setError('Could not access microphone. Please ensure permissions are granted.')
      cleanup()
    }
  }, [cleanup])

  const stopRecording = useCallback(() => {
    cleanup()
  }, [cleanup])

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

