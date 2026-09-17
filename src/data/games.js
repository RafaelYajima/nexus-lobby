/**
 * Catálogo de jogos e banners do lobby.
 * Os jogos ainda são placeholders ("Em breve") — os banners funcionam como
 * vitrine/promo enquanto os jogos não ficam prontos.
 */

export const GAMES = [
  {
    id: 'brawl',
    name: 'Arena Brawl',
    desc: 'Batalhas PvP intensas em arenas fechadas. Último em pé vence.',
    emoji: '⚔️',
    accent: 'from-violet-600 to-fuchsia-500',
    tag: 'PvP',
    badge: 'POPULAR',
  },
  {
    id: 'racing',
    name: 'Corrida Neon',
    desc: 'Velocidade pura em pistas futuristas iluminadas a neon.',
    emoji: '🏎️',
    accent: 'from-cyan-500 to-blue-600',
    tag: 'Corrida',
    badge: 'NOVO',
  },
  {
    id: 'tower',
    name: 'Torre Mística',
    desc: 'RPG de estratégia: suba andares, derrote guardiões, colete relíquias.',
    emoji: '🏰',
    accent: 'from-emerald-500 to-teal-600',
    tag: 'RPG',
  },
  {
    id: 'quiz',
    name: 'Quiz Relâmpago',
    desc: 'Perguntas rápidas contra o relógio e ranking global.',
    emoji: '⚡',
    accent: 'from-amber-500 to-rose-500',
    tag: 'Casual',
  },
  {
    id: 'orbital',
    name: 'Defesa Orbital',
    desc: 'Proteja a estação espacial de ondas de invasores alienígenas.',
    emoji: '🛰️',
    accent: 'from-indigo-500 to-blue-700',
    tag: 'Estratégia',
    badge: 'NOVO',
  },
  {
    id: 'maze',
    name: 'Labirinto Sombrio',
    desc: 'Encontre a saída antes que a luz da sua tocha acabe.',
    emoji: '🧩',
    accent: 'from-fuchsia-600 to-purple-800',
    tag: 'Puzzle',
  },
]

export const BANNERS = [
  {
    id: 'bn-brawl',
    eyebrow: 'Mais jogado da semana',
    title: 'Arena Brawl',
    desc: 'A arena está pegando fogo! Monte sua estratégia e dispute o topo do ranking com jogadores do mundo inteiro.',
    emoji: '⚔️',
    accent: 'from-violet-700 via-fuchsia-600 to-pink-500',
    cta: 'Explorar jogos ↓',
  },
  {
    id: 'bn-racing',
    eyebrow: 'Novidade na pista',
    title: 'Corrida Neon',
    desc: 'Novos circuitos chegando: deslize pelas curvas da cidade neon e bata seus próprios recordes de velocidade.',
    emoji: '🏎️',
    accent: 'from-cyan-600 via-sky-600 to-indigo-600',
    cta: 'Explorar jogos ↓',
  },
  {
    id: 'bn-tourney',
    eyebrow: 'Evento da comunidade',
    title: '1º Torneio NEXUS',
    desc: 'Prepare-se: o primeiro torneio oficial da comunidade vem aí, com direito a troféus exclusivos no perfil. Inscrições em breve!',
    emoji: '🏆',
    accent: 'from-amber-500 via-orange-500 to-rose-600',
    cta: 'Explorar jogos ↓',
  },
]
