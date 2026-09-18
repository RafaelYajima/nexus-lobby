import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import Spinner from '../components/Spinner'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { useRooms } from '../hooks/useRooms'
import { useRoomChat } from '../hooks/useRoomChat'
import { useQuizGame } from '../hooks/useQuizGame'
import QuizPanel from '../components/QuizPanel'
import { GAMES } from '../data/games'
import { dayLabel, timeLabel } from '../utils/time'

const gameOf = (id) => GAMES.find((g) => g.id === id)

/** Dentro da sala: membros (ao vivo) + chat do grupo. */
export default function RoomPage() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { join, leave } = useRooms()
  const { messages, loading: chatLoading, blocked: chatBlocked, send } = useRoomChat(roomId)

  const [room, setRoom] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [members, setMembers] = useState([]) // db-members decorados com perfil
  const [tab, setTab] = useState('chat') // 'chat' | 'quiz'
  const [inRoomNow, setInRoomNow] = useState(new Set()) // ids com a aba aberta na sala
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const boxRef = useRef(null)

  // quiz roda após os states (members precisa existir antes)
  const quiz = useQuizGame(roomId, members.length)
  const quizLive = !!quiz.game // partida rolando (para o badge pulsante da aba)

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'

  // sala + membership + presença dentro da sala
  useEffect(() => {
    if (!user || !roomId || !isSupabaseConfigured) return undefined
    let cancelled = false

    const boot = async () => {
      const { data: r, error } = await supabase.from('rooms').select('*').eq('id', roomId).single()
      if (cancelled) return
      if (error || !r) {
        setNotFound(true)
        setLoadingRoom(false)
        return
      }
      if (r.status !== 'open' && r.created_by !== user.id) {
        setNotFound(true)
        setLoadingRoom(false)
        return
      }
      setRoom(r)
      await join(roomId)

      const { data: ms } = await supabase.from('room_members').select('user_id').eq('room_id', roomId)
      const memberIds = [...new Set((ms ?? []).map((m) => m.user_id))]
      let profs = []
      if (memberIds.length) {
        const { data: ps } = await supabase
          .from('profiles')
          .select('id, username, tag, role')
          .in('id', memberIds)
        profs = ps ?? []
      }
      const byId = Object.fromEntries(profs.map((p) => [p.id, p]))
      if (!cancelled) {
        setMembers(memberIds.map((id) => ({ id, ...(byId[id] ?? {}) })))
        setLoadingRoom(false)
      }
    }
    boot()

    // quem está com a sala aberta agora (presença própria do app = 1 track por conexão ✓)
    const ch = supabase.channel(`sala:presenca:${roomId}`, { config: { presence: { key: user.id } } })
    ch.on('presence', { event: 'sync' }, () => {
      const ids = new Set(Object.keys(ch.presenceState()))
      setInRoomNow(ids)
    }).subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ username, tag: profile?.tag ?? null, role: profile?.role ?? 'user' })
      }
    })

    return () => {
      cancelled = true
      supabase.removeChannel(ch)
      leave(roomId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomId])

  // rola pro fim do chat
  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const memberById = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members]
  )

  const sortedMembers = useMemo(() => {
    const copy = [...members]
    copy.sort((a, b) => {
      const hostA = a.id === room?.created_by ? 0 : 1
      const hostB = b.id === room?.created_by ? 0 : 1
      if (hostA !== hostB) return hostA - hostB
      const inA = inRoomNow.has(a.id) ? 0 : 1
      const inB = inRoomNow.has(b.id) ? 0 : 1
      return inA - inB
    })
    return copy
  }, [members, inRoomNow, room])

  const submit = async (e) => {
    e?.preventDefault()
    if (sending || !draft.trim()) return
    setSending(true)
    setSendErr('')
    const res = await send(draft)
    setSending(false)
    if (res.ok) setDraft('')
    else setSendErr(res.message)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const game = gameOf(room?.game_id)

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        {/* header da sala */}
        <div className="flex items-center gap-3">
          <Link
            to="/salas"
            aria-label="Voltar para salas"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-500 transition hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Salas
          </Link>
          {room ? (
            <>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-lg shadow ${
                  game?.accent ?? 'from-zinc-500 to-zinc-700'
                }`}
              >
                {game?.emoji ?? '🎮'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                  {room.name}
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {game?.name ?? room.game_id}
                  {room.created_by === user?.id && ' · sala sua 👑'}
                </p>
              </div>
              <span className="ml-auto rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                🟢 {inRoomNow.size} na sala
              </span>
            </>
          ) : loadingRoom ? (
            <Spinner className="p-2" />
          ) : null}
        </div>

        {notFound && !loadingRoom ? (
          <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-ink-900">
            <p className="text-3xl">🚪</p>
            <p className="mt-2 text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
              Essa sala não existe (ou foi fechada)
            </p>
            <Link
              to="/salas"
              className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
            >
              Ver salas abertas
            </Link>
          </section>
        ) : (
          <div className="mt-4 grid flex-1 gap-4 sm:grid-cols-[240px_1fr]">
            {/* membros */}
            <aside className="order-2 rounded-3xl border border-zinc-200 bg-white p-4 shadow-soft sm:order-1 dark:border-white/10 dark:bg-ink-900">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                👥 Membros ({members.length})
              </h2>
              <ul className="mt-3 space-y-1.5">
                {sortedMembers.map((m) => {
                  const inRoom = inRoomNow.has(m.id)
                  const isMe = m.id === user?.id
                  const isHost = m.id === room?.created_by
                  return (
                    <li key={m.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                      <span className="relative shrink-0">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-white ${
                            isMe
                              ? 'bg-gradient-to-br from-violet-600 to-fuchsia-500'
                              : 'bg-gradient-to-br from-zinc-500 to-zinc-700 dark:from-zinc-600 dark:to-zinc-800'
                          }`}
                        >
                          {(m.username || '?').slice(0, 1).toUpperCase()}
                        </span>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-ink-900 ${
                            inRoom ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`}
                        />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700 dark:text-zinc-200">
                        {m.username ?? 'jogador'}
                        {m.tag && <span className="font-mono text-zinc-400"> #{m.tag}</span>}
                        {isMe && <span className="text-zinc-400"> (você)</span>}
                      </p>
                      {isHost && <span title="Dono da sala">👑</span>}
                    </li>
                  )
                })}
              </ul>
            </aside>

            {/* chat / quiz */}
            <section className="order-1 flex flex-col sm:order-2">
              {/* abas */}
              <div className="mb-3 inline-flex items-center self-start rounded-2xl border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-ink-900">
                <button
                  type="button"
                  onClick={() => setTab('chat')}
                  className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                    tab === 'chat'
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  💬 Chat
                </button>
                <button
                  type="button"
                  onClick={() => setTab('quiz')}
                  className={`relative rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                    tab === 'quiz'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  ⚡ Quiz
                  {quizLive && tab !== 'quiz' && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                    </span>
                  )}
                </button>
              </div>

              {tab === 'quiz' ? (
                <QuizPanel quiz={quiz} members={members} />
              ) : (
                <>
                  <div
                ref={boxRef}
                className="min-h-[42vh] flex-1 space-y-2 overflow-y-auto rounded-3xl border border-zinc-200 bg-white/70 p-4 shadow-soft-inner max-h-[58vh] dark:border-white/10 dark:bg-white/[0.03]"
              >
                {(chatLoading || loadingRoom) && <Spinner className="p-8" />}
                {chatBlocked && (
                  <div className="py-12 text-center">
                    <p className="text-3xl">🔧</p>
                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                      O chat da sala precisa das <strong>Migrações v8 + v13</strong> (SETUP.md).
                    </p>
                  </div>
                )}
                {!chatLoading && !chatBlocked && messages.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-3xl">🗨️</p>
                    <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                      Sala silenciosa… quebra o gelo aí!
                    </p>
                  </div>
                )}
                {(() => {
                  let lastDay = ''
                  return messages.map((m) => {
                    const mine = m.sender_id === user?.id
                    const author = memberById[m.sender_id]
                    const day = new Date(m.created_at).toDateString()
                    const showSep = day !== lastDay
                    lastDay = day
                    return (
                      <div key={m.id}>
                        {showSep && (
                          <p className="pb-1 pt-3 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 first:pt-0">
                            {dayLabel(m.created_at)}
                          </p>
                        )}
                        <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] ${
                              mine ? '' : 'min-w-[7rem]'
                            }`}
                          >
                            {!mine && (
                              <p className="mb-0.5 pl-1.5 text-[10px] font-bold text-violet-500 dark:text-violet-300">
                                {author?.username ?? 'jogador'}
                                {author?.tag && (
                                  <span className="font-mono font-normal text-zinc-400">
                                    {' '}#{author.tag}
                                  </span>
                                )}
                              </p>
                            )}
                            <div
                              className={`rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                                mine
                                  ? 'rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white'
                                  : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              <p
                                className={`mt-0.5 text-right text-[10px] ${
                                  mine ? 'text-white/60' : 'text-zinc-400'
                                }`}
                              >
                                {timeLabel(m.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>

              {/* compositor */}
              {room && (
                <form onSubmit={submit} className="mt-3">
                  {sendErr && <p className="mb-2 text-xs text-rose-500">{sendErr}</p>}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      rows={1}
                      placeholder="Mensagem para a sala…"
                      className="max-h-32 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 placeholder-zinc-400 shadow-soft outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-white/10 dark:bg-ink-900 dark:text-zinc-100"
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      aria-label="Enviar mensagem"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-lg text-white shadow-neon-violet transition hover:bg-violet-500 active:scale-95 disabled:opacity-40 disabled:shadow-none"
                    >
                      ➤
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                    Enter envia · Shift+Enter quebra linha · até 500 caracteres
                  </p>
                </form>
              )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
