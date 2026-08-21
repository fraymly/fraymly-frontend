import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import Spinner from '../../components/loaders/Spinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { deleteProject, getProject, updateProject } from '../../api/projects.api' // Keep updateProject for project name editing
import {
  addWorkflowToProject,
  deleteProjectWorkflow,
  getWorkflowTemplate,
  listAllWorkflows,
  listProjectWorkflowRuns,
  listProjectWorkflows,
  runProjectWorkflow,
} from '../../api/workflows.api' // Keep these for displaying stats
import { listExports } from '../../api/video.api'
import { SERVER_URL } from '../../lib/constants'
import { formatSeconds, humanizeStatus } from '../../lib/format'

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-tight text-slate-950">{value}</p>
    </div>
  )
}

function WorkflowCardSkeleton() {
  return (
    <div className="block animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-1/3 rounded bg-slate-200" />
        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
          <div className="h-6 w-16 rounded-full bg-slate-200" />
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
      </div>
      <div className="mt-3 h-4 w-3/4 rounded bg-slate-200" />
      <div className="mt-4 flex justify-end gap-2">
        <div className="h-9 w-24 rounded-full bg-slate-200" />
        <div className="h-9 w-28 rounded-full bg-slate-200" />
        <div className="h-9 w-20 rounded-full bg-slate-200" />
      </div>
    </div>
  )
}

export default function ProjectPage() {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [workflowToRemove, setWorkflowToRemove] = useState(null)

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  })

  const workflowsQuery = useQuery({
    queryKey: ['project-workflows', projectId],
    queryFn: () => listProjectWorkflows(projectId),
    enabled: Boolean(projectId),
  })

  const runsQuery = useQuery({
    queryKey: ['project-workflow-runs', projectId],
    queryFn: () => listProjectWorkflowRuns(projectId),
    enabled: Boolean(projectId),
  })

  const exportsQuery = useQuery({
    queryKey: ['project-exports', projectId],
    queryFn: () => listExports({ projectId }),
    enabled: Boolean(projectId),
  })

  const allWorkflowsQuery = useQuery({
    queryKey: ['all-workflows'],
    queryFn: listAllWorkflows,
  })

  const project = projectQuery.data?.project
  const videos = projectQuery.data?.videos ?? []
  const workflowRuns = runsQuery.data?.runs ?? []
  const projectWorkflows = workflowsQuery.data?.workflows ?? []
  const allWorkflows = allWorkflowsQuery.data?.workflows ?? []
  const exports = exportsQuery.data?.exports ?? []

  const activeTitle = project?.name ?? 'Loading project...'
  const isLoading =
    projectQuery.isLoading ||
    workflowsQuery.isLoading ||
    runsQuery.isLoading ||
    allWorkflowsQuery.isLoading ||
    exportsQuery.isLoading

  const deleteProjectMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate('/projects')
    },
  })

  const handleUpdateProjectName = async (event) => {
    event.preventDefault()
    const newName = event.target.elements.name.value?.trim()

    if (newName && newName !== project?.name) {
      await updateProject(projectId, { name: newName })
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    }

    setIsEditing(false)
  }

  const addWorkflowFromTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      const template = await getWorkflowTemplate(templateId)
      if (!template?.workflow) {
        throw new Error('Template not found')
      }
      const { name, description, nodes, edges, settings } = template.workflow
      return addWorkflowToProject(projectId, { name, description, nodes, edges, settings })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-workflows', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setSelectedTemplateId('')
    },
    onError: (error) => {
      console.error('Failed to add workflow from template:', error)
      alert('Failed to add workflow from template. Please try again.')
    },
  })

  const deleteProjectWorkflowMutation = useMutation({
    mutationFn: (workflowId) => deleteProjectWorkflow(projectId, workflowId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project-workflows', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
      ])
      setWorkflowToRemove(null)
    },
    onError: (error) => {
      console.error('Failed to remove workflow from project:', error)
      alert('Failed to delete workflow. Please try again.')
    },
  })

  const runWorkflowMutation = useMutation({
    mutationFn: ({ workflowId }) => runProjectWorkflow(projectId, workflowId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-workflow-runs', projectId] })
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error) => {
      console.error('Failed to run workflow:', error)
      alert('Failed to run workflow. Please try again.')
    },
  })


  const currentPipelineItem = useMemo(() => {
    const run = workflowRuns.find((r) => r.status === 'running' || r.status === 'queued') || workflowRuns[0]
    return run ? { status: run.status, progress: run.progress ?? 0, currentStep: run.currentStep || 'Workflow starting...' } : null
  }, [workflowRuns])

  const isWorkflowRunning = (workflowId) => (
    workflowRuns.some((run) => run.workflowId === workflowId && ['running', 'queued'].includes(run.status))
  )

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="space-y-8"
        >
          <section className="space-y-4">
            <nav className="flex items-center gap-2 text-sm text-slate-500">
              <Link to="/projects" className="transition hover:text-slate-950">
                Projects
              </Link>
              <span>/</span>
              <span className="truncate font-medium text-slate-950">
                {project?.name ?? 'Loading...'}
              </span>
            </nav>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                {isEditing ? (
                  <form
                    onSubmit={handleUpdateProjectName}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                  >
                    <input
                      name="name"
                      defaultValue={activeTitle}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-3xl font-medium tracking-tight text-slate-950 outline-none focus:border-slate-950 sm:max-w-2xl"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-slate-950 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white"
                    >
                      Save
                    </button>
                  </form>
                ) : (
                  <h1 className="max-w-4xl text-2xl font-medium tracking-tight text-slate-950 sm:text-3xl">
                    {activeTitle}
                  </h1>
                )}

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Create and run workflows to process the source video into short clips.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button // eslint-disable-line
                  onClick={() => setIsEditing(!isEditing)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>

                <button
                  onClick={() => { // eslint-disable-line
                    if (window.confirm('Are you sure you want to delete this project?')) {
                      deleteProjectMutation.mutate()
                    }
                  }}
                  className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deleteProjectMutation.isPending}
                >
                  {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </section>

          {isLoading ? <Spinner /> : null}

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Source video" value={videos.length} />
            <StatCard label="Project workflows" value={projectWorkflows.length} />
            <StatCard label="Runs" value={workflowRuns.length} />
            <StatCard label="Exports" value={exports.length} />
          </section>

          {currentPipelineItem ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                    Active Run
                  </p>
                  <h2 className="mt-2 text-2xl font-medium tracking-tight text-slate-950">
                    {humanizeStatus(currentPipelineItem.status)}
                  </h2>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                  {currentPipelineItem.progress}% complete
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-950 transition-all"
                  style={{ width: `${currentPipelineItem.progress}%` }}
                />
              </div>

              <p className="mt-4 text-sm text-slate-500">
                {currentPipelineItem.currentStep === 'fetch failed'
                  ? 'AI Service unreachable. Please check if the backend AI service is running.'
                  : currentPipelineItem.currentStep}
              </p>
            </section>
          ) : null}

          {videos[0] ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                    Input video
                  </p>
                  <h3 className="mt-2 text-xl font-medium tracking-tight text-slate-950">
                    {videos[0].originalName}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/editor/${projectId}`}
                    className="rounded-full border border-slate-950 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white"
                  >
                    Open editor
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Duration: {formatSeconds(videos[0].durationSeconds ?? 0)}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Status: {videos[0].status ?? 'uploaded'}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Type: {videos[0].mimeType ?? 'video'}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Jobs: {projectQuery.data?.jobs?.length ?? 0}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
              Project Workflows
            </p>

            <div className="mt-4 space-y-3">
              {workflowsQuery.isLoading ? (
                <>
                  <WorkflowCardSkeleton />
                  <WorkflowCardSkeleton />
                </>
              ) : projectWorkflows.length > 0 ? (
                projectWorkflows.map((workflow) => (
                  <div
                    key={workflow._id}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-950">
                        {workflow.name}
                      </span>
                      <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {workflow.nodes?.length ?? 0} nodes
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                          {workflow.edges?.length ?? 0} edges
                        </span>
                        {workflow.updatedAt && (
                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                            Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{workflow.description}</p>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${projectId}/workflow/full?workflowId=${workflow._id}`)}
                        className="rounded-full border border-slate-950 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white"
                      >
                        Open Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => runWorkflowMutation.mutate({ workflowId: workflow._id })}
                        disabled={isWorkflowRunning(workflow._id) || runWorkflowMutation.isPending}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isWorkflowRunning(workflow._id) || (runWorkflowMutation.isPending && runWorkflowMutation.variables?.workflowId === workflow._id) ? 'Running...' : 'Run Workflow'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkflowToRemove(workflow)} // This will trigger the modal
                        disabled={deleteProjectWorkflowMutation.isPending && deleteProjectWorkflowMutation.variables === workflow._id}
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No workflows in this project yet. Add one from below.
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-medium text-slate-950">Add Existing Workflow Template</h3>
              <div className="mt-3 flex gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-sky-400"
                >
                  <option value="">Select a template</option>
                  {allWorkflows.map((template) => (
                    <option key={template._id} value={template._id}>{template.name}</option>
                  ))}
                </select>
                <button onClick={() => addWorkflowFromTemplateMutation.mutate(selectedTemplateId)} disabled={!selectedTemplateId || addWorkflowFromTemplateMutation.isPending} className="rounded-full border border-slate-950 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white disabled:opacity-50">
                  {addWorkflowFromTemplateMutation.isPending ? 'Adding...' : 'Add to Project'}
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                Workflow history
              </p>

              <div className="mt-4 space-y-3">
                {workflowRuns.map((run) => (
                  <Link
                    key={run._id}
                    to={`/projects/${projectId}/runs/${run._id}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-950">
                        {run.status}
                      </span>
                      <span className="text-xs text-slate-500">{run.progress ?? 0}%</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{run.currentStep}</p>
                  </Link>
                ))}

                {workflowRuns.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No workflow runs yet.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">
                Exports
              </p>

              <div className="mt-4 space-y-3">
                {exports.map((item) => (
                  <a
                    key={item._id}
                    href={`${SERVER_URL}/api/exports/${item._id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-950 transition hover:border-slate-300 hover:bg-white"
                  >
                    {item.title || item.outputUrl}
                  </a>
                ))}

                {exports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Rendered clips will appear here after a workflow run.
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </motion.div>
        <ConfirmationModal
          isOpen={!!workflowToRemove}
          onClose={() => setWorkflowToRemove(null)}
          onConfirm={() => deleteProjectWorkflowMutation.mutate(workflowToRemove._id)}
          title="Remove workflow"
          message={`Are you sure you want to remove the "${workflowToRemove?.name}" workflow from this project? This action cannot be undone.`}
          confirmText="Remove"
          isConfirming={deleteProjectWorkflowMutation.isPending}
        />
      </div>
    </div>
  )
}