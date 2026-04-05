// services/api.js
// All HTTP calls go to the cloud FastAPI backend (Render/Railway)
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const ADMIN_JWT_STORAGE_KEY = 'emoticloud_admin_jwt'

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_JWT_STORAGE_KEY)
}

export function setAdminToken(token) {
  sessionStorage.setItem(ADMIN_JWT_STORAGE_KEY, token)
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_JWT_STORAGE_KEY)
}

const api = axios.create({
  baseURL: BASE,
  timeout: 120000,
})

api.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
  const url = config.url || ''
  const isAdminPath = url.includes('/admin/')
  const isLogin = url.includes('/admin/login')
  if (isAdminPath && !isLogin) {
    const t = getAdminToken()
    if (t) {
      config.headers.Authorization = `Bearer ${t}`
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || ''
    if (err.response?.status === 401 && url.includes('/admin/') && !url.includes('/admin/login')) {
      clearAdminToken()
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
        window.location.assign(`${window.location.origin}/admin/login`)
      }
    }
    return Promise.reject(err)
  }
)

export async function detectFace(imageBlob) {
  const form = new FormData()
  form.append('file', imageBlob, 'capture.jpg')
  const { data } = await api.post('/detect-face/', form)
  return data
}

export async function detectVoice(audioBlob) {
  const form = new FormData()
  form.append('file', audioBlob, 'recording.wav')
  const { data } = await api.post('/detect-voice/', form)
  return data
}

export async function combineEmotions(payload) {
  const { data } = await api.post('/combine-emotions', payload)
  return data
}

export async function getHistory(limit = 50) {
  const { data } = await api.get('/get-history', { params: { limit } })
  return data
}

export async function deleteRecord(id) {
  const { data } = await api.delete(`/delete/${id}`)
  return data
}

/** Public usage counters (still available for non-admin use). */
export async function getUsageStats() {
  const { data } = await api.get('/usage-stats')
  return data
}

/** Admin-only usage stats — required when server enforces admin JWT. */
export async function getAdminUsageStats() {
  const { data } = await api.get('/admin/usage-stats')
  return data
}

export async function adminLogin(password) {
  const { data } = await api.post('/admin/login', { password })
  return data
}

export async function getAdminAuthStatus() {
  const { data } = await api.get('/admin/auth-status')
  return data
}

export async function toggleAutoDelete(enabled) {
  const { data } = await api.post('/admin/toggle-auto-delete', { enabled })
  return data
}

export async function getAutoDeleteStatus() {
  const { data } = await api.get('/admin/auto-delete-status')
  return data
}

export async function bulkDelete(days) {
  const { data } = await api.post('/admin/bulk-delete', { older_than_days: days })
  return data
}

export async function getLogs(limit = 50) {
  const { data } = await api.get('/admin/logs', { params: { limit } })
  return data
}

export async function healthCheck() {
  const { data } = await api.get('/health')
  return data
}
