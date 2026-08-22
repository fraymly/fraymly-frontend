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

export async function requestSignedUploadUrl(fileName, contentType) {
  return apiRequest('/projects/signed-upload-url', {
    method: 'POST',
    body: { fileName, contentType },
  })
}

/**
 * Uploads a file directly to Google Cloud Storage via a Signed URL, tracking progress.
 */
export function uploadFileWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress?.(percent)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`GCS upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during GCS upload')))
    xhr.addEventListener('abort', () => reject(new Error('GCS upload aborted')))

    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}
