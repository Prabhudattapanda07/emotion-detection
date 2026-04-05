import { useRef, useState, useCallback } from 'react'

export function useCamera() {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const [active, setActive]   = useState(false)
  const [error,  setError]    = useState(null)
  const [photo,  setPhoto]    = useState(null)   // base64 data-URL

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setActive(true)
    } catch (e) {
      setError('Camera access denied. Please allow camera permissions.')
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setActive(false)
  }, [])

  const capture = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setPhoto(dataUrl)
    return dataUrl
  }, [])

  // Convert data-URL to Blob for API upload
  const captureBlob = useCallback(() => {
    const dataUrl = capture()
    if (!dataUrl) return null
    const arr    = dataUrl.split(',')
    const mime   = arr[0].match(/:(.*?);/)[1]
    const bstr   = atob(arr[1])
    const n      = bstr.length
    const u8arr  = new Uint8Array(n)
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i)
    return new Blob([u8arr], { type: mime })
  }, [capture])

  return { videoRef, canvasRef, active, error, photo, start, stop, capture, captureBlob, setPhoto }
}
