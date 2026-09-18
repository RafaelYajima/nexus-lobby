/** Helpers de tempo compartilhados pelos chats. */
export function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function dayLabel(iso) {
  const d = new Date(iso)
  const now = new Date()
  const ontem = new Date(now)
  ontem.setDate(ontem.getDate() - 1)
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, now)) return 'Hoje'
  if (sameDay(d, ontem)) return 'Ontem'
  return d.toLocaleDateString('pt-BR')
}
