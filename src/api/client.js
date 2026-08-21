import { AUTH_TOKEN_KEY, SERVER_URL } from '../lib/constants'

const API_BASE = `${SERVER_URL}/api`

const readToken = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
}

export function persistAuthToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

export async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
  const token = readToken()
  const requestHeaders = { ...headers }
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  if (body && !isFormData) {
    requestHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: body
      ? isFormData
        ? body
        : JSON.stringify(body)
      : undefined,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`)
  }

  return payload?.data ?? {}
}