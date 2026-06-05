const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export function apiUrl(path: string) {
  const normalizedBaseUrl = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.replace(/^\/+/, '')

  return `${normalizedBaseUrl}/${normalizedPath}`
}

export async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(apiUrl(path), init)

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response
}
