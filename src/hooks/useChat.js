import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../utils/errors'

/**
 * Chat direto 1:1 entre amigos (tabela `direct_messages` — Migração v6).
 *  - histórico persistente: últimas 50 mensagens ao abrir
 *  - recebimento instantâneo: Realtime postgres_changes (RLS garante: só chega
 *    mensagem em que o usuário participa)
 *  - blocked=true → tabela ainda não existe (v6 pendente): UI mostra aviso
 */
export function useChat(friendId) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!user || !friendId || !isSupabaseConfigured) return undefined
    let cancelled = false
    setLoading(true)
    setBlocked(false)
    setErr('')

    const pairOr = `and(sender_id.eq.${user.id},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${user.id})`
    const inPair = (m) =>
      (m.sender_id === user.id && m.recipient_id === friendId) ||
      (m.sender_id === friendId && m.recipient_id === user.id)
    const append = (m) =>
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))

    const load = async () => {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(pairOr)
        .order('created_at', { ascending: false })
        .limit(50)
      if (cancelled) return
      if (error) {
        setBlocked(true)
        setErr(translateError(error.message))
        setLoading(false)
        return
      }
      setMessages((data ?? []).slice().reverse())
      setLoading(false)
    }

    const channel = supabase
      .channel(`chat:dm:${user.id}:${friendId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        ({ new: msg }) => {
          if (inPair(msg)) append(msg)
        }
      )
      .subscribe()

    load()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user, friendId])

  const send = useCallback(
    async (content) => {
      const text = (content ?? '').trim()
      if (!text) return { ok: false, message: 'Escreva algo antes de enviar.' }
      if (text.length > 1000) return { ok: false, message: 'Máximo de 1000 caracteres por mensagem.' }
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({ sender_id: user.id, recipient_id: friendId, content: text })
        .select()
        .single()
      if (error) return { ok: false, message: translateError(error.message) }
      if (data) {
        setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]))
      }
      return { ok: true }
    },
    [user, friendId]
  )

  return { messages, loading, blocked, err, send }
}
