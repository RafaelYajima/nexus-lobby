import { useCallback, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

/**
 * Ranking da comunidade (view `community_score` — Migração v9).
 * blocked=true quando a view ainda não existe (v9 pendente).
 */
export function useRanking() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [blocked, setBlocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return
    const { data, error } = await supabase
      .from('community_score')
      .select('id, username, tag, role, score')
      .order('score', { ascending: false })
      .limit(50)
    if (error) {
      setBlocked(true)
      setLoading(false)
      return
    }
    setBlocked(false)
    setRows(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const meIndex = rows.findIndex((r) => r.id === user?.id)
  const me = meIndex >= 0 ? { ...rows[meIndex], posicao: meIndex + 1 } : null

  return { rows, me, blocked, loading, reload: load }
}
