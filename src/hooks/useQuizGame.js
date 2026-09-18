import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { playQuizCorrect, playQuizWrong, playQuizFinish } from '../lib/sound'

export const QUESTION_TIME_MS = 10000
export const QUESTION_TIME_S = 10
export const ROUND_COUNT = 8
const GRACE_MS = 500

/** Erro de “função inexistente” → Migração v12 pendente. */
const isMissingFn = (error) =>
  error?.code === 'PGRST202' || /function public\.quiz_/i.test(error?.message || '')

/**
 * ⚡ Quiz Relâmpago v12 — correção NO BANCO.
 *
 * As perguntas/gabarito moram em public.quiz_questions (RLS sem policy de leitura:
 * só as funções security-definer abrem). O jogo inteiro é dirigido por RPC:
 *   quiz_start   → sorteia 8 perguntas e cria a partida (snapshot sem gabarito)
 *   quiz_answer  → valida tempo no CLOCK DO SERVIDOR, corrige, pontua e grava
 *   quiz_advance → avança rodada/finaliza (quem avança primeiro vence, sem dono)
 *   quiz_reveal  → entrega o gabarito da rodada APÓS ela passar (ou fim da partida)
 *
 * O cliente nunca mais insere/atualiza direto nas tabelas nem recebe gabarito
 * — só o snapshot de perguntas+opções (questions jsonb, sem resposta).
 */
export function useQuizGame(roomId, membersCount) {
  const { user } = useAuth()
  const [game, setGame] = useState(null) // partida ativa (status 'active')
  const [lastFinished, setLastFinished] = useState(null) // última encerrada
  const [answers, setAnswers] = useState([]) // respostas do jogo em foco (stream)
  const [myAnswers, setMyAnswers] = useState({}) // "gameId:idx" → {chosen, correct, points, answerIndex}
  const [reveals, setReveals] = useState({}) // "gameId:idx" → índice da correta
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false) // v11 pendente (tabelas ausentes)
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
  }, [user, roomId])

  const currentGameId = game?.id ?? lastFinished?.id ?? null

  // stream de respostas do jogo em foco (placar ao vivo — inserts vêm das RPCs)
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

  // perguntas = snapshot gravado na partida (texto + opções, SEM gabarito)
  const questions = useMemo(() => {
    const src = game ?? lastFinished
    const snap = src?.questions
    return Array.isArray(snap) ? snap : []
  }, [game, lastFinished])

  // quantos (e quem) já responderam a rodada atual
  const answeredNow = useMemo(() => {
    if (!game) return new Set()
    return new Set(
      answers.filter((a) => a.question_idx === game.question_idx).map((a) => a.user_id)
    )
  }, [answers, game])

  // ⏱️ avanço de rodada / fim de jogo: o SERVIDOR decide; o cliente só sugere na hora
  useEffect(() => {
    if (!game || game.status !== 'active') return undefined
    const started = new Date(game.question_started_at).getTime()

    const tick = setInterval(() => {
      const elapsed = Date.now() - started
      const everyoneAnswered = membersCount > 0 && answeredNow.size >= membersCount
      const due = elapsed >= QUESTION_TIME_MS + GRACE_MS || (everyoneAnswered && elapsed >= 1200)
      if (!due) return
      // RPC é security-definer + row-lock: N clientes chamam, o banco avança 1 vez
      supabase.rpc('quiz_advance', { p_game_id: game.id }).then(() => {})
    }, 400)

    return () => clearInterval(tick)
  }, [game, answeredNow.size, membersCount])

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
      const { error } = await supabase.rpc('quiz_start', { p_room_id: roomId })
      if (error) {
        if (isMissingFn(error))
          return { ok: false, message: 'Rode a Migração v12 (SETUP.md) — correção passou pro banco.' }
        if (error.code === '23505')
          return { ok: false, message: 'Já tem partida rolando nesta sala!' }
        return { ok: false, message: error.message || 'Não foi possível iniciar a partida.' }
      }
      return { ok: true } // a partida chega via Realtime e a tela muda sozinha
    } finally {
      setStarting(false)
    }
  }, [user, roomId, starting])

  const answer = useCallback(
    async (chosen) => {
      if (!user || !game || game.status !== 'active') return { ok: false }
      const key = `${game.id}:${game.question_idx}`
      if (myAnswers[key] || answeredNow.has(user.id)) return { ok: false }

      const { data, error } = await supabase.rpc('quiz_answer', {
        p_game_id: game.id,
        p_chosen: chosen,
      })
      if (error) {
        if (/esgotado|encerrou/i.test(error.message || ''))
          return { ok: false, message: '⏰ O servidor já tinha virado a rodada nesse instante.' }
        if (isMissingFn(error))
          return { ok: false, message: 'Rode a Migração v12 (SETUP.md) para responder.' }
        // sem mais falha silenciosa: loga e devolve o motivo pra UI mostrar
        console.warn('[quiz] quiz_answer falhou:', error)
        return { ok: false, message: error.message || 'Não consegui registrar a resposta.' }
      }

      if (data?.correct) playQuizCorrect()
      else playQuizWrong()
      setMyAnswers((prev) => ({
        ...prev,
        [key]: {
          chosen,
          correct: !!data?.correct,
          points: data?.points ?? 0,
          answerIndex: data?.answer_index ?? null,
        },
      }))
      return { ok: true }
    },
    [user, game, myAnswers, answeredNow]
  )

  /** Pede o gabarito de uma rodada já encerrada (ex.: estourei o tempo sem responder). */
  const reveal = useCallback(
    async (questionIdx) => {
      if (!user || !game) return
      const key = `${game.id}:${questionIdx}`
      if (reveals[key] != null) return
      const { data, error } = await supabase.rpc('quiz_reveal', {
        p_game_id: game.id,
        p_question_idx: questionIdx,
      })
      if (error || data == null) return
      setReveals((prev) => (prev[key] != null ? prev : { ...prev, [key]: data }))
    },
    [user, game, reveals]
  )

  return {
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
  }
}
