import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
  const [theme, setTheme] = useState(getInitialTheme)

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
          setTheme(data.theme)
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      // Persiste no perfil quando há sessão ativa.
      if (user && isSupabaseConfigured) {
        supabase
          .from('profiles')
          .update({ theme: next })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.warn('[tema] Não foi possível salvar no perfil:', error.message)
          })
      }
      return next
    })
  }, [user])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>')
  return ctx
}
