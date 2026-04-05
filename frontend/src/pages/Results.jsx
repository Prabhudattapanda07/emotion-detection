import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, Mic, Camera, GitMerge, CloudLightning } from 'lucide-react'
import { useDetection } from '../context/DetectionContext'
import EmotionBadge, { emotionMeta } from '../components/EmotionBadge'
import ConfidenceBar from '../components/ConfidenceBar'
import {
  RadarChart, PolarGrid, PolarAngleAxis,
  Radar, ResponsiveContainer, Tooltip
} from 'recharts'

function ResultCard({ icon: Icon, title, result, color }) {
  if (!result) return (
    <div className="card flex flex-col items-center justify-center min-h-48 text-muted gap-2">
      <Icon size={32} strokeWidth={1} />
      <p className="text-sm font-mono">No {title.toLowerCase()} data</p>
    </div>
  )

  const radarData = Object.entries(result.all_scores ?? {}).map(([e, v]) => ({
    emotion: e, value: Math.round(v * 100),
  }))

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color }} />
        <span className="font-display font-700 text-white">{title}</span>
      </div>

      <div className="flex items-center gap-4">
        <EmotionBadge emotion={result.emotion} size="lg" />
        <div className="text-right">
          <p className="text-xs text-dim font-mono">Confidence</p>
          <p className="font-display font-800 text-2xl" style={{ color }}>
            {Math.round(result.confidence * 100)}%
          </p>
        </div>
      </div>

      {radarData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#1e2a42" />
            <PolarAngleAxis dataKey="emotion" tick={{ fill: '#8899aa', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
            <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.15} />
            <Tooltip contentStyle={{ background: '#141b2d', border: '1px solid #1e2a42', borderRadius: 8, fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      )}

      <div className="space-y-2">
        {Object.entries(result.all_scores ?? {})
          .sort(([,a],[,b]) => b - a)
          .map(([label, val]) => (
            <ConfidenceBar key={label} label={label} value={val}
              color={label === result.emotion ? color : '#1e2a42'} />
          ))}
      </div>
    </div>
  )
}

export default function Results() {
  const navigate = useNavigate()
  const { faceResult, voiceResult, combined } = useDetection()

  const valenceColor = {
    positive: '#00b4a0',
    negative: '#ff4d6d',
    neutral:  '#8899aa',
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')}
          className="btn-ghost flex items-center gap-2 text-sm px-3 py-2">
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <p className="text-dim font-mono text-xs uppercase tracking-widest">Analysis Output</p>
          <h1 className="font-display font-800 text-3xl text-white">Detection Results</h1>
        </div>
      </div>

      {/* Combined emotion hero */}
      {combined && (
        <div className="mb-8 card border-accent/20 bg-accent/5 animate-slide-up">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitMerge size={16} className="text-accent" />
                <span className="font-mono text-xs text-accent uppercase tracking-widest">Combined Emotion (Weighted Fusion)</span>
              </div>
              <EmotionBadge emotion={combined.combined_emotion} size="lg" />
              <p className="mt-3 text-dim text-sm max-w-lg leading-relaxed">{combined.analysis}</p>
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-xs text-dim font-mono">Confidence</p>
                <p className="font-display font-800 text-4xl text-accent">
                  {Math.round(combined.confidence * 100)}%
                </p>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs font-mono text-dim">Valence</span>
                <span className="tag font-mono capitalize"
                  style={{ color: valenceColor[combined.valence], borderColor: valenceColor[combined.valence] + '40', background: valenceColor[combined.valence] + '10' }}>
                  {combined.valence}
                </span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs font-mono text-dim">Agreement</span>
                <span className={`tag font-mono ${combined.agreement ? 'text-teal border-teal/30 bg-teal/10' : 'text-rose border-rose/30 bg-rose/10'}`}>
                  {combined.agreement ? '✓ Aligned' : '≠ Mixed'}
                </span>
              </div>
            </div>
          </div>

          {/* Weight indicators */}
          <div className="mt-4 flex gap-6 text-xs font-mono text-dim border-t border-border/50 pt-4">
            <span>Face weight: <span className="text-accent">60%</span></span>
            <span>Voice weight: <span className="text-amber">40%</span></span>
            <span className="ml-auto flex items-center gap-1">
              <CloudLightning size={11} className="text-teal" />
              Computed on cloud · Stored in MongoDB Atlas
            </span>
          </div>
        </div>
      )}

      {/* Individual results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResultCard icon={Camera} title="Face Detection" result={faceResult}  color="#00d4ff" />
        <ResultCard icon={Mic}    title="Voice Detection" result={voiceResult} color="#ffb547" />
      </div>

      {!faceResult && !voiceResult && (
        <div className="text-center py-24 text-muted">
          <Brain size={48} strokeWidth={1} className="mx-auto mb-4" />
          <p className="font-display font-700 text-lg text-white">No results yet</p>
          <p className="text-sm mt-1">Go to Detect page to analyse face and voice</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-6">
            Start Detection
          </button>
        </div>
      )}
    </div>
  )
}
