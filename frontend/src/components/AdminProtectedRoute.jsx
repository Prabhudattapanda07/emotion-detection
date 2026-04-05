import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAdminAuthStatus, getAdminToken } from '../services/api'

/**
 * When the API has ADMIN_PASSWORD set, only allow /admin/dashboard with a stored JWT.
 * When auth is disabled on the server, allow direct access.
 */
export default function AdminProtectedRoute({ children }) {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getAdminAuthStatus()
        if (cancelled) return
        if (!data.auth_required) {
          setAllowed(true)
          setReady(true)
          return
        }
        const token = getAdminToken()
        setAllowed(!!token)
        setReady(true)
      } catch {
        if (!cancelled) {
          setAllowed(false)
          setReady(true)
        }
      }
    })()
    return () => { cancelled = true }
  }, [location.pathname])

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted font-mono text-sm">
        Checking access…
      </div>
    )
  }

  if (!allowed) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />
  }

  return children
}
