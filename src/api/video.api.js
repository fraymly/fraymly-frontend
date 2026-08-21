import { apiRequest } from './client'

export async function listVideos(projectId) {
  const suffix = projectId ? `?projectId=${projectId}` : ''
  return apiRequest(`/videos${suffix}`)
}

export async function getVideo(videoId) {
  return apiRequest(`/videos/${videoId}`)
}

export async function listClips({ projectId, jobId } = {}) {
  const params = new URLSearchParams()

  if (projectId) {
    params.set('projectId', projectId)
  }

  if (jobId) {
    params.set('jobId', jobId)
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiRequest(`/clips${suffix}`)
}

export async function listExports({ projectId, jobId } = {}) {
  const params = new URLSearchParams()

  if (projectId) {
    params.set('projectId', projectId)
  }

  if (jobId) {
    params.set('jobId', jobId)
  }

  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiRequest(`/exports${suffix}`)
}

