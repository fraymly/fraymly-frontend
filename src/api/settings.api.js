import { apiRequest } from './client'

export async function getSettings() {
  return apiRequest('/settings')
}

export async function updateSettings(payload) {
  return apiRequest('/settings', {
    method: 'PUT',
    body: payload,
  })
}

