import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePresence } from '../../context/PresenceContext'
import { useProfile } from '../../hooks/useProfile'
import { PRESENCE_META } from '../../lib/presence'

const DOTS = {
  online: 'bg-emerald-500',
  away: 'bg-amber-400',
  invisible: 'border-2 border-zinc-400 bg-transparent',
}

/** Painel do usuário no rodapé da coluna (avatar+status, nome#tag, 🎤 🎧 ⚙️). */
export default function UserPanel() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { effectiveStatus } = usePresence()

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'
  const tag = profile?.tag ?? null
  const dot = DOTS[effectiveStatus] ?? 'bg-zinc-500'

  return (
    <div className="mt-auto flex shrink-0 items-center gap-1.5 border-t border-zinc-200/70 bg-zinc-100/80 p-2 dark:border-white/5 dark:bg-ink-950/60">
      <Link to="/perfil" className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 transition hover:bg-black/5 dark:hover:bg-white/5" title="Meu perfil">
        <span className="relative shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white">
            {username.slice(0, 1).toUpperCase()}
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-100 dark:border-ink-950 ${dot}`}
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-extrabold text-zinc-900 dark:text-zinc-50">
            {username}
            {tag && <span className="font-mono text-zinc-400"> #{tag}</span>}
          </span>
          <span className="block text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
            {PRESENCE_META[effectiveStatus]?.label ?? 'online'}
          </span>
        </span>
      </Link>

      {[
        { icon: '🎤', label: 'Microfone (em breve)' },
        { icon: '🎧', label: 'Áudio (em breve)' },
      ].map((b) => (
        <span
          key={b.icon}
          title={b.label}
          className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg text-sm opacity-45"
        >
          {b.icon}
        </span>
      ))}
      <Link
        to="/perfil"
        aria-label="Configurações"
        title="Configurações"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-zinc-500 transition hover:bg-black/5 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
      >
        ⚙️
      </Link>
    </div>
  )
}
