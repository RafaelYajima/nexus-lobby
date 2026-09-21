import { Link, useLocation, useParams } from 'react-router-dom'
import { useRooms } from '../../hooks/useRooms'
import Logo from '../Logo'

const RAIL_BTN =
  'group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl text-sm font-black transition-all duration-150 hover:rounded-xl'
const PILL = (on) =>
  `absolute -left-4 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-zinc-800 transition-all dark:bg-white ${
    on ? 'h-9' : 'h-0 group-hover:h-4'
  }`

/** Trilha esquerda estilo Discord: Início + seus servidores + ➕ criar/explorar. */
export default function ServerRail() {
  const { rooms } = useRooms()
  const { roomId } = useParams()
  const { pathname } = useLocation()
  const homeActive = !pathname.startsWith('/salas/')

  return (
    <nav
      aria-label="Servidores"
      className="relative flex w-[76px] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-zinc-200/70 bg-zinc-100 py-3 dark:border-white/5 dark:bg-ink-950"
    >
      <span className={RAIL_BTN + ' bg-white shadow dark:bg-ink-800'} title="Início">
        <Link to="/lobby" aria-label="Início" className="grid h-full w-full place-items-center">
          <Logo size={22} withGlow={false} />
        </Link>
        <span className={PILL(homeActive)} />
      </span>

      <span className="my-1 h-px w-8 shrink-0 bg-zinc-300 dark:bg-white/10" />

      {(rooms ?? []).slice(0, 12).map((room) => {
        const active = roomId === room.id
        return (
          <span
            key={room.id}
            className={`${RAIL_BTN} ${
              active
                ? 'rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-neon-violet'
                : 'bg-white text-zinc-600 hover:bg-violet-600 hover:text-white dark:bg-ink-800 dark:text-zinc-300'
            }`}
            title={room.name}
          >
            <Link
              to={`/salas/${room.id}`}
              aria-label={`Servidor ${room.name}`}
              className="grid h-full w-full place-items-center"
            >
              {(room.name || '?').slice(0, 1).toUpperCase()}
            </Link>
            <span className={PILL(active)} />
          </span>
        )
      })}

      <span
        className={`${RAIL_BTN} mt-1 border-2 border-dashed border-zinc-300 text-emerald-600 text-xl hover:border-emerald-500 dark:border-white/15 dark:text-emerald-400`}
        title="Criar ou explorar servidores"
      >
        <Link to="/salas" aria-label="Criar ou explorar servidores" className="grid h-full w-full place-items-center">
          +
        </Link>
      </span>
    </nav>
  )
}
