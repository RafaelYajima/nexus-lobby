/** Estilos do selo de cada papel */
export const ROLE_STYLES = {
  adm: {
    label: 'ADMIN',
    className:
      'border border-fuchsia-400/50 bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-neon-violet',
  },
  mod: {
    label: 'MOD',
    className: 'border border-cyan-500/50 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
  },
  user: {
    label: 'JOGADOR',
    className: 'border border-zinc-400/40 bg-zinc-500/10 text-zinc-500 dark:text-zinc-400',
  },
}

export default function RoleBadge({ role, size = 'md' }) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.user
  const sizing = size === 'sm' ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'
  return (
    <span
      className={`inline-flex items-center rounded-md font-bold tracking-widest ${sizing} ${style.className}`}
    >
      {style.label}
    </span>
  )
}
