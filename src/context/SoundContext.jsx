import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'
import { isSoundEnabled, setSoundEnabled, playMessageDing } from '../lib/sound'

const SoundContext = createContext(null)

/**
 * Preferência de sons da conta:
 *  - fonte da verdade: profiles.sound_enabled (Migração v10) → segue a CONTA
 *    em qualquer dispositivo/aba/anônima
 *  - cache: localStorage (players síncronos leem dele)
 *  - sem a coluna (v10 pendente) → cai no comportamento antigo (só localStorage)
 */
export function SoundProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  // puxa a preferência da conta ao logar
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return undefined
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('sound_enabled')
        .eq('id', userId)
        .single()
      if (cancelled || error) return // v10 pendente / linha ok: mantém modo local
      const serverValue = data?.sound_enabled ?? true
      setSoundEnabled(serverValue)
      setSoundOn(serverValue)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const toggle = useCallback(() => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) playMessageDing() // testeinha ao ligar
    if (userId && isSupabaseConfigured) {
      supabase.from('profiles').update({ sound_enabled: next }).eq('id', userId)
    }
  }, [soundOn, userId])

  const value = useMemo(() => ({ soundOn, toggle }), [soundOn, toggle])

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound deve ser usado dentro de <SoundProvider>')
  return ctx
}
