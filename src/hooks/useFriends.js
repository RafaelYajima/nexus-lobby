import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../utils/errors'

/**
 * Sistema de amizades:
 *   friends    → aceitas (tabela `friendships` — Migração v4)
 *   incoming   → pedidos recebidos aguardando minha resposta
 *   outgoing   → pedidos que eu enviei aguardando resposta
 *   favorites  → ids dos amigos que EU favoritei (tabela `friend_favorites` — Migração v5)
 *   blocked    → friendships ainda não existe (v4 pendente)
 *   favBlocked → friend_favorites ainda não existe (v5 pendente)
 */
export function useFriends() {
  const { user } = useAuth()
  const [friends, setFriends] = useState([])
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [favorites, setFavorites] = useState([])
  const [blocked, setBlocked] = useState(false)
  const [favBlocked, setFavBlocked] = useState(false)
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

    // favoritos (v5) — se a tabela não existe ainda, degrada sem quebrar nada
    const { data: favs, error: favErr } = await supabase
      .from('friend_favorites')
      .select('friend_id')
    if (favErr) {
      setFavBlocked(true)
      setFavorites([])
    } else {
      setFavBlocked(false)
      setFavorites((favs ?? []).map((f) => f.friend_id))
    }

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

  /** ⭐ Marca/desmarca favorito (pessoal — o amigo não vê). */
  const toggleFavorite = useCallback(
    async (friendId) => {
      if (favBlocked) {
        return { ok: false, message: 'Favoritos aguardam a Migração v5 (ver SETUP.md).' }
      }
      if (favorites.includes(friendId)) {
        const { error } = await supabase
          .from('friend_favorites')
          .delete()
          .eq('friend_id', friendId)
        if (error) return { ok: false, message: translateError(error.message) }
      } else {
        const { error } = await supabase
          .from('friend_favorites')
          .insert({ user_id: user.id, friend_id: friendId })
        if (error) return { ok: false, message: translateError(error.message) }
      }
      await load()
      return { ok: true }
    },
    [user, favorites, favBlocked, load]
  )

  return {
    friends,
    incoming,
    outgoing,
    favorites,
    favBlocked,
    blocked,
    loading,
    errorMsg,
    reload: load,
    sendRequest,
    accept,
    remove,
    toggleFavorite,
  }
}
