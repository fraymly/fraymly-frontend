import { apiRequest } from './client'

export async function listJobs() {
  return apiRequest('/jobs')
}

export async function getJob(jobId) {
  return apiRequest(`/jobs/${jobId}`)
}

export async function retryJob(jobId) {
  return apiRequest(`/jobs/${jobId}/retry`, {
    method: 'POST',
  })
}

export async function deleteJob(jobId) {
  return apiRequest(`/jobs/${jobId}`, {
    method: 'DELETE',
  })
}

export async function createShortsJob(formData) {
  return apiRequest('/jobs/shorts', {
    method: 'POST',
    body: formData,
  })
}

