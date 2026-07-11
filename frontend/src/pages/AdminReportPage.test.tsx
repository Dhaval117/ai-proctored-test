import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminReportPage from './AdminReportPage'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    getAdminSessionDetail: vi.fn(),
  },
}))

describe('AdminReportPage (Story 5.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders detailed QA transcript and proctoring logs for a candidate session', async () => {
    vi.mocked(api.getAdminSessionDetail).mockResolvedValue({
      session: {
        session_id: '123e4567-e89b-12d3-a456-426614174000',
        candidate_id: '11111111-1111-1111-1111-111111111111',
        candidate_name: 'Alice Smith',
        language: 'Python',
        experience_years: 5,
        status: 'COMPLETED' as any,
        violation_count: 1,
        risk_score: 20,
        created_at: '2026-07-09T10:00:00Z',
      },
      qa_transcript: [
        {
          question_id: 'q-1',
          question_text: 'Explain Python decorators.',
          answer_text: 'Decorators wrap a function to modify its behavior.',
          is_follow_up: false,
          sequence_number: 1,
          evaluation_score: 9,
          evaluation_feedback: 'Excellent explanation.',
          created_at: '2026-07-09T10:01:00Z',
        },
      ],
      proctoring_logs: [
        {
          id: 'log-1',
          event_type: 'TAB_SWITCH' as any,
          severity: 'MEDIUM' as any,
          warning_number: 1,
          timestamp: '2026-07-09T10:02:00Z',
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/admin/sessions/123e4567-e89b-12d3-a456-426614174000']}>
        <Routes>
          <Route path="/admin/sessions/:id" element={<AdminReportPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText(/Explain Python decorators\./i)).toBeInTheDocument()
      expect(screen.getByText(/Decorators wrap a function to modify its behavior\./i)).toBeInTheDocument()
      expect(screen.getByText(/Score: 9 \/ 10/i)).toBeInTheDocument()
    })
  })
})
