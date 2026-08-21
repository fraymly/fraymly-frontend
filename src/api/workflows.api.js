import { apiRequest } from './client'

export async function getWorkflowCatalog() {
  return apiRequest('/workflows/catalog')
}

export async function addWorkflowToProject(projectId, payload) { // This is for adding a template to a project
  return apiRequest(`/projects/${projectId}/workflows`, {
    method: 'POST',
    body: payload,
  })
}

export async function createWorkflowTemplate(payload) { // This is for creating a new global template
  return apiRequest('/workflows', {
    method: 'POST',
    body: payload,
  })
}

export async function listProjectWorkflows(projectId) {
  return apiRequest(`/projects/${projectId}/workflows`)
}
export async function getWorkflowTemplate(workflowId) { // Renamed for clarity
  return apiRequest(`/workflows/${workflowId}`)
}

export async function updateWorkflowTemplate(workflowId, payload) { // Renamed for clarity
  return apiRequest(`/workflows/${workflowId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export async function deleteWorkflowTemplate(workflowId) { // Renamed for clarity
  // No projectId is needed since workflows are global templates.
  // The backend will handle removing it from any projects if necessary,
  // though based on current logic, they are copied, not linked.
  return apiRequest(`/workflows/${workflowId}`, {
    method: 'DELETE',
  })
}

export async function deleteProjectWorkflow(projectId, workflowId) {
  return apiRequest(`/projects/${projectId}/workflows/${workflowId}`, {
    method: 'DELETE',
  })
}


export async function runProjectWorkflow(projectId, workflowId, payload = {}) {
  return apiRequest(`/projects/${projectId}/workflows/${workflowId}/run`, {
    method: 'POST',
    body: payload,
  })
}

export async function listProjectWorkflowRuns(projectId) {
  return apiRequest(`/projects/${projectId}/workflows/runs`)
}

export async function getWorkflowRun(projectId, runId) {
  return apiRequest(`/projects/${projectId}/workflows/runs/${runId}`)
}

export async function stopWorkflowRun(projectId, runId) {
  return apiRequest(`/projects/${projectId}/workflows/runs/${runId}`, {
    method: 'DELETE',
  })
}

export async function pauseWorkflowRun(projectId, runId) {
  return apiRequest(`/projects/${projectId}/workflows/runs/${runId}/pause`, {
    method: 'POST',
  })
}

export async function resumeWorkflowRun(projectId, runId) {
  return apiRequest(`/projects/${projectId}/workflows/runs/${runId}/resume`, {
    method: 'POST',
  })
}

// New API call to list all workflows (templates)
export async function listAllWorkflows() {
  return apiRequest('/workflows')
}