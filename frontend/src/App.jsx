import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import Home from './pages/Home'
import Results from './pages/Results'
import History from './pages/History'
import Admin from './pages/Admin'
import AdminLogin from './pages/AdminLogin'
import { DetectionProvider } from './context/DetectionContext'

export default function App() {
  return (
    <DetectionProvider>
      <Layout>
        <Routes>
          <Route path="/"        element={<Home />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <AdminProtectedRoute>
              <Admin />
            </AdminProtectedRoute>
          } />
        </Routes>
      </Layout>
    </DetectionProvider>
  )
}
