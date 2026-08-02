import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SystemCheckPage from '../SystemCheckPage'
import { api } from '../../lib/api'
import { ThemeProvider } from '../../context/ThemeContext'

vi.mock('../../lib/api', () => ({
  api: {
    checkSessionValidity: vi.fn(),
  },
}))

vi.mock('../../hooks/useFaceDetection', () => ({
  useFaceDetection: vi.fn().mockReturnValue({
    faceStatus: 'NO_FACE',
    initializeProctoring: vi.fn().mockResolvedValue(true),
    stopProctoring: vi.fn()
  })
}))

vi.mock('../../lib/photoValidation', () => ({
  validateReferencePhoto: vi.fn().mockResolvedValue({ valid: true }),
  ensureFaceApiModelsLoaded: vi.fn().mockResolvedValue(undefined)
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('SystemCheckPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to exam page if session status is not SETUP', async () => {
    vi.mocked(api.checkSessionValidity).mockResolvedValue({
      session_id: '123',
      status: 'COMPLETED' as any,
      message: 'Session valid',
    })

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/exam/123']}>
          <Routes>
            <Route path="/exam/:id" element={<SystemCheckPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/exam/123/take', { replace: true })
    })
  })

  it('renders system check wizard if session status is SETUP', async () => {
    vi.mocked(api.checkSessionValidity).mockResolvedValue({
      session_id: '123',
      status: 'SETUP' as any,
      message: 'Session valid',
    })

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/exam/123']}>
          <Routes>
            <Route path="/exam/:id" element={<SystemCheckPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/System Check/i)).toBeInTheDocument()
      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })
})
