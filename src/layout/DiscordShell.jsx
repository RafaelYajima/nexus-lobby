import { Outlet } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ServerRail from '../components/shell/ServerRail'
import ContextSidebar from '../components/shell/ContextSidebar'
import ActivityRail from '../components/shell/ActivityRail'
import { useMediaQuery } from '../hooks/useMediaQuery'

/**
 * 🧱 Casca estilo Discord:
 *  - lg+ (tela grande): trilha de servidores + coluna contexto + conteúdo + "Ativo agora"
 *  - abaixo de lg: layout mobile atual (AppHeader + barra inferior) — mesmo conteúdo
 */
export default function DiscordShell() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  if (!isDesktop) {
    return (
      <>
        <AppHeader />
        <Outlet />
      </>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <ServerRail />
      <ContextSidebar />
      <main className="relative flex-1 overflow-y-auto bg-zinc-100 dark:bg-ink-900/30">
        <div className="flex min-h-full flex-col">
          <Outlet />
        </div>
      </main>
      <ActivityRail />
    </div>
  )
}
