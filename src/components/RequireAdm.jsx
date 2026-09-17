import { Navigate } from 'react-router-dom'
import { useProfile } from '../hooks/useProfile'
import Spinner from './Spinner'

/**
 * Porta de acesso por papel: só admins passam.
 * Mod/jogador é mandado de volta ao lobby.
 */
export default function RequireAdm({ children }) {
  const { profile, loading } = useProfile()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-ink-950">
        <Spinner className="h-8 w-8 text-violet-500" />
      </div>
    )
  }

  if (profile?.role !== 'adm') return <Navigate to="/lobby" replace />

  return children
}
