import { Link } from 'react-router-dom'
import { useFriends } from '../../hooks/useFriends'
import { usePresence } from '../../context/PresenceContext'

const METAS = {
  online: { dot: 'bg-emerald-500', label: '🟢 Online' },
  away: { dot: 'bg-amber-400', label: '🟡 Ausente' },
}

/** Painel direito "Ativo agora" (xl+): só AMIGOS online — a privacidade continua. */
export default function ActivityRail() {
  const { friends } = useFriends()
  const { others } = usePresence()

  const friendIds = new Set(friends.map((f) => f.userId))
  const online = others.filter((o) => friendIds.has(o.id) && (o.status === 'online' || o.status === 'away')).slice(0, 10)
  const friendById = Object.fromEntries(friends.map((f) => [f.userId, f]))

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l border-zinc-200/70 bg-white/40 dark:border-white/5 dark:bg-ink-900/40 xl:flex">
      <header className="flex h-14 shrink-0 items-center border-b border-zinc-200/70 px-4 dark:border-white/5">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Ativo agora
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {online.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 shadow-soft dark:bg-ink-800">
            <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
              Por enquanto tá tudo quieto por aqui…
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Quando um amigo entrar online ou der aquela espiada, a gente mostra aqui! 🟢
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {online.map((o) => {
              const f = friendById[o.id] ?? {}
              const m = METAS[o.status] ?? METAS.online
              return (
                <li key={o.id}>
                  <Link
                    to={`/chat/${o.id}`}
                    className={`flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-soft transition hover:-translate-y-0.5 dark:bg-ink-800 ${
                      o.status === 'away' ? 'opacity-80' : ''
                    }`}
                  >
                    <span className="relative shrink-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white">
                        {(f.username || o.username || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-ink-800 ${m.dot}`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-extrabold text-zinc-900 dark:text-zinc-50">
                        {f.username ?? o.username ?? 'jogador'}
                      </span>
                      <span className="block text-[10px] font-semibold text-zinc-400">{m.label}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
