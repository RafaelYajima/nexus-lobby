import { useEffect, useState } from 'react'
import { useTheme } from '../../context/ThemeContext'

function Switch({ checked, onChange, label, desc }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">{label}</span>
        {desc && (
          <span className="mt-0.5 block text-xs text-zinc-400 dark:text-zinc-500">{desc}</span>
        )}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500' : 'bg-zinc-200 dark:bg-white/10'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}

function SectionTitle({ children }) {
  return (
    <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
      {children}
    </h3>
  )
}

/**
 * Painel de configurações do jogador.
 * - Tema: salvo no perfil do Supabase (via ThemeContext);
 * - Reduzir animações: preferência local aplicada no documento;
 * - Idioma: preparado para o futuro.
 */
export default function SettingsCard() {
  const { theme, setTheme } = useTheme()
  const [reduceMotion, setReduceMotion] = useState(() => {
    try {
      return localStorage.getItem('nexus-reduce-motion') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    try {
      localStorage.setItem('nexus-reduce-motion', reduceMotion ? '1' : '0')
    } catch {
      /* noop */
    }
  }, [reduceMotion])

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
        <span aria-hidden="true">⚙️</span> Configurações
      </h2>

      <div className="mt-5 space-y-6">
        {/* Aparência */}
        <div className="space-y-2.5">
          <SectionTitle>Aparência</SectionTitle>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-white/5">
            {[
              { v: 'light', label: '☀️ Claro' },
              { v: 'dark', label: '🌙 Escuro' },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setTheme(opt.v)}
                aria-pressed={theme === opt.v}
                className={`rounded-lg py-2 text-sm font-semibold transition-all ${
                  theme === opt.v
                    ? 'bg-white text-zinc-900 shadow dark:bg-white/10 dark:text-white dark:shadow-neon-violet'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
            Salvo no seu perfil — vale em qualquer dispositivo que você entrar.
          </p>
        </div>

        {/* Acessibilidade */}
        <div className="space-y-2.5 border-t border-zinc-100 pt-5 dark:border-white/5">
          <SectionTitle>Acessibilidade</SectionTitle>
          <Switch
            checked={reduceMotion}
            onChange={setReduceMotion}
            label="Reduzir animações"
            desc="Desliga movimentos e transições da interface neste dispositivo."
          />
        </div>

        {/* Idioma */}
        <div className="space-y-2.5 border-t border-zinc-100 pt-5 dark:border-white/5">
          <SectionTitle>Idioma</SectionTitle>
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.03]">
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              🇧🇷 Português (BR)
            </span>
            <span className="rounded-md bg-zinc-200/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
              Em breve
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
