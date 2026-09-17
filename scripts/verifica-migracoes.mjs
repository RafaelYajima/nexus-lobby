import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
globalThis.WebSocket = WebSocket
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
)
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
await sb.auth.signInWithPassword({ email: 'jogador-teste@exemplo.com', password: 'Teste123!' })
console.log('logado como jogador-teste (usuário comum)\n')

// v4: policy pública de perfis (busca de amigos) — usuário comum consegue ver OUTROS?
const { data: profs, error: e1 } = await sb.from('profiles').select('username, tag, role').limit(10)
if (e1) console.log('❌ perfis públicos:', e1.message)
else {
  console.log(`✅ v4 perfis visíveis p/ autenticados: ${profs.length} perfil(is) visíveis`)
  profs.forEach((p) => console.log(`   - ${p.username}${p.tag ? ' #' + p.tag : ' (sem tag)'} [${p.role ?? 'user'}]`))
}

// v3: tag existe e preenchida?
const temTagOk = !e1 && profs.some((p) => p.role !== 'adm' && p.tag && /^\d{4}$/.test(p.tag))
console.log(temTagOk ? '✅ v3 tags: coluna existe e há usuários com tag ####' : '⚠️ v3 tags: nenhum usuário comum com tag #### (v3 não rodou ou só há adm)')

// v4: tabela friendships existe?
const { error: e2 } = await sb.from('friendships').select('id').limit(1)
if (!e2) console.log('✅ v4 tabela friendships: existe e policies permitem select'); else console.log('❌ v4 friendships:', e2.code, e2.message);
