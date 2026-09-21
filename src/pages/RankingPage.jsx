import AppHeader from '../components/AppHeader'
import Spinner from '../components/Spinner'
import RoleBadge from '../components/RoleBadge'
import { useAuth } from '../context/AuthContext'
import { usePresence } from '../context/PresenceContext'
import { useRanking } from '../hooks/useRanking'
import { PRESENCE_META } from '../lib/presence'

const MEDALS = ['🥇', '🥈', '🥉']
const PODIUM_STYLES = [
  'from-amber-400 to-yellow-500 shadow-amber-500/30',   // 1º
  'from-zinc-300 to-zinc-400 shadow-zinc-400/30',       // 2º
  'from-orange-400 to-amber-600 shadow-orange-500/30',  // 3º
]

const SCORING = [
  { icon: '⚡', pts: 'até 120', what: 'por partida de Quiz Relâmpago nas Salas' },
  { icon: '🤝', pts: 10, what: 'por amizade aceita' },
  { icon: '💬', pts: 1, what: 'por mensagem enviada (DM ou sala)' },
  { icon: '🎮', pts: 15, what: 'por sala criada' },
  { icon: '⭐', pts: 5, what: 'por amigo que te favoritou' },
]

function AvatarDot({ name, status, size = 'h-10 w-10 text-sm' }) {
  const dot = PRESENCE_META[status]?.dot ?? 'bg-zinc-500'
  return (
    <span className="relative shrink-0">
      <span
        className={`flex ${size} items-center justify-center rounded-xl bg-gradient-to-br from-zinc-500 to-zinc-700 font-black text-white dark:from-zinc-600 dark:to-zinc-800`}
      >
        {(name || '?').slice(0, 1).toUpperCase()}
      </span>
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-ink-900 ${dot}`}
      />
    </span>
  )
}

/** 🏆 Ranking da comunidade. */
export default function RankingPage() {
  const { user } = useAuth()
  const { others } = usePresence()
  const { rows, me, blocked, loading, reload } = useRanking()

  const presenceById = new Map(others.map((o) => [o.id, o.status]))
  const statusOf = (id) => presenceById.get(id) ?? 'offline'

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-24 pt-8 lg:pb-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-black tracking-tight">🏆 Ranking</h1>
          <button
            type="button"
            onClick={reload}
            title="Atualizar ranking"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-500 transition hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ⟳ Atualizar
          </button>
        </div>

        {blocked ? (
          <section className="rounded-3xl border border-dashed border-amber-400/40 bg-amber-400/5 p-6 text-center">
            <p className="text-3xl">🔧</p>
            <p className="mt-2 text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
              O ranking ainda não foi ativado no banco
            </p>
            <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
              Rode a <strong>Migração v9</strong> (SETUP.md) no SQL Editor do Supabase — é só uma
              view, leva 10 segundos.
            </p>
          </section>
        ) : loading ? (
          <Spinner className="p-10" label="Calculando papéis da comunidade…" />
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white py-12 text-center shadow-soft dark:border-white/10 dark:bg-ink-900">
            <p className="text-3xl">🌱</p>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
              Ainda ninguém pontuou — chame a galera e abra a tempora!
            </p>
          </div>
        ) : (
          <>
            {/* sua posição */}
            {me && (
              <div className="flex items-center gap-3 rounded-2xl border border-violet-500/40 bg-violet-600/10 px-4 py-3">
                <span className="text-xl font-black text-violet-600 dark:text-violet-300">
                  #{me.posicao}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                  Você
                  <span className="font-mono text-zinc-400">
                    {me.tag ? ` #${me.tag}` : ''}
                  </span>
                </p>
                <span className="text-sm font-black text-violet-600 dark:text-violet-300">
                  {me.score} pts
                </span>
              </div>
            )}

            {/* pódio */}
            <section className="grid grid-cols-3 items-end gap-3">
              {[top3[1], top3[0], top3[2]].map(
                (p, i) =>
                  p && (
                    <div
                      key={p.id}
                      className={`rounded-3xl border border-zinc-200 bg-white p-4 text-center shadow-soft dark:border-white/10 dark:bg-ink-900 ${
                        i === 1 ? 'pb-6' : ''
                      }`}
                    >
                      <p className={`text-3xl ${i !== 1 ? 'opacity-80' : ''}`}>
                        {MEDALS[p === top3[0] ? 0 : p === top3[1] ? 1 : 2]}
                      </p>
                      <div className="mx-auto mt-2 w-fit">
                        <AvatarDot
                          name={p.username}
                          status={statusOf(p.id)}
                          size={i === 1 ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm'}
                        />
                      </div>
                      <p
                        className="mt-2 truncate text-xs font-extrabold text-zinc-900 dark:text-zinc-50"
                        title={`${p.username}${p.tag ? ` #${p.tag}` : ''}`}
                      >
                        {p.username}
                        {p.tag && <span className="font-mono text-zinc-400"> #{p.tag}</span>}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full bg-gradient-to-br px-2.5 py-0.5 text-[11px] font-black text-white shadow ${
                          PODIUM_STYLES[p === top3[0] ? 0 : p === top3[1] ? 1 : 2]
                        }`}
                      >
                        {p.score} pts
                      </span>
                    </div>
                  )
              )}
            </section>

            {/* do 4º em diante */}
            {rest.length > 0 && (
              <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
                <ul className="divide-y divide-zinc-100 dark:divide-white/5">
                  {rest.map((p, i) => {
                    const posicao = i + 4
                    const isMe = p.id === user?.id
                    return (
                      <li
                        key={p.id}
                        className={`flex items-center gap-3 py-2.5 ${
                          isMe ? 'rounded-xl bg-violet-600/5 px-2 -mx-2' : ''
                        }`}
                      >
                        <span className="w-8 shrink-0 text-center text-xs font-black text-zinc-400">
                          {posicao}
                        </span>
                        <AvatarDot name={p.username} status={statusOf(p.id)} size="h-9 w-9 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
                            {p.username}
                            {p.tag && <span className="font-mono text-zinc-400"> #{p.tag}</span>}
                            {isMe && <span className="text-zinc-400"> (você)</span>}
                          </p>
                          <RoleBadge role={p.role} />
                        </div>
                        <span className="text-sm font-black text-violet-600 dark:text-violet-300">
                          {p.score}
                          <span className="text-[10px] font-bold text-zinc-400"> pts</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </>
        )}

        {/* como pontuar */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
          <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
            📈 Como pontuar
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {SCORING.map((s) => (
              <li key={s.what} className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-sm">
                  {s.icon}
                </span>
                <span>
                  <strong className="text-violet-600 dark:text-violet-300">+{s.pts}</strong> {s.what}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
            Dica: o ⚡ Quiz Relâmpago já está valendo esses pontos — jogue nas Salas e suba aqui!
          </p>
        </section>
      </main>
    </div>
  )
}
