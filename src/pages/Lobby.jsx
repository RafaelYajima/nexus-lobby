import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import Spinner from '../components/Spinner'

const GAMES = [
  { id: 'brawl', name: 'Arena Brawl', desc: 'Batalhas PvP em tempo real', emoji: '⚔️', accent: 'from-violet-600 to-fuchsia-500', tag: 'PvP' },
  { id: 'racing', name: 'Corrida Neon', desc: 'Velocidade pura em pistas futuristas', emoji: '🏎️', accent: 'from-cyan-500 to-blue-600', tag: 'Corrida' },
  { id: 'tower', name: 'Torre Mística', desc: 'RPG de estratégia por andares', emoji: '🏰', accent: 'from-emerald-500 to-cyan-500', tag: 'RPG' },
  { id: 'quiz', name: 'Quiz Relâmpago', desc: 'Perguntas rápidas, ranking global', emoji: '⚡', accent: 'from-amber-500 to-rose-500', tag: 'Casual' },
]

/** Estilos do selo de cada papel */
const ROLE_STYLES = {
  adm: {
    label: 'ADMIN',
    className:
      'border border-fuchsia-400/50 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-neon-violet',
  },
  mod: {
    label: 'MOD',
    className: 'border border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
  },
  user: {
    label: 'JOGADOR',
    className: 'border border-zinc-400/40 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
  },
}

function RoleBadge({ role, size = 'md' }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.user
  const sizing = size === 'sm' ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'
  return (
    <span className={`inline-flex items-center rounded-md font-bold tracking-widest ${sizing} ${style.className}`}>
      {style.label}
    </span>
  )
}

const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export default function Lobby() {
  const { user, signOut } = useAuth()
  const { theme } = useTheme()
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
      month: 'long',
      year: 'numeric',
    }).format(new Date(raw))
  }, [profile, user])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    // Sem sessão, o ProtectedRoute redireciona para /login automaticamente.
  }

  return (
    <div className="relative min-h-screen bg-zinc-100 dark:bg-ink-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-white/5 dark:bg-ink-950/75">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size={34} withGlow={false} />
            <span className="text-lg font-black tracking-[0.18em] text-zinc-900 dark:text-white">NEXUS</span>
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
                <p className="max-w-[180px] truncate text-[11px] text-zinc-400 dark:text-zinc-500">{user?.email}</p>
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
      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <div className="pointer-events-none absolute -top-10 left-1/2 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[110px]" aria-hidden="true" />

        <section className="relative">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-500 dark:text-violet-400">
            Lobby {role === 'adm' && <RoleBadge role="adm" size="sm" />} {role === 'mod' && <RoleBadge role="mod" size="sm" />}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Olá, <span className="text-gradient">{username}</span> 👋
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            Este é o seu lobby. Os jogos abaixo ainda estão em construção — e é aqui que vamos
            transformá-los em algo épico nas próximas etapas.
          </p>
        </section>

        {/* Grid de jogos (placeholders) */}
        <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAMES.map((game) => (
            <div
              key={game.id}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20 dark:hover:shadow-neon-violet"
            >
              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${game.accent} shadow-lg`}
              >
                {game.emoji}
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-white">{game.name}</h3>
                <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                  {game.tag}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{game.desc}</p>
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:border-white/15 dark:text-zinc-500"
              >
                Em breve
              </button>
            </div>
          ))}
        </section>

        {/* Perfil */}
        <section className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 lg:col-span-2 dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              Seu perfil
            </h2>
            {profileLoading ? (
              <div className="mt-6 flex justify-center">
                <Spinner className="h-6 w-6 text-violet-500" />
              </div>
            ) : (
              <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Nome de usuário
                  </dt>
                  <dd className="mt-1 font-semibold text-zinc-900 dark:text-white">{username}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    E-mail
                  </dt>
                  <dd className="mt-1 break-all font-semibold text-zinc-900 dark:text-white">{user?.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Tipo de conta
                  </dt>
                  <dd className="mt-1.5">
                    <RoleBadge role={role} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Membro desde
                  </dt>
                  <dd className="mt-1 font-semibold text-zinc-900 dark:text-white">{memberSince}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Tema preferido
                  </dt>
                  <dd className="mt-1 font-semibold text-zinc-900 dark:text-white">
                    {theme === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
                  </dd>
                </div>
              </dl>
            )}
            <p className="mt-5 rounded-xl bg-violet-500/5 p-3 text-[11px] leading-relaxed text-zinc-400 dark:bg-violet-400/5 dark:text-zinc-500">
              💡 O tema escolhido é salvo automaticamente no seu perfil — em qualquer dispositivo que
              você entrar, o NEXUS estará do seu jeito.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-600/10 to-cyan-500/10 p-6 dark:border-violet-400/20">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-violet-500 dark:text-violet-300">
                Próximos passos
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-300">
                {role === 'adm' && (
                  <li className="flex items-start gap-2"><span>🛡️</span> Painel admin: gerenciar mods e jogadores</li>
                )}
                <li className="flex items-start gap-2"><span>🎮</span> Criar salas de jogo públicas e privadas</li>
                <li className="flex items-start gap-2"><span>💬</span> Chat em tempo real no lobby</li>
                <li className="flex items-start gap-2"><span>🏆</span> Ranking e histórico de partidas</li>
                <li className="flex items-start gap-2"><span>👥</span> Sistema de amigos e convites</li>
              </ul>
            </div>
            <p className="mt-6 text-[11px] text-zinc-400 dark:text-zinc-500">
              Roadmap sujeito ao seu feedback, chefia. 🚀
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
