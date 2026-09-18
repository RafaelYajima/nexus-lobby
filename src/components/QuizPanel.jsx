import { useEffect, useMemo, useState } from 'react'
import Spinner from './Spinner'
import { useAuth } from '../context/AuthContext'
import { QUESTION_TIME_MS } from '../hooks/useQuizGame'
import { ROUND_COUNT } from '../data/quizQuestions'

const LETTERS = ['A', 'B', 'C', 'D']
const MEDALS = ['🥇', '🥈', '🥉']

/** ⏱️ contador regressivo sincronizado com o timestamp do servidor. */
function useCountdown(startedAt, running) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return undefined
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [running, startedAt])
  useEffect(() => setNow(Date.now()), [startedAt])
  const started = startedAt ? new Date(startedAt).getTime() : now
  const remain = Math.max(0, QUESTION_TIME_MS - (now - started))
  return { remain, frac: Math.max(0, Math.min(1, remain / QUESTION_TIME_MS)) }
}

/** ⚡ Quiz Relâmpago — painel do jogo dentro da sala. */
export default function QuizPanel({ quiz, members }) {
  const { user } = useAuth()
  const {
    game,
    lastFinished,
    questions,
    answers,
    answeredNow,
    loading,
    blocked,
    starting,
    start,
    answer,
  } = quiz

  const [startMsg, setStartMsg] = useState('')
  const { remain, frac } = useCountdown(game?.question_started_at, !!game)

  // placar agregado (todas as rodadas do jogo em foco)
  const totals = useMemo(() => {
    const acc = {}
    for (const a of answers) acc[a.user_id] = (acc[a.user_id] ?? 0) + (a.points ?? 0)
    return acc
  }, [answers])
  const standings = useMemo(
    () =>
      members
        .map((m) => ({ ...m, pts: totals[m.id] ?? 0 }))
        .sort((a, b) => b.pts - a.pts || (a.username || '').localeCompare(b.username || '')),
    [members, totals]
  )

  const myAnswer = useMemo(() => {
    if (!game || !user) return null
    return answers.find((a) => a.user_id === user.id && a.question_idx === game.question_idx) ?? null
  }, [answers, game, user])

  const onStart = async () => {
    setStartMsg('')
    const res = await start()
    if (!res.ok) setStartMsg(res.message)
  }

  if (blocked) {
    return (
      <div className="rounded-3xl border border-dashed border-amber-400/40 bg-amber-400/5 p-8 text-center">
        <p className="text-3xl">🔧</p>
        <p className="mt-2 text-sm font-extrabold text-zinc-800 dark:text-zinc-100">
          O Quiz Relâmpago ainda não foi ativado no banco
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-zinc-500 dark:text-zinc-400">
          Rode a <strong>Migração v11</strong> (SETUP.md) no SQL Editor do Supabase.
        </p>
      </div>
    )
  }

  if (loading) return <Spinner className="p-10" label="Preparando o baralho…" />

  const myHits = user ? answers.filter((a) => a.user_id === user.id && a.correct).length : 0
  const myTotal = user ? totals[user.id] ?? 0 : 0

  return (
    <div className="space-y-4">
      {game ? (
        /* ========================= PARTIDA ROLANDO ========================= */
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
          {/* cabeçalho da rodada */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              ⚡ Quiz Relâmpago
            </p>
            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
              Pergunta {Math.min(game.question_idx + 1, questions.length)} de {questions.length || ROUND_COUNT}
            </p>
          </div>

          {/* barra do tempo */}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/5">
              <div
                className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-200 ease-linear ${
                  frac > 0.35 ? 'from-amber-500 to-rose-500' : 'from-rose-600 to-rose-500'
                }`}
                style={{ width: `${frac * 100}%` }}
              />
            </div>
            <span
              className={`w-8 text-right text-sm font-black tabular-nums ${
                frac > 0.35 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'
              }`}
            >
              {Math.ceil(remain / 1000)}s
            </span>
          </div>

          {/* pergunta */}
          {questions[game.question_idx] ? (
            (() => {
              const q = questions[game.question_idx]
              return (
                <div key={`${game.id}:${game.question_idx}`}>
                  <p className="mt-4 text-base font-extrabold leading-snug text-zinc-900 dark:text-zinc-50">
                    {q.q}
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, i) => {
                      const mine = myAnswer?.chosen === i
                      const answered = !!myAnswer
                      const locked = myAnswer || remain <= 0
                      const reveal = myAnswer || remain <= 0
                      const isCorrect = i === q.a
                      let cls =
                        'border-zinc-200 bg-white hover:border-amber-400 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-400/60'
                      if (reveal && isCorrect)
                        cls = 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-400'
                      else if (reveal && mine && !isCorrect)
                        cls = 'border-rose-500 bg-rose-500/10 dark:border-rose-400'
                      else if (reveal)
                        cls = 'border-zinc-200 bg-white opacity-50 dark:border-white/10 dark:bg-white/5'
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={!!locked}
                          onClick={() => answer(i)}
                          className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm font-bold text-zinc-800 shadow-sm transition active:scale-[0.98] disabled:cursor-default dark:text-zinc-100 ${cls}`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                              reveal && isCorrect
                                ? 'bg-emerald-500 text-white'
                                : reveal && mine && !isCorrect
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {reveal && isCorrect ? '✓' : reveal && mine ? '✗' : LETTERS[i]}
                          </span>
                          <span className="min-w-0 break-words">{opt}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* feedback */}
                  <div className="mt-3 min-h-6 text-center text-xs font-bold">
                    {myAnswer ? (
                      myAnswer.correct ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ✅ Correta! +{myAnswer.points} pts
                        </span>
                      ) : (
                        <span className="text-rose-500">
                          ❌ Errou — era <strong>{LETTERS[q.a]}</strong>: {q.options[q.a]}
                        </span>
                      )
                    ) : remain <= 0 ? (
                      <span className="text-rose-500">
                        ⏰ Tempo! Era <strong>{LETTERS[q.a]}</strong>: {q.options[q.a]}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">
                        Acerte rápido: o bônus de rapidez cai a cada segundo…
                      </span>
                    )}
                  </div>
                </div>
              )
            })()
          ) : (
            <Spinner className="p-6" />
          )}

          {/* status da rodada */}
          <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-3 text-[11px] text-zinc-400 dark:border-white/5 dark:text-zinc-500">
            <span>
              ✋ <strong className="text-zinc-600 dark:text-zinc-300">{answeredNow.size}</strong>{' '}
              de <strong className="text-zinc-600 dark:text-zinc-300">{members.length}</strong>{' '}
              responderam
            </span>
            <span>
              Você: <strong className="text-amber-600 dark:text-amber-400">{myTotal} pts</strong> ·{' '}
              {myHits} acerto{myHits === 1 ? '' : 's'}
            </span>
          </div>
        </section>
      ) : (
        /* ========================= LOBBY DO QUIZ ========================= */
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-soft dark:border-white/10 dark:bg-ink-900">
          <div className="bg-gradient-to-br from-amber-500 to-rose-500 p-5 text-white">
            <p className="text-lg font-black">⚡ Quiz Relâmpago</p>
            <p className="mt-1 text-xs text-white/80">
              {ROUND_COUNT} perguntas · {QUESTION_TIME_MS / 1000}s por pergunta · acerto = 10 pts +
              bônus de rapidez (até +5)
            </p>
          </div>
          <div className="p-5 text-center">
            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50 sm:w-auto sm:px-10"
            >
              {starting ? 'Embaralhando…' : '▶ Iniciar partida'}
            </button>
            {startMsg && <p className="mt-2 text-xs font-bold text-rose-500">{startMsg}</p>}
            <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
              Qualquer pessoa da sala pode puxar uma partida — todo mundo que está na sala joga
              junto, e o placar final vira pontos no 🏆 Ranking.
            </p>
          </div>
        </section>
      )}

      {/* ========================= PLACAR (ao vivo ou final) ========================= */}
      {(game || lastFinished) && standings.some((s) => s.pts > 0) && (
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {game ? '📊 Placar ao vivo' : '🏁 Última partida'}
          </h3>
          {!game && lastFinished && standings[0]?.pts > 0 && (
            <p className="mt-2 text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
              🏆 {standings[0].username}
              {standings[0].tag && (
                <span className="font-mono text-zinc-400"> #{standings[0].tag}</span>
              )}{' '}
              {standings[0].id === user?.id ? '(você!) ' : ''}
              venceu com {standings[0].pts} pts!
            </p>
          )}
          <ul className="mt-3 space-y-1.5">
            {standings
              .filter((s) => s.pts > 0 || !!game)
              .map((s, i) => (
                <li
                  key={s.id}
                  className={`flex items-center gap-3 rounded-xl px-2 py-1.5 text-xs ${
                    s.id === user?.id ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <span className="w-6 text-center font-black">
                    {MEDALS[i] ?? <span className="text-zinc-400">{i + 1}º</span>}
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-500 to-zinc-700 text-[10px] font-black text-white dark:from-zinc-600 dark:to-zinc-800">
                    {(s.username || '?').slice(0, 1).toUpperCase()}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-bold text-zinc-700 dark:text-zinc-200">
                    {s.username ?? 'jogador'}
                    {s.tag && <span className="font-mono text-zinc-400"> #{s.tag}</span>}
                    {s.id === user?.id && <span className="text-zinc-400"> (você)</span>}
                  </p>
                  <span className="font-black text-amber-600 dark:text-amber-400">
                    {s.pts}
                    <span className="text-[10px] font-bold text-zinc-400"> pts</span>
                  </span>
                </li>
              ))}
          </ul>
          {!!game && (
            <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
              Quanto mais rápido responder, mais pontos por acerto ⚡
            </p>
          )}
          {!game && (
            <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">
              Esses pontos já foram somados ao 🏆 Ranking da comunidade.
            </p>
          )}
        </section>
      )}
    </div>
  )
}
