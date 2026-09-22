import { Fragment } from 'react'
import { dayLabel, timeLabel } from '../../utils/time'

// Cor do autor derivada do id (estável): cada pessoa ganha um tom próprio no canal,
// estilo as cores de cargo do Discord.
const AUTHOR_TONES = [
  'from-violet-600 to-fuchsia-500',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-violet-600',
]
const NAME_TONES = [
  'text-violet-500 dark:text-violet-300',
  'text-cyan-600 dark:text-cyan-300',
  'text-emerald-600 dark:text-emerald-300',
  'text-amber-600 dark:text-amber-300',
  'text-rose-600 dark:text-rose-300',
  'text-indigo-600 dark:text-indigo-300',
]

const toneOf = (id) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h % AUTHOR_TONES.length
}

const GROUP_GAP_MS = 5 * 60 * 1000 // mesma pessoa em < 5 min agrupa

/**
 * Lista de mensagens estilo Discord: linhas em largura cheia, agrupadas por autor,
 * avatar só no início do grupo, hora no hover e divisores de dia.
 */
export default function MessageList({
  messages,
  meId,
  byId,
  emptyIcon = '🗨️',
  emptyTitle = 'Canal silencioso por aqui…',
  emptyHint,
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-3xl shadow-neon-violet">
          {emptyIcon}
        </span>
        <p className="mt-4 text-base font-extrabold text-zinc-900 dark:text-zinc-50">{emptyTitle}</p>
        {emptyHint && (
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-400 dark:text-zinc-500">
            {emptyHint}
          </p>
        )}
      </div>
    )
  }

  let lastDay = ''
  let prev = null

  return (
    <div className="space-y-0.5">
      {messages.map((m) => {
        const day = new Date(m.created_at).toDateString()
        const showSep = day !== lastDay
        lastDay = day

        const mine = m.sender_id === meId
        const author = byId[m.sender_id] ?? {}
        const grouped =
          !showSep &&
          prev &&
          prev.sender_id === m.sender_id &&
          new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < GROUP_GAP_MS
        prev = m

        const t = toneOf(m.sender_id)

        return (
          <Fragment key={m.id}>
            {showSep && (
              <div className="flex items-center gap-3 pb-2 pt-4 first:pt-1">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  {dayLabel(m.created_at)}
                </span>
                <span className="h-px flex-1 bg-zinc-200 dark:bg-white/10" />
              </div>
            )}

            <div
              className={`group flex gap-3 rounded-xl px-2 py-1 transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04] ${
                grouped ? '' : 'mt-2'
              } ${mine ? 'flex-row-reverse' : ''}`}
            >
              {/* avatar / hover-timestamp */}
              <div className="w-9 shrink-0">
                {grouped ? (
                  <span
                    className={`block pt-0.5 text-[10px] leading-6 text-zinc-400 opacity-0 transition group-hover:opacity-100 ${
                      mine ? 'text-left' : 'text-right'
                    }`}
                  >
                    {timeLabel(m.created_at)}
                  </span>
                ) : (
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-black text-white shadow ${
                      mine ? 'from-violet-600 to-fuchsia-500' : AUTHOR_TONES[t]
                    }`}
                  >
                    {(author.username || '?').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>

              <div className={`min-w-0 flex-1 ${mine ? 'text-right' : ''}`}>
                {!grouped && (
                  <p
                    className={`flex flex-wrap items-baseline gap-x-2 ${
                      mine ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span
                      className={`text-sm font-extrabold ${
                        mine ? 'text-violet-600 dark:text-violet-300' : NAME_TONES[t]
                      }`}
                    >
                      {author.username ?? 'jogador'}
                    </span>
                    {author.tag && (
                      <span className="font-mono text-[10px] text-zinc-400">#{author.tag}</span>
                    )}
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {timeLabel(m.created_at)}
                    </span>
                  </p>
                )}
                {mine ? (
                  <span className="inline-block max-w-[85%] whitespace-pre-wrap break-words rounded-xl bg-violet-600/12 px-3 py-1.5 text-left text-sm leading-relaxed text-zinc-800 ring-1 ring-violet-500/20 dark:bg-violet-500/15 dark:text-zinc-100">
                    {m.content}
                  </span>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
                    {m.content}
                  </p>
                )}
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
