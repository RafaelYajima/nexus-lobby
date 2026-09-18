/**
 * Sons de notificação sintetizados via WebAudio (sem arquivos de áudio).
 * Navegadores bloqueiam som antes da primeira interação — as chamadas falham em
 * silêncio até o usuário clicar/tocar em algo; depois funcionam normalmente.
 */

const KEY = 'nexus_sound'

/** Padrão: LIGADO. */
export function isSoundEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* sem storage — segue sem persistir */
  }
}

let audioCtx = null
function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

function tone({ freq = 880, dur = 0.12, type = 'sine', vol = 0.07, at = 0 }) {
  const c = ctx()
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

/** 💬 "ding-ding" suave quando chega mensagem. */
export function playMessageDing() {
  if (!isSoundEnabled()) return
  try {
    tone({ freq: 880, dur: 0.1 })
    tone({ freq: 1174.66, dur: 0.14, at: 0.08 }) // D6 — brilho
  } catch {
    /* autoplay bloqueado até interagir */
  }
}

/** 👋 "iii" acendendo quando um amigo entra online. */
export function playFriendOnlineChime() {
  if (!isSoundEnabled()) return
  try {
    tone({ freq: 523.25, dur: 0.1 })       // C5
    tone({ freq: 659.25, dur: 0.1, at: 0.09 })  // E5
    tone({ freq: 783.99, dur: 0.16, at: 0.18 }) // G5
  } catch {
    /* idem */
  }
}

/** ⚡ Quiz: acerto — "ti-ri-í" subindo. */
export function playQuizCorrect() {
  if (!isSoundEnabled()) return
  try {
    tone({ freq: 659.25, dur: 0.09, vol: 0.06 })            // E5
    tone({ freq: 987.77, dur: 0.14, vol: 0.06, at: 0.07 })  // B5
  } catch {
    /* autoplay bloqueado até interagir */
  }
}

/** ⚡ Quiz: erro — "bum" grave seco. */
export function playQuizWrong() {
  if (!isSoundEnabled()) return
  try {
    tone({ freq: 220, dur: 0.12, type: 'square', vol: 0.035 })
    tone({ freq: 164.81, dur: 0.18, type: 'square', vol: 0.035, at: 0.09 }) // E3
  } catch {
    /* idem */
  }
}

/** 🏆 Quiz: fim de partida — fanfarra de 4 notas. */
export function playQuizFinish() {
  if (!isSoundEnabled()) return
  try {
    tone({ freq: 523.25, dur: 0.1 })                      // C5
    tone({ freq: 659.25, dur: 0.1, at: 0.1 })             // E5
    tone({ freq: 783.99, dur: 0.12, at: 0.2 })            // G5
    tone({ freq: 1046.5, dur: 0.28, at: 0.32 })           // C6 — final triunfal
  } catch {
    /* idem */
  }
}
