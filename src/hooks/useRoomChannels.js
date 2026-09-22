import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../utils/errors'

/**
 * Canais (texto/voz) de um servidor — Migração v14.
 * Se a v14 ainda não foi rodada, degrada com available=false:
 * o app funciona como antes (canal único #geral implícito).
 */
export function useRoomChannels(roomId) {
  const { user } = useAuth()
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)

  const tag = useMemo(() => Math.random().toString(36).slice(2, 10), [])

  const load = useCallback(async () => {
    if (!user || !roomId || !isSupabaseConfigured) return
    const { data, error } = await supabase
      .from('room_channels')
      .select('*')
      .eq('room_id', roomId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) {
      // tabela não existe ainda (v14 pendente) → degrada pro modo de canal único
      setAvailable(false)
      setChannels([])
      setLoading(false)
      return
    }
    setAvailable(true)
    setChannels(data ?? [])
    setLoading(false)
  }, [user, roomId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  // canais mudam pouco, mas aparecem ao vivo quando o dono edita
  useEffect(() => {
    if (!user || !roomId || !available || !isSupabaseConfigured) return undefined
    const ch = supabase
      .channel(`room:channels:${roomId}:${tag}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_channels', filter: `room_id=eq.${roomId}` },
        () => load()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [user, roomId, available, load, tag])

  const add = useCallback(
    async (type, rawName) => {
      const name = rawName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-._]/g, '')
      if (!/^text|voice$/.test(type)) return { ok: false, message: 'Tipo de canal inválido.' }
      if (!name || name.length < 2) return { ok: false, message: 'Dê um nome (mín. 2 caracteres).' }
      if (name.length > 24) return { ok: false, message: 'Nome muito longo (máx. 24).' }
      const position = channels.length
      const { error } = await supabase
        .from('room_channels')
        .insert({ room_id: roomId, type, name, position })
      if (error) return { ok: false, message: translateError(error.message) }
      await load()
      return { ok: true }
    },
    [roomId, channels.length, load]
  )

  const rename = useCallback(
    async (channelId, rawName) => {
      const name = rawName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-._]/g, '')
      if (!name || name.length < 2 || name.length > 24)
        return { ok: false, message: 'Nome de 2 a 24 caracteres.' }
      const { error } = await supabase.from('room_channels').update({ name }).eq('id', channelId)
      if (error) return { ok: false, message: translateError(error.message) }
      await load()
      return { ok: true }
    },
    [load]
  )

  const remove = useCallback(
    async (channelId) => {
      const { error } = await supabase.from('room_channels').delete().eq('id', channelId)
      if (error) return { ok: false, message: translateError(error.message) }
      await load()
      return { ok: true }
    },
    [load]
  )

  return { channels, loading, available, add, rename, remove, reload: load }
}
