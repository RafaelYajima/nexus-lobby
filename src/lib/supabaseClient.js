import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

/**
 * true somente quando o .env foi preenchido com credenciais reais.
 * Enquanto isso a interface funciona, mas as chamadas de auth ficam bloqueadas na UI.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    !supabaseUrl.includes('SEU-PROJETO') &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.includes('sua-chave')
)

// Cliente único usado no app inteiro. Com placeholders, usa valores dummy
// válidos só para não quebrar a renderização (nenhuma chamada é disparada).
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key-0000000000000000'
)
