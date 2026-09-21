import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import RoleBadge from '../components/RoleBadge'
import { useAuth } from '../context/AuthContext'
import { usePresence } from '../context/PresenceContext'
import { useUnread } from '../context/UnreadContext'
import { useFriends } from '../hooks/useFriends'
import { useChat } from '../hooks/useChat'
import { PRESENCE_META } from '../lib/presence'

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso) {
  const d = new Date(iso)
  const now = new Date()
  const ontem = new Date(now)
  ontem.setDate(ontem.getDate() - 1)
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, now)) return 'Hoje'
  if (sameDay(d, ontem)) return 'Ontem'
  return d.toLocaleDateString('pt-BR')
}

/** 💬 Chat direto com um amigo. */
export default function ChatPage() {
  const { friendId } = useParams()
  const { user } = useAuth()
  const { others } = usePresence()
  const { setActiveChat, markRead } = useUnread()
  const { friends, loading: friendsLoading } = useFriends()
  const friend = friends.find((f) => f.userId === friendId)
  const { messages, loading, blocked, err, send } = useChat(friendId)

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState('')
  const boxRef = useRef(null)

  const presenceById = new Map(others.map((o) => [o.id, o.status]))
  const status = presenceById.get(friendId) ?? 'offline'
  const meta = PRESENCE_META[status] ?? PRESENCE_META.invisible

  // rola pro fim quando chega mensagem
  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // marca lida ao entrar, ao receber (chat aberto) e ao sair
  useEffect(() => {
    if (!friend) return undefined
    setActiveChat(friendId)
    markRead(friendId)
    return () => {
      setActiveChat(null)
      markRead(friendId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId, friend])

  useEffect(() => {
    if (friend && messages.length > 0) markRead(friendId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, friend, friendId])

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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-24 pt-6 lg:pb-6">
        {/* header do chat */}
        <div className="flex items-center gap-3">
          <Link
            to="/amigos"
            aria-label="Voltar para amigos"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-500 transition hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Amigos
          </Link>

          {friendsLoading ? (
            <Spinner className="p-2" />
          ) : friend ? (
            <>
              <span className="relative shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-sm font-black text-white">
                  {(friend.username || '?').slice(0, 1).toUpperCase()}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-100 dark:border-ink-950 ${meta.dot}`}
                />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
                  {friend.username}
                  {friend.tag && <span className="font-mono text-zinc-400"> #{friend.tag}</span>}
                </p>
                <div className="flex items-center gap-2">
                  <RoleBadge role={friend.role} />
                  <span className={`text-[11px] font-semibold ${meta.text}`}>
                    {meta.emoji} {meta.label}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-400">amigo não encontrado</p>
          )}
        </div>

        {/* corpo */}
        {blocked ? (
          <section className="mt-6 rounded-3xl border border-dashed border-amber-400/40 bg-amber-400/5 p-6 text-center">
            <p className="text-3xl">🔧</p>
            <p className="mt-2 text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
              O chat ainda não foi ativado no banco
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
              Rode a <strong>Migração v6</strong> (SETUP.md) no SQL Editor do Supabase e a conversa
              começa. {err && <span className="block mt-1 opacity-70">({err})</span>}
            </p>
          </section>
        ) : !friendsLoading && !friend ? (
          <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-soft dark:border-white/10 dark:bg-ink-900">
            <p className="text-3xl">🚧</p>
            <p className="mt-2 text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
              Vocês ainda não são amigos
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Conversa direta é só entre amigos — adicione a pessoa primeiro.
            </p>
            <Link
              to="/amigos"
              className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
            >
              Ir para Amigos
            </Link>
          </section>
        ) : (
          <>
            {/* mensagens */}
            <div
              ref={boxRef}
              className="mt-4 min-h-[42vh] flex-1 space-y-2 overflow-y-auto rounded-3xl border border-zinc-200 bg-white/70 p-4 shadow-soft-inner max-h-[58vh] dark:border-white/10 dark:bg-white/[0.03]"
            >
              {(loading || friendsLoading) && <Spinner className="p-8" />}
              {!loading && !friendsLoading && messages.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-3xl">👋</p>
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Nenhuma mensagem ainda. Manda aquele "oi"!
                  </p>
                </div>
              )}
              {(() => {
                let lastDay = ''
                return messages.map((m) => {
                  const mine = m.sender_id === user?.id
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
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[70%] ${
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
                  )
                })
              })()}
            </div>

            {/* compositor */}
            {friend && (
              <form onSubmit={submit} className="mt-3">
                {sendErr && <p className="mb-2 text-xs text-rose-500">{sendErr}</p>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    placeholder={`Mensagem para ${friend.username}…`}
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
                  Enter envia · Shift+Enter quebra linha · até 1000 caracteres
                </p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  )
}
