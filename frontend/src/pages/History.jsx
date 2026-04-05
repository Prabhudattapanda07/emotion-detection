import { useEffect, useState } from 'react'
import { Trash2, RefreshCw, Clock, CloudLightning, Mic, Camera, Filter } from 'lucide-react'
import { getHistory, deleteRecord } from '../services/api'
import EmotionBadge from '../components/EmotionBadge'

function HistoryCard({ record, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteRecord(record.id)
      onDelete(record.id)
    } catch {
      setDeleting(false)
    }
  }

  const date = new Date(record.timestamp)
  const isAudio = record.type === 'voice'

  return (
    <div className="card flex flex-col sm:flex-row gap-4 animate-fade-in">
      {/* Media preview */}
      <div className="w-full sm:w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-ink border border-border flex items-center justify-center">
        {record.file_url ? (
          isAudio ? (
            <div className="flex flex-col items-center gap-2 text-muted w-full px-2">
              <Mic size={20} className="text-amber" />
              <audio src={record.file_url} controls className="w-full scale-75 origin-center" />
            </div>
          ) : (
            <img src={record.file_url} alt="face" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="text-muted">{isAudio ? <Mic size={24} /> : <Camera size={24} />}</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <EmotionBadge emotion={record.emotion} />
            <div className="flex items-center gap-3 text-xs text-dim font-mono">
              <span className="capitalize flex items-center gap-1">
                {isAudio ? <Mic size={10} /> : <Camera size={10} />}
                {record.type}
              </span>
              <span>·</span>
              <span>{Math.round((record.confidence ?? 0) * 100)}% confidence</span>
            </div>
          </div>
          <button onClick={handleDelete} disabled={deleting}
            className="text-muted hover:text-rose transition-colors p-1.5 rounded-lg hover:bg-rose/10">
            {deleting
              ? <RefreshCw size={14} className="animate-spin" />
              : <Trash2 size={14} />}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted font-mono">
          <Clock size={10} />
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </div>

        {record.combined_emotion && (
          <div className="text-xs font-mono text-dim">
            Combined: <span className="text-teal capitalize">{record.combined_emotion}</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted font-mono">
          <CloudLightning size={10} className="text-teal" />
          MongoDB Atlas · GridFS media
        </div>
      </div>
    </div>
  )
}

export default function History() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')   // all | face | voice

  async function load() {
    setLoading(true)
    try {
      const data = await getHistory(100)
      setRecords(data.records ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all'
    ? records
    : records.filter(r => r.type === filter)

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-dim font-mono text-xs uppercase tracking-widest mb-1">
            Cloud Database · MongoDB Atlas
          </p>
          <h1 className="font-display font-800 text-3xl text-white">Detection History</h1>
          <p className="text-dim text-sm mt-1">
            All past detections stored in MongoDB Atlas — accessible from anywhere
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="btn-ghost flex items-center gap-2 text-sm"
            disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'face', 'voice'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-600 capitalize transition-all
              ${filter === f ? 'bg-accent/10 text-accent border border-accent/20' : 'text-dim hover:text-white border border-border hover:border-accent/30'}`}>
            {f === 'face' && <Camera size={13} />}
            {f === 'voice' && <Mic size={13} />}
            {f === 'all' && <Filter size={13} />}
            {f} {f !== 'all' && `(${records.filter(r => r.type === f).length})`}
          </button>
        ))}
        <span className="ml-auto text-dim text-sm font-mono flex items-center gap-1">
          <CloudLightning size={13} className="text-teal" />
          {filtered.length} records in cloud
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-24 text-muted">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="font-mono text-sm">Fetching from API...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <Clock size={48} strokeWidth={1} className="mx-auto mb-4" />
          <p className="font-display font-700 text-lg text-white">No records found</p>
          <p className="text-sm mt-1">Start detecting emotions to build your history</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(r => (
            <HistoryCard key={r.id} record={r}
              onDelete={id => setRecords(prev => prev.filter(x => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  )
}
