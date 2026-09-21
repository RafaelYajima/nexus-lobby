import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../hooks/useRooms'

const INPUT_CLASSES =
  'w-full rounded-xl border border-zinc-200 bg-transparent px-4 py-2.5 text-sm text-zinc-800 placeholder-zinc-400 shadow-soft-inner outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-white/10 dark:text-zinc-100'

/** Identidade "extra" do servidor (espaço reservado p quando os jogos voltarem). */
const SERVER_GAME_ID = 'server'

/** 🏰 Servidores — criar e entrar (canais de texto por enquanto; voz chega no capítulo 2). */
export default function RoomsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { rooms, blocked, loading, create, close } = useRooms()
  const [name, setName] = useState('')
  const gameId = SERVER_GAME_ID
  const [busy, setBusy] = useState(false)
  const [busyRoom, setBusyRoom] = useState('')
  const [flash, setFlash] = useState('')

  const submit = async (e) => {
    e?.preventDefault()
    if (busy) return
    setBusy(true)
    setFlash('')
    const res = await create({ name, gameId })
    setBusy(false)
    if (!res.ok) {
      setFlash(res.message)
      return
    }
    setName('')
    navigate(`/salas/${res.room.id}`)
  }

  const onClose = async (roomId) => {
    if (!window.confirm('Fechar este servidor? Ele sai da lista para todo mundo.')) return
    setBusyRoom(roomId)
      const res = await close(roomId)
      setBusyRoom('')
      setFlash(res.ok ? 'Servidor fechado.' : res.message)
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-24 pt-8 lg:pb-8">
        <h1 className="font-display text-2xl font-black tracking-tight">🏰 Servidores</h1>

        {flash && (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-600 dark:text-emerald-300">
            {flash}
          </p>
        )}

        {blocked ? (
          <section className="rounded-3xl border border-dashed border-amber-400/40 bg-amber-400/5 p-6 text-center">
            <p className="text-3xl">🔧</p>
            <p className="mt-2 text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
              Os servidores ainda não foram ativados no banco
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
              Rode a <strong>Migração v8</strong> (SETUP.md) no SQL Editor do Supabase e volte —
              crie e entre em servidores na hora.
            </p>
          </section>
        ) : (
          <>
            {/* criar servidor */}
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                ➕ Criar servidor
              </h2>
              <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do servidor (ex.: a casa da galera)"
                  maxLength={40}
                  className={INPUT_CLASSES}
                />
                <button
                  type="submit"
                  disabled={busy || name.trim().length < 2}
                  className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {busy ? 'Criando…' : 'Criar'}
                </button>
              </form>
              <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                Servidores são públicos por enquanto — convites privados chegam num próximo
                capítulo. Quem entra já pode conversar no texto; 🎙️ voz vem logo depois.
              </p>
            </section>

            {/* lista */}
            <section>
              <h2 className="mb-3 text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                🚪 Servidores abertos ({rooms.length})
              </h2>
              {loading ? (
                <Spinner className="p-8" />
              ) : rooms.length === 0 ? (
                <div className="rounded-3xl border border-zinc-200 bg-white py-12 text-center shadow-soft dark:border-white/10 dark:bg-ink-900">
                  <p className="text-3xl">🏝️</p>
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Nenhum servidor aberto ainda — crie o primeiro e chame a galera!
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {rooms.map((room) => {
                    const mine = room.created_by === user?.id
                    return (
                      <div
                        key={room.id}
                        className="group rounded-3xl border border-zinc-200 bg-white p-4 shadow-soft transition hover:border-violet-400/60 hover:shadow-violet-500/5 dark:border-white/10 dark:bg-ink-900"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-xl shadow">
                            🏰
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                              {room.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-zinc-400 dark:text-zinc-500">
                              Servidor · por{' '}
                              {mine
                                ? 'você'
                                : `${room.host?.username ?? 'jogador'}${room.host?.tag ? ` #${room.host.tag}` : ''}`}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Link
                            to={`/salas/${room.id}`}
                            className="flex-1 rounded-xl bg-violet-600 px-3.5 py-2 text-center text-xs font-bold text-white transition hover:bg-violet-500 active:scale-95"
                          >
                            Entrar →
                          </Link>
                          {mine && (
                            <button
                              type="button"
                              disabled={busyRoom === room.id}
                              onClick={() => onClose(room.id)}
                              className="rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-bold text-zinc-500 transition hover:border-rose-300 hover:text-rose-500 disabled:opacity-50 dark:border-white/10 dark:text-zinc-400"
                            >
                              Fechar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
