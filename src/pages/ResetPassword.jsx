import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../utils/errors'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import ThemeToggle from '../components/ThemeToggle'
import Logo from '../components/Logo'
import Spinner from '../components/Spinner'

const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default function ResetPassword() {
  const { user, loading, updatePassword } = useAuth()
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // O link do e-mail traz um token de recovery; o SDK dispara este evento.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const canReset = recoveryMode || Boolean(user)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.')
    if (password !== confirm) return setError('As senhas não coincidem.')
    setSubmitting(true)
    const { error } = await updatePassword(password)
    setSubmitting(false)
    if (error) setError(translateError(error))
    else setDone(true)
  }

  const inputClass =
    'w-full rounded-xl border border-zinc-200 bg-white py-3 pl-11 pr-4 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all hover:border-zinc-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder-zinc-600 dark:hover:border-white/20 dark:focus:border-violet-400'

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-100 dark:bg-ink-950">
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 animate-float rounded-full bg-violet-500/25 blur-[120px] dark:bg-violet-600/20" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] animate-float-reverse rounded-full bg-cyan-400/20 blur-[130px] dark:bg-cyan-500/15" aria-hidden="true" />
      <ThemeToggle className="absolute right-5 top-5 z-20" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size={64} />
            <h1 className="mt-4 text-3xl font-black tracking-[0.22em] text-zinc-900 dark:text-white">NEXUS</h1>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-white/85 p-6 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/50">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-8 w-8 text-violet-500" />
              </div>
            ) : !canReset ? (
              <div className="text-center">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Link inválido ou expirado</h2>
                <p className="mb-6 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Solicite um novo link de recuperação na tela de login.
                </p>
                <Link
                  to="/login"
                  className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-neon-violet transition hover:brightness-110"
                >
                  Voltar para o login
                </Link>
              </div>
            ) : done ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-2xl">
                  ✅
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Senha atualizada!</h2>
                <p className="mb-6 mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Sua nova senha já está valendo. Bora jogar?
                </p>
                <Link
                  to="/lobby"
                  className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-neon-violet transition hover:brightness-110"
                >
                  Ir para o lobby
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Defina sua nova senha</h2>
                <p className="mb-6 mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Escolha uma senha forte com pelo menos 6 caracteres.
                </p>

                {error && (
                  <div className="mb-4 rounded-xl border border-rose-300/60 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="new-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                      Nova senha
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
                        <IconLock />
                      </span>
                      <input
                        id="new-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo de 6 caracteres"
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
                        <IconLock />
                      </span>
                      <input
                        id="confirm-password"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repita a nova senha"
                        autoComplete="new-password"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 py-3.5 text-sm font-bold tracking-wide text-white shadow-neon-violet transition-all hover:shadow-neon-cyan hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner className="h-4 w-4" /> Salvando...
                      </span>
                    ) : (
                      'Salvar nova senha'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
