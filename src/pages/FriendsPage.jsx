import { useState } from 'react'
import AppHeader from '../components/AppHeader'
import Spinner from '../components/Spinner'
import RoleBadge from '../components/RoleBadge'
import PresenceControl from '../components/presence/PresenceControl'
import { useAuth } from '../context/AuthContext'
import { usePresence } from '../context/PresenceContext'
import { useFriends } from '../hooks/useFriends'
import { supabase } from '../lib/supabaseClient'
import { PRESENCE_META } from '../lib/presence'
import { translateError } from '../utils/errors'

const INPUT_CLASSES =
  'w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 shadow-soft-inner outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-white/10 dark:text-zinc-100'

const GHOST_BTN =
  'rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-bold text-zinc-500 transition hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200'

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

/** Página 👥 Amigos: status pessoal, pedidos, busca e lista de amigos. */
export default function FriendsPage() {
  const { user } = useAuth()
  const { others } = usePresence()
  const {
    friends,
    incoming,
    outgoing,
    blocked,
    loading,
    sendRequest,
    accept,
    remove,
  } = useFriends()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchMsg, setSearchMsg] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [flash, setFlash] = useState('')

  const presenceById = new Map(others.map((o) => [o.id, o.status]))
  const statusOf = (f) => presenceById.get(f.userId) ?? 'offline'

  const groups = { online: [], away: [], offline: [] }
  friends.forEach((f) => groups[statusOf(f)].push(f))

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
    setFlash(res?.ok === false ? res.message : successMsg)
  }

  const search = async (e) => {
    e?.preventDefault()
    const q = query.trim().replace(/[,()]/g, '')
    if (q.length < 2) {
      setSearchMsg('Digite pelo menos 2 caracteres. Dica: #tag exata também funciona (ex.: #0007).')
      setResults(null)
      return
    }
    setSearchBusy(true)
    setSearchMsg('')
    const conditions = [`username.ilike.%${q}%`]
    const digits = q.replace(/^#/, '')
    if (/^\d{1,4}$/.test(digits)) conditions.push(`tag.eq.${digits.padStart(4, '0')}`)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(conditions.join(','))
      .limit(8)
    if (error) {
      setSearchMsg(`${translateError(error.message)} — confira se a Migração v4 foi rodada (SETUP.md).`)
      setResults(null)
    } else {
      const list = (data ?? []).filter((p) => p.id !== user.id)
      setResults(list)
      if (!list.length) setSearchMsg('Ninguém encontrado. Tente o nome de usuário ou a #tag com 4 dígitos.')
    }
    setSearchBusy(false)
  }

  const removeWithConfirm = (f) => {
    const label = f.statusLabel ?? f.username
    if (window.confirm(`Remover ${label} dos seus amigos?`)) {
      doAction(f.userId, () => remove(f.friendshipId), `${f.username} removido dos amigos.`)
    }
  }

  const groupDefs = [
    { key: 'online', ...PRESENCE_META.online },
    { key: 'away', ...PRESENCE_META.away },
    { key: 'offline', label: 'Offline', dot: 'bg-zinc-500', emoji: '⚫' },
  ]

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
        <header>
          <h1 className="font-display text-2xl font-black tracking-tight">👥 Amigos</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Seu círculo, seu status. Ninguém de fora vê quando você está online.
          </p>
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
                              doAction(f.friendshipId, () => accept(f.friendshipId), `Você e ${f.username} agora são amigos! 🎉`)
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

            {/* busca */}
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                ➕ Adicionar amigo
              </h2>
              <form onSubmit={search} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nome de usuário ou #tag…"
                  className={INPUT_CLASSES}
                />
                <button
                  type="submit"
                  disabled={searchBusy}
                  className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {searchBusy ? 'Buscando…' : 'Buscar'}
                </button>
              </form>
              {searchMsg && (
                <p className="mt-2.5 text-xs text-zinc-400 dark:text-zinc-500">{searchMsg}</p>
              )}
              {results && results.length > 0 && (
                <ul className="mt-3 divide-y divide-zinc-100 dark:divide-white/5">
                  {results.map((p) => {
                    const rel = relationOf(p.id)
                    return (
                      <li key={p.id} className="flex items-center gap-3 py-3">
                        <AvatarStatus name={p.username} status={presenceById.get(p.id) ?? 'offline'} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                            {p.username}
                            {p.tag && <span className="font-mono text-zinc-400"> #{p.tag}</span>}
                          </p>
                          <div className="mt-0.5">
                            <RoleBadge role={p.role} />
                          </div>
                        </div>
                        {rel === 'amigo' && (
                          <span className="text-xs font-bold text-emerald-500">✓ Já é amigo</span>
                        )}
                        {rel === 'enviado' && (
                          <span className="text-xs font-bold text-zinc-400">Pedido enviado ✉️</span>
                        )}
                        {rel === 'recebido' && (
                          <span className="text-xs font-bold text-cyan-500">Te mandou pedido 📬</span>
                        )}
                        {!rel && (
                          <button
                            type="button"
                            disabled={busyKey === p.id}
                            onClick={() =>
                              doAction(p.id, () => sendRequest(p.id), `Pedido enviado para ${p.username} ✉️`)
                            }
                            className="rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                          >
                            Adicionar
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* lista de amigos */}
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                💙 Seus amigos ({friends.length})
              </h2>
              {friends.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-3xl">🌱</p>
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Nenhum amigo ainda. Use a busca acima e chame a galera pra criar contas!
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-5">
                  {groupDefs.map((g) =>
                    groups[g.key].length > 0 ? (
                      <div key={g.key}>
                        <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500">
                          <span className={`h-2 w-2 rounded-full ${g.dot}`} />
                          {g.emoji === '⚫' ? '💤' : g.emoji} {g.label} ({groups[g.key].length})
                        </h3>
                        <ul className="mt-2 space-y-2.5">
                          {groups[g.key].map((f) => (
                            <li
                              key={f.friendshipId}
                              className="flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                            >
                              <AvatarStatus name={f.username} status={statusOf(f)} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                                  {f.username}
                                  {f.tag && <span className="font-mono text-zinc-400"> #{f.tag}</span>}
                                </p>
                                <RoleBadge role={f.role} />
                              </div>
                              <button
                                type="button"
                                disabled={busyKey === f.userId}
                                onClick={() => removeWithConfirm(f)}
                                className={`${GHOST_BTN} hover:text-rose-500`}
                              >
                                Remover
                              </button>
                            </li>
                          ))}
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
