import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../utils/errors'

/** Chat de sala (grupo) — histórico + ao vivo (Realtime). Depende da Migração v8 + membership. */
export function useRoomChat(roomId) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!user || !roomId || !isSupabaseConfigured) return undefined
    let cancelled = false
    setLoading(true)
    setBlocked(false)

    const load = async () => {
      const { data, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (cancelled) return
      if (error) {
        setBlocked(true)
        setLoading(false)
        return
      }
      setMessages((data ?? []).slice().reverse())
      setLoading(false)
    }

    const append = (m) =>
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))

    const ch = supabase
      .channel(`room:chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        ({ new: m }) => append(m)
      )
      .subscribe()

    load()
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [user, roomId])

  const send = useCallback(
    async (content) => {
      const text = (content ?? '').trim()
      if (!text) return { ok: false, message: 'Escreva algo antes de enviar.' }
      if (text.length > 500) return { ok: false, message: 'Máximo de 500 caracteres por mensagem.' }
      const { error } = await supabase
        .from('room_messages')
        .insert({ room_id: roomId, sender_id: user.id, content: text })
      if (error) return { ok: false, message: translateError(error.message) }
      return { ok: true }
    },
    [user, roomId]
  )

  return { messages, loading, blocked, send }
}
