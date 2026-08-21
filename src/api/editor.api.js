import { apiRequest } from './client'

export async function getEditorProject(projectId) {
  return apiRequest(`/editor/projects/${projectId}`)
}

export async function updateEditorClip(clipId, payload) {
  return apiRequest(`/editor/clips/${clipId}`, {
    method: 'PATCH',
    body: payload,
  })
}

