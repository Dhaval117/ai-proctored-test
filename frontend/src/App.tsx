/**
 * App.tsx — Root application with React Router and DesktopGuard.
 *
 * Route structure:
 *   /           → SetupPage      (candidate information form)
 *   /check      → SystemCheckPage (media + face verification)
 *   /exam/:id   → ExamPage       (live examination)
 *   /admin      → AdminPage      (admin dashboard)
 *   *           → Redirect to /
 *
 * DesktopGuard wraps all routes to block narrow viewports.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import DesktopGuard from './components/DesktopGuard'
import { AuthProvider } from './context/AuthContext'
import AdminLayout from './components/AdminLayout'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPage from './pages/AdminPage'
import AdminReportPage from './pages/AdminReportPage'
import SystemCheckPage from './pages/SystemCheckPage'
import ExamPage from './pages/ExamPage'

export default function App() {
  return (
    <AuthProvider>
      <DesktopGuard>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminPage />} />
            <Route path="sessions/:id" element={<AdminReportPage />} />
          </Route>

          {/* Candidate Routes */}
          <Route path="/exam/:id" element={<SystemCheckPage />} />
          <Route path="/exam/:id/take" element={<ExamPage />} />

          {/* Fallback */}
          <Route path="*" element={
            <div className="flex h-screen items-center justify-center text-xl font-semibold text-neutral-500">
              404 - Page Not Found. Please use the exact link provided to you.
            </div>
          } />
        </Routes>
      </DesktopGuard>
    </AuthProvider>
  )
}
