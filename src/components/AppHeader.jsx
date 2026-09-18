import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSound } from '../context/SoundContext'
import { useUnread } from '../context/UnreadContext'
import { useProfile } from '../hooks/useProfile'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import Spinner from './Spinner'
import RoleBadge from './RoleBadge'

const NAV_ITEMS = [
  { label: 'Lobby', to: '/lobby' },
  { label: 'Perfil', to: '/perfil' },
  { label: 'Amigos', to: '/amigos' },
  { label: 'Salas', to: '/salas' },
  { label: 'Admin', to: '/admin', admOnly: true },
  { label: 'Loja', to: null },
  { label: 'Ranking', to: '/ranking' },
  { label: 'Comunidade', to: null },
]

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

/** Botão de ligar/desligar os sons de notificação (persistido na CONTA). */
function SoundToggle() {
  const { soundOn, toggle } = useSound()
  return (
    <button
      type="button"
      onClick={toggle}
      title={soundOn ? 'Desativar sons de notificação' : 'Ativar sons de notificação'}
      aria-label={soundOn ? 'Desativar sons' : 'Ativar sons'}
      className="rounded-xl border border-zinc-200 bg-white/80 p-2.5 text-sm transition hover:border-violet-400/60 active:scale-95 dark:border-white/10 dark:bg-white/5"
    >
      {soundOn ? '🔊' : '🔇'}
    </button>
  )
}

/**
 * Header compartilhado das áreas logadas.
 * O chip do usuário leva para a página de perfil (/perfil).
 */
export default function AppHeader() {
  const { user, signOut } = useAuth()
  const { totalUnread } = useUnread()
  const { profile } = useProfile()
  const { pathname } = useLocation()
  const [signingOut, setSigningOut] = useState(false)

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'
  const tag = profile?.tag ?? null
  const role = profile?.role ?? 'user'

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    // Sem sessão, o ProtectedRoute redireciona para /login automaticamente.
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-white/5 dark:bg-ink-950/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link to="/lobby" className="flex items-center gap-3 transition hover:opacity-80">
            <Logo size={34} withGlow={false} />
            <span className="text-lg font-black tracking-[0.18em] text-zinc-900 dark:text-white">
              NEXUS
            </span>
          </Link>

          {/* nav principal — itens admOnly só renderizam para role adm */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {NAV_ITEMS.filter((item) => !item.admOnly || role === 'adm').map((item) =>
              item.to ? (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    pathname.startsWith(item.to)
                      ? 'bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="inline-flex items-center">
                    {item.label}
                    {item.to === '/amigos' && totalUnread > 0 && (
                      <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow">
                        {totalUnread > 9 ? '9+' : totalUnread}
                      </span>
                    )}
                  </span>
                </NavLink>
              ) : (
                <span
                  key={item.label}
                  title="Em breve"
                  className="cursor-not-allowed rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-300 dark:text-zinc-700"
                >
                  {item.label}
                </span>
              )
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <SoundToggle />
          <ThemeToggle />

          {/* chip do usuário -> página de perfil */}
          <Link
            to="/perfil"
            title="Abrir meu perfil"
            className="group flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-white/80 py-1.5 pl-1.5 pr-2.5 transition-all hover:border-violet-400/60 hover:shadow-md hover:shadow-violet-500/10 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-400/40"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white">
              {username.slice(0, 1).toUpperCase()}
            </span>
            <span className="leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
                {username}
                {tag && <span className="font-mono text-[11px] font-medium text-zinc-400 dark:text-zinc-500">#{tag}</span>}
                {role !== 'user' && <RoleBadge role={role} size="sm" />}
              </span>
              <span className="hidden max-w-[150px] truncate text-[11px] text-zinc-400 sm:block dark:text-zinc-500">
                {user?.email}
              </span>
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-violet-500 dark:text-zinc-600 dark:group-hover:text-violet-300"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>

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
  )
}
