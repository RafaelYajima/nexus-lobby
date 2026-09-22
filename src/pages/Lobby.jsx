import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * Início: so uma saudação calorosa — quem entra aqui já parte direto
 * pras conversas pela coluna lateral. Rodapé sempre colado no fim da tela.
 */
export default function Lobby() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'

  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-zinc-100 dark:bg-ink-950">
      {/* textura de fundo */}
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[120px]" aria-hidden="true" />

      {/* saudação central */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-6 pb-12 text-center">
        <p className="text-sm text-zinc-400 sm:text-base dark:text-zinc-500">{getGreeting()},</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-white">
          <span className="text-gradient">{username}</span> 👋
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-400 sm:text-base dark:text-zinc-500">
          Bora conversar com a galera?
        </p>
      </main>

      <footer className="relative mt-auto border-t border-zinc-200/70 py-6 text-center text-xs text-zinc-400 dark:border-white/5 dark:text-zinc-600">
        © 2026 NEXUS · Sua galera, um clique de distância 💜
      </footer>
    </div>
  )
}
