import RoleBadge from '../RoleBadge'
import Spinner from '../Spinner'

/**
 * Cartão-resumo do perfil: avatar, nome#tag, selo do papel,
 * nível/XP e estatísticas placeholders.
 */
export default function ProfileCard({ username, tag, email, role, memberSince, loading }) {
  if (loading) {
    return (
      <section className="flex h-64 items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
        <Spinner className="h-6 w-6 text-violet-500" />
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
      {/* faixa colorida do topo */}
      <div className="h-16 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400" aria-hidden="true" />

      <div className="-mt-8 flex flex-col items-center px-5 pb-5 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-violet-600 to-cyan-500 text-2xl font-black text-white shadow-lg dark:border-ink-900">
          {username.slice(0, 1).toUpperCase()}
        </span>

        <h3 className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5 text-lg font-bold text-zinc-900 dark:text-white">
          {username}
          {tag && (
            <span className="font-mono text-sm font-medium text-zinc-400 dark:text-zinc-500">#{tag}</span>
          )}
          <RoleBadge role={role} size="sm" />
        </h3>
        <p className="mt-0.5 max-w-full truncate text-xs text-zinc-400 dark:text-zinc-500">{email}</p>

        {/* nível / XP */}
        <div className="mt-4 w-full">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            <span>Nível 1</span>
            <span>0 / 100 XP</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
            <div className="h-full w-[6%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 shadow-neon-cyan" />
          </div>
        </div>

        {/* estatísticas (placeholders até os jogos existirem) */}
        <dl className="mt-4 grid w-full grid-cols-3 divide-x divide-zinc-100 rounded-xl border border-zinc-100 bg-zinc-50/60 text-center dark:divide-white/5 dark:border-white/5 dark:bg-white/[0.03]">
          {[
            ['Partidas', '—'],
            ['Vitórias', '—'],
            ['Troféus', '—'],
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-3" title="Disponível quando os jogos chegarem">
              <dt className="text-[9px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {label}
              </dt>
              <dd className="mt-0.5 text-base font-black text-zinc-700 dark:text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-3.5 text-[10px] font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
          Membro desde {memberSince}
        </p>
      </div>
    </section>
  )
}
