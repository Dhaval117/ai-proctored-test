import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from './api'

// Mock the global fetch
const originalFetch = global.fetch

describe('api - 401 interceptor', () => {
  beforeEach(() => {
    // Reset local storage
    localStorage.clear()
    
    // Mock window.location.href
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/' },
      writable: true,
    })
    
    global.fetch = vi.fn()
  })
  
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('clears admin_token and redirects to /admin/login on 401 response from admin API', async () => {
    localStorage.setItem('admin_token', 'fake_token')
    
    // Mock fetch to return a 401 Unauthorized
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Unauthorized' }),
    } as Response)

    try {
      await api.getAdminSessions()
    } catch (e) {
      // Expected to throw an Error
    }

    // Ensure local storage is cleared
    expect(localStorage.getItem('admin_token')).toBeNull()
    
    // Ensure window location is redirected
    expect(window.location.href).toBe('/admin/login')
  })

  it('does not redirect on non-401 errors from admin API', async () => {
    localStorage.setItem('admin_token', 'fake_token')
    
    // Mock fetch to return a 500
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server Error' }),
    } as Response)

    try {
      await api.getAdminSessions()
    } catch (e) {
      // Expected to throw
    }

    // Ensure local storage remains
    expect(localStorage.getItem('admin_token')).toBe('fake_token')
    
    // Ensure no redirect occurred
    expect(window.location.href).toBe('http://localhost/')
  })
})
