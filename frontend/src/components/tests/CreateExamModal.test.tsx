import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CreateExamModal } from '../CreateExamModal'
import { api } from '../../lib/api'
import { ThemeProvider } from '../../context/ThemeContext'

vi.mock('../../lib/api', () => ({
  api: {
    createAdminSession: vi.fn(),
  },
}))

describe('CreateExamModal', () => {
  it('renders correctly and opens modal', () => {
    render(
      <ThemeProvider>
        <CreateExamModal onSuccess={vi.fn()} />
      </ThemeProvider>
    )
    const btn = screen.getByText('Create Exam')
    expect(btn).toBeInTheDocument()
    
    // Open modal
    fireEvent.click(btn)
    expect(screen.getByText('Create New Exam')).toBeInTheDocument()
  })

  it('submits form and calls createAdminSession', async () => {
    const mockOnSuccess = vi.fn()
    vi.mocked(api.createAdminSession).mockResolvedValue({
      session_id: '123',
      candidate_id: '456',
      status: 'SETUP' as any,
      message: 'Created',
    })

    render(
      <ThemeProvider>
        <CreateExamModal onSuccess={mockOnSuccess} />
      </ThemeProvider>
    )
    
    // Open modal
    fireEvent.click(screen.getByText('Create Exam'))
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/Candidate Name/i), { target: { value: 'John Doe' } })
    fireEvent.change(screen.getByLabelText(/Candidate Email/i), { target: { value: 'john@example.com' } })
    fireEvent.change(screen.getByLabelText(/Technology \/ Language/i), { target: { value: 'TypeScript' } })
    fireEvent.change(screen.getByLabelText(/Years of Experience/i), { target: { value: '3' } })
    
    // Submit
    const submitBtn = screen.getAllByText('Create Exam')[1] // The second one is the submit button
    fireEvent.click(submitBtn)
    
    await waitFor(() => {
      expect(api.createAdminSession).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        expires_in_hours: 24,
        num_questions: 5,
        follow_ups_per_question: 1,
        language: 'TypeScript',
        experience_years: 3,
      })
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })
})
