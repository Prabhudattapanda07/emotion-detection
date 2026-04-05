import { useRef, useState, useCallback } from 'react'

export function useVoiceRecorder() {
  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const [recording,  setRecording]  = useState(false)
  const [audioBlob,  setAudioBlob]  = useState(null)
  const [audioURL,   setAudioURL]   = useState(null)
  const [error,      setError]      = useState(null)
  const [duration,   setDuration]   = useState(0)
  const timerRef = useRef(null)

  const start = useCallback(async () => {
    setError(null)
    setAudioBlob(null)
    setAudioURL(null)
    setDuration(0)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr

      mr.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioURL(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }

      mr.start(100)
      setRecording(true)

      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    } catch (e) {
      setError('Microphone access denied. Please allow microphone permissions.')
    }
  }, [])

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop()
    clearInterval(timerRef.current)
    setRecording(false)
  }, [])

  return { recording, audioBlob, audioURL, error, duration, start, stop }
}
