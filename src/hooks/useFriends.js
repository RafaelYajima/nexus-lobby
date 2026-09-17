import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../utils/errors'

/**
 * Sistema de amizades (tabela `friendships` — Migração v4):
 *   friends  → aceitas
 *   incoming → pedidos recebidos aguardando minha resposta
 *   outgoing → pedidos que eu enviei aguardando resposta
 *   blocked  → true quando a tabela/policies ainda não existem no banco
 */
export function useFriends() {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const load = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return
    setErrorMsg('')

    const { data: rows, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`)

    if (error) {
      setBlocked(true)
      setLoading(false)
      setErrorMsg(translateError(error.message))
      return
    }
    setBlocked(false)

    const otherIds = [
      ...new Set((rows ?? []).map((r) => (r.requester === user.id ? r.addressee : r.requester))),
    ]

    let profiles = []
    if (otherIds.length) {
      const { data: profs } = await supabase.from('profiles').select('*').in('id', otherIds)
      profiles = profs ?? []
    }
    const byId = Object.fromEntries(profiles.map((p) => [p.id, p]))

    const decorate = (r) => {
      const other = r.requester === user.id ? r.addressee : r.requester
      const p = byId[other] || {}
      return {
        friendshipId: r.id,
        userId: other,
        username: p.username ?? 'jogador',
        tag: p.tag ?? null,
        role: p.role ?? 'user',
        createdAt: r.created_at,
        fromMe: r.requester === user.id,
      }
    }

    setFriends((rows ?? []).filter((r) => r.status === 'accepted').map(decorate))
    setIncoming(
      (rows ?? []).filter((r) => r.status === 'pending' && r.addressee === user.id).map(decorate)
    )
    setOutgoing(
      (rows ?? []).filter((r) => r.status === 'pending' && r.requester === user.id).map(decorate)
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const sendRequest = useCallback(
    async (targetUserId) => {
      const { error } = await supabase
        .from('friendships')
        .insert({ requester: user.id, addressee: targetUserId })
      if (error) return { ok: false, message: translateError(error.message) }
      await load()
      return { ok: true }
    },
    [user, load]
  )

  const accept = useCallback(
    async (friendshipId) => {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
      if (error) return { ok: false, message: translateError(error.message) }
      await load()
      return { ok: true }
    },
    [load]
  )

  /** Serve para recusar pedido, cancelar envio e remover amigo. */
  const remove = useCallback(
    async (friendshipId) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
      if (error) return { ok: false, message: translateError(error.message) }
      await load()
      return { ok: true }
    },
    [load]
  )

  return { friends, incoming, outgoing, blocked, loading, errorMsg, reload: load, sendRequest, accept, remove }
}
