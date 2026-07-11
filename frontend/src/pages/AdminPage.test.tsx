import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import AdminPage from './AdminPage'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({
  api: {
    getAdminSessions: vi.fn(),
  },
}))

describe('AdminPage (Story 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders admin dashboard header and filter controls', async () => {
    vi.mocked(api.getAdminSessions).mockResolvedValue({
      total: 1,
      page: 1,
      page_size: 10,
      sessions: [
        {
          session_id: '123e4567-e89b-12d3-a456-426614174000',
          candidate_name: 'Alice Smith',
          candidate_email: 'alice@example.com',
          language: 'Python',
          experience_years: 5,
          status: 'COMPLETED' as any,
          violation_count: 1,
          risk_score: 10,
          created_at: '2026-07-09T10:00:00Z',
        },
      ],
    })

    render(
      <BrowserRouter>
        <AdminPage />
      </BrowserRouter>
    )

    expect(screen.getByText(/Admin Portal — Exam Sessions/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('alice@example.com')).toBeInTheDocument()
      expect(screen.getByText('Python')).toBeInTheDocument()
    })
  })
})
