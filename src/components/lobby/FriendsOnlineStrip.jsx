import { Link } from 'react-router-dom'
import { usePresence } from '../../context/PresenceContext'
import { useFriends } from '../../hooks/useFriends'
import { PRESENCE_META } from '../../lib/presence'

const MAX_AVATARS = 8

/**
 * Faixa do lobby: mostra APENAS amigos online (ausente também conta como online).
 * Esconde sozinha quando não há amigos online — o lobby fica limpo.
 */
export default function FriendsOnlineStrip() {
  const { friends, blocked, loading } = useFriends()
  const { others } = usePresence()

  const presenceById = new Map(others.map((o) => [o.id, o.status]))
  const onlineFriends = friends.filter((f) => presenceById.has(f.userId))

  if (loading || blocked || onlineFriends.length === 0) return null

  const shown = onlineFriends.slice(0, MAX_AVATARS)
  const extra = onlineFriends.length - shown.length

  return (
    <section className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3.5 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          <span className="text-emerald-500 dark:text-emerald-400">{onlineFriends.length}</span>{' '}
          {onlineFriends.length === 1 ? 'amigo online agora' : 'amigos online agora'}
        </p>
      </div>

      <div className="flex -space-x-2.5">
        {shown.map((f) => {
          const status = presenceById.get(f.userId) ?? 'offline'
          const dot = PRESENCE_META[status]?.dot ?? 'bg-zinc-400'
          return (
            <span
              key={f.userId}
              title={`${f.username}${f.tag ? ` #${f.tag}` : ''} — ${PRESENCE_META[status]?.label ?? ''}`}
              className="relative ring-2 ring-white rounded-xl transition-transform hover:z-10 hover:-translate-y-1 dark:ring-ink-950"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500 to-zinc-700 text-xs font-black text-white dark:from-zinc-600 dark:to-zinc-800">
                {f.username.slice(0, 1).toUpperCase()}
              </span>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-ink-950 ${dot}`}
              />
            </span>
          )
        })}
        {extra > 0 && (
          <span className="ring-2 ring-white rounded-xl dark:ring-ink-950">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-[11px] font-black text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
              +{extra}
            </span>
          </span>
        )}
      </div>

      <Link
        to="/amigos"
        className="ml-auto text-xs font-bold text-violet-600 transition hover:text-violet-500 dark:text-violet-300"
      >
        Abrir amigos →
      </Link>
    </section>
  )
}
