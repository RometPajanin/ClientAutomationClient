const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
let csrfToken = ''

function url(path) {
  return `${baseUrl}${path}`
}

async function request(path, { method = 'GET', body, csrf = false } = {}) {
  const response = await fetch(url(path), {
    method,
    credentials: 'include',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(csrf && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'The server could not complete that request. Please try again.')
    error.code = data?.error?.code
    error.status = response.status
    throw error
  }
  return data
}

function rememberSession(data) {
  csrfToken = data?.csrfToken || ''
  return data
}

export async function loginAdmin(username, password) {
  return rememberSession(await request('/api/v1/auth/login', {
    method: 'POST',
    body: { username, password },
  }))
}

export async function restoreAdminSession() {
  return rememberSession(await request('/api/v1/auth/session'))
}

export async function logoutAdmin() {
  try {
    return await request('/api/v1/auth/logout', { method: 'POST', csrf: true })
  } finally {
    csrfToken = ''
  }
}

export function submitInquiry(data) {
  return request('/api/v1/inquiries', { method: 'POST', body: data })
}

export function getInquiries(filters = {}) {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value)
  })
  const suffix = query.size ? `?${query}` : ''
  return request(`/api/v1/admin/inquiries${suffix}`)
}

export function getInquiry(id) {
  return request(`/api/v1/admin/inquiries/${encodeURIComponent(id)}`)
}

export function getAiSettings() {
  return request('/api/v1/admin/settings/ai')
}

export function updateAiSettings(companyPrompt) {
  return request('/api/v1/admin/settings/ai', { method: 'PUT', body: { companyPrompt }, csrf: true })
}
