const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('makhtout_token')
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }

  return response.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchWithAuth('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password }),
      }),
    register: (email: string, password: string, full_name?: string) =>
      fetchWithAuth('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name }),
      }),
    me: () => fetchWithAuth('/api/auth/me'),
  },
  documents: {
    list: () => fetchWithAuth('/api/documents/'),
    get: (id: string) => fetchWithAuth(`/api/documents/${id}`),
    upload: (file: File, languageHint: string = 'auto') => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('language_hint', languageHint)
      return fetchWithAuth('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })
    },
    export: async (id: string, format: 'txt' | 'docx' | 'pdf') => {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/documents/${id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ format }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Export failed' }))
        throw new Error(error.detail || 'Export failed')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcription-${id}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    },
  },
  ocr: {
    process: (documentId: string, mode: string = 'machine', languageHint: string = 'auto') =>
      fetchWithAuth(`/api/ocr/${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, language_hint: languageHint }),
      }),
    transcriptions: (documentId: string) => fetchWithAuth(`/api/ocr/${documentId}/transcriptions`),
    correct: (transcriptionId: string, originalValue: string, correctedValue: string) =>
      fetchWithAuth(`/api/ocr/transcriptions/${transcriptionId}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_value: originalValue, corrected_value: correctedValue }),
      }),
    suggest: (word: string, context: string, languageHint: string = 'auto', topK: number = 5) =>
      fetchWithAuth('/api/ocr/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, context, language_hint: languageHint, top_k: topK }),
      }),
  },
  admin: {
    corrections: () => fetchWithAuth('/api/admin/corrections'),
    validateCorrection: (id: string) =>
      fetchWithAuth(`/api/admin/corrections/${id}/validate`, { method: 'POST' }),
    rejectCorrection: (id: string) =>
      fetchWithAuth(`/api/admin/corrections/${id}/reject`, { method: 'POST' }),
    exportCorrections: (format: string = 'json') =>
      fetch(`${API_URL}/api/admin/corrections/export?format=${format}`, {
        headers: { Authorization: `Bearer ${getToken() || ''}` },
      }),
    payments: () => fetchWithAuth('/api/admin/payments'),
    validatePayment: (id: string) => fetchWithAuth(`/api/admin/payments/${id}/validate`, { method: 'POST' }),
    rejectPayment: (id: string) => fetchWithAuth(`/api/admin/payments/${id}/reject`, { method: 'POST' }),
  },
  billing: {
    plans: () => fetchWithAuth('/api/billing/plans'),
    info: () => fetchWithAuth('/api/billing/info'),
    checkout: (planSlug: string, provider: string) =>
      fetchWithAuth('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_slug: planSlug, provider }),
      }),
    manualPayment: (planSlug: string, reference: string, amount: number, currency: string, notes?: string) =>
      fetchWithAuth('/api/billing/manual-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_slug: planSlug, reference, amount, currency, notes }),
      }),
  },
}
