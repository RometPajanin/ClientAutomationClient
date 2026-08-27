const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function url(path) {
  return `${baseUrl}${path}`
}

async function request(path, { apiKey, method = 'GET', body } = {}) {
  const response = await fetch(url(path), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(apiKey ? { 'x-admin-api-key': apiKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('The admin key was not accepted.')
    throw new Error('The server could not complete that request. Please try again.')
  }
  if (response.status === 204) return null
  return response.json()
}

export function submitInquiry(data) {
  return request('/api/v1/inquiries', { method: 'POST', body: data })
}

export function getInquiries(apiKey, filters = {}) {
  const query = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value)
  })
  const suffix = query.size ? `?${query}` : ''
  return request(`/api/v1/admin/inquiries${suffix}`, { apiKey })
}

export function getInquiry(apiKey, id) {
  return request(`/api/v1/admin/inquiries/${encodeURIComponent(id)}`, { apiKey })
}

export function getAiSettings(apiKey) {
  return request('/api/v1/admin/settings/ai', { apiKey })
}

export function updateAiSettings(apiKey, companyPrompt) {
  return request('/api/v1/admin/settings/ai', { apiKey, method: 'PUT', body: { companyPrompt } })
}
