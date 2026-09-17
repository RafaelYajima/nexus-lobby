import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import Spinner from '../components/Spinner'
import RoleBadge from '../components/RoleBadge'
import HeroCarousel from '../components/lobby/HeroCarousel'
import GameCard from '../components/lobby/GameCard'
import ProfileCard from '../components/lobby/ProfileCard'
import SettingsCard from '../components/lobby/SettingsCard'
import { GAMES } from '../data/games'

const NAV_ITEMS = [
  { label: 'Lobby', active: true },
  { label: 'Loja', active: false },
  { label: 'Ranking', active: false },
  { label: 'Comunidade', active: false },
]

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function Lobby() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setProfileLoading(false)
      return
    }
    let active = true
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.warn('[perfil]', error.message)
        if (active) {
          setProfile(data ?? null)
          setProfileLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'
  const role = profile?.role ?? 'user'

  const memberSince = useMemo(() => {
    const raw = profile?.created_at || user?.created_at
    if (!raw) return '—'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(raw))
  }, [profile, user])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    // Sem sessão, o ProtectedRoute redireciona para /login automaticamente.
  }

  const scrollToGames = () => {
    document.getElementById('jogos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="relative min-h-screen bg-zinc-100 dark:bg-ink-950">
      {/* textura de fundo */}
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[120px]" aria-hidden="true" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-white/5 dark:bg-ink-950/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo size={34} withGlow={false} />
              <span className="text-lg font-black tracking-[0.18em] text-zinc-900 dark:text-white">
                NEXUS
              </span>
            </div>

            {/* nav principal */}
            <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
              {NAV_ITEMS.map((item) => (
                <span
                  key={item.label}
                  title={item.active ? undefined : 'Em breve'}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    item.active
                      ? 'bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300'
                      : 'cursor-not-allowed text-zinc-400 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-500'
                  }`}
                >
                  {item.label}
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 rounded-xl border border-zinc-200 bg-white/80 py-1.5 pl-1.5 pr-3 sm:flex dark:border-white/10 dark:bg-white/5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white">
                {username.slice(0, 1).toUpperCase()}
              </span>
              <div className="leading-tight">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
                  {username}
                  {role !== 'user' && <RoleBadge role={role} size="sm" />}
                </p>
                <p className="max-w-[160px] truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-3.5 text-sm font-medium text-zinc-500 transition-all hover:border-rose-300 hover:text-rose-500 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
            >
              {signingOut ? <Spinner className="h-4 w-4" /> : <IconLogout />}
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* coluna principal */}
          <div className="space-y-10">
            <HeroCarousel onCta={scrollToGames} />

            <section id="jogos" className="scroll-mt-24">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                  <span aria-hidden="true">🕹️</span> Jogos em destaque
                </h2>
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {GAMES.length} títulos
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {GAMES.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            </section>
          </div>

          {/* coluna lateral: perfil + configurações */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <ProfileCard
              username={username}
              email={user?.email}
              role={role}
              memberSince={memberSince}
              loading={profileLoading}
            />
            <SettingsCard />
          </aside>
        </div>

        <footer className="mt-14 border-t border-zinc-200/70 pt-6 text-center text-xs text-zinc-400 dark:border-white/5 dark:text-zinc-600">
          © 2026 NEXUS · Feito para jogadores 🎮
        </footer>
      </main>
    </div>
  )
}
