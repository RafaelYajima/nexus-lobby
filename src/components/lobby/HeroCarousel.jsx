import { useCallback, useEffect, useState } from 'react'
import { BANNERS } from '../../data/games'

const IconChevron = ({ dir = 'left' }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
)

/**
 * Banner rotativo do lobby: autoplay (pausa com o mouse em cima),
 * setas e indicadores. O CTA rola a página até a grade de jogos.
 */
export default function HeroCarousel({ onCta }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = BANNERS.length

  const go = useCallback(
    (i) => setIndex(((i % count) + count) % count),
    [count]
  )

  useEffect(() => {
    if (paused || count < 2) return undefined
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 5200)
    return () => clearInterval(t)
  }, [paused, count])

  return (
    <section
      className="group relative h-60 overflow-hidden rounded-3xl border border-zinc-200/60 shadow-xl shadow-zinc-900/5 sm:h-72 lg:h-80 dark:border-white/10 dark:shadow-black/40"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Destaques do lobby"
    >
      {BANNERS.map((b, i) => {
        const active = i === index
        return (
          <article
            key={b.id}
            aria-hidden={!active}
            className={`absolute inset-0 bg-gradient-to-br transition-all duration-700 ease-out ${b.accent} ${
              active
                ? 'pointer-events-auto translate-x-0 opacity-100'
                : 'pointer-events-none translate-x-8 opacity-0'
            }`}
          >
            {/* texturas */}
            <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" aria-hidden="true" />

            {/* emoji gigante decorativo */}
            <span
              className="absolute -right-2 top-1/2 hidden -translate-y-1/2 animate-float text-[9rem] leading-none opacity-25 sm:block sm:text-[11rem] lg:text-[13rem]"
              aria-hidden="true"
            >
              {b.emoji}
            </span>

            {/* conteúdo */}
            <div className="relative z-10 flex h-full flex-col justify-center gap-2.5 p-6 sm:gap-3 sm:p-10">
              <span className="w-fit rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                {b.eyebrow}
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
                {b.title}
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-white/85 sm:text-base">{b.desc}</p>
              <div>
                <button
                  type="button"
                  onClick={onCta}
                  className="mt-1 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                >
                  {b.cta}
                </button>
              </div>
            </div>
          </article>
        )
      })}

      {/* setas */}
      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Banner anterior"
        className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-90"
      >
        <IconChevron dir="left" />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Próximo banner"
        className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white backdrop-blur-sm transition hover:bg-black/50 active:scale-90"
      >
        <IconChevron dir="right" />
      </button>

      {/* indicadores */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`Ir para o banner: ${b.title}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
