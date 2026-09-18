import { NavLink } from 'react-router-dom'
import { useUnread } from '../context/UnreadContext'

/**
 * 📱 Navegação inferior para telas pequenas (o nav principal fica escondido
 * abaixo de md). Renderiza de páginas logadas via AppHeader.
 */
const ITEMS = [
  { to: '/lobby', icon: '🏠', label: 'Lobby' },
  { to: '/amigos', icon: '👥', label: 'Amigos' },
  { to: '/salas', icon: '🎮', label: 'Salas' },
  { to: '/ranking', icon: '🏆', label: 'Ranking' },
]

export default function MobileNav() {
  const { totalUnread } = useUnread()
  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/70 bg-white/85 backdrop-blur-xl dark:border-white/5 dark:bg-ink-950/85 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-extrabold transition ${
                isActive
                  ? 'text-violet-600 dark:text-violet-300'
                  : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`
            }
          >
            <span className="relative text-lg leading-none">
              {item.icon}
              {item.to === '/amigos' && totalUnread > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
