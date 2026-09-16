import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-ink-950">
        <div className="flex flex-col items-center gap-3 text-zinc-400 dark:text-zinc-500">
          <Spinner className="h-8 w-8 text-violet-500" />
          <p className="text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
