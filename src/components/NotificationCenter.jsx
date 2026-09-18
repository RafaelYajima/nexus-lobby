import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUnread } from '../context/UnreadContext'
import { usePresence } from '../context/PresenceContext'
import { useFriends } from '../hooks/useFriends'
import { playMessageDing, playFriendOnlineChime } from '../lib/sound'

let toastSeq = 0

/**
 * Central de notificações (som + toasts visuais):
 *  - não-lidas SUBIU → ding 🔊 + toast 💬 (clique abre o chat)
 *  - amigo ENTROU online → chime + toast 🟢
 * Estado inicial não notifica (zero "chuva" ao abrir o app).
 */
export default function NotificationCenter() {
  const navigate = useNavigate()
  const { totalUnread, unreadByFriend } = useUnread()
  const { others } = usePresence()
  const { friends } = useFriends()
  const [toasts, setToasts] = useState([])

  const friendById = useMemo(() => Object.fromEntries(friends.map((f) => [f.userId, f])), [friends])
  const friendIds = useMemo(() => new Set(friends.map((f) => f.userId)), [friends])

  const prevUnread = useRef(null)
  const prevOnlineFriends = useRef(null)

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id))

  const pushToast = (toast) => {
    const id = ++toastSeq
    setToasts((t) => [...t, { ...toast, id }].slice(-3)) // no máx 3 na tela
    setTimeout(() => dismiss(id), 4500)
  }

  // 💬 mensagens: não-lidas cresceram → notifica
  useEffect(() => {
    if (prevUnread.current === null) {
      prevUnread.current = { total: totalUnread, by: unreadByFriend }
      return
    }
    if (totalUnread > (prevUnread.current?.total ?? 0)) {
      playMessageDing()
      const senderId = Object.keys(unreadByFriend).find(
        (k) => (unreadByFriend[k] ?? 0) > (prevUnread.current?.by?.[k] ?? 0)
      )
      const f = senderId ? friendById[senderId] : null
      pushToast({
        icon: '💬',
        title: f?.username ?? 'Mensagem nova',
        text: f ? `te mandou uma mensagem` : 'você tem algo pra ler 👀',
        onClick: senderId ? () => navigate(`/chat/${senderId}`) : null,
      })
    }
    prevUnread.current = { total: totalUnread, by: unreadByFriend }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalUnread, unreadByFriend])

  // 🟢 amigo entrou online → chime + toast
  useEffect(() => {
    const now = new Set()
    const onlineFriends = []
    for (const o of others) {
      if (friendIds.has(o.id)) {
        now.add(o.id)
        onlineFriends.push(o)
      }
    }
    const prev = prevOnlineFriends.current
    if (prev) {
      for (const o of onlineFriends) {
        if (!prev.has(o.id)) {
          playFriendOnlineChime()
          pushToast({
            icon: '🟢',
            title: `${o.username ?? 'Um amigo'} entrou online`,
            text: 'bora chamar pra uma sala ou conversar?',
            onClick: () => navigate(`/chat/${o.id}`),
          })
          break
        }
      }
    }
    prevOnlineFriends.current = now
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [others, friendIds])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-3 top-[4.25rem] z-50 flex w-[min(92vw,320px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="button"
          tabIndex={0}
          onClick={() => {
            t.onClick?.()
            dismiss(t.id)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              t.onClick?.()
              dismiss(t.id)
            }
          }}
          className="pointer-events-auto flex cursor-pointer items-start gap-2.5 rounded-2xl border border-violet-500/40 bg-white/95 px-3.5 py-3 text-left shadow-lg backdrop-blur transition hover:border-violet-400 dark:border-violet-400/30 dark:bg-ink-900/95"
        >
          <span className="text-lg leading-none">{t.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-extrabold text-zinc-900 dark:text-zinc-50">
              {t.title}
            </span>
            {t.text && (
              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">{t.text}</span>
            )}
          </span>
          <button
            type="button"
            aria-label="Fechar notificação"
            onClick={(e) => {
              e.stopPropagation()
              dismiss(t.id)
            }}
            className="text-xs text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
