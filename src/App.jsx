import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AppShell from './components/layout/AppShell'
import RequireAuth from './components/providers/RequireAuth'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import ProjectsPage from './pages/Projects/ProjectsPage'
import ProjectPage from './pages/Project/ProjectPage'
import FullWorkflowPage from './pages/Project/FullWorkflowPage'
import WorkflowTemplatesPage from './pages/Project/WorkflowTemplatesPage'
import { WorkflowRunDetail } from './pages/Project/WorkflowRunDetail'
import EditorPage from './pages/Editor/EditorPage'
import ExportsPage from './pages/Exports/ExportsPage'
import SettingsPage from './pages/Settings/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectPage />} />
          <Route path="/workflows" element={<WorkflowTemplatesPage />} /> // This lists all templates
          <Route path="/workflows/:workflowId/edit" element={<FullWorkflowPage />} />
          <Route path="/projects/:projectId/runs/:runId" element={<WorkflowRunDetail />} />
          <Route path="/editor/:projectId" element={<EditorPage />} />
          <Route path="/exports" element={<ExportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
