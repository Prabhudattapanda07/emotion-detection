import { createContext, useContext, useState } from 'react'

const DetectionContext = createContext(null)

export function DetectionProvider({ children }) {
  const [faceResult,  setFaceResult]  = useState(null)
  const [voiceResult, setVoiceResult] = useState(null)
  const [combined,    setCombined]    = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const reset = () => {
    setFaceResult(null)
    setVoiceResult(null)
    setCombined(null)
  }

  return (
    <DetectionContext.Provider value={{
      faceResult,  setFaceResult,
      voiceResult, setVoiceResult,
      combined,    setCombined,
      isProcessing, setIsProcessing,
      reset,
    }}>
      {children}
    </DetectionContext.Provider>
  )
}

export function useDetection() {
  const ctx = useContext(DetectionContext)
  if (!ctx) throw new Error('useDetection must be inside DetectionProvider')
  return ctx
}
