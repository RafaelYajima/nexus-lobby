import AppHeader from '../components/AppHeader'
import HeroCarousel from '../components/lobby/HeroCarousel'
import GameCard from '../components/lobby/GameCard'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { GAMES } from '../data/games'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/**
 * Lobby: vitrine de jogos. Configurações e perfil vivem em /perfil.
 */
export default function Lobby() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'

  const scrollToGames = () => {
    document.getElementById('jogos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative min-h-screen bg-zinc-100 dark:bg-ink-950">
      {/* textura de fundo */}
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[120px]" aria-hidden="true" />

      <AppHeader />

      <main className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        {/* saudação */}
        <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">{getGreeting()},</p>
            <h1 className="mt-0.5 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              <span className="text-gradient">{username}</span> 👋
            </h1>
          </div>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">O que vamos jogar hoje?</p>
        </section>

        <HeroCarousel onCta={scrollToGames} />

        <section id="jogos" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-zinc-900 dark:text-white">
              <span aria-hidden="true">🕹️</span> Jogos em destaque
            </h2>
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {GAMES.length} títulos
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>

        <footer className="mt-14 border-t border-zinc-200/70 pt-6 text-center text-xs text-zinc-400 dark:border-white/5 dark:text-zinc-600">
          © 2026 NEXUS · Feito para jogadores 🎮
        </footer>
      </main>
    </div>
  )
}
