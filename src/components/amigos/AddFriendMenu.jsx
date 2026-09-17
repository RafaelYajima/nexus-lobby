import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { usePresence } from '../../context/PresenceContext'
import { PRESENCE_META } from '../../lib/presence'
import { translateError } from '../../utils/errors'
import RoleBadge from '../RoleBadge'

/**
 * Botão "+" que abre um menu suspenso com a busca "adicionar amigo".
 * Substitui o bloco de busca antigo — o corpo da página fica limpo.
 */
export default function AddFriendMenu({ relationOf, onAdd, busyKey }) {
  const { user } = useAuth()
  const { others } = usePresence()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const presenceById = new Map(others.map((o) => [o.id, o.status]))

  const close = () => {
    setOpen(false)
    setResults(null)
    setMsg('')
    setQuery('')
  }

  const search = async (e) => {
    e?.preventDefault()
    const q = query.trim().replace(/[,()]/g, '')
    if (q.length < 2) {
      setMsg('Digite pelo menos 2 caracteres. Dica: #tag exata também funciona (ex.: #0007).')
      setResults(null)
      return
    }
    setBusy(true)
    setMsg('')
    const conditions = [`username.ilike.%${q}%`]
    const digits = q.replace(/^#/, '')
    if (/^\d{1,4}$/.test(digits)) conditions.push(`tag.eq.${digits.padStart(4, '0')}`)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(conditions.join(','))
      .limit(8)
    if (error) {
      setMsg(`${translateError(error.message)} — confira se a Migração v4 foi rodada (SETUP.md).`)
      setResults(null)
    } else {
      const list = (data ?? []).filter((p) => p.id !== user.id)
      setResults(list)
      if (!list.length) setMsg('Ninguém encontrado. Tente o nome de usuário ou a #tag com 4 dígitos.')
    }
    setBusy(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Adicionar amigo"
        title="Adicionar amigo"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-xl font-black leading-none text-white shadow-neon-violet transition hover:bg-violet-500 active:scale-95"
      >
        +
      </button>

      {open && (
        <>
          {/* backdrop: clique fora fecha (mobile-friendly) */}
          <button
            type="button"
            aria-label="Fechar busca"
            onClick={close}
            className="fixed inset-0 z-30 cursor-default bg-transparent"
          />
          <div className="absolute right-0 z-40 mt-2 w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-ink-900 sm:w-96">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
                ➕ Adicionar amigo
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="text-sm font-bold text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={search} className="mt-3 flex gap-2">
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome de usuário ou #tag…"
                className="w-full rounded-xl border border-zinc-200 bg-transparent px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-white/10 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-xl bg-violet-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {busy ? '…' : 'Buscar'}
              </button>
            </form>

            {msg && (
              <p className="mt-2.5 text-xs text-zinc-400 dark:text-zinc-500">{msg}</p>
            )}

            {results && results.length > 0 && (
              <ul className="mt-3 max-h-64 divide-y divide-zinc-100 overflow-y-auto dark:divide-white/5">
                {results.map((p) => {
                  const rel = relationOf(p.id)
                  const status = presenceById.get(p.id) ?? 'offline'
                  const dot = PRESENCE_META[status]?.dot ?? 'bg-zinc-500'
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <span className="relative shrink-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500 to-zinc-700 text-xs font-black text-white dark:from-zinc-600 dark:to-zinc-800">
                          {(p.username || '?').slice(0, 1).toUpperCase()}
                        </span>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-ink-900 ${dot}`}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                          {p.username}
                          {p.tag && <span className="font-mono text-zinc-400"> #{p.tag}</span>}
                        </p>
                        <RoleBadge role={p.role} />
                      </div>
                      {rel === 'amigo' && (
                        <span className="text-xs font-bold text-emerald-500">✓ Amigo</span>
                      )}
                      {rel === 'enviado' && (
                        <span className="text-xs font-bold text-zinc-400">Enviado ✉️</span>
                      )}
                      {rel === 'recebido' && (
                        <span className="text-xs font-bold text-cyan-500">Enviou a você 📬</span>
                      )}
                      {!rel && (
                        <button
                          type="button"
                          disabled={busyKey === p.id}
                          onClick={() => onAdd(p)}
                          className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                        >
                          Adicionar
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
