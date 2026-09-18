import { useEffect, useMemo, useState } from 'react'
import Spinner from './Spinner'
import { useAuth } from '../context/AuthContext'
import { QUESTION_TIME_MS, QUESTION_TIME_S, ROUND_COUNT } from '../hooks/useQuizGame'

const LETTERS = ['A', 'B', 'C', 'D']
const MEDALS = ['🥇', '🥈', '🥉']

/** ⏱️ contador regressivo (a validação oficial é do clock do servidor — v12). */
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
    myAnswers,
    reveals,
    loading,
    blocked,
    starting,
    start,
    answer,
    reveal,
  } = quiz

  const [startMsg, setStartMsg] = useState('')
  const { remain, frac } = useCountdown(game?.question_started_at, !!game)
  const timedOut = !game ? false : remain <= 0

  // minha resposta desta rodada: prioriza o que o servidor confirmou (linha gravada),
  // senão cai na resposta recém-retornada pela RPC (instantâneo pra UI)
  const roundKey = game ? `${game.id}:${game.question_idx}` : null
  const myRow = useMemo(() => {
    if (!game || !user) return null
    return (
      answers.find((a) => a.user_id === user.id && a.question_idx === game.question_idx) ?? null
    )
  }, [answers, game, user])
  const myAnswer = myRow ?? (roundKey ? (myAnswers[roundKey] ?? null) : null)

  // gabarito visível: depois de responder (RPC devolve) ou ao revelar rodada encerrada
  const correctIdx = useMemo(() => {
    if (!roundKey) return null
    return myAnswers[roundKey]?.answerIndex ?? reveals[roundKey] ?? null
  }, [myAnswers, reveals, roundKey])

  // estourei o tempo sem responder → peço o gabarito (o banco só libera rodada passada)
  useEffect(() => {
    if (game && !myAnswer && timedOut && correctIdx == null) reveal(game.question_idx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, game?.question_idx, myAnswer, timedOut, correctIdx])

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
          Rode as <strong>Migrações v11 + v12</strong> (SETUP.md) no SQL Editor do Supabase.
        </p>
      </div>
    )
  }

  if (loading) return <Spinner className="p-10" label="Preparando o baralho…" />

  const myHits = user ? answers.filter((a) => a.user_id === user.id && a.correct).length : 0
  const myTotal = user ? totals[user.id] ?? 0 : 0
  const q = game ? questions[game.question_idx] : null

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
              Pergunta {Math.min(game.question_idx + 1, questions.length || ROUND_COUNT)} de{' '}
              {questions.length || ROUND_COUNT}
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

          {/* pergunta (do snapshot do servidor — gabarito nunca sai de lá em massa) */}
          {q ? (
            <div key={roundKey}>
              <p className="mt-4 text-base font-extrabold leading-snug text-zinc-900 dark:text-zinc-50">
                {q.q}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, i) => {
                  const mine = myAnswer?.chosen === i
                  const locked = !!myAnswer || timedOut
                  const showResult = locked && (correctIdx != null || mine)
                  const isCorrect = correctIdx != null && i === correctIdx
                  let cls =
                    'border-zinc-200 bg-white hover:border-amber-400 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-400/60'
                  if (showResult && isCorrect)
                    cls = 'border-emerald-500 bg-emerald-500/10 dark:border-emerald-400'
                  else if (showResult && mine && !myAnswer?.correct)
                    cls = 'border-rose-500 bg-rose-500/10 dark:border-rose-400'
                  else if (locked)
                    cls = 'border-zinc-200 bg-white opacity-50 dark:border-white/10 dark:bg-white/5'
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={locked}
                      onClick={() => answer(i)}
                      className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm font-bold text-zinc-800 shadow-sm transition active:scale-[0.98] disabled:cursor-default dark:text-zinc-100 ${cls}`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                          showResult && isCorrect
                            ? 'bg-emerald-500 text-white'
                            : showResult && mine && !myAnswer?.correct
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {showResult && isCorrect ? '✓' : showResult && mine ? '✗' : LETTERS[i]}
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
                  ) : correctIdx != null ? (
                    <span className="text-rose-500">
                      ❌ Errou — era <strong>{LETTERS[correctIdx]}</strong>: {q.options[correctIdx]}
                    </span>
                  ) : (
                    <span className="text-rose-500">❌ Errou — a certa surge quando a rodada virar</span>
                  )
                ) : timedOut ? (
                  correctIdx != null ? (
                    <span className="text-rose-500">
                      ⏰ Tempo! Era <strong>{LETTERS[correctIdx]}</strong>: {q.options[correctIdx]}
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500">⏰ Tempo esgotado…</span>
                  )
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500">
                    Acerte rápido: o bônus de rapidez cai a cada segundo…
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* partida criada antes da v12 (sem snapshot) — o servidor encerra sozinho */
            <div className="mt-6 py-6 text-center">
              <p className="text-2xl">🧹</p>
              <p className="mt-2 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                Esta partida começou antes da v12 — encerrando automaticamente…
              </p>
            </div>
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
              {ROUND_COUNT} perguntas · {QUESTION_TIME_S}s por pergunta · acerto = 10 pts + bônus de
              rapidez (até +5) · correção 100% no servidor 🔒
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
