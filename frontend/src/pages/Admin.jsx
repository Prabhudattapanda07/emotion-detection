import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Trash2, ToggleLeft, ToggleRight,
  BarChart2, RefreshCw, Terminal, CloudLightning,
  AlertTriangle, CheckCircle2, LogOut
} from 'lucide-react'
import {
  getUsageStats, toggleAutoDelete, getAutoDeleteStatus,
  bulkDelete, getLogs, clearAdminToken
} from '../services/api'

function StatCard({ label, value, color = '#00d4ff', icon: Icon }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: color + '15', border: `1px solid ${color}30` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-dim text-xs font-mono">{label}</p>
        <p className="font-display font-800 text-2xl text-white">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const [stats,       setStats]       = useState(null)
  const [autoDelete,  setAutoDelete]  = useState(false)
  const [logs,        setLogs]        = useState([])
  const [bulkDays,    setBulkDays]    = useState(7)
  const [loading,     setLoading]     = useState({ stats: false, toggle: false, bulk: false, logs: false })
  const [toast,       setToast]       = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadAll() {
    setLoading(l => ({ ...l, stats: true, logs: true }))
    try {
      const [s, ad, l] = await Promise.all([
        getUsageStats(),
        getAutoDeleteStatus(),
        getLogs(30),
      ])
      setStats(s.stats)
      setAutoDelete(ad.auto_delete_enabled)
      setLogs(l.logs ?? [])
    } catch (e) {
      showToast('Failed to load admin data', 'error')
    } finally {
      setLoading(l => ({ ...l, stats: false, logs: false }))
    }
  }

  useEffect(() => { loadAll() }, [])

  async function handleToggle() {
    setLoading(l => ({ ...l, toggle: true }))
    try {
      const newVal = !autoDelete
      await toggleAutoDelete(newVal)
      setAutoDelete(newVal)
      showToast(`Auto-cleanup ${newVal ? 'enabled' : 'disabled'}`)
    } catch {
      showToast('Toggle failed', 'error')
    } finally {
      setLoading(l => ({ ...l, toggle: false }))
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ALL records older than ${bulkDays} days from MongoDB (including GridFS files)?`)) return
    setLoading(l => ({ ...l, bulk: true }))
    try {
      const res = await bulkDelete(bulkDays)
      showToast(`Deleted ${res.deleted_count} records from cloud`)
      loadAll()
    } catch {
      showToast('Bulk delete failed', 'error')
    } finally {
      setLoading(l => ({ ...l, bulk: false }))
    }
  }

  function handleLogout() {
    clearAdminToken()
    navigate('/admin/login')
  }

  const logLevelStyle = {
    INFO:    'text-teal  bg-teal/5  border-teal/20',
    WARNING: 'text-amber bg-amber/5 border-amber/20',
    ERROR:   'text-rose  bg-rose/5  border-rose/20',
  }

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border font-mono text-sm animate-slide-up
          ${toast.type === 'error' ? 'bg-rose/10 border-rose/30 text-rose' : 'bg-teal/10 border-teal/30 text-teal'}`}>
          {toast.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-dim font-mono text-xs uppercase tracking-widest mb-1">Cloud Administration</p>
          <h1 className="font-display font-800 text-3xl text-white">Admin Panel</h1>
          <p className="text-dim text-sm mt-1">Manage cloud resources, auto-cleanup and usage tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading.stats ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleLogout} className="btn-ghost flex items-center gap-2 text-sm">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Usage stats */}
      <section className="mb-8">
        <h2 className="font-display font-700 text-white mb-4 flex items-center gap-2">
          <BarChart2 size={16} className="text-accent" />
          Usage Tracking
          <span className="tag text-dim border-border ml-2 font-mono text-xs">Cloud Principle</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={CloudLightning} label="Total Requests"
            value={stats?.total_requests ?? 0} color="#00d4ff" />
          <StatCard icon={Shield} label="Face Requests"
            value={stats?.face_requests ?? 0} color="#00b4a0" />
          <StatCard icon={Shield} label="Voice Requests"
            value={stats?.voice_requests ?? 0} color="#ffb547" />
        </div>
        {stats?.last_request && (
          <p className="mt-3 text-xs font-mono text-muted">
            Last request: {new Date(stats.last_request).toLocaleString()}
          </p>
        )}
      </section>

      {/* Auto-delete toggle */}
      <section className="mb-8">
        <h2 className="font-display font-700 text-white mb-4 flex items-center gap-2">
          <RefreshCw size={16} className="text-amber" />
          Auto-Cleanup (Background Task)
          <span className="tag text-amber border-amber/30 bg-amber/5 ml-2 font-mono text-xs">Runs on Cloud Server</span>
        </h2>
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="font-display font-600 text-white">Daily Cleanup Job</p>
            <p className="text-dim text-sm mt-0.5">
              Runs at 02:00 UTC on the cloud server. Deletes records older than 7 days
              from MongoDB (documents + GridFS) automatically.
            </p>
            <p className="text-xs font-mono text-muted mt-2">
              Cloud Principle: Background task runs server-side 24/7 — no client needed.
            </p>
          </div>
          <button onClick={handleToggle} disabled={loading.toggle}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-display font-600 text-sm
              hover:brightness-110"
            style={autoDelete
              ? { background: '#00b4a010', borderColor: '#00b4a040', color: '#00b4a0' }
              : { background: '#1e2a4280', borderColor: '#1e2a42',   color: '#8899aa' }}>
            {loading.toggle
              ? <RefreshCw size={16} className="animate-spin" />
              : autoDelete ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {autoDelete ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </section>

      {/* Bulk delete */}
      <section className="mb-8">
        <h2 className="font-display font-700 text-white mb-4 flex items-center gap-2">
          <Trash2 size={16} className="text-rose" />
          Bulk Delete
        </h2>
        <div className="card flex items-center gap-4 flex-wrap">
          <p className="text-dim text-sm flex-1">
            Delete all MongoDB records and GridFS files older than:
          </p>
          <div className="flex items-center gap-3">
            <select value={bulkDays} onChange={e => setBulkDays(+e.target.value)}
              className="bg-ink border border-border rounded-xl px-3 py-2 text-sm font-mono text-white
                         focus:outline-none focus:border-accent">
              {[1, 3, 7, 14, 30].map(d => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
            <button onClick={handleBulkDelete} disabled={loading.bulk}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose/10 border border-rose/30
                         text-rose font-display font-700 text-sm hover:bg-rose/20 transition-all">
              {loading.bulk
                ? <RefreshCw size={14} className="animate-spin" />
                : <Trash2 size={14} />}
              Delete from Cloud
            </button>
          </div>
        </div>
      </section>

      {/* Cloud logs */}
      <section>
        <h2 className="font-display font-700 text-white mb-4 flex items-center gap-2">
          <Terminal size={16} className="text-teal" />
          Cloud Logs
          <span className="tag text-teal border-teal/30 bg-teal/5 ml-2 font-mono text-xs">Stored in MongoDB</span>
        </h2>
        <div className="card p-0 overflow-hidden">
          <div className="border-b border-border px-4 py-2.5 flex items-center gap-2 bg-ink">
            <Terminal size={12} className="text-teal" />
            <span className="font-mono text-xs text-dim">mongodb://logs (last 30)</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-center py-8 text-muted font-mono text-sm">No logs yet</p>
            ) : (
              logs.map((log, i) => (
                <div key={i}
                  className="flex items-start gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-white/2 text-xs font-mono">
                  <span className={`tag flex-shrink-0 ${logLevelStyle[log.level] ?? 'text-dim border-border'}`}>
                    {log.level}
                  </span>
                  <span className="text-dim">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="text-white flex-1">{log.message}</span>
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <span className="text-muted">{JSON.stringify(log.meta)}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
