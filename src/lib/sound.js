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
