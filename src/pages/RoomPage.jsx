import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { useRooms } from '../hooks/useRooms'
import { useRoomChat } from '../hooks/useRoomChat'
import { useRoomChannels } from '../hooks/useRoomChannels'
import { useQuizGame } from '../hooks/useQuizGame'
import QuizPanel from '../components/QuizPanel'
import MessageList from '../components/chat/MessageList'
import ChatComposer from '../components/chat/ChatComposer'
import { GAMES } from '../data/games'

const gameOf = (id) => GAMES.find((g) => g.id === id)

// 🧊 pivot Discord: Quiz fica escondido por ora (volta como extra num capítulo futuro)
const QUIZ_ENABLED = false

/** Dentro do servidor: canal de texto com membros ao vivo ao lado (voz: chega no cap.2). */
export default function RoomPage() {
  const { roomId, channelId } = useParams()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { join, leave } = useRooms()
  const { channels, available: channelsAvailable } = useRoomChannels(roomId)

  // canal ativo: o da URL, senão o primeiro de texto, senão "geral" implícito (v14 pendente)
  const activeChannel = useMemo(() => {
    if (!channelsAvailable) return { id: null, type: 'text', name: 'geral' }
    return (
      channels.find((c) => c.id === channelId) ??
      channels.find((c) => c.type === 'text') ??
      null
    )
  }, [channelsAvailable, channels, channelId])
  const inVoice = activeChannel?.type === 'voice'

  const { messages, loading: chatLoading, blocked: chatBlocked, send } = useRoomChat(
    roomId,
    inVoice ? '__none__' : (activeChannel?.id ?? undefined)
  )

  const [room, setRoom] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loadingRoom, setLoadingRoom] = useState(true)
  const [members, setMembers] = useState([]) // db-members decorados com perfil
  const [tab, setTab] = useState('chat') // 'chat' | 'quiz'
  const [inRoomNow, setInRoomNow] = useState(new Set()) // ids com a aba aberta na sala
  const [showMembers, setShowMembers] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const boxRef = useRef(null)

  // quiz roda após os states (members precisa existir antes)
  const quiz = useQuizGame(roomId, members.length)
  const quizLive = QUIZ_ENABLED && !!quiz.game // badge pulsante da aba (quando o quiz voltar)

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

  const game = gameOf(room?.game_id)

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-24 pt-5 sm:px-6 lg:pb-6">
        {/* header do canal — estilo Discord (# canal + contexto) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/salas"
            aria-label="Voltar para servidores"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-500 transition hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200 lg:hidden"
          >
            ←
          </Link>
          {room ? (
            <>
              <div className="flex min-w-0 items-baseline gap-2">
                <p className="truncate text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                  {inVoice ? '🔊' : '💬'} {activeChannel?.name ?? 'geral'}
                </p>
                <p className="hidden truncate text-xs text-zinc-400 sm:inline dark:text-zinc-500">
                  · {room.name} · {game?.name ?? 'Servidor de texto'}
                  {room.created_by === user?.id && ' · servidor seu 👑'}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  🟢 {inRoomNow.size} online aqui
                </span>
                {room.created_by === user?.id && (
                  <Link
                    to={`/salas/${roomId}/config`}
                    aria-label="Configurar servidor"
                    title="Configurar servidor"
                    className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-violet-400/60 hover:text-violet-500 dark:border-white/10"
                  >
                    ⚙️
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setShowMembers((v) => !v)}
                  aria-label={showMembers ? 'Esconder lista de membros' : 'Mostrar lista de membros'}
                  aria-pressed={showMembers}
                  title={showMembers ? 'Esconder membros' : 'Mostrar membros'}
                  className={`rounded-xl border px-3 py-1.5 text-sm transition ${
                    showMembers
                      ? 'border-violet-400/60 bg-violet-500/10 text-violet-600 dark:text-violet-300'
                      : 'border-zinc-200 text-zinc-400 hover:text-zinc-600 dark:border-white/10 dark:hover:text-zinc-200'
                  }`}
                >
                  👥
                </button>
              </div>
            </>
          ) : loadingRoom ? (
            <Spinner className="p-2" />
          ) : null}
        </div>

        {notFound && !loadingRoom ? (
          <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-ink-900">
            <p className="text-3xl">🚪</p>
            <p className="mt-2 text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
              Esse servidor não existe (ou foi fechado)
            </p>
            <Link
              to="/salas"
              className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
            >
              Ver servidores abertos
            </Link>
          </section>
        ) : (
          <div className="mt-3 flex flex-1 flex-col gap-4 lg:flex-row lg:gap-5">
            {/* coluna do chat */}
            <section className="flex min-w-0 flex-1 flex-col">
              {QUIZ_ENABLED && (
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
              )}

              {inVoice ? (
                /* 🔮 cap.2: quadro do canal de voz (entrar/sair, mutar, quem tá falando) */
                <div className="flex min-h-[42vh] flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-400/40 bg-emerald-400/5 p-10 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl shadow">
                    🔊
                  </span>
                  <p className="mt-4 text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                    Canal de voz <span className="text-emerald-500">{activeChannel?.name}</span>
                  </p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
                    Aqui você vai <strong>entrar, mutar 🎙️ e ver quem tá falando</strong> ao vivo —
                    com WebRTC próprio e zero custo. Chega no próximo capítulo!
                  </p>
                  <span className="mt-4 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    em breve — cap. 2
                  </span>
                </div>
              ) : QUIZ_ENABLED && tab === 'quiz' ? (
                <QuizPanel quiz={quiz} members={members} />
              ) : (
                <>
                  {/* mensagens — flat, sem card ao redor */}
                  <div
                    ref={boxRef}
                    className="min-h-[42vh] max-h-[56vh] flex-1 overflow-y-auto pr-1 lg:max-h-[68vh]"
                  >
                    {(chatLoading || loadingRoom) && <Spinner className="p-8" />}
                    {chatBlocked && (
                      <div className="py-12 text-center">
                        <p className="text-3xl">🔧</p>
                        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                          O chat deste servidor precisa das <strong>Migrações v8 + v13</strong> (SETUP.md).
                        </p>
                      </div>
                    )}
                    {!chatLoading && !chatBlocked && (
                      <MessageList
                        messages={messages}
                        meId={user?.id}
                        byId={memberById}
                        emptyIcon="💬"
                        emptyTitle={`Bem-vindo(a) ao #${activeChannel?.name ?? 'geral'}!`}
                        emptyHint="Este é o começo deste canal de texto. Manda a primeira mensagem e quebra o gelo."
                      />
                    )}
                  </div>

                  {/* compositor */}
                  {room && (
                    <div className="mt-3">
                      <ChatComposer
                        key={`${roomId}:${activeChannel?.id ?? 'geral'}`}
                        placeholder={`Mensagem em #${activeChannel?.name ?? 'geral'}`}
                        maxChars={500}
                        onSend={send}
                      />
                    </div>
                  )}
                </>
              )}
            </section>

            {/* membros — toggle pelo 👥 do header */}
            {showMembers && (
              <aside className="order-first shrink-0 lg:order-none lg:w-56 lg:border-l lg:border-zinc-200 lg:pl-4 dark:lg:border-white/10">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Membros — {members.length}
                </h2>
                <ul className="mt-3 space-y-0.5">
                  {sortedMembers.map((m) => {
                    const inRoom = inRoomNow.has(m.id)
                    const isMe = m.id === user?.id
                    const isHost = m.id === room?.created_by
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                      >
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
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-100 dark:border-ink-950 ${
                              inRoom ? 'bg-emerald-500' : 'bg-zinc-400'
                            }`}
                          />
                        </span>
                        <p className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-700 dark:text-zinc-200">
                          {m.username ?? 'jogador'}
                          {m.tag && <span className="font-mono text-zinc-400"> #{m.tag}</span>}
                          {isMe && <span className="text-zinc-400"> (você)</span>}
                        </p>
                        {isHost && <span title="Dono do servidor">👑</span>}
                      </li>
                    )
                  })}
                </ul>
              </aside>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
