import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import Spinner from '../../components/loaders/Spinner'
import ConfirmationModal from '../../components/ui/ConfirmationModal'
import { listProjects } from '../../api/projects.api'
import {
  listAllWorkflows,
  createWorkflowTemplate, // This is correct
  deleteWorkflowTemplate,
} from '../../api/workflows.api'
import { formatDistanceToNow } from 'date-fns'

function WorkflowTemplateCard({ workflow, onDeleteClick }) {
  return (
    <div className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-slate-950">
            {workflow.name ?? 'Untitled workflow'}
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
            {workflow.description ?? 'No description added.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-500">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {workflow.nodes?.length ?? 0} nodes
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            {workflow.edges?.length ?? 0} edges
          </span>
          {workflow.updatedAt && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
              Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Link
            to={`/workflows/${workflow._id}/edit`}
            className="rounded-full border border-slate-950 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white"
          >
            Open Editor
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDeleteClick(workflow)
            }}
            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkflowTemplatesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [workflowToDelete, setWorkflowToDelete] = useState(null)
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)

  const workflowsQuery = useQuery({
    queryKey: ['all-workflows'],
    queryFn: listAllWorkflows,
  })

  const createWorkflowMutation = useMutation({
    mutationFn: ({ payload }) => createWorkflowTemplate(payload),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['all-workflows'] });
      // Navigate to the new workflow editor for the created template
      navigate(`/workflows/${data?._id}/edit`);
    },
  })

  const deleteWorkflowMutation = useMutation({
    mutationFn: ({ workflowId }) => deleteWorkflowTemplate(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-workflows'] })
      setWorkflowToDelete(null)
    },
  })

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const allWorkflows = workflowsQuery.data?.workflows ?? []
  const projects = projectsQuery.data?.projects ?? []

  const filteredWorkflows = useMemo(() => {
    if (!searchTerm) return allWorkflows
    return allWorkflows.filter(
      (workflow) =>
        workflow.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [allWorkflows, searchTerm])

  const stats = useMemo(
    () => ({
      templates: allWorkflows.length,
    }),
    [allWorkflows.length],
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
          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Workflows</p>
            <h1 className="max-w-3xl text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">
              Workflow Templates
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">
              Manage your reusable workflow templates here.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Templates</p>
              <p className="mt-2 text-2xl font-medium text-slate-950">{stats.templates}</p>
            </div>
          </section>

          {workflowsQuery.isLoading || projectsQuery.isLoading ? (
            <div className="py-10">
              <Spinner />
            </div>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-sky-400"
              />
              <span className="text-sm text-slate-500">{filteredWorkflows.length} templates</span>
            </div>

            <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">List</p>
                <h2 className="mt-2 text-2xl font-medium tracking-tight text-slate-950">
                  All Templates
                </h2>
              </div>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="rounded-full border border-slate-950 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-950 hover:text-white"
              >
                Create New Template
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredWorkflows.map((workflow) => (
                <WorkflowTemplateCard
                  key={workflow._id}
                  workflow={workflow}
                  onDeleteClick={setWorkflowToDelete}
                />
              ))}

              {!workflowsQuery.isLoading && filteredWorkflows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No workflow templates yet. Create one to get started.
                </div>
              ) : null}
            </div>
          </section>
        </motion.div>
        <CreateTemplateModal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={(data) => {
            createWorkflowMutation.mutate({ payload: data })
            setCreateModalOpen(false)
          }}
          isCreating={createWorkflowMutation.isPending}
        />
        <ConfirmationModal
          isOpen={!!workflowToDelete}
          onClose={() => setWorkflowToDelete(null)}
          onConfirm={() => deleteWorkflowMutation.mutate({ workflowId: workflowToDelete._id })}
          title="Delete workflow template"
          message={`Are you sure you want to delete the "${workflowToDelete?.name}" template? This action cannot be undone.`}
          confirmText="Delete"
          isConfirming={deleteWorkflowMutation.isPending}
        />
      </div>
    </div>
  )
}

function CreateTemplateModal({ isOpen, onClose, onSubmit, isCreating }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: 'New viral shorts workflow',
      description: 'A template to analyze a video and generate engaging short clips.',
      shortCount: 5,
      shortDuration: 30,
    },
  })

  const handleFormSubmit = (data) => {
    onSubmit({
      name: data.name,
      description: data.description,
      nodes: [],
      edges: [],
      settings: {
        shortCount: Number(data.shortCount),
        shortDuration: Number(data.shortDuration),
      },
    })
  }

  if (!isOpen) return null

  const labelClass = 'text-sm font-medium text-slate-700'
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">Create New Workflow Template</h2>
        <p className="mt-1 text-sm text-slate-500">
          Start by providing some basic details for your new template.
        </p>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-6 space-y-4">
          <label className="block">
            <span className={labelClass}>Template Name</span>
            <input {...register('name', { required: 'Name is required' })} className={`mt-2 ${inputClass}`} />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
          </label>

          <label className="block">
            <span className={labelClass}>Description</span>
            <textarea {...register('description')} rows="3" className={`mt-2 ${inputClass}`} />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={labelClass}>Shorts Count</span>
              <input type="number" {...register('shortCount', { required: true, min: 1 })} className={`mt-2 ${inputClass}`} />
            </label>
            <label className="block">
              <span className={labelClass}>Target Duration (s)</span>
              <input type="number" {...register('shortDuration', { required: true, min: 5 })} className={`mt-2 ${inputClass}`} />
            </label>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-full border border-sky-600 bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create and Open Editor'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}