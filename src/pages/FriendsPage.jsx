import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Spinner from '../components/Spinner'
import RoleBadge from '../components/RoleBadge'
import PresenceControl from '../components/presence/PresenceControl'
import AddFriendMenu from '../components/amigos/AddFriendMenu'
import { useAuth } from '../context/AuthContext'
import { usePresence } from '../context/PresenceContext'
import { useUnread } from '../context/UnreadContext'
import { useFriends } from '../hooks/useFriends'
import { useProfile } from '../hooks/useProfile'
import { PRESENCE_META } from '../lib/presence'

const GHOST_BTN =
  'rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-bold text-zinc-500 transition hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200'

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'online', label: 'Online' },
  { id: 'favoritos', label: 'Favoritos' },
]

function AvatarStatus({ name, status }) {
  const dot = PRESENCE_META[status]?.dot ?? 'bg-zinc-500'
  return (
    <span className="relative shrink-0">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500 to-zinc-700 text-sm font-black text-white dark:from-zinc-600 dark:to-zinc-800">
        {(name || '?').slice(0, 1).toUpperCase()}
      </span>
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-ink-900 ${dot}`}
      />
    </span>
  )
}

/** Chip "eu: nome #tag" — copia sua identificação pra convidar alguém de fora. */
function InviteChip() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [copied, setCopied] = useState(false)

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'
  const handle = `${username}${profile?.tag ? ` #${profile.tag}` : ''}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(handle)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard indisponível — ignora */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Toque para copiar e convidar um amigo"
      className="flex max-w-[10rem] items-center gap-1.5 rounded-full border border-dashed border-violet-400/50 bg-violet-600/5 px-3 py-2 text-xs font-bold text-violet-600 transition hover:bg-violet-600/15 dark:text-violet-300 sm:max-w-none"
    >
      📋
      <span className="truncate font-mono">{handle}</span>
      <span className={copied ? 'text-emerald-500' : ''}>{copied ? '✓' : ''}</span>
    </button>
  )
}

/** Página 👥 Amigos — filtros rápidos, favoritos, busca no "+" e status. */
export default function FriendsPage() {
  const { user } = useAuth()
  const { others } = usePresence()
  const { unreadByFriend, totalUnread, markAllRead } = useUnread()
  const {
    friends,
    incoming,
    outgoing,
    favorites,
    favBlocked,
    blocked,
    loading,
    sendRequest,
    accept,
    remove,
    toggleFavorite,
  } = useFriends()

  const [filter, setFilter] = useState('todos')
  const [listQuery, setListQuery] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [flash, setFlash] = useState('')

  const presenceById = new Map(others.map((o) => [o.id, o.status]))
  const statusOf = (f) => presenceById.get(f.userId) ?? 'offline'
  const isFavorite = (f) => favorites.includes(f.userId)

  const relationOf = (userId) => {
    if (friends.some((f) => f.userId === userId)) return 'amigo'
    if (outgoing.some((f) => f.userId === userId)) return 'enviado'
    if (incoming.some((f) => f.userId === userId)) return 'recebido'
    return null
  }

  const doAction = async (key, fn, successMsg) => {
    setBusyKey(key)
    setFlash('')
    const res = await fn()
    setBusyKey('')
    if (res?.ok === false) setFlash(res.message)
    else if (successMsg) setFlash(successMsg)
    return res
  }

  const onAdd = (p) =>
    doAction(p.id, () => sendRequest(p.id), `Pedido enviado para ${p.username} ✉️`)

  const onToggleFav = async (f) => {
    setBusyKey(`fav:${f.userId}`)
    const res = await toggleFavorite(f.userId)
    setBusyKey('')
    if (res?.ok === false) setFlash(res.message)
  }

  const removeWithConfirm = (f) => {
    if (window.confirm(`Remover ${f.username} dos seus amigos?`)) {
      doAction(f.userId, () => remove(f.friendshipId), `${f.username} removido dos amigos.`)
    }
  }

  // filtro rápido + busca na lista
  const byFilter = friends.filter((f) => {
    if (filter === 'online') return statusOf(f) !== 'offline'
    if (filter === 'favoritos') return isFavorite(f)
    return true
  })
  const q = listQuery.trim().toLowerCase()
  const bySearch = q
    ? byFilter.filter(
        (f) => f.username.toLowerCase().includes(q) || (f.tag && f.tag.includes(q.replace('#', '')))
      )
    : byFilter

  const groups = { online: [], away: [], offline: [] }
  bySearch.forEach((f) => groups[statusOf(f)].push(f))

  const counts = {
    todos: friends.length,
    online: friends.filter((f) => statusOf(f) !== 'offline').length,
    favoritos: friends.filter((f) => isFavorite(f)).length,
  }

  const groupDefs = [
    { key: 'online', ...PRESENCE_META.online },
    { key: 'away', ...PRESENCE_META.away },
    { key: 'offline', label: 'Offline', dot: 'bg-zinc-500', emoji: '💤' },
  ]

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-24 pt-8 lg:pb-8">
        {/* header com convite + botão de adicionar */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight">👥 Amigos</h1>
          </div>
          <div className="flex items-center gap-2">
            <InviteChip />
            {!blocked && (
              <AddFriendMenu relationOf={relationOf} onAdd={onAdd} busyKey={busyKey} />
            )}
          </div>
        </header>

        <PresenceControl />

        {flash && (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-600 dark:text-emerald-300">
            {flash}
          </p>
        )}

        {blocked ? (
          <section className="rounded-3xl border border-dashed border-amber-400/40 bg-amber-400/5 p-6 text-center">
            <p className="text-3xl">🔧</p>
            <p className="mt-2 text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
              A tabela de amizades ainda não existe no banco
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
              Rode a <strong>Migração v4</strong> (está pronta no SETUP.md) no SQL Editor do Supabase
              e esta página ganha vida na hora — sem mexer em mais nada.
            </p>
          </section>
        ) : loading ? (
          <Spinner className="p-10" label="Carregando amizades…" />
        ) : (
          <>
            {/* pedidos pendentes */}
            {(incoming.length > 0 || outgoing.length > 0) && (
              <section className="grid gap-4 sm:grid-cols-2">
                {incoming.length > 0 && (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
                    <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                      📬 Pedidos recebidos ({incoming.length})
                    </h2>
                    <ul className="mt-3 space-y-3">
                      {incoming.map((f) => (
                        <li key={f.friendshipId} className="flex items-center gap-3">
                          <AvatarStatus name={f.username} status="offline" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                              {f.username}
                              {f.tag && <span className="font-mono text-zinc-400"> #{f.tag}</span>}
                            </p>
                            <p className="text-[11px] text-zinc-400">quer ser seu amigo</p>
                          </div>
                          <button
                            type="button"
                            disabled={busyKey === f.friendshipId}
                            onClick={() =>
                              doAction(
                                f.friendshipId,
                                () => accept(f.friendshipId),
                                `Você e ${f.username} agora são amigos! 🎉`
                              )
                            }
                            className="rounded-xl bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-600 transition hover:bg-cyan-500/25 disabled:opacity-50 dark:text-cyan-300"
                          >
                            Aceitar
                          </button>
                          <button
                            type="button"
                            disabled={busyKey === f.friendshipId}
                            onClick={() =>
                              doAction(f.friendshipId, () => remove(f.friendshipId), 'Pedido recusado.')
                            }
                            className={`${GHOST_BTN} hover:text-rose-500`}
                          >
                            Recusar
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {outgoing.length > 0 && (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
                    <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                      📤 Pedidos enviados ({outgoing.length})
                    </h2>
                    <ul className="mt-3 space-y-3">
                      {outgoing.map((f) => (
                        <li key={f.friendshipId} className="flex items-center gap-3">
                          <AvatarStatus name={f.username} status="offline" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                              {f.username}
                              {f.tag && <span className="font-mono text-zinc-400"> #{f.tag}</span>}
                            </p>
                            <p className="text-[11px] text-zinc-400">aguardando resposta…</p>
                          </div>
                          <button
                            type="button"
                            disabled={busyKey === f.friendshipId}
                            onClick={() =>
                              doAction(f.friendshipId, () => remove(f.friendshipId), 'Pedido cancelado.')
                            }
                            className={GHOST_BTN}
                          >
                            Cancelar
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* lista de amigos com filtros rápidos */}
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                  💙 Seus amigos
                </h2>
                <div className="flex items-center gap-2">
                  {totalUnread > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-500/20 active:scale-95 dark:text-emerald-300"
                    >
                      ✓ Marcar tudo como lido
                    </button>
                  )}
                  {/* busca na lista */}
                  {friends.length > 4 && (
                    <input
                      type="text"
                      value={listQuery}
                      onChange={(e) => setListQuery(e.target.value)}
                      placeholder="Filtrar por nome…"
                      className="w-40 rounded-xl border border-zinc-200 bg-transparent px-3 py-1.5 text-xs text-zinc-700 placeholder-zinc-400 outline-none transition focus:border-violet-500 dark:border-white/10 dark:text-zinc-200"
                    />
                  )}
                </div>
              </div>

              {/* chips de filtro rápido */}
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                      filter === f.id
                        ? 'border-violet-500/60 bg-violet-600/10 text-violet-600 dark:text-violet-300'
                        : 'border-zinc-200 text-zinc-500 hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {f.id === 'online' && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                    {f.id === 'favoritos' && <span className="text-amber-400">★</span>}
                    {f.label}
                    <span className="rounded-full bg-zinc-100 px-1.5 text-[10px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                      {counts[f.id]}
                    </span>
                  </button>
                ))}
              </div>

              {friends.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl">🌱</p>
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Nenhum amigo ainda — toque no <strong>+</strong> ali em cima para buscar, ou
                    copie sua identificação e mande pra alguém te adicionar.
                  </p>
                </div>
              ) : bySearch.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  Nada por aqui com esse filtro{q ? ' + busca' : ''}{' '}
                  {filter === 'favoritos' && '— toque na ⭐ de um amigo para favoritar.'}
                </p>
              ) : (
                <div className="mt-4 space-y-5">
                  {groupDefs.map((g) =>
                    groups[g.key].length > 0 ? (
                      <div key={g.key}>
                        <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500">
                          <span className={`h-2 w-2 rounded-full ${g.dot}`} />
                          {g.emoji} {g.label} ({groups[g.key].length})
                        </h3>
                        <ul className="mt-2 space-y-1">
                          {groups[g.key].map((f) => {
                            const fav = isFavorite(f)
                            return (
                              <li
                                key={f.friendshipId}
                                className="flex items-center gap-2.5 rounded-2xl px-2 py-2 transition hover:bg-zinc-50 sm:gap-3 dark:hover:bg-white/5"
                              >
                                <AvatarStatus name={f.username} status={statusOf(f)} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                                    {f.username}
                                    {f.tag && (
                                      <span className="font-mono text-zinc-400"> #{f.tag}</span>
                                    )}
                                  </p>
                                  <RoleBadge role={f.role} />
                                </div>

                                {/* ações */}
                                <Link
                                  to={`/chat/${f.userId}`}
                                  title={`Conversar com ${f.username}`}
                                  className="relative rounded-xl px-2 py-2 text-sm transition hover:bg-violet-600/10 active:scale-95"
                                >
                                  💬
                                  {(unreadByFriend[f.userId] ?? 0) > 0 && (
                                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow">
                                      {unreadByFriend[f.userId] > 9
                                        ? '9+'
                                        : unreadByFriend[f.userId]}
                                    </span>
                                  )}
                                </Link>
                                <button
                                  type="button"
                                  title={fav ? 'Remover dos favoritos' : 'Marcar como favorito'}
                                  disabled={busyKey === `fav:${f.userId}`}
                                  onClick={() => onToggleFav(f)}
                                  className={`rounded-xl px-2 py-2 text-base transition active:scale-90 disabled:opacity-40 ${
                                    fav
                                      ? 'text-amber-400'
                                      : favBlocked
                                        ? 'text-zinc-200 dark:text-zinc-700'
                                        : 'text-zinc-300 hover:text-amber-400 dark:text-zinc-600'
                                  }`}
                                >
                                  ★
                                </button>
                                <button
                                  type="button"
                                  disabled={busyKey === f.userId}
                                  onClick={() => removeWithConfirm(f)}
                                  className={`${GHOST_BTN} hidden hover:text-rose-500 sm:inline-flex`}
                                >
                                  Remover
                                </button>
                                {/* remover no mobile: ícone compacto */}
                                <button
                                  type="button"
                                  title="Remover amigo"
                                  disabled={busyKey === f.userId}
                                  onClick={() => removeWithConfirm(f)}
                                  className="rounded-xl px-2 py-2 text-sm text-zinc-400 transition hover:text-rose-500 sm:hidden"
                                >
                                  ✕
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
