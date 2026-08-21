import { apiRequest } from './client'

export async function login(payload) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export async function me() {
  return apiRequest('/auth/me')
}

