// Valida o pipeline oficial: signUp + signIn de um usuario de teste
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
)

class FakeWebSocket {
  constructor() {}
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  realtime: { transport: FakeWebSocket },
  auth: { persistSession: false },
})

const email = 'jogador-teste@exemplo.com'
const password = 'Teste123!'

console.log('== 1. signUp (pode falhar se ja existir - tudo bem) ==')
const up = await supabase.auth.signUp({
  email,
  password,
  options: { data: { username: 'jogador_teste' } },
})
console.log('erro:', up.error?.message ?? 'nenhum')
if (up.data?.user) {
  console.log('user id:', up.data.user.id)
  console.log('identities (estrutura nativa do GoTrue):')
  console.log(JSON.stringify(up.data.user.identities, null, 2))
  console.log('session criada?', Boolean(up.data.session))
}

console.log('\n== 2. signIn ==')
const client2 = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  realtime: { transport: FakeWebSocket },
  auth: { persistSession: false },
})
const si = await client2.auth.signInWithPassword({ email, password })
console.log('erro:', si.error ? `${si.error.name} | ${si.error.message} | status ${si.error.status}` : 'nenhum')
console.log('logou?', Boolean(si.data?.session))
