import { create } from 'zustand'
import { AUTH_TOKEN_KEY } from '../lib/constants'

const readStoredToken = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

const writeStoredToken = (token) => {
  if (typeof window === 'undefined') {
    return
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  }
}

const useAppStore = create((set, get) => ({
  token: readStoredToken(),
  user: null,
  socketConnected: false,
  activeProjectId: null,
  activeJobId: null,
  workflowRuntime: {
    runId: null,
    projectId: null,
    workflowId: null,
    activeNodeId: null,
    progress: 0,
    currentStep: '',
    nodeStates: {},
  },
  aiProgress: null,
  setAuth: ({ token, user }) => {
    writeStoredToken(token)
    set({ token, user })
  },
  setUser: (user) => set({ user }),
  hydrateAuth: () => set({ token: readStoredToken() }),
  clearAuth: () => {
    writeStoredToken(null)
    set({
      token: null,
      user: null,
      socketConnected: false,
      activeProjectId: null,
      activeJobId: null,
      workflowRuntime: {
        runId: null,
        projectId: null,
        workflowId: null,
        activeNodeId: null,
        progress: 0,
        currentStep: '',
        nodeStates: {},
      },
    })
  },
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  setActiveJobId: (activeJobId) => set({ activeJobId }),
  setWorkflowRuntime: (patch) => set((state) => ({
    workflowRuntime: {
      ...state.workflowRuntime,
      ...patch,
      nodeStates: patch.nodeStates ? patch.nodeStates : state.workflowRuntime.nodeStates,
    },
  })),
  setWorkflowNodeState: (nodeId, patch) => set((state) => ({
    workflowRuntime: {
      ...state.workflowRuntime,
      nodeStates: {
        ...state.workflowRuntime.nodeStates,
        [nodeId]: {
          ...(state.workflowRuntime.nodeStates[nodeId] ?? {}),
          ...patch,
        },
      },
    },
  })),
  setAiProgress: (aiProgress) => set({ aiProgress }),
  clearAiProgress: () => set({ aiProgress: null }),
}))

export default useAppStore
