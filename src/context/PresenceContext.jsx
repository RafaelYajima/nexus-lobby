import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { useProfile } from '../hooks/useProfile'
import { loadPresencePref, resolvePref, savePresencePref } from '../lib/presence'

const PresenceContext = createContext(null)

/** 10 min sem interação (mouse/teclado/toque) → ausente automático */
const IDLE_AFTER_MS = 10 * 60 * 1000

/**
 * Presença em tempo real (UM canal para o app inteiro).
 *
 * Semântica do Realtime descoberta por testes:
 *  - eventos (join/leave/sync) propagam APENAS por chave; updates de meta no
 *    mesmo track não geram diffs, e re-tracks acumulam metas fantasmas.
 *  - com UM track por conexão, join e untrack (invisível) são 100% confiáveis.
 *  - mudanças de status/meta vão por MENSAGENS BROADCAST (instantâneas),
 *    sobrepostas à entrada de presença do usuário.
 */
export function PresenceProvider({ children }) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const userId = user?.id

  const [pref, setPref] = useState({ mode: 'online', until: null })
  const [connected, setConnected] = useState(false)
  const [isIdle, setIsIdle] = useState(false)
  const [others, setOthers] = useState([])

  const channelRef = useRef(null)
  const lastActiveRef = useRef(Date.now())
  const idleRef = useRef(false)
  const prefRef = useRef({ mode: 'online', until: null })
  /** id -> último status/meta recebido por broadcast (fora de ordem seguro via ts) */
  const overridesRef = useRef({})
  /** invariante: no máximo UM track por conexão */
  const trackedRef = useRef(false)
  const lastPayloadRef = useRef('')

  useEffect(() => {
    prefRef.current = pref
  }, [pref])

  const identity = useMemo(
    () => ({
      username:
        profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador',
      tag: profile?.tag ?? null,
      role: profile?.role ?? 'user',
    }),
    [profile, user]
  )
  const identityRef = useRef(identity)
  useEffect(() => {
    identityRef.current = identity
  }, [identity])

  // carrega preferência salva quando o usuário aparece
  useEffect(() => {
    if (!userId) return
    const loaded = resolvePref(loadPresencePref(userId))
    prefRef.current = loaded
    setPref(loaded)
  }, [userId])

  const applyState = useCallback(
    (ch) => {
      const state = ch.presenceState()
      const list = Object.entries(state)
        .filter(([id]) => id !== userId)
        .map(([id, metas]) => {
          const latestMeta = metas?.[metas.length - 1] ?? {}
          const ov = overridesRef.current[id] // status/meta mais recentes (broadcast)
          // esconde estado velho de quem avisou "invisível" por broadcast:
          // só volta a aparecer se RE-trackear (updated_at mais novo que o aviso)
          if (ov?.status === 'invisible') {
            const metaTs = Date.parse(latestMeta.updated_at ?? '') || 0
            if (metaTs <= ov.ts) return null
          }
          const base = { id, ...latestMeta }
          return ov ? { ...base, ...ov, id } : base
        })
        .filter(Boolean)
      setOthers(list)
    },
    [userId]
  )

  const applyStateRef = useRef(applyState)
  useEffect(() => {
    applyStateRef.current = applyState
  }, [applyState])

  const broadcast = useCallback(() => {
    const ch = channelRef.current
    if (!ch || !userId) return
    const resolved = resolvePref(prefRef.current, Date.now())
    const status = resolved.mode === 'online' && idleRef.current ? 'away' : resolved.mode
    const idn = identityRef.current

    // Invisível: avisa PRIMEIRO por broadcast (hide instantâneo para todos);
    // o efeito do canal recria a conexão sem track — servidor faz a faxina.
    if (resolved.mode === 'invisible') {
      const invKey = `inv::${userId}`
      if (invKey === lastPayloadRef.current) return
      lastPayloadRef.current = invKey
      ch.send({
        type: 'broadcast',
        event: 'presence-status',
        payload: { user_id: userId, status: 'invisible', ts: Date.now() },
      }).catch(() => {})
      return
    }

    if (!trackedRef.current) {
      trackedRef.current = true
      ch.track({ ...idn, status, updated_at: new Date().toISOString() }).catch(() => {
        trackedRef.current = false
      })
    }

    const key = `vis::${JSON.stringify({ ...idn, status })}`
    if (key === lastPayloadRef.current) return
    lastPayloadRef.current = key

    ch.send({
      type: 'broadcast',
      event: 'presence-status',
      payload: { user_id: userId, ...idn, status, ts: Date.now() },
    }).catch(() => {})
  }, [userId])

  /**
   * Canal único — recriado quando:
   *  - a IDENTIDADE muda (rejoin anuncia meta nova)
   *  - alterna invisível↔visível (invisível = conexão sem track; a remoção da
   *    conexão anterior apaga nossa presença de forma 100% confiável — chave
   *    removida só garantida quando há UM track por conexão)
   */
  const wantsVisible = pref.mode !== 'invisible'
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return undefined
    trackedRef.current = false
    lastPayloadRef.current = ''
    const ch = supabase.channel('lobby:online', { config: { presence: { key: userId } } })
    channelRef.current = ch

    ch.on('presence', { event: 'sync' }, () => applyStateRef.current(ch))
    ch.on('broadcast', { event: 'presence-status' }, ({ payload }) => {
      if (!payload?.user_id || payload.user_id === userId) return
      const ts = payload.ts ?? 0
      const prev = overridesRef.current[payload.user_id]
      if (prev && prev.ts >= ts) return
      overridesRef.current[payload.user_id] = {
        username: payload.username,
        tag: payload.tag ?? null,
        role: payload.role,
        status: payload.status,
        ts,
      }
      applyStateRef.current(ch)
    })
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnected(true)
        broadcast()
      } else {
        setConnected(false)
      }
    })

    return () => {
      supabase.removeChannel(ch)
      if (channelRef.current === ch) channelRef.current = null
      trackedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, identity, broadcast, wantsVisible])

  // detecção de inatividade (ausente automático, estilo Discord)
  useEffect(() => {
    const markActive = () => {
      lastActiveRef.current = Date.now()
      if (idleRef.current) {
        idleRef.current = false
        setIsIdle(false)
        broadcast()
      }
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, markActive, { passive: true }))

    const check = setInterval(() => {
      if (!idleRef.current && Date.now() - lastActiveRef.current > IDLE_AFTER_MS) {
        idleRef.current = true
        setIsIdle(true)
        broadcast()
      }
    }, 15000)

    return () => {
      events.forEach((event) => window.removeEventListener(event, markActive))
      clearInterval(check)
    }
  }, [broadcast])

  // expiração do prazo ("ausente até 18h" → volta sozinho)
  useEffect(() => {
    const tick = setInterval(() => {
      const resolved = resolvePref(prefRef.current, Date.now())
      if (resolved !== prefRef.current) {
        prefRef.current = resolved
        setPref(resolved)
        if (userId) savePresencePref(userId, resolved)
      }
    }, 15000)
    return () => clearInterval(tick)
  }, [userId])

  // transmite sempre que algo relevante muda
  useEffect(() => {
    if (connected) broadcast()
  }, [connected, pref, isIdle, broadcast])

  const setPresence = useCallback(
    (mode, minutes = null) => {
      const next = { mode, until: minutes ? Date.now() + minutes * 60000 : null }
      prefRef.current = next
      setPref(next)
      if (userId) savePresencePref(userId, next)
      if (mode === 'online') {
        lastActiveRef.current = Date.now()
        idleRef.current = false
        setIsIdle(false)
      }
      broadcast()
    },
    [userId, broadcast]
  )

  const setPresenceUntil = useCallback(
    (mode, untilTs) => {
      const next = { mode, until: untilTs }
      prefRef.current = next
      setPref(next)
      if (userId) savePresencePref(userId, next)
      broadcast()
    },
    [userId, broadcast]
  )

  const effectiveStatus = pref.mode === 'online' && isIdle ? 'away' : pref.mode

  const value = useMemo(
    () => ({ others, connected, pref, effectiveStatus, isIdle, setPresence, setPresenceUntil }),
    [others, connected, pref, effectiveStatus, isIdle, setPresence, setPresenceUntil]
  )

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePresence() {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('usePresence deve ser usado dentro de <PresenceProvider>')
  return ctx
}
