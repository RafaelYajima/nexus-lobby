import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../utils/errors'

/** Salão de salas: lista abertas + cria/fecha (host) + entra/sai. Tabelas da Migração v8. */
export function useRooms() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return
    const { data: rows, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      setBlocked(true)
      setLoading(false)
      return
    }
    setBlocked(false)

    const hostIds = [...new Set((rows ?? []).map((r) => r.created_by))]
    let hosts = []
    if (hostIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, tag, role')
        .in('id', hostIds)
      hosts = profs ?? []
    }
    const byId = Object.fromEntries(hosts.map((h) => [h.id, h]))

    setRooms((rows ?? []).map((r) => ({ ...r, host: byId[r.created_by] ?? null })))
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // lista viva: novas salas/fechadas aparecem sem refresh
  useEffect(() => {
    if (!user || blocked || !isSupabaseConfigured) return undefined
    const ch = supabase
      .channel('rooms:list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [user, blocked, load])

  const create = useCallback(
    async ({ name, gameId }) => {
      const trimmed = name.trim()
      if (trimmed.length < 2) return { ok: false, message: 'Dê um nome pra sala (mín. 2 letras).' }
      const { data, error } = await supabase
        .from('rooms')
        .insert({ name: trimmed, game_id: gameId, created_by: user.id })
        .select()
        .single()
      if (error) return { ok: false, message: translateError(error.message) }
      await load()
      return { ok: true, room: data }
    },
    [user, load]
  )

  const close = useCallback(
    async (roomId) => {
      const { error } = await supabase.from('rooms').update({ status: 'closed' }).eq('id', roomId)
      if (error) return { ok: false, message: translateError(error.message) }
      await load()
      return { ok: true }
    },
    [load]
  )

  const join = useCallback(
    async (roomId) => {
      const { error } = await supabase
        .from('room_members')
        .upsert({ room_id: roomId, user_id: user.id }, { onConflict: 'room_id,user_id' })
      return !error
    },
    [user]
  )

  const leave = useCallback(
    async (roomId) => {
      await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', user.id)
    },
    [user]
  )

  return { rooms, blocked, loading, create, close, join, leave, reload: load }
}
