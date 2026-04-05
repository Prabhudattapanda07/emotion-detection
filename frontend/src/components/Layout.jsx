import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Brain, BarChart2, Clock, Shield,
  Cpu, Wifi, CloudLightning
} from 'lucide-react'
import { getAdminToken } from '../services/api'

const NAV_BASE = [
  { to: '/',        icon: Brain,          label: 'Detect' },
  { to: '/results', icon: BarChart2,      label: 'Results' },
  { to: '/history', icon: Clock,          label: 'History' },
]
const ADMIN_NAV = { to: '/admin', icon: Shield, label: 'Admin' }

export default function Layout({ children }) {
  const location = useLocation()
  const [showAdmin, setShowAdmin] = useState(false)

  useEffect(() => {
    setShowAdmin(!!getAdminToken())
  }, [location.pathname])

  const navItems = showAdmin ? [...NAV_BASE, ADMIN_NAV] : NAV_BASE

  return (
    <div className="flex min-h-screen bg-ink">
      {/* ── Sidebar ────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 bg-panel border-r border-border flex flex-col">
        {/* Logo */}
        <div className="px-6 py-7 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                <CloudLightning size={18} className="text-accent" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-teal border-2 border-panel" />
            </div>
            <div>
              <p className="font-display font-800 text-white text-base leading-none">EmotiCloud</p>
              <p className="text-dim text-xs mt-0.5 font-mono">v2.0 · Cloud AI</p>
            </div>
          </div>
        </div>

        {/* Cloud status badge */}
        <div className="mx-4 mt-4 px-3 py-2 rounded-lg bg-teal/5 border border-teal/20 flex items-center gap-2">
          <Wifi size={12} className="text-teal" />
          <span className="text-xs text-teal font-mono">Cloud Connected</span>
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal ping-slow" />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 mt-6 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-display font-600 transition-all duration-150 ` +
                (isActive
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-dim hover:text-white hover:bg-white/5')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-accent' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Cloud info footer */}
        <div className="px-4 pb-6 space-y-2">
          <div className="text-xs text-muted font-mono px-1 mb-2">CLOUD LAYER</div>
          {[
            { icon: Cpu,           label: 'FastAPI · Render' },
            { icon: CloudLightning, label: 'MongoDB · GridFS' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted">
              <Icon size={11} />
              <span className="font-mono">{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
