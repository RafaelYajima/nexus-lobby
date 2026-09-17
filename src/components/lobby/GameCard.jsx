/**
 * Card de jogo da grade: arte em gradiente com emoji animado no hover,
 * selo de marketing (POPULAR/NOVO), categoria e botão "Em breve".
 */
export default function GameCard({ game }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-violet-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-violet-400/30 dark:hover:shadow-neon-violet">
      {/* arte */}
      <div className={`relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br ${game.accent}`}>
        <div className="absolute inset-0 bg-grid opacity-25" aria-hidden="true" />
        <span
          className="text-5xl drop-shadow-lg transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-125"
          aria-hidden="true"
        >
          {game.emoji}
        </span>
        {game.badge && (
          <span className="absolute left-3 top-3 rounded-md bg-black/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-sm">
            {game.badge === 'POPULAR' ? '🔥' : '✨'} {game.badge}
          </span>
        )}
      </div>

      {/* informações */}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-zinc-900 dark:text-white">{game.name}</h3>
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            {game.tag}
          </span>
        </div>
        <p className="mt-1.5 min-h-[2.5rem] text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          {game.desc}
        </p>
        <button
          type="button"
          disabled
          className="mt-3 w-full cursor-not-allowed rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-semibold uppercase tracking-widest text-zinc-400 transition-colors group-hover:border-violet-400/50 group-hover:text-violet-500 dark:border-white/15 dark:text-zinc-500 dark:group-hover:border-violet-400/40 dark:group-hover:text-violet-300"
        >
          Em breve
        </button>
      </div>
    </div>
  )
}
