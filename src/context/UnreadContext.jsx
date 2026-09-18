import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const UnreadContext = createContext(null)

/**
 * Contadores de mensagens não lidas (tabela `chat_reads` — Migração v7).
 *  - na entrada: conta o backlog (recebidas depois da última leitura)
 *  - ao vivo: Realtime INSERT em direct_messages incrementa na hora
 *  - ChatPage chama setActiveChat(friendId): mensagens do chat aberto
 *    NÃO contam (já estão sendo lidas) e markRead zera o contador
 *  - v7 pendente → indisponível silencioso: tudo zero, nada quebra
 */
export function UnreadProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id

  const [available, setAvailable] = useState(true)
  const [unreadByFriend, setUnreadByFriend] = useState({}) // friendId -> nº não lidas
  const activeChatRef = useRef(null)

  const setActiveChat = useCallback((friendId) => {
    activeChatRef.current = friendId
  }, [])

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return undefined
    let cancelled = false

    const load = async () => {
      const { data: reads, error: readsErr } = await supabase
        .from('chat_reads')
        .select('other_user_id, last_read_at')
      if (cancelled) return
      if (readsErr) {
        setAvailable(false)
        return
      }
      setAvailable(true)
      const readMap = Object.fromEntries((reads ?? []).map((r) => [r.other_user_id, r.last_read_at]))

      const { data: ms, error: msErr } = await supabase
        .from('direct_messages')
        .select('sender_id, created_at')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(800)
      if (cancelled || msErr) return

      const counts = {}
      for (const m of ms ?? []) {
        const last = readMap[m.sender_id]
        if (!last || m.created_at > last) counts[m.sender_id] = (counts[m.sender_id] ?? 0) + 1
      }
      setUnreadByFriend(counts)
    }

    load()

    const channel = supabase
      .channel('unread:dm')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        ({ new: m }) => {
          if (m.recipient_id !== userId) return
          if (activeChatRef.current === m.sender_id) return // chat aberto: ChatPage marca lida
          setUnreadByFriend((prev) => ({
            ...prev,
            [m.sender_id]: (prev[m.sender_id] ?? 0) + 1,
          }))
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markRead = useCallback(
    async (friendId) => {
      if (!userId || !friendId) return
      setUnreadByFriend((prev) => ({ ...prev, [friendId]: 0 }))
      try {
        await supabase
          .from('chat_reads')
          .upsert(
            { user_id: userId, other_user_id: friendId, last_read_at: new Date().toISOString() },
            { onConflict: 'user_id,other_user_id' }
          )
      } catch {
        /* v7 pendente: silêncio — local já zerou */
      }
    },
    [userId]
  )

  const totalUnread = useMemo(
    () => Object.values(unreadByFriend).reduce((acc, n) => acc + n, 0),
    [unreadByFriend]
  )

  const value = useMemo(
    () => ({ available, unreadByFriend, totalUnread, setActiveChat, markRead }),
    [available, unreadByFriend, totalUnread, setActiveChat, markRead]
  )

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnread() {
  const ctx = useContext(UnreadContext)
  if (!ctx) throw new Error('useUnread deve ser usado dentro de <UnreadProvider>')
  return ctx
}
