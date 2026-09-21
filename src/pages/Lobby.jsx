import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import FriendsOnlineStrip from '../components/lobby/FriendsOnlineStrip'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Boa madrugada'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const ACTIONS = [
  {
    to: '/salas',
    emoji: '🏰',
    accent: 'from-violet-600 to-fuchsia-500',
    title: 'Servidores da galera',
    desc: 'Crie a sua casa ou entre na dos amigos — canais de texto rolando agora.',
    cta: 'Abrir servidores →',
  },
  {
    to: '/amigos',
    emoji: '👥',
    accent: 'from-cyan-500 to-blue-600',
    title: 'Conversar com amigos',
    desc: 'Conversa privada com quem você adicionou — veja quem tá online.',
    cta: 'Ver amigos →',
  },
  {
    to: null,
    emoji: '🎙️',
    accent: 'from-emerald-500 to-teal-600',
    title: 'Canais de voz',
    desc: 'Falar ao vivo dentro do servidor, mutar, ouvir a galera jogando.',
    cta: 'No próximo capítulo…',
    soon: true,
  },
]

/**
 * Home: hub rápido estilo Discord (servidores, amigos, e o que vem por aí).
 * Jogos/vitrine ficam escondidos por ora — retornam como extras.
 */
export default function Lobby() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const username =
    profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'jogador'

  return (
    <div className="relative min-h-screen bg-zinc-100 dark:bg-ink-950">
      {/* textura de fundo */}
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-500/15 blur-[120px]" aria-hidden="true" />

      <AppHeader />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:pb-16">
        {/* saudação */}
        <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">{getGreeting()},</p>
            <h1 className="mt-0.5 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              <span className="text-gradient">{username}</span> 👋
            </h1>
          </div>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">Bora conversar com a galera?</p>
        </section>

        <div className="mb-6">
          <FriendsOnlineStrip />
        </div>

        {/* ações rápidas */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map((a) => {
            const inner = (
              <>
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow ${a.accent}`}
                >
                  {a.emoji}
                </span>
                <span className="mt-3 block truncate text-base font-extrabold text-zinc-900 dark:text-zinc-50">
                  {a.title}
                  {a.soon && (
                    <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      em breve
                    </span>
                  )}
                </span>
                <span className="mt-1 block min-h-8 text-xs text-zinc-500 dark:text-zinc-400">
                  {a.desc}
                </span>
                <span
                  className={`mt-3 text-xs font-extrabold ${
                    a.soon
                      ? 'text-zinc-300 dark:text-zinc-600'
                      : 'text-violet-600 dark:text-violet-300'
                  }`}
                >
                  {a.cta}
                </span>
              </>
            )
            return a.to ? (
              <Link
                key={a.title}
                to={a.to}
                className="group rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-violet-400/60 hover:shadow-lg hover:shadow-violet-500/10 dark:border-white/10 dark:bg-ink-900"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={a.title}
                className="relative rounded-3xl border border-dashed border-zinc-200 bg-white/60 p-5 opacity-80 dark:border-white/10 dark:bg-ink-900/60"
              >
                {inner}
              </div>
            )
          })}
        </section>

        {/* nota de capítulo */}
        <section className="mt-6 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-fuchsia-500/5 p-5 dark:border-violet-400/20">
          <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
            🚀 O NEXUS virou a sua casa de conversa
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Estamos em reforma pra ficar ainda melhor: primeiro canais de 🎙️ <strong>voz</strong>
            {' '}dentro dos servidores, depois vídeo e chamadas diretas. Os jogos fazem uma pausa
            e voltam como bônus — o que você fez neles (ranking, partidas) segue guardado.
          </p>
        </section>

        <footer className="mt-14 border-t border-zinc-200/70 pt-6 text-center text-xs text-zinc-400 dark:border-white/5 dark:text-zinc-600">
          © 2026 NEXUS · Sua galera, um clique de distância 💜
        </footer>
      </main>
    </div>
  )
}
