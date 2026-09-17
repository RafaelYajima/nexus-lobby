import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../utils/errors'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import ThemeToggle from '../components/ThemeToggle'
import Logo from '../components/Logo'
import Spinner from '../components/Spinner'

/* ---------- Ícones (estilo Feather) ---------- */
const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}
const IconMail = () => (
  <svg {...iconProps}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)
const IconLock = () => (
  <svg {...iconProps}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const IconUser = () => (
  <svg {...iconProps}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IconEye = () => (
  <svg {...iconProps}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const IconEyeOff = () => (
  <svg {...iconProps}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

/* ---------- Campo de formulário ---------- */
function Field({ id, label, type = 'text', value, onChange, placeholder, icon, error, autoComplete, rightSlot }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-xl border bg-white py-3 pl-11 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all dark:bg-white/5 dark:text-zinc-100 dark:placeholder-zinc-600 ${
            rightSlot ? 'pr-11' : 'pr-4'
          } ${
            error
              ? 'border-rose-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-500/60'
              : 'border-zinc-200 hover:border-zinc-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 dark:border-white/10 dark:hover:border-white/20 dark:focus:border-violet-400'
          }`}
        />
        {rightSlot}
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-400">{error}</p>}
    </div>
  )
}

/* ---------- Página de autenticação ---------- */
export default function AuthPage() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth()
  const [view, setView] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 dark:bg-ink-950">
        <Spinner className="h-8 w-8 text-violet-500" />
      </div>
    )
  }
  if (user) return <Navigate to="/lobby" replace />

  const set = (key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }))
  }

  const switchView = (v) => {
    setView(v)
    setError('')
    setNotice('')
    setFieldErrors({})
    setShowPassword(false)
  }

  function validate() {
    const errors = {}
    if (view === 'signup' && form.username.trim().length < 3) {
      errors.username = 'Use pelo menos 3 caracteres.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Informe um e-mail válido.'
    }
    if (view !== 'forgot') {
      // No cadastro a API do Supabase exige 6+ caracteres.
      // No login quem valida é o servidor, então só exigimos campo preenchido.
      if (view === 'signup' && form.password.length < 6) errors.password = 'Mínimo de 6 caracteres.'
      if (view === 'signin' && form.password.length === 0) errors.password = 'Informe sua senha.'
      if (view === 'signup' && form.confirm !== form.password) {
        errors.confirm = 'As senhas não coincidem.'
      }
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!validate()) return
    setSubmitting(true)
    try {
      if (view === 'signin') {
        const { error } = await signIn(form.email.trim(), form.password)
        if (error) throw error
        // sucesso: onAuthStateChange atualiza a sessão e redirecionamos automático
      } else if (view === 'signup') {
        const { data, error } = await signUp(form.email.trim(), form.password, form.username.trim())
        if (error) throw error
        if (!data.session) {
          // Supabase exigindo confirmação de e-mail
          switchView('signin')
          setNotice('Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre.')
        }
        // se veio sessão, o redirecionamento para o lobby acontece sozinho
      } else {
        const { error } = await resetPassword(form.email.trim())
        if (error) throw error
        setNotice('Se este e-mail estiver cadastrado, você receberá o link de recuperação em instantes.')
      }
    } catch (err) {
      console.error('[auth]', err)
      setError(translateError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const titles = {
    signin: { heading: 'Bem-vindo de volta', sub: 'Entre para continuar sua jornada na arena.' },
    signup: { heading: 'Crie sua conta', sub: 'Leva menos de um minuto para entrar no jogo.' },
    forgot: { heading: 'Recuperar senha', sub: 'Enviaremos um link de redefinição para o seu e-mail.' },
  }
  const cta = {
    signin: 'Entrar na arena',
    signup: 'Criar minha conta',
    forgot: 'Enviar link de recuperação',
  }

  const eyeButton = (
    <button
      type="button"
      onClick={() => setShowPassword((s) => !s)}
      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
    >
      {showPassword ? <IconEyeOff /> : <IconEye />}
    </button>
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-100 dark:bg-ink-950">
      {/* Fundo: grade + orbes neon */}
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 animate-float rounded-full bg-violet-500/25 blur-[120px] dark:bg-violet-600/20" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] animate-float-reverse rounded-full bg-cyan-400/20 blur-[130px] dark:bg-cyan-500/15" aria-hidden="true" />

      <ThemeToggle className="absolute right-5 top-5 z-20" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Marca */}
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo size={64} />
            <h1 className="mt-4 text-3xl font-black tracking-[0.22em] text-zinc-900 dark:text-white">
              NEXUS
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Sua arena de jogos em um só lugar
            </p>
          </div>

          {/* Cartão */}
          <div className="rounded-3xl border border-zinc-200/80 bg-white/85 p-6 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl sm:p-8 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-black/50">
            {/* Status da conexão com o Supabase (visível apenas em desenvolvimento) */}
            {import.meta.env.DEV && (isSupabaseConfigured ? (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-300/60 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Conectado ao Supabase
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-amber-300/60 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
                <strong>Supabase não configurado.</strong> Preencha{' '}
                <code className="font-mono">VITE_SUPABASE_URL</code> e{' '}
                <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> no arquivo{' '}
                <code className="font-mono">.env</code> seguindo o passo a passo do{' '}
                <code className="font-mono">SETUP.md</code> e reinicie o servidor.
              </div>
            ))}

            {view !== 'forgot' ? (
              /* Abas Entrar / Cadastrar */
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
                {[
                  { v: 'signin', label: 'Entrar' },
                  { v: 'signup', label: 'Cadastrar' },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => switchView(v)}
                    className={`rounded-lg py-2.5 text-sm font-semibold transition-all ${
                      view === v
                        ? 'bg-white text-zinc-900 shadow dark:bg-white/10 dark:text-white dark:shadow-neon-violet'
                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => switchView('signin')}
                className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-violet-500 dark:text-zinc-400 dark:hover:text-violet-300"
              >
                <span aria-hidden="true">←</span> Voltar para o login
              </button>
            )}

            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{titles[view].heading}</h2>
            <p className="mb-6 mt-1 text-sm text-zinc-500 dark:text-zinc-400">{titles[view].sub}</p>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-300/60 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}
            {notice && (
              <div className="mb-4 rounded-xl border border-emerald-300/60 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                {notice}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {view === 'signup' && (
                <Field
                  id="username"
                  label="Nome de usuário"
                  value={form.username}
                  onChange={set('username')}
                  placeholder="ex.: shadow_fox"
                  icon={<IconUser />}
                  error={fieldErrors.username}
                  autoComplete="username"
                />
              )}

              <Field
                id="email"
                label="E-mail"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="voce@exemplo.com"
                icon={<IconMail />}
                error={fieldErrors.email}
                autoComplete="email"
              />

              {view !== 'forgot' && (
                <div>
                  <Field
                    id="password"
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    placeholder={view === 'signup' ? 'Mínimo de 6 caracteres' : 'Sua senha'}
                    icon={<IconLock />}
                    error={fieldErrors.password}
                    autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
                    rightSlot={eyeButton}
                  />
                  {view === 'signin' && (
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={() => switchView('forgot')}
                        className="text-xs font-medium text-zinc-500 transition hover:text-violet-500 dark:text-zinc-400 dark:hover:text-violet-300"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                  )}
                </div>
              )}

              {view === 'signup' && (
                <Field
                  id="confirm"
                  label="Confirmar senha"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={set('confirm')}
                  placeholder="Repita a senha"
                  icon={<IconLock />}
                  error={fieldErrors.confirm}
                  autoComplete="new-password"
                  rightSlot={eyeButton}
                />
              )}

              <button
                type="submit"
                disabled={submitting || !isSupabaseConfigured}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 py-3.5 text-sm font-bold tracking-wide text-white shadow-neon-violet transition-all hover:shadow-neon-cyan hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" /> Aguarde...
                  </span>
                ) : (
                  cta[view]
                )}
              </button>
            </form>

            {view === 'signup' && (
              <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade do NEXUS.
              </p>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
            © 2026 NEXUS · Feito para jogadores
          </p>
        </div>
      </main>
    </div>
  )
}
