import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './AuthContext'

const ThemeContext = createContext(null)

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('nexus-theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* localStorage indisponível */
  }
  if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light'
  return 'dark'
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState(getInitialTheme)

  // Aplica a classe no <html> e mantém cópia local (para visitantes).
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    try {
      localStorage.setItem('nexus-theme', theme)
    } catch {
      /* noop */
    }
  }, [theme])

  // Ao logar, o tema salvo no perfil do Supabase vence o local —
  // assim o usuário sempre cai no tema que escolheu, em qualquer dispositivo.
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return
    let active = true
    supabase
      .from('profiles')
      .select('theme')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.warn('[tema] Não foi possível ler o perfil:', error.message)
        if (active && (data?.theme === 'dark' || data?.theme === 'light')) {
          setThemeState(data.theme) // direto no estado: sem regravar o que acabamos de ler
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const persist = useCallback(
    (next) => {
      if (user && isSupabaseConfigured) {
        supabase
          .from('profiles')
          .update({ theme: next })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.warn('[tema] Não foi possível salvar no perfil:', error.message)
          })
      }
    },
    [user]
  )

  /** Define o tema ('dark' | 'light') e persiste no perfil quando logado. */
  const setTheme = useCallback(
    (next) => {
      if (next !== 'dark' && next !== 'light') return
      setThemeState((prev) => {
        if (prev !== next) persist(next)
        return next
      })
    },
    [persist]
  )

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      persist(next)
      return next
    })
  }, [persist])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>')
  return ctx
}
