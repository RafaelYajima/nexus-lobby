// Reproduz o fluxo de login exatamente como o app faz
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { inspect } from 'node:util'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
)

// Transport fake só para o script rodar no Node 20 (login não usa realtime)
class FakeWebSocket {
  constructor() {}
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  realtime: { transport: FakeWebSocket },
})

console.log('URL:', env.VITE_SUPABASE_URL, '\n')

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'adm@lobby.com',
  password: '123',
})

console.log('=== error (inspect completo) ===')
console.log(inspect(error, { depth: 10, showHidden: true }))
console.log('\n=== error.message ===', JSON.stringify(error?.message))
console.log('=== typeof message ===', typeof error?.message)
console.log('\n=== data.session existe? ===', Boolean(data?.session))
