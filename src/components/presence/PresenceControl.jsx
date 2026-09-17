import { useState } from 'react'
import { usePresence } from '../../context/PresenceContext'
import { DURATION_OPTIONS, PRESENCE_META, PRESENCE_MODES, formatUntil } from '../../lib/presence'

/**
 * Seletor de status estilo Discord:
 * 🟢 Online / 🟡 Ausente / ⚪ Invisível
 * Ausente e Invisível aceitam duração: permanente, 30min, 1h, 4h ou horário escolhido.
 */
export default function PresenceControl() {
  const { pref, effectiveStatus, isIdle, setPresence, setPresenceUntil } = usePresence()
  const [pendingMode, setPendingMode] = useState(null)
  const [duration, setDuration] = useState('permanent')
  const [customTs, setCustomTs] = useState('')
  const [customErr, setCustomErr] = useState('')

  const meta = PRESENCE_META[effectiveStatus]

  const clickMode = (mode) => {
    if (mode === 'online') {
      setPresence('online')
      setPendingMode(null)
      return
    }
    setPendingMode(pendingMode === mode ? null : mode)
    setDuration('permanent')
    setCustomErr('')
  }

  const clickDuration = (opt) => {
    if (!pendingMode) return
    if (opt.minutes === 'custom') {
      setDuration('custom')
      return
    }
    setPresence(pendingMode, opt.minutes)
    setPendingMode(null)
  }

  const applyCustom = () => {
    const ts = new Date(customTs).getTime()
    if (!customTs || Number.isNaN(ts) || ts <= Date.now()) {
      setCustomErr('Escolha um horário no futuro.')
      return
    }
    setPresenceUntil(pendingMode, ts)
    setCustomErr('')
    setCustomTs('')
    setPendingMode(null)
  }

  const statusLine = () => {
    if (effectiveStatus === 'away' && pref.mode === 'online' && isIdle)
      return `Sem atividade há 10+ minutos — seus amigos te veem como Ausente. Mexa no mouse/teclado para voltar.`
    if (pref.mode === 'away')
      return `Seus amigos te veem como Ausente ${pref.until ? formatUntil(pref.until) : 'até você mudar'}.`
    if (pref.mode === 'invisible')
      return `Você aparece offline para todo mundo ${pref.until ? formatUntil(pref.until) : 'até você mudar'}.`
    return 'Seus amigos te veem como online. Após 10 minutos parado, você vira 🟡 Ausente automaticamente.'
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${meta.dot}`} />
          <div>
            <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
              Seu status: {meta.emoji} {meta.label}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{statusLine()}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESENCE_MODES.map((mode) => {
            const m = PRESENCE_META[mode]
            const active = pref.mode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => clickMode(mode)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                  active
                    ? 'border-violet-500/60 bg-violet-600/10 text-violet-600 dark:text-violet-300'
                    : 'border-zinc-200 text-zinc-500 hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${m.dot}`} />
                {m.label}
                {active && mode !== 'online' && <span className="opacity-60">▾</span>}
              </button>
            )
          })}
        </div>
      </div>

      {pendingMode && (
        <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 p-3.5 dark:border-white/10">
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Ficar {PRESENCE_META[pendingMode].emoji} {PRESENCE_META[pendingMode].label} por quanto
            tempo?
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => clickDuration(opt)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  duration === opt.id && opt.minutes === 'custom'
                    ? 'border-violet-500/60 bg-violet-600/10 text-violet-600 dark:text-violet-300'
                    : 'border-zinc-200 text-zinc-500 hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {duration === 'custom' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="datetime-local"
                value={customTs}
                onChange={(e) => setCustomTs(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-xs text-zinc-700 outline-none transition focus:border-violet-500 dark:border-white/10 dark:text-zinc-200"
              />
              <button
                type="button"
                onClick={applyCustom}
                className="rounded-xl bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
              >
                Aplicar
              </button>
              {customErr && <p className="text-xs text-rose-500">{customErr}</p>}
            </div>
          )}

          <p className="mt-2.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            ⏱️ Quando o prazo acabar, você volta para 🟢 Online sozinho (mesmo com o app aberto).
          </p>
        </div>
      )}
    </section>
  )
}
