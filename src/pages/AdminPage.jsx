import { useEffect, useMemo, useState } from 'react'
import RoleBadge from '../components/RoleBadge'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { translateError } from '../utils/errors'

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IconShieldOff = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="4" y1="4" x2="20" y2="20" />
  </svg>
)

const ROLE_ORDER = { adm: 0, mod: 1, user: 2 }

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <p className={`text-2xl font-black sm:text-3xl ${accent}`}>{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
    </div>
  )
}

function Msg({ type, children }) {
  if (!children) return null
  const styles =
    type === 'error'
      ? 'border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
      : 'border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
  return <div className={`rounded-xl border p-3 text-xs font-medium ${styles}`}>{children}</div>
}

export default function AdminPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadUsers() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setError(translateError(error))
      setUsers([])
    } else {
      const sorted = [...(data ?? [])].sort((a, b) => {
        const r = (ROLE_ORDER[a.role] ?? 3) - (ROLE_ORDER[b.role] ?? 3)
        return r !== 0 ? r : new Date(b.created_at) - new Date(a.created_at)
      })
      setUsers(sorted)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '')
    if (!q) return users
    return users.filter(
      (u) => u.username?.toLowerCase().includes(q) || u.tag?.includes(q)
    )
  }, [users, query])

  const counts = useMemo(
    () => ({
      total: users.length,
      mods: users.filter((u) => u.role === 'mod').length,
      new7: users.filter((u) => Date.now() - new Date(u.created_at).getTime() < 7 * 864e5).length,
    }),
    [users]
  )

  async function changeRole(u, role) {
    setBusyId(u.id)
    setError('')
    setNotice('')
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id)
    setBusyId(null)
    if (error) {
      setError(translateError(error))
    } else {
      setNotice(
        role === 'mod'
          ? `${u.username} agora é MOD 🛡️`
          : `${u.username} voltou a ser jogador`
      )
      loadUsers()
    }
  }

  const fmtDate = (raw) =>
    raw
      ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
          new Date(raw)
        )
      : '—'

  return (
    <div className="relative min-h-screen bg-zinc-100 dark:bg-ink-950">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-[120px]" aria-hidden="true" />


      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:pb-16">
        {/* título */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2.5 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              <span aria-hidden="true">🛡️</span> Painel <span className="text-gradient">Admin</span>
            </h1>

          </div>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="rounded-xl border border-zinc-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-all hover:border-violet-400/50 hover:text-violet-600 active:scale-95 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:text-violet-300"
          >
            {loading ? 'Atualizando…' : '↻ Atualizar lista'}
          </button>
        </section>

        {/* estatísticas */}
        <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Jogadores no total" value={counts.total} accent="text-zinc-900 dark:text-white" />
          <StatCard label="Moderadores ativos" value={counts.mods} accent="text-cyan-500 dark:text-cyan-300" />
          <StatCard label="Novos nos últimos 7 dias" value={counts.new7} accent="text-violet-500 dark:text-violet-300" />
        </section>

        <Msg type="error">{error}</Msg>
        <div className="h-3" />
        <Msg type="success">{notice}</Msg>

        {/* busca + lista */}
        <section className="mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
          <div className="border-b border-zinc-100 p-4 dark:border-white/5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
                <IconSearch />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome de usuário ou tag (#5624)…"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all hover:border-zinc-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder-zinc-600 dark:hover:border-white/20 dark:focus:border-violet-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Spinner className="h-7 w-7 text-violet-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-12 text-center text-sm text-zinc-400 dark:text-zinc-500">
              Nenhum jogador encontrado{query && <> para “{query}”</>}.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-white/5">
              {filtered.map((u) => {
                const isMe = u.id === user.id
                const busy = busyId === u.id
                return (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/70 sm:px-5 dark:hover:bg-white/[0.02]"
                  >
                    {/* avatar + identidade */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white">
                        {(u.username || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-white">
                          <span className="truncate">{u.username || '—'}</span>
                          {u.tag && (
                            <span className="font-mono text-xs font-medium text-zinc-400 dark:text-zinc-500">
                              #{u.tag}
                            </span>
                          )}
                          <RoleBadge role={u.role} size="sm" />
                          {isMe && (
                            <span className="rounded-md bg-violet-500/10 px-1.5 py-px text-[9px] font-black uppercase tracking-widest text-violet-500 dark:text-violet-300">
                              Você
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                          Entrou em {fmtDate(u.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* ações */}
                    <div className="shrink-0">
                      {isMe ? (
                        <span className="text-[11px] italic text-zinc-400 dark:text-zinc-600">
                          seu papel é imutável por aqui 👑
                        </span>
                      ) : u.role === 'adm' ? (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-600">—</span>
                      ) : u.role === 'mod' ? (
                        <button
                          type="button"
                          onClick={() => changeRole(u, 'user')}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/70 px-3.5 py-2 text-xs font-bold text-rose-500 transition-all hover:bg-rose-500/10 active:scale-95 disabled:opacity-50 dark:border-rose-500/40 dark:text-rose-400"
                        >
                          {busy ? <Spinner className="h-3.5 w-3.5" /> : <IconShieldOff />}
                          Remover MOD
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => changeRole(u, 'mod')}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/50 px-3.5 py-2 text-xs font-bold text-cyan-600 transition-all hover:bg-cyan-500/10 active:scale-95 disabled:opacity-50 dark:text-cyan-300"
                        >
                          {busy ? <Spinner className="h-3.5 w-3.5" /> : <IconShield />}
                          Tornar MOD
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && filtered.length > 0 && (
            <p className="border-t border-zinc-100 px-4 py-3 text-[11px] text-zinc-400 sm:px-5 dark:border-white/5 dark:text-zinc-500">
              Mostrando {filtered.length} de {users.length} jogadores · alterações de papel valem
              na hora e são registradas no banco.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
