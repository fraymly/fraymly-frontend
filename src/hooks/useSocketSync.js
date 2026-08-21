import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { SOCKET_URL } from '../lib/constants'
import useAppStore from '../store/useAppStore'

export function useSocketSync(enabled) {
  const queryClient = useQueryClient()
  const setSocketConnected = useAppStore((state) => state.setSocketConnected)
  const setWorkflowRuntime = useAppStore((state) => state.setWorkflowRuntime)
  const setWorkflowNodeState = useAppStore((state) => state.setWorkflowNodeState)
  const setAiProgress = useAppStore((state) => state.setAiProgress)
  const clearAiProgress = useAppStore((state) => state.clearAiProgress)

  useEffect(() => {
    if (!enabled) {
      setSocketConnected(false)
      return undefined
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
    })

    const refresh = async (keys) => {
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    }

    socket.on('connect', () => {
      setSocketConnected(true)
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
    })

    socket.on('jobs:created', () => {
      refresh([['jobs'], ['projects']])
    })

    socket.on('jobs:updated', (payload) => {
      const jobId = payload?.job?._id
      const projectId = payload?.job?.projectId
      refresh([['jobs'], jobId ? ['job', jobId] : null, projectId ? ['project', projectId] : null].filter(Boolean))
    })

    socket.on('clips:updated', (payload) => {
      const projectId = payload?.projectId
      const jobId = payload?.jobId
      refresh([['clips'], jobId ? ['job', jobId] : null, projectId ? ['project', projectId] : null].filter(Boolean))
    })

    socket.on('exports:updated', (payload) => {
      const jobId = payload?.jobId
      refresh([['exports'], jobId ? ['job', jobId] : null, payload?.item?.projectId ? ['project-exports', payload.item.projectId] : null].filter(Boolean))
    })

    socket.on('projects:updated', (payload) => {
      const projectId = payload?.projectId
      refresh([['projects'], projectId ? ['project', projectId] : null].filter(Boolean))
    })

    socket.on('workflow-runs:created', (payload) => {
      if (payload?.run) {
        setWorkflowRuntime({
          runId: payload.run._id,
          projectId: payload.run.projectId,
          workflowId: payload.run.workflowId,
          activeNodeId: payload.run.activeNodeId ?? null,
          progress: payload.run.progress ?? 0,
          currentStep: payload.run.currentStep ?? '',
          nodeStates: {},
        })
      }

      const projectId = payload?.run?.projectId
      const runId = payload?.run?._id
      refresh([
        projectId ? ['project-workflow-runs', projectId] : null,
        projectId ? ['project', projectId] : null,
        runId ? ['workflow-run', runId] : null,
      ].filter(Boolean))
    })

    socket.on('workflow-runs:updated', (payload) => {
      const run = payload?.run
      if (run) {
        setWorkflowRuntime((prevState) => ({
          ...prevState,
          ...run,
          nodeStates: Array.isArray(run.nodeResults)
            ? run.nodeResults.reduce((acc, item) => {
                acc[item.nodeId] = { ...(acc[item.nodeId] || {}), ...item }
                return acc
              }, { ...prevState.nodeStates })
            : prevState.nodeStates,
        }))

        refresh([
          ['project-workflow-runs', run.projectId],
          ['workflow-run', run._id],
          ['project', run.projectId],
          ['project-workflows', run.projectId],
          ['exports'],
        ])
      }
    })

    socket.on('workflow-runs:node', (payload) => {
      if (payload?.nodeId) {
        if (payload.status) {
          // This is a full state update for a node (e.g., running, completed)
          setWorkflowNodeState(payload.nodeId, {
            status: payload.status,
            progress: payload.progress,
            label: payload.label,
            output: payload.output,
            updatedAt: new Date().toISOString(),
          })
        } else if (payload.progress !== undefined) {
          // This is a progress-only update for a running node
          setWorkflowNodeState(payload.nodeId, { progress: payload.progress })
        }
      }
    })

    socket.on('ai:progress', (payload) => {
      setAiProgress(payload)
    })

    socket.on('ai:complete', (payload) => {
      setAiProgress({ ...payload, progress: 100, stage: 'completed' })
      setTimeout(() => clearAiProgress(), 8000)
    })

    socket.on('ai:error', (payload) => {
      setAiProgress({ ...payload, error: true })
      setTimeout(() => clearAiProgress(), 8000)
    })

    return () => {
      socket.disconnect()
      setSocketConnected(false)
    }
  }, [enabled, queryClient, setSocketConnected, setWorkflowNodeState, setWorkflowRuntime, setAiProgress, clearAiProgress])
}