import { Navigate } from 'react-router'
import useAppStore from '../../store/useAppStore'

export default function RequireAuth({ children }) {
  const token = useAppStore((state) => state.token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

