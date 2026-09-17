import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

/**
 * Busca o perfil do usuário logado (username, tag, role, created_at...).
 * Retorna { profile, loading, refresh } — use refresh() após editar o perfil.
 */
export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setProfile(null)
      setLoading(false)
      return null
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) console.warn('[perfil]', error.message)
    setProfile(data ?? null)
    setLoading(false)
    return data ?? null
  }, [user])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  return { profile, loading, refresh }
}
