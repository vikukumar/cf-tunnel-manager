import { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { authApi } from '../api/client'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: 1,
  })

  const { data: authInfo } = useQuery({
    queryKey: ['auth', 'info'],
    queryFn: authApi.info,
  })

  // Still loading user info
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-[#F6821F] animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // If auth is enabled and user is not authenticated, redirect to login
  if (authInfo?.enabled && (!user || !user.email || user.email === 'anonymous')) {
    return <Navigate to="/login" replace />
  }

  // If auth check failed, redirect to login
  if (error) {
    return <Navigate to="/login" replace />
  }

  // User is authenticated, render the protected content
  return <>{children}</>
}
