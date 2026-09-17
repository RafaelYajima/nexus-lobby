import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

/**
 * Presença em tempo real: quem está com o app aberto agora.
 * Usa Supabase Realtime (channels + presence) — não depende de tabela no banco.
 *
 * Retorna { online, connected }
 *   online: [{ id, username, tag, role, online_at }] — 1 entrada por usuário
 */
export function useOnlineUsers({ username, tag, role }) {
  const { user } = useAuth()
  const [online, setOnline] = useState([])
  const [connected, setConnected] = useState(false)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return undefined

    const channel = supabase.channel('lobby:online', {
      config: { presence: { key: user.id } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const list = Object.entries(state).map(([id, metas]) => ({
          id,
          ...(metas?.[0] ?? {}),
        }))
        setOnline(list)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true)
          channel.track({
            username,
            tag: tag ?? null,
            role: role ?? 'user',
            online_at: new Date().toISOString(),
          })
        } else {
          setConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
    // entra no canal uma vez por sessão
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // quando a identidade carrega (username/tag/role), atualiza a presença
  useEffect(() => {
    const channel = channelRef.current
    if (!connected || !channel) return
    channel.track({
      username,
      tag: tag ?? null,
      role: role ?? 'user',
      online_at: new Date().toISOString(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, username, tag, role])

  return { online, connected }
}
