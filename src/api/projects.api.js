import { apiRequest } from './client'

export async function listProjects() {
  return apiRequest('/projects')
}

export async function createProject(payload) {
  return apiRequest('/projects', {
    method: 'POST',
    body: payload,
  })
}

export async function getProject(projectId) {
  return apiRequest(`/projects/${projectId}`)
}

export async function updateProject(projectId, payload) {
  return apiRequest(`/projects/${projectId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteProject(projectId) {
  return apiRequest(`/projects/${projectId}`, {
    method: 'DELETE',
  })
}

