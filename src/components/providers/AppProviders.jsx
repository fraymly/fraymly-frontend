import { useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { me } from '../../api/auth.api'
import useAppStore from '../../store/useAppStore'
import { useSocketSync } from '../../hooks/useSocketSync'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function AuthBootstrap({ children }) {
  const token = useAppStore((state) => state.token)
  const user = useAppStore((state) => state.user)
  const setUser = useAppStore((state) => state.setUser)
  const clearAuth = useAppStore((state) => state.clearAuth)
  const hydrateAuth = useAppStore((state) => state.hydrateAuth)

  useEffect(() => {
    hydrateAuth()
  }, [hydrateAuth])

  const authQuery = useQuery({
    queryKey: ['me'],
    queryFn: me,
    enabled: Boolean(token),
    retry: false,
  })

  useEffect(() => {
    if (authQuery.data?.user) {
      setUser(authQuery.data.user)
    }
  }, [authQuery.data, setUser])

  useEffect(() => {
    if (authQuery.error && token) {
      clearAuth()
    }
  }, [authQuery.error, clearAuth, token])

  useSocketSync(Boolean(token && (user || authQuery.data?.user)))

  return children
}

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryClientProvider>
  )
}
