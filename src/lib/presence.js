/** Configurações do sistema de presença (estilo Discord). */

export const PRESENCE_META = {
  online: {
    label: 'Online',
    dot: 'bg-emerald-500',
    text: 'text-emerald-500',
    emoji: '🟢',
    description: 'Seus amigos te veem como online.',
  },
  away: {
    label: 'Ausente',
    dot: 'bg-amber-400',
    text: 'text-amber-500',
    emoji: '🟡',
    description: 'Aparece ausente — com prazo opcional.',
  },
  invisible: {
    label: 'Invisível',
    dot: 'bg-zinc-400',
    text: 'text-zinc-400',
    emoji: '⚪',
    description: 'Ninguém te vê online. É como se estivesse offline.',
  },
}

export const PRESENCE_MODES = Object.keys(PRESENCE_META)

/** Opções de duração. minutes=null → permanente até o usuário mudar. */
export const DURATION_OPTIONS = [
  { id: 'permanent', label: 'Até eu mudar', minutes: null },
  { id: 'm30', label: '30 min', minutes: 30 },
  { id: 'h1', label: '1 hora', minutes: 60 },
  { id: 'h4', label: '4 horas', minutes: 240 },
  { id: 'custom', label: 'Escolher horário…', minutes: 'custom' },
]

const storageKey = (userId) => `nexus_presence_${userId}`

export function loadPresencePref(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { mode: 'online', until: null }
    const parsed = JSON.parse(raw)
    if (!PRESENCE_MODES.includes(parsed.mode)) return { mode: 'online', until: null }
    return { mode: parsed.mode, until: parsed.until ?? null }
  } catch {
    return { mode: 'online', until: null }
  }
}

export function savePresencePref(userId, pref) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(pref))
  } catch {
    /* storage cheio/bloqueado — segue sem persistir */
  }
}

/** Preferência expirada → volta para online. Retorna MESMO objeto se nada mudou. */
export function resolvePref(pref, nowTs = Date.now()) {
  if (pref.until && pref.until <= nowTs) return { mode: 'online', until: null }
  return pref
}

/** "até 18:40" / "até amanhã 08:00" / "até 20/09/2026 08:00" */
export function formatUntil(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const amanha = new Date(now)
  amanha.setDate(amanha.getDate() + 1)
  const sameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
  const hh = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (sameDay(d, now)) return `até ${hh}`
  if (sameDay(d, amanha)) return `até amanhã ${hh}`
  return `até ${d.toLocaleDateString('pt-BR')} ${hh}`
}
