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
import SetupPage from './pages/SetupPage'
import SystemCheckPage from './pages/SystemCheckPage'
import ExamPage from './pages/ExamPage'
import AdminPage from './pages/AdminPage'
import AdminReportPage from './pages/AdminReportPage'

export default function App() {
  return (
    <DesktopGuard>
      <Routes>
        <Route path="/"                   element={<SetupPage />} />
        <Route path="/check"              element={<SystemCheckPage />} />
        <Route path="/exam/:id"           element={<ExamPage />} />
        <Route path="/admin"              element={<AdminPage />} />
        <Route path="/admin/sessions/:id" element={<AdminReportPage />} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
    </DesktopGuard>
  )
}
