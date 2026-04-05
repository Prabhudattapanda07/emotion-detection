import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Mic, MicOff, Upload, Zap,
  StopCircle, RefreshCw, ArrowRight, CloudUpload
} from 'lucide-react'
import { useCamera } from '../hooks/useCamera'
import { useVoiceRecorder } from '../hooks/useVoiceRecorder'
import { useDetection } from '../context/DetectionContext'
import { detectFace, detectVoice, combineEmotions } from '../services/api'
import EmotionBadge from '../components/EmotionBadge'
import ConfidenceBar from '../components/ConfidenceBar'

export default function Home() {
  const navigate = useNavigate()
  const { setFaceResult, setVoiceResult, setCombined, setIsProcessing } = useDetection()
  const cam = useCamera()
  const rec = useVoiceRecorder()

  const [faceRes,  setFaceRes]  = useState(null)
  const [voiceRes, setVoiceRes] = useState(null)
  const [loading,  setLoading]  = useState({ face: false, voice: false, combine: false })
  const [error,    setError]    = useState(null)

  // ── Face capture & detect ─────────────────────────────
  async function handleCapture() {
    setError(null)
    const blob = cam.captureBlob()
    if (!blob) return
    setLoading(l => ({ ...l, face: true }))
    try {
      const result = await detectFace(blob)
      setFaceRes(result)
      setFaceResult(result)
    } catch (e) {
      setError(e.response?.data?.detail || 'Face detection failed.')
    } finally {
      setLoading(l => ({ ...l, face: false }))
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setLoading(l => ({ ...l, face: true }))
    try {
      const result = await detectFace(file)
      setFaceRes(result)
      setFaceResult(result)
      // Preview uploaded image
      const url = URL.createObjectURL(file)
      cam.setPhoto(url)
    } catch (e) {
      setError(e.response?.data?.detail || 'Face detection failed.')
    } finally {
      setLoading(l => ({ ...l, face: false }))
    }
  }

  // ── Voice detect ──────────────────────────────────────
  async function handleVoiceDetect() {
    if (!rec.audioBlob) return
    setError(null)
    setLoading(l => ({ ...l, voice: true }))
    try {
      const result = await detectVoice(rec.audioBlob)
      setVoiceRes(result)
      setVoiceResult(result)
    } catch (e) {
      setError(e.response?.data?.detail || 'Voice detection failed.')
    } finally {
      setLoading(l => ({ ...l, voice: false }))
    }
  }

  // ── Combine & navigate ────────────────────────────────
  async function handleCombine() {
    if (!faceRes || !voiceRes) return
    setLoading(l => ({ ...l, combine: true }))
    try {
      const result = await combineEmotions({
        face_emotion: faceRes.emotion,
        face_confidence: faceRes.confidence,
        voice_emotion: voiceRes.emotion,
        voice_confidence: voiceRes.confidence,
      })
      setCombined(result)
      navigate('/results')
    } catch (e) {
      setError('Combine failed.')
    } finally {
      setLoading(l => ({ ...l, combine: false }))
    }
  }

  const recDuration = `${Math.floor(rec.duration / 60).toString().padStart(2,'0')}:${(rec.duration % 60).toString().padStart(2,'0')}`

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-dim font-mono text-xs uppercase tracking-widest mb-1">Cloud Emotion Detection</p>
        <h1 className="font-display font-800 text-3xl text-white">Detect Emotions</h1>
        <p className="text-dim text-sm mt-1">
          Capture face · Record voice · Get AI-powered analysis from the cloud
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-rose/10 border border-rose/30 text-rose text-sm font-mono">
          ⚠ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Face Panel ───────────────────────────────── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-accent" />
              <span className="font-display font-700 text-white">Face Detection</span>
            </div>
            <span className="tag text-teal border-teal/30 bg-teal/5 font-mono">
              OpenCV + DeepFace
            </span>
          </div>

          {/* Camera preview */}
          <div className="relative bg-ink rounded-xl overflow-hidden aspect-video border border-border">
            {cam.photo ? (
              <img src={cam.photo} alt="captured" className="w-full h-full object-cover" />
            ) : (
              <video ref={cam.videoRef} autoPlay muted playsInline
                className="w-full h-full object-cover" />
            )}
            {cam.active && !cam.photo && (
              <div className="scan-line" />
            )}
            {!cam.active && !cam.photo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
                <Camera size={36} strokeWidth={1} />
                <span className="text-sm font-mono">Camera off</span>
              </div>
            )}
            {loading.face && (
              <div className="absolute inset-0 bg-ink/70 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  <span className="text-accent text-xs font-mono">Sending to cloud...</span>
                </div>
              </div>
            )}
            <canvas ref={cam.canvasRef} className="hidden" />
          </div>

          {cam.error && <p className="text-rose text-xs font-mono">{cam.error}</p>}

          {/* Camera controls */}
          <div className="flex gap-2 flex-wrap">
            {!cam.active ? (
              <button onClick={cam.start}
                className="btn-primary flex items-center gap-2 text-sm">
                <Camera size={14} /> Start Camera
              </button>
            ) : (
              <>
                <button onClick={handleCapture}
                  className="btn-primary flex items-center gap-2 text-sm"
                  disabled={loading.face}>
                  <Zap size={14} /> Capture & Detect
                </button>
                <button onClick={cam.stop} className="btn-ghost flex items-center gap-2 text-sm">
                  <StopCircle size={14} /> Stop
                </button>
              </>
            )}
            {cam.photo && (
              <button onClick={() => { cam.setPhoto(null); setFaceRes(null) }}
                className="btn-ghost flex items-center gap-2 text-sm">
                <RefreshCw size={14} /> Retake
              </button>
            )}
            <label className="btn-ghost flex items-center gap-2 text-sm cursor-pointer">
              <Upload size={14} /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          {/* Face result */}
          {faceRes && (
            <div className="border border-border rounded-xl p-4 space-y-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <EmotionBadge emotion={faceRes.emotion} />
                <span className="text-xs font-mono text-dim flex items-center gap-1">
                  <CloudUpload size={12} /> Stored in MongoDB
                </span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(faceRes.all_scores ?? {})
                  .sort(([,a],[,b]) => b - a)
                  .slice(0, 5)
                  .map(([label, val]) => (
                    <ConfidenceBar key={label} label={label} value={val}
                      color={label === faceRes.emotion ? '#00d4ff' : '#1e2a42'} />
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Voice Panel ──────────────────────────────── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-amber" />
              <span className="font-display font-700 text-white">Voice Detection</span>
            </div>
            <span className="tag text-amber border-amber/30 bg-amber/5 font-mono">
              Librosa MFCC
            </span>
          </div>

          {/* Visualiser */}
          <div className="relative bg-ink rounded-xl overflow-hidden h-40 border border-border flex items-center justify-center">
            {rec.recording ? (
              <div className="flex items-end gap-1 h-16">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="wave-bar h-full"
                    style={{ animationDelay: `${i * 0.06}s`, height: `${20 + Math.random() * 60}%` }} />
                ))}
              </div>
            ) : rec.audioURL ? (
              <div className="w-full px-4">
                <audio src={rec.audioURL} controls className="w-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted">
                <Mic size={36} strokeWidth={1} />
                <span className="text-sm font-mono">Microphone ready</span>
              </div>
            )}
            {loading.voice && (
              <div className="absolute inset-0 bg-ink/70 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-amber border-t-transparent animate-spin" />
                  <span className="text-amber text-xs font-mono">Processing MFCC...</span>
                </div>
              </div>
            )}
          </div>

          {/* Timer */}
          {rec.recording && (
            <div className="flex items-center gap-2 text-rose font-mono text-sm">
              <span className="w-2 h-2 rounded-full bg-rose animate-pulse" />
              Recording {recDuration}
            </div>
          )}

          {rec.error && <p className="text-rose text-xs font-mono">{rec.error}</p>}

          {/* Recorder controls */}
          <div className="flex gap-2 flex-wrap">
            {!rec.recording ? (
              <button onClick={rec.start}
                className="btn-primary flex items-center gap-2 text-sm bg-amber text-ink border-amber hover:brightness-110">
                <Mic size={14} /> Start Recording
              </button>
            ) : (
              <button onClick={rec.stop}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose text-white font-display font-700 text-sm hover:brightness-110 transition-all">
                <MicOff size={14} /> Stop
              </button>
            )}
            {rec.audioBlob && (
              <button onClick={handleVoiceDetect}
                className="btn-primary flex items-center gap-2 text-sm"
                disabled={loading.voice}>
                <Zap size={14} /> Analyse Voice
              </button>
            )}
          </div>

          {/* Voice result */}
          {voiceRes && (
            <div className="border border-border rounded-xl p-4 space-y-3 animate-slide-up">
              <div className="flex items-center justify-between">
                <EmotionBadge emotion={voiceRes.emotion} />
                <span className="text-xs font-mono text-dim flex items-center gap-1">
                  <CloudUpload size={12} /> Stored in MongoDB
                </span>
              </div>
              {voiceRes.mfcc_summary && (
                <div className="font-mono text-xs text-muted">
                  MFCC[0–9]: [{voiceRes.mfcc_summary.join(', ')}]
                </div>
              )}
              <div className="space-y-1.5">
                {Object.entries(voiceRes.all_scores ?? {})
                  .sort(([,a],[,b]) => b - a)
                  .slice(0, 5)
                  .map(([label, val]) => (
                    <ConfidenceBar key={label} label={label} value={val}
                      color={label === voiceRes.emotion ? '#ffb547' : '#1e2a42'} />
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Combine button ────────────────────────────── */}
      {faceRes && voiceRes && (
        <div className="mt-6 flex justify-center animate-slide-up">
          <button onClick={handleCombine}
            disabled={loading.combine}
            className="btn-primary flex items-center gap-3 px-10 py-4 text-base rounded-2xl">
            {loading.combine
              ? <span className="w-5 h-5 rounded-full border-2 border-ink border-t-transparent animate-spin" />
              : <Zap size={18} />}
            Combine & View Full Results
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
