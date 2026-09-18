import { useEffect, useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader'
import ProfileCard from '../components/lobby/ProfileCard'
import SettingsCard from '../components/lobby/SettingsCard'
import RoleBadge from '../components/RoleBadge'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabaseClient'
import { translateError } from '../utils/errors'

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-all hover:border-zinc-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:placeholder-zinc-600 dark:hover:border-white/20 dark:focus:border-violet-400 dark:disabled:bg-white/[0.03]'

const labelClass =
  'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400'

function Msg({ type, children }) {
  if (!children) return null
  const styles =
    type === 'error'
      ? 'border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
      : 'border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
  return <div className={`rounded-xl border p-3 text-xs font-medium ${styles}`}>{children}</div>
}

export default function ProfilePage() {
  const { user, updatePassword } = useAuth()
  const { profile, loading, refresh } = useProfile()

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'
  const tag = profile?.tag ?? null
  const role = profile?.role ?? 'user'

  const memberSince = useMemo(() => {
    const raw = profile?.created_at || user?.created_at
    if (!raw) return '—'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(raw))
  }, [profile, user])

  /* ---------- card: informações da conta ---------- */
  const [name, setName] = useState(username)
  const [savingName, setSavingName] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')
  const [infoErr, setInfoErr] = useState('')

  useEffect(() => {
    setName(username)
  }, [username])

  const nameTrimmed = name.trim()
  const nameDirty = nameTrimmed !== username
  const nameValid = nameTrimmed.length >= 3 && nameTrimmed.length <= 24

  async function handleSaveName(e) {
    e.preventDefault()
    setInfoMsg('')
    setInfoErr('')
    if (!nameDirty || !nameValid) return
    setSavingName(true)
    const { error } = await supabase
      .from('profiles')
      .update({ username: nameTrimmed })
      .eq('id', user.id)
    setSavingName(false)
    if (error) {
      setInfoErr(translateError(error))
    } else {
      await refresh()
      setInfoMsg('Nome de usuário atualizado! 🎉')
    }
  }

  /* ---------- card: segurança ---------- */
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [secMsg, setSecMsg] = useState('')
  const [secErr, setSecErr] = useState('')

  async function handleSavePassword(e) {
    e.preventDefault()
    setSecMsg('')
    setSecErr('')
    if (pw.next.length < 6) return setSecErr('A nova senha precisa de pelo menos 6 caracteres.')
    if (pw.next !== pw.confirm) return setSecErr('As senhas não coincidem.')
    setSavingPw(true)
    const { error } = await updatePassword(pw.next)
    setSavingPw(false)
    if (error) {
      setSecErr(translateError(error))
    } else {
      setSecMsg('Senha atualizada com sucesso! 🔒')
      setPw({ next: '', confirm: '' })
    }
  }

  return (
    <div className="relative min-h-screen bg-zinc-100 dark:bg-ink-950">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" aria-hidden="true" />

      <AppHeader />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 md:pb-16">
        <section className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
            Meu <span className="text-gradient">perfil</span>
          </h1>

        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* coluna principal */}
          <div className="space-y-6">
            {/* Informações da conta */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                <span aria-hidden="true">🪪</span> Informações da conta
              </h2>

              <form onSubmit={handleSaveName} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="username" className={labelClass}>
                    Nome de usuário
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="username"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Como você aparece no NEXUS"
                      maxLength={24}
                      className={inputClass}
                    />
                    <button
                      type="submit"
                      disabled={!nameDirty || !nameValid || savingName || loading}
                      className="shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3 text-sm font-bold text-white shadow-neon-violet transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      {savingName ? <Spinner className="mx-auto h-4 w-4" /> : 'Salvar'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    3–24 caracteres. Pode mudar quando quiser —{' '}
                    {tag ? (
                      <>sua tag <span className="font-mono font-semibold text-violet-500 dark:text-violet-300">#{tag}</span> permanece sempre a mesma.</>
                    ) : (
                      'sua tag permanece sempre a mesma.'
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-zinc-100 pt-5 sm:grid-cols-2 dark:border-white/5">
                  <div>
                    <span className={labelClass}>Sua tag única</span>
                    {tag ? (
                      <>
                        <span className="inline-flex items-center rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-2 font-mono text-sm font-bold tracking-wider text-white shadow-neon-cyan">
                          #{tag}
                        </span>
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                          🔒 Fixa — é ela que diferencia você de jogadores com o mesmo nome.
                        </p>
                      </>
                    ) : role === 'adm' ? (
                      <p className="rounded-xl bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-500 dark:bg-white/[0.03] dark:text-zinc-400">
                        👑 Contas de administrador não utilizam tag.
                      </p>
                    ) : (
                      <p className="rounded-xl bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-400 dark:bg-white/[0.03] dark:text-zinc-500">
                        —
                      </p>
                    )}
                  </div>

                  <div>
                    <span className={labelClass}>E-mail</span>
                    <input value={user?.email ?? ''} disabled className={inputClass} />
                    <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                      O e-mail é sua credencial de acesso e não pode ser alterado por aqui.
                    </p>
                  </div>
                </div>

                <Msg type="error">{infoErr}</Msg>
                <Msg type="success">{infoMsg}</Msg>
              </form>
            </section>

            {/* Segurança */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.04]">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                <span aria-hidden="true">🔐</span> Segurança
              </h2>

              <form onSubmit={handleSavePassword} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="new-password" className={labelClass}>
                      Nova senha
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={pw.next}
                      onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                      placeholder="Mínimo de 6 caracteres"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-new-password" className={labelClass}>
                      Confirmar nova senha
                    </label>
                    <input
                      id="confirm-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={pw.confirm}
                      onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                      placeholder="Repita a nova senha"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                    A troca vale imediatamente. Você permanece conectado neste dispositivo.
                  </p>
                  <button
                    type="submit"
                    disabled={savingPw || !pw.next || !pw.confirm}
                    className="shrink-0 rounded-xl border border-violet-500/40 px-6 py-2.5 text-sm font-bold text-violet-600 transition-all hover:bg-violet-500/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-300"
                  >
                    {savingPw ? <Spinner className="mx-auto h-4 w-4" /> : 'Atualizar senha'}
                  </button>
                </div>

                <Msg type="error">{secErr}</Msg>
                <Msg type="success">{secMsg}</Msg>
              </form>
            </section>
          </div>

          {/* coluna lateral: resumo + configurações */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <ProfileCard
              username={username}
              tag={tag}
              email={user?.email}
              role={role}
              memberSince={memberSince}
              loading={loading}
            />
            <SettingsCard />
          </aside>
        </div>
      </main>
    </div>
  )
}
