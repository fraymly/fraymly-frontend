import { useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWorkflowRun, stopWorkflowRun, pauseWorkflowRun, resumeWorkflowRun, listProjectWorkflows, listProjectWorkflowRuns } from '../../api/workflows.api'
import { getProject } from '../../api/projects.api'
import AppShell from '../../components/layout/AppShell'
import Spinner from '../../components/loaders/Spinner'
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx'
import { Button } from '../../components/ui/button'
import WorkflowWhiteboard from '../../components/workflow/WorkflowWhiteboard'

export function WorkflowRunDetail() {
  const { projectId, runId } = useParams()
  const queryClient = useQueryClient()

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  })

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['workflow-run', runId],
    queryFn: () => getWorkflowRun(projectId, runId),
    refetchInterval: (query) => {
      const st = query.state.data?.run?.status
      return (st === 'running' || st === 'queued' || st === 'stopping') ? 2000 : false
    },
    enabled: !!projectId && !!runId,
  })

  const run = data?.run

  const runsQuery = useQuery({
    queryKey: ['project-workflow-runs', projectId],
    queryFn: () => listProjectWorkflowRuns(projectId),
    enabled: !!projectId,
  })

  const workflowsQuery = useQuery({
    queryKey: ['project-workflows', projectId],
    queryFn: () => listProjectWorkflows(projectId),
    enabled: !!projectId,
  })

  const stopMutation = useMutation({
    mutationFn: () => stopWorkflowRun(projectId, runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-run', runId] })
      queryClient.invalidateQueries({ queryKey: ['project-workflow-runs', projectId] })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: () => pauseWorkflowRun(projectId, runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-run', runId] })
      queryClient.invalidateQueries({ queryKey: ['project-workflow-runs', projectId] })
    },
  })

  const resumeMutation = useMutation({
    mutationFn: () => resumeWorkflowRun(projectId, runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-run', runId] })
      queryClient.invalidateQueries({ queryKey: ['project-workflow-runs', projectId] })
    },
  })
  const breadcrumbs = [
    { label: 'Projects', to: '/projects' },
    { label: projectData?.project?.name || 'Project', to: `/projects/${projectId}` },
    { label: 'Runs', to: `/projects/${projectId}` },
    { label: runId.slice(0, 8) },
  ]

  if (isLoading || !projectData || workflowsQuery.isLoading || runsQuery.isLoading) return <Spinner />
  if (error) return <ErrorDisplay error={error} />
  if (!run) return <div>Workflow run not found.</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Workflow Run Details</h1>
          <div className="text-sm text-slate-500">Monitoring run: {runId}</div>
        </div>
        <div className="flex gap-2">
          {run && (run.status === 'running' || run.status === 'queued') && (
            <Button
              variant="outline"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              {pauseMutation.isPending ? 'Pausing...' : 'Pause'}
            </Button>
          )}

          {run && (run.status === 'paused' || run.status === 'failed') && (
            <Button
              variant="default"
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {resumeMutation.isPending ? 'Resuming...' : 'Resume Workflow'}
            </Button>
          )}

          {run && (run.status === 'running' || run.status === 'queued' || run.status === 'stopping') && (
            <Button
              variant="destructive"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending || run.status === 'stopping'}
            >
              {stopMutation.isPending || run.status === 'stopping' ? 'Stopping...' : 'Stop Workflow'}
            </Button>
          )}
        </div>
      </div>
      <WorkflowWhiteboard
        project={projectData?.project}
        workflows={workflowsQuery.data?.workflows ?? []}
        workflowRuns={runsQuery.data?.runs ?? []}
      />
    </div>
  )
}