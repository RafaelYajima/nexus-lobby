import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { useRooms } from '../../hooks/useRooms'
import { useFriends } from '../../hooks/useFriends'
import { usePresence } from '../../context/PresenceContext'
import { useUnread } from '../../context/UnreadContext'
import UserPanel from './UserPanel'

const STATUS_DOT = { online: 'bg-emerald-500', away: 'bg-amber-400' }

function FriendRow({ friend, active, unread, status }) {
  return (
    <Link
      to={`/chat/${friend.userId}`}
      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition ${
        active ? 'bg-violet-500/10' : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <span className="relative shrink-0">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black text-white ${
            status === 'online' || status === 'away'
              ? 'bg-gradient-to-br from-violet-600 to-cyan-500'
              : 'bg-gradient-to-br from-zinc-500 to-zinc-700'
          }`}
        >
          {(friend.username || '?').slice(0, 1).toUpperCase()}
        </span>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-ink-900 ${
            STATUS_DOT[status] ?? 'bg-zinc-400'
          }`}
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700 dark:text-zinc-200">
        {friend.username ?? 'jogador'}
        {friend.tag && <span className="font-mono text-zinc-400"> #{friend.tag}</span>}
      </span>
      {unread > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}

/**
 * Coluna do meio (estilo Discord): fora de servidor = Início/Amigos/Mensagens Diretas;
 * dentro de servidor = nome do servidor + canais (💬 texto ativo, 🔊 voz em breve).
 */
export default function ContextSidebar() {
  const { pathname } = useLocation()
  const { roomId } = useParams()
  const { rooms } = useRooms()
  const { friends } = useFriends()
  const { others } = usePresence()
  const { unreadByFriend, totalUnread } = useUnread()

  const presenceById = new Map(others.map((o) => [o.id, o.status]))
  const inServer = pathname.startsWith('/salas/') && roomId
  const room = inServer ? (rooms ?? []).find((r) => r.id === roomId) : null

  const navItem = (to, icon, label, badge = 0) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
          isActive
            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
            : 'text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5'
        }`
      }
    >
      <span className="text-sm">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200/70 bg-white/60 dark:border-white/5 dark:bg-ink-900/60">
      {inServer ? (
        <>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200/70 px-4 dark:border-white/5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm shadow">
              🏰
            </span>
            <p className="truncate text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
              {room?.name ?? 'Servidor'}
            </p>
          </header>

          <div className="flex-1 overflow-y-auto px-2.5 py-3">
            <p className="px-1.5 pb-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Canais de texto
            </p>
            <Link
              to={`/salas/${roomId}`}
              className="flex items-center gap-2.5 rounded-xl bg-violet-500/10 px-2.5 py-1.5 text-xs font-extrabold text-violet-600 dark:text-violet-300"
            >
              💬 geral
            </Link>

            <p className="px-1.5 pb-1.5 pt-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Canais de voz
            </p>
            <div
              className="flex cursor-not-allowed items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-zinc-400 dark:text-zinc-600"
              title="Canais de voz — chegam no próximo capítulo 🎙️"
            >
              🔊 sala de voz
              <span className="ml-auto rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                em breve
              </span>
            </div>

            <div className="mt-4 border-t border-zinc-200/70 pt-3 dark:border-white/5">
              <Link
                to="/salas"
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-zinc-600 transition hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/5"
              >
                ⬅️ todos os servidores
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <header className="flex h-14 shrink-0 items-center border-b border-zinc-200/70 px-4 dark:border-white/5">
            <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">💬 Conversas</p>
          </header>

          <div className="flex-1 overflow-y-auto px-2.5 py-3">
            {navItem('/lobby', '🏠', 'Início')}
            {navItem('/amigos', '👥', 'Amigos', totalUnread)}

            <div className="mt-4 flex items-center justify-between px-1.5 pb-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Mensagens diretas
              </p>
              <Link
                to="/amigos"
                aria-label="Adicionar amigo"
                title="Adicionar amigo"
                className="text-sm font-black text-zinc-400 transition hover:text-violet-500"
              >
                +
              </Link>
            </div>

            {friends.length === 0 ? (
              <div className="mt-4 px-2.5 text-center">
                <p className="text-2xl">🫥</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                  Por enquanto tá vazio…
                  <br />
                  suas mensagens diretas com amigos aparecem aqui.
                </p>
                <Link
                  to="/amigos"
                  className="mt-3 inline-block rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-violet-500"
                >
                  Adicionar amigos
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {friends.map((f) => (
                  <FriendRow
                    key={f.userId}
                    friend={f}
                    active={pathname === `/chat/${f.userId}`}
                    unread={unreadByFriend[f.userId] ?? 0}
                    status={presenceById.get(f.userId) ?? 'offline'}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <UserPanel />
    </aside>
  )
}
