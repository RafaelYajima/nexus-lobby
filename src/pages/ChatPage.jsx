import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import RoleBadge from '../components/RoleBadge'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { usePresence } from '../context/PresenceContext'
import { useUnread } from '../context/UnreadContext'
import { useFriends } from '../hooks/useFriends'
import { useChat } from '../hooks/useChat'
import { PRESENCE_META } from '../lib/presence'
import MessageList from '../components/chat/MessageList'
import ChatComposer from '../components/chat/ChatComposer'

/** 💬 Chat direto com um amigo. */
export default function ChatPage() {
  const { friendId } = useParams()
  const { user } = useAuth()
  const { profile } = useProfile()
  const { others } = usePresence()
  const { setActiveChat, markRead } = useUnread()
  const { friends, loading: friendsLoading } = useFriends()
  const friend = friends.find((f) => f.userId === friendId)
  const { messages, loading, blocked, err, send } = useChat(friendId)

  const boxRef = useRef(null)

  const presenceById = new Map(others.map((o) => [o.id, o.status]))
  const status = presenceById.get(friendId) ?? 'offline'
  const meta = PRESENCE_META[status] ?? PRESENCE_META.invisible

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'

  const byId = useMemo(() => {
    const me = { username, tag: profile?.tag ?? null, role: profile?.role ?? null }
    const map = {}
    if (user) map[user.id] = me
    if (friend) map[friendId] = { username: friend.username, tag: friend.tag, role: friend.role }
    return map
  }, [user, username, profile, friend, friendId])

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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-24 pt-5 sm:px-6 lg:pb-6">
        {/* header da conversa */}
        <div className="flex items-center gap-3">
          <Link
            to="/amigos"
            aria-label="Voltar para amigos"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-500 transition hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200 lg:hidden"
          >
            ←
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
                <p className="truncate text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                  @ {friend.username}
                  {friend.tag && <span className="font-mono text-zinc-400"> #{friend.tag}</span>}
                </p>
                <div className="flex items-center gap-2">
                  <RoleBadge role={friend.role} />
                  <span className={`text-[11px] font-semibold ${meta.text}`}>
                    {meta.emoji} {meta.label}
                  </span>
                </div>
              </div>

              {/* chamadas diretas — chegam num capítulo futuro 📞 */}
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  title="Chamada de voz — em breve 🎙️"
                  className="cursor-not-allowed rounded-xl border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-300 dark:border-white/10 dark:text-zinc-600"
                >
                  📞
                </button>
                <button
                  type="button"
                  disabled
                  title="Vídeo — em breve 🎥"
                  className="cursor-not-allowed rounded-xl border border-zinc-200 px-2.5 py-1.5 text-sm text-zinc-300 dark:border-white/10 dark:text-zinc-600"
                >
                  🎥
                </button>
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
            {/* mensagens — flat, sem card ao redor */}
            <div
              ref={boxRef}
              className="mt-4 min-h-[42vh] max-h-[56vh] flex-1 overflow-y-auto pr-1 lg:max-h-[68vh]"
            >
              {(loading || friendsLoading) && <Spinner className="p-8" />}
              {!loading && !friendsLoading && (
                <MessageList
                  messages={messages}
                  meId={user?.id}
                  byId={byId}
                  emptyIcon="👋"
                  emptyTitle={friend ? `Começo da conversa com ${friend.username}` : 'Conversa vazia'}
                  emptyHint="Mensagens diretas ficam só entre vocês dois 🔒 — manda aquele oi!"
                />
              )}
            </div>

            {/* compositor */}
            {friend && (
              <div className="mt-3">
                <ChatComposer
                  key={friendId}
                  placeholder={`Mensagem para ${friend.username}…`}
                  maxChars={1000}
                  onSend={send}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
