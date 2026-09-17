import { useAuth } from '../../context/AuthContext'
import { useProfile } from '../../hooks/useProfile'
import { useOnlineUsers } from '../../hooks/useOnlineUsers'

const ROLE_ORDER = { adm: 0, mod: 1, user: 2 }
const MAX_AVATARS = 10

/**
 * Faixa "jogadores online agora" — presença via Supabase Realtime.
 * Mostra contagem ao vivo + avatares empilhados (você primeiro).
 */
export default function OnlineNow() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'

  const { online, connected } = useOnlineUsers({
    username,
    tag: profile?.tag ?? null,
    role: profile?.role ?? 'user',
  })

  const sorted = [...online].sort((a, b) => {
    if (a.id === user?.id) return -1
    if (b.id === user?.id) return 1
    return (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3)
  })

  const count = sorted.length
  const shown = sorted.slice(0, MAX_AVATARS)
  const extra = count - shown.length

  return (
    <section
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3.5 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]"
    >
      {/* status */}
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          {connected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              connected ? 'bg-emerald-500' : 'bg-zinc-400'
            }`}
          />
        </span>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {!connected && 'Conectando…'}
          {connected && count === 1 && 'Só você online agora'}
          {connected && count > 1 && (
            <>
              <span className="text-emerald-500 dark:text-emerald-400">{count}</span> jogadores
              online agora
            </>
          )}
        </p>
        {connected && count === 1 && (
          <span className="hidden text-xs text-zinc-400 sm:inline dark:text-zinc-500">
            👀 abra outra aba/janela (ou chame um amigo) e veja a mágica acontecer
          </span>
        )}
      </div>

      {/* avatares */}
      {count > 0 && (
        <div className="flex items-center">
          <div className="flex -space-x-2.5">
            {shown.map((u) => {
              const isMe = u.id === user?.id
              const who = `${u.username ?? 'jogador'}${u.tag ? ` #${u.tag}` : ''}${
                isMe ? ' (você)' : ''
              }`
              return (
                <span
                  key={u.id}
                  title={who}
                  className={`ring-2 ring-white transition-transform hover:z-10 hover:-translate-y-1 dark:ring-ink-950 ${
                    isMe ? 'z-10' : ''
                  } rounded-xl`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black text-white ${
                      isMe
                        ? 'bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-neon-violet'
                        : 'bg-gradient-to-br from-zinc-500 to-zinc-700 dark:from-zinc-600 dark:to-zinc-800'
                    }`}
                  >
                    {(u.username || '?').slice(0, 1).toUpperCase()}
                  </span>
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
        </div>
      )}
    </section>
  )
}
