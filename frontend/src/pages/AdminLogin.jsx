import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Shield, KeyRound, LogIn, AlertTriangle } from 'lucide-react'
import { adminLogin, getAdminAuthStatus, setAdminToken } from '../services/api'

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authRequired, setAuthRequired] = useState(true)
  const [error, setError] = useState(null)

  const redirectTo = location.state?.from?.pathname || '/admin'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getAdminAuthStatus()
        if (cancelled) return
        setAuthRequired(!!data.auth_required)
        setChecking(false)
        if (!data.auth_required) {
          navigate(redirectTo, { replace: true })
        }
      } catch {
        if (!cancelled) {
          setChecking(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [navigate, redirectTo])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const data = await adminLogin(password)
      setAdminToken(data.access_token)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="p-8 max-w-xl mx-auto text-muted font-mono text-sm">
        Checking admin accessâ€¦
      </div>
    )
  }

  return (
    <div className="p-8 max-w-xl mx-auto animate-fade-in">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
            <Shield size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-dim font-mono text-xs uppercase tracking-widest">Admin Access</p>
            <h1 className="font-display font-800 text-2xl text-white">Admin Login</h1>
          </div>
        </div>

        {!authRequired && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-teal/10 border border-teal/30 text-teal text-sm font-mono">
            Admin auth is disabled on the server. Redirectingâ€¦
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-rose/10 border border-rose/30 text-rose text-sm font-mono flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-dim text-xs font-mono">ADMIN PASSWORD</span>
            <div className="mt-2 flex items-center gap-2 bg-ink border border-border rounded-xl px-3 py-2">
              <KeyRound size={14} className="text-dim" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm font-mono outline-none"
                placeholder="Enter admin password"
                required
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading || !authRequired}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
          >
            <LogIn size={14} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-xs text-muted font-mono">
          Set <span className="text-white">ADMIN_PASSWORD</span> in the backend environment to enable admin auth.
        </p>
      </div>
    </div>
  )
}
