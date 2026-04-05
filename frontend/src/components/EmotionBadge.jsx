// Emotion label → colour + emoji mapping
const EMOTION_META = {
  happy:    { color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10', emoji: '😄' },
  sad:      { color: 'text-blue-400  border-blue-400/30  bg-blue-400/10',  emoji: '😢' },
  angry:    { color: 'text-rose-400  border-rose-400/30  bg-rose-400/10',  emoji: '😠' },
  fear:     { color: 'text-purple-400 border-purple-400/30 bg-purple-400/10', emoji: '😨' },
  surprise: { color: 'text-orange-400 border-orange-400/30 bg-orange-400/10', emoji: '😲' },
  disgust:  { color: 'text-green-400 border-green-400/30 bg-green-400/10', emoji: '🤢' },
  neutral:  { color: 'text-slate-400  border-slate-400/30  bg-slate-400/10',  emoji: '😐' },
}

export function emotionMeta(emotion) {
  return EMOTION_META[emotion?.toLowerCase()] ?? EMOTION_META.neutral
}

export default function EmotionBadge({ emotion, size = 'md' }) {
  const meta = emotionMeta(emotion)
  const sizeClass = size === 'lg'
    ? 'text-base px-5 py-2.5 rounded-2xl gap-2.5'
    : 'text-sm px-3 py-1.5 rounded-xl gap-2'

  return (
    <span className={`inline-flex items-center font-display font-700 border capitalize
                      ${meta.color} ${sizeClass}`}>
      <span>{meta.emoji}</span>
      {emotion ?? 'unknown'}
    </span>
  )
}
