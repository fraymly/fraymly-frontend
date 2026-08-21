import { FolderInput, FolderKanban, LayoutDashboard, Settings, Workflow } from "lucide-react"

export const AUTH_TOKEN_KEY = 'fraymly.auth.token'
export const APP_NAME = 'Fraymly'
export const SERVER_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/exports', label: 'Exports', icon: FolderInput },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const WORKFLOW_NAV_ITEM = { to: '/workflows', label: 'Workflows', icon: Workflow }

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? SERVER_URL;