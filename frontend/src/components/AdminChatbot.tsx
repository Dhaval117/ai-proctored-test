import React, { useState, useRef, useEffect } from 'react'
import {
  Button,
  Input,
  Spinner,
} from '@fluentui/react-components'
import {
  Chat24Filled,
  Send20Regular,
  Dismiss20Regular,
  Bot24Regular
} from '@fluentui/react-icons'
import { api } from '../lib/api'
import { useAdminChatbotStyles } from './styles/AdminChatbot.styles'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'bot'
  content: string
}

export function AdminChatbot() {
  const styles = useAdminChatbotStyles()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: 'Hello! I am your AI admin assistant. You can ask me natural language questions about your exams, candidates, or proctoring logs.' }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const response = await api.adminChat({ message: userMessage })
      setMessages(prev => [...prev, { role: 'bot', content: response.response }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'bot', content: `Error: ${err.message || 'Failed to get response'}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.container}>
      <div className={isOpen ? styles.chatWindow : `${styles.chatWindow} ${styles.chatWindowHidden}`}>
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot24Regular />
            <div>
              <div className={styles.headerTitle}>ProctorAI Assistant</div>
              <div className={styles.headerSubtitle}>Ask questions about your data</div>
            </div>
          </div>
          <Button 
            appearance="subtle" 
            icon={<Dismiss20Regular />} 
            onClick={() => setIsOpen(false)} 
            style={{ color: 'white' }}
          />
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((msg, idx) => (
            <div key={idx} className={msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleBot}>
              <div className={styles.messageText}>
                {msg.role === 'bot' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={styles.messageBubbleBot}>
              <Spinner size="extra-tiny" label="Thinking..." labelPosition="after" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputContainer}>
          <Input
            className={styles.input}
            placeholder="Ask a question..."
            value={inputValue}
            onChange={(_, data) => setInputValue(data.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <Button
            className={styles.sendButton}
            appearance="primary"
            icon={<Send20Regular />}
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          />
        </div>
      </div>

      <div 
        className={styles.toggleButton} 
        onClick={() => setIsOpen(!isOpen)}
        title="Open AI Assistant"
      >
        {isOpen ? <Dismiss20Regular fontSize={24} /> : <Chat24Filled fontSize={24} />}
      </div>
    </div>
  )
}
