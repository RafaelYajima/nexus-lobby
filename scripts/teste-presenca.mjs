// Teste fim-a-fim da presença: DOIS usuários entram no canal 'lobby:online'
// e cada um deve enxergar 2 pessoas online.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import WebSocket from 'ws'

globalThis.WebSocket = WebSocket // Node 20 não tem WebSocket nativo

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
)

const mk = () =>
  createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

const ACCOUNTS = [
  { email: 'adm@lobby.com', password: '123123', meta: { username: 'Admin', role: 'adm' } },
  { email: 'jogador-teste@exemplo.com', password: 'Teste123!', meta: { username: 'jogador_teste', role: 'user' } },
]

async function loginAndJoin(acc) {
  const client = mk()
  const { data, error } = await client.auth.signInWithPassword({
    email: acc.email,
    password: acc.password,
  })
  if (error) throw new Error(`login ${acc.email}: ${error.message}`)
  const id = data.user.id

  return new Promise((resolve) => {
    const ch = client.channel('lobby:online', { config: { presence: { key: id } } })
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState()
      const keys = Object.keys(state)
      console.log(`[${acc.meta.username}] sync -> ${keys.length} online`)
      if (keys.length >= 2) resolve(keys.length)
    }).subscribe(async (status) => {
      console.log(`[${acc.meta.username}] status: ${status}`)
      if (status === 'SUBSCRIBED') await ch.track({ ...acc.meta, online_at: new Date().toISOString() })
      if (status === 'CHANNEL_ERROR') resolve(-1)
    })
  })
}

console.log('Conectando dois usuários ao canal lobby:online...\n')
try {
  const results = await Promise.race([
    Promise.all(ACCOUNTS.map(loginAndJoin)),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
  ])
  if (results.every((n) => n >= 2)) {
    console.log('\n✅ PRESENÇA OK — os dois usuários se enxergam online!')
  } else {
    console.log('\n⚠️ Resultado parcial:', results)
  }
} catch (e) {
  console.log('\n⚠️ Não confirmou a tempo (', e.message, ')')
  console.log('Verifique se Realtime está habilitado no projeto (Database -> Replication / Realtime).')
}
process.exit(0)
