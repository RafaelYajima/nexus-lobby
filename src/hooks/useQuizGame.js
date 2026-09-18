import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { QUESTIONS, ROUND_COUNT } from '../data/quizQuestions'
import { playQuizCorrect, playQuizWrong, playQuizFinish } from '../lib/sound'

/** Duração da rodada (ms) e folguinha de rede antes de avançar por timeout. */
export const QUESTION_TIME_MS = 10000
const GRACE_MS = 500

const qById = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))

/** 10 pts pelo acerto + até 5 de bônus de rapidez (linear nos 10s). */
export function pointsFor(correct, elapsedMs) {
  if (!correct) return 0
  const frac = Math.max(0, Math.min(1, 1 - elapsedMs / QUESTION_TIME_MS))
  return 10 + Math.round(5 * frac)
}

/**
 * ⚡ Quiz Relâmpago na sala (Migração v11).
 * Estado mora no Supabase: quiz_games (rodada atual) + quiz_answers (placar).
 * Avanço de rodada = update condicional ("só se ainda estiver na rodada X"):
 * qualquer cliente tenta, só o primeiro consegue → sem host fantasma.
 */
export function useQuizGame(roomId, membersCount) {
  const { user } = useAuth()
  const [game, setGame] = useState(null) // partida ativa (status 'active')
  const [lastFinished, setLastFinished] = useState(null) // última encerrada
  const [answers, setAnswers] = useState([]) // respostas do jogo em foco
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false) // v11 pendente
  const [starting, setStarting] = useState(false)
  const resultSavedFor = useRef(new Set())
  const fanfareFor = useRef(new Set())

  // carrega/atualiza partida corrente (+ última encerrada) e assina mudanças
  useEffect(() => {
    if (!user || !roomId || !isSupabaseConfigured) return undefined
    let cancelled = false
    setLoading(true)
    setBlocked(false)

    const refresh = async () => {
      const { data, error } = await supabase
        .from('quiz_games')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      if (error) {
        setBlocked(true) // tabela ausente → Migração v11 pendente
        setLoading(false)
        return
      }
      const g = data?.[0] ?? null
      if (!g) {
        setGame(null)
        setLastFinished(null)
      } else if (g.status === 'active') {
        setGame(g)
        setLastFinished(null)
      } else {
        setGame(null)
        setLastFinished(g)
      }
      setLoading(false)
    }

    const ch = supabase
      .channel(`quiz:room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quiz_games', filter: `room_id=eq.${roomId}` },
        () => refresh()
      )
      .subscribe()

    refresh()
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomId])

  const currentGameId = game?.id ?? lastFinished?.id ?? null

  // stream de respostas do jogo em foco (ativa ou finalizada — placar ao vivo)
  useEffect(() => {
    if (!user || !currentGameId) {
      setAnswers([])
      return undefined
    }
    let cancelled = false
    setAnswers([])

    const load = async () => {
      const { data, error } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('game_id', currentGameId)
      if (cancelled || error) return
      setAnswers(data ?? [])
    }

    const ch = supabase
      .channel(`quiz:answers:${currentGameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quiz_answers', filter: `game_id=eq.${currentGameId}` },
        ({ new: a }) =>
          setAnswers((prev) =>
            prev.some(
              (x) =>
                x.game_id === a.game_id &&
                x.question_idx === a.question_idx &&
                x.user_id === a.user_id
            )
              ? prev
              : [...prev, a]
          )
      )
      .subscribe()

    load()
    return () => {
      cancelled = true
      supabase.removeChannel(ch)
    }
  }, [user, currentGameId])

  // baralho da partida (resolve ids do banco contra o banco local de perguntas)
  const questions = useMemo(() => {
    const src = game ?? lastFinished
    return (src?.question_ids ?? []).map((id) => qById[id]).filter(Boolean)
  }, [game, lastFinished])

  // quantos já responderam a rodada atual
  const answeredNow = useMemo(() => {
    if (!game) return new Set()
    return new Set(
      answers.filter((a) => a.question_idx === game.question_idx).map((a) => a.user_id)
    )
  }, [answers, game])

  // ⏱️ avanço de rodada / fim de jogo — update condicional: primeiro que chegar vence
  useEffect(() => {
    if (!game || game.status !== 'active' || questions.length === 0) return undefined
    const started = new Date(game.question_started_at).getTime()

    const tick = setInterval(() => {
      const elapsed = Date.now() - started
      const everyoneAnswered = membersCount > 0 && answeredNow.size >= membersCount
      const timedOut = elapsed >= QUESTION_TIME_MS + GRACE_MS
      const snapAll = everyoneAnswered && elapsed >= 1200 // respiro pra quem respondeu por último
      if (!timedOut && !snapAll) return

      const isLast = game.question_idx >= questions.length - 1
      const patch = isLast
        ? { status: 'finished', finished_at: new Date().toISOString() }
        : {
            question_idx: game.question_idx + 1,
            question_started_at: new Date().toISOString(),
          }
      supabase
        .from('quiz_games')
        .update(patch)
        .eq('id', game.id)
        .eq('status', 'active')
        .eq('question_idx', game.question_idx) // se alguém já avançou, este update não casa mais
        .then(() => {})
    }, 400)

    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id, game?.question_idx, answeredNow.size, membersCount, questions.length])

  // grava MEU placar final → alimenta o ranking (community_score), idempotente
  useEffect(() => {
    const g = lastFinished
    if (!g || !user || resultSavedFor.current.has(g.id)) return
    const mine = answers.filter((a) => a.user_id === user.id)
    if (mine.length === 0) return
    resultSavedFor.current.add(g.id)
    const total = mine.reduce((s, a) => s + (a.points ?? 0), 0)
    const acertos = mine.filter((a) => a.correct).length
    supabase
      .from('game_results')
      .insert({
        user_id: user.id,
        game: 'quiz',
        room_id: g.room_id,
        points: total,
        detail: { game_id: g.id, acertos, perguntas: questions.length || ROUND_COUNT },
      })
      .then(() => {}) // 23505 (índice único) = já gravado por outra aba — ok
  }, [lastFinished, answers, user, questions.length])

  // 🎺 fanfarra quando uma partida da qual participei termina
  useEffect(() => {
    const g = lastFinished
    if (!g || !user || fanfareFor.current.has(g.id)) return
    if (answers.some((a) => a.user_id === user.id)) {
      fanfareFor.current.add(g.id)
      playQuizFinish()
    }
  }, [lastFinished, answers, user])

  const start = useCallback(async () => {
    if (!user || starting) return { ok: false, message: 'Criando partida…' }
    setStarting(true)
    try {
      const pool = [...QUESTIONS]
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      const question_ids = pool.slice(0, ROUND_COUNT).map((q) => q.id)
      const { error } = await supabase
        .from('quiz_games')
        .insert({ room_id: roomId, host_id: user.id, question_ids })
      if (error) {
        return {
          ok: false,
          message:
            error.code === '23505'
              ? 'Já tem partida rolando nesta sala!'
              : 'Sem permissão para iniciar (veja a Migração v11 no SETUP.md).',
        }
      }
      return { ok: true } // a partida chega via Realtime e a tela muda sozinha
    } finally {
      setStarting(false)
    }
  }, [user, roomId, starting])

  const answer = useCallback(
    async (chosen) => {
      if (!user || !game || game.status !== 'active') return { ok: false }
      const q = questions[game.question_idx]
      if (!q) return { ok: false }
      if (answeredNow.has(user.id)) return { ok: false } // já respondeu
      const elapsed = Date.now() - new Date(game.question_started_at).getTime()
      if (elapsed > QUESTION_TIME_MS + GRACE_MS) return { ok: false } // tempo esgotado
      const correct = chosen === q.a
      const points = pointsFor(correct, elapsed)
      if (correct) playQuizCorrect()
      else playQuizWrong()
      const { error } = await supabase.from('quiz_answers').insert({
        game_id: game.id,
        question_idx: game.question_idx,
        user_id: user.id,
        chosen,
        correct,
        points,
      })
      // 23505 = o primeiro insert já valeu (clique duplo / aba gêmea)
      return error && error.code !== '23505' ? { ok: false } : { ok: true }
    },
    [user, game, questions, answeredNow]
  )

  return {
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
  }
}
