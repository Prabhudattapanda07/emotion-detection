export default function ConfidenceBar({ label, value, color = '#00d4ff' }) {
  const pct = Math.round((value ?? 0) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono text-dim">
        <span className="capitalize">{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
