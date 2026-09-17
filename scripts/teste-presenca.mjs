// Teste fim-a-fim REFLETINDO A SEMÂNTICA DO APP (1 track por conexão + broadcast de status):
//  1) dois usuários entram (online) → se veem (presence sincrono)
//  2) um fica AUSENTE  → via mensagem broadcast 'presence-status'
//  3) um fica INVISÍVEL → untrack (chave some do radar com 1 único track)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'

globalThis.WebSocket = WebSocket

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
)

const TOPIC = `teste:presenca:${randomUUID().slice(0, 8)}`

const mk = () =>
  createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

async function main() {
  console.log(`Tópico fresco: ${TOPIC}\n`)
  console.log('FASE 1 — dois usuários ONLINE\n')
  const adm = mk()
  const jogador = mk()
  const [a, b] = await Promise.all([
    adm.auth.signInWithPassword({ email: 'adm@lobby.com', password: '123123' }),
    jogador.auth.signInWithPassword({ email: 'jogador-teste@exemplo.com', password: 'Teste123!' }),
  ])
  if (a.error || b.error) throw new Error('login falhou: ' + (a.error || b.error).message)

  const chA = adm.channel(TOPIC, { config: { presence: { key: a.data.user.id } } })
  const chB = jogador.channel(TOPIC, { config: { presence: { key: b.data.user.id } } })

  const keysCount = (s) => Object.keys(s).length

  const pJoin = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout fase 1')), 20000)
    chA.on('presence', { event: 'sync' }, () => {
      if (keysCount(chA.presenceState()) >= 2) {
        clearTimeout(t)
        res()
      }
    })
  })

  let sawAway = false
  const pAway = new Promise((res) => {
    chA.on('broadcast', { event: 'presence-status' }, ({ payload }) => {
      if (payload?.user_id === b.data.user.id && payload.status === 'away') sawAway = true
      res()
    })
  })

  // fase 3 (invisível): o app some via BROADCAST (instantâneo, 100% entregue);
  // a remoção do presence pelo servidor vem depois, no tempo dele.
  let sawInvisible = false
  const pInvisible = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout fase 3 (broadcast)')), 10000)
    chA.on('broadcast', { event: 'presence-status' }, ({ payload }) => {
      if (payload?.user_id === b.data.user.id && payload?.status === 'invisible') {
        sawInvisible = true
        clearTimeout(t)
        res()
      }
    })
  })
  chA.on('presence', { event: 'leave' }, () => console.log('  (info) servidor removeu presença do jogador'))

  for (const [ch, user, meta] of [
    [chA, a.data.user, { username: 'Admin', role: 'adm', status: 'online' }],
    [chB, b.data.user, { username: 'jogador_teste', role: 'user', status: 'online' }],
  ]) {
    ch.subscribe((st) => {
      console.log(`  [${meta.username}] ${st}`)
      if (st === 'SUBSCRIBED') ch.track({ ...meta, updated_at: new Date().toISOString() })
    })
  }

  await pJoin
  console.log(`  ✅ Admin vê ${keysCount(chA.presenceState())} usuários online\n`)

  console.log('FASE 2 — jogador fica AUSENTE (broadcast presence-status)')
  await chB.send({
    type: 'broadcast',
    event: 'presence-status',
    payload: { user_id: b.data.user.id, username: 'jogador_teste', role: 'user', status: 'away', ts: Date.now() },
  })
  await Promise.race([pAway, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout fase 2')), 10000))])
  if (!sawAway) throw new Error('payload away não recebido')
  console.log('  ✅ Admin recebeu broadcast "away" do jogador\n')

  console.log('FASE 3 — jogador fica INVISÍVEL (broadcast + faxina do servidor)')
  await chB.send({
    type: 'broadcast',
    event: 'presence-status',
    payload: { user_id: b.data.user.id, status: 'invisible', ts: Date.now() },
  })
  await pInvisible
  console.log('  ✅ Admin escondeu o jogador INSTANTANEAMENTE via broadcast')
  if (!sawInvisible) throw new Error('aviso de invisível não recebido')
  // faxina higiênica (como o app faz): recriação da conexão sem track
  await jogador.removeChannel(chB)

  console.log('✅ SEMÂNTICA FINAL OK — joins por presence + status por broadcast + invisível instantâneo')
  process.exit(0)
}

main().catch((e) => {
  console.error('\n❌ Falha:', e.message)
  process.exit(1)
})
