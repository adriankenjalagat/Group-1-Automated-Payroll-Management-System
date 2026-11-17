let rawBaseUrl = (
  import.meta.env.VITE_API_URL ||
  'https://group-1-automated-payroll-management-system-production-a144f8b1.up.railway.app/api'
).trim()

if (rawBaseUrl && !rawBaseUrl.startsWith('http://') && !rawBaseUrl.startsWith('https://')) {
  rawBaseUrl = `https://${rawBaseUrl}`
}

if (!rawBaseUrl.endsWith('/api') && !rawBaseUrl.includes('/api/')) {
  rawBaseUrl = `${rawBaseUrl}/api`
}

const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options

  const token = typeof window !== 'undefined' ? localStorage.getItem('msu_token') : null
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const requestHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((headers as Record<string, string>) || {}),
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    headers: requestHeaders,
    body: isFormData ? (body as BodyInit) : (body !== undefined ? JSON.stringify(body) : undefined),
    ...rest,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String(data.message)
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return data as T
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}
