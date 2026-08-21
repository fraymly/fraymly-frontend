import WorkflowWhiteboard from '../../components/workflow/WorkflowWhiteboard'
import { Link, useParams, useNavigate } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkflowTemplate,
  updateWorkflowTemplate,
  listAllWorkflows,
} from '../../api/workflows.api'
import Spinner from '../../components/loaders/Spinner'

export default function FullWorkflowPage() {
  const { workflowId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const createWorkflowMutation = useMutation({
    mutationFn: (payload) => createWorkflowTemplate(payload), // No projectId needed
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['all-workflows'] })
      navigate(`/workflows/${data.workflow._id}/edit`, { replace: true })
    },
  })

  const updateWorkflowMutation = useMutation({
    mutationFn: ({ workflowId, payload }) => updateWorkflowTemplate(workflowId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['all-workflows'] })
      await queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] })
    },
  })

  const runWorkflowMutation = useMutation({
    mutationFn: ({ projectId, workflowId, payload }) => runProjectWorkflow(projectId, workflowId, payload),
    onSuccess: async () => {
      // Invalidation is handled on the project page where runs are visible
      alert('Workflow run started!')
    },
  })

  const workflowsQuery = useQuery({ queryKey: ['all-workflows'], queryFn: listAllWorkflows })

  if (workflowsQuery.isLoading) return <Spinner />

  const workflows = workflowsQuery.data?.workflows ?? []
  const currentWorkflow = workflows.find(w => w._id === workflowId)

  // Pass the workflowId from the URL to WorkflowWhiteboard to pre-select it
  const initialSelectedWorkflowId = workflowId || (workflows.length > 0 ? workflows[0]._id : null);

  return (
    <div className="flex h-screen flex-col bg-[#f7f7f5] text-slate-950">
      <div className="relative flex flex-1 flex-col"> {/* This div will contain the header and whiteboard */}
        <header className="absolute top-0 left-0 z-10 w-full flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/workflows" className="transition hover:text-slate-950">
              Workflows
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-950">{currentWorkflow?.name ?? 'Editor'}</span>
          </nav>
        </header>
        <WorkflowWhiteboard
          workflows={workflows}
          workflowRuns={[]} // Runs are project-specific, not relevant in global editor
          onCreate={(payload) => createWorkflowMutation.mutateAsync(payload)}
          onUpdate={(wfId, payload) => updateWorkflowMutation.mutateAsync({ workflowId: wfId, payload })}
          onDelete={null} // Deletion is now handled on the templates page
          onRun={(workflowId, payload) => runWorkflowMutation.mutateAsync({ workflowId, payload })}
          viewMode="focused"
          initialSelectedWorkflowId={initialSelectedWorkflowId}
        />
      </div>
    </div>
  )
}