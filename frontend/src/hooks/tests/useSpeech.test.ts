import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSpeech } from '../useSpeech'

// Mock browser APIs
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: WebSocket.OPEN,
} as any

const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() })),
  createScriptProcessor: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null,
  })),
  destination: {},
  close: vi.fn(),
  state: 'running',
} as any

describe('useSpeech', () => {
  beforeEach(() => {
    // Mock getUserMedia
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        }),
      },
      writable: true,
    })

    // Mock WebSocket
    global.WebSocket = vi.fn().mockImplementation(class {
      constructor() {
        return mockWebSocket
      }
    }) as any
    global.WebSocket.OPEN = 1

    // Mock AudioContext
    global.window.AudioContext = vi.fn().mockImplementation(class {
      constructor() {
        return mockAudioContext
      }
    }) as any
    global.window.speechSynthesis = {
      cancel: vi.fn(),
      speak: vi.fn(),
    } as any
    global.SpeechSynthesisUtterance = vi.fn() as any
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes recording and converts float32 to int16', async () => {
    const { result } = renderHook(() => useSpeech())

    await act(async () => {
      result.current.startRecording()
    })

    // wait for media stream to resolve
    await waitFor(() => {
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalled()
    })

    if (result.current.error) {
      throw new Error(`Hook error: ${result.current.error}`)
    }

    expect(global.WebSocket).toHaveBeenCalledWith(expect.stringContaining('/api/speech/live'))

    // Trigger onopen
    await act(async () => {
      mockWebSocket.onopen()
    })

    expect(global.window.AudioContext).toHaveBeenCalled()
    expect(mockAudioContext.createScriptProcessor).toHaveBeenCalledWith(2048, 1, 1)

    // Find the processor that was returned
    const processor = mockAudioContext.createScriptProcessor.mock.results[0].value
    expect(processor.onaudioprocess).toBeDefined()

    // Simulate audio process event with some float32 data
    const mockInputData = new Float32Array([1.0, -1.0, 0.5, -0.5, 0.0])
    const expectedInt16Data = new Int16Array([32767, -32768, 16383, -16384, 0])
    
    const mockEvent = {
      inputBuffer: {
        getChannelData: () => mockInputData
      }
    }

    mockWebSocket.readyState = WebSocket.OPEN

    await act(async () => {
      processor.onaudioprocess(mockEvent)
    })

    // It should have converted to int16 and sent the buffer
    expect(mockWebSocket.send).toHaveBeenCalled()
    const sentData = mockWebSocket.send.mock.calls[0][0]
    
    // Check if the sent data matches expected int16 buffer
    expect(new Int16Array(sentData)).toEqual(expectedInt16Data)
  })
})
