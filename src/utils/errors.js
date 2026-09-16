/**
 * Extrai uma mensagem de erro legível de qualquer formato que o Supabase
 * devolver (AuthError, PostgrestError, erros de rede, objetos vazios...).
 */
export function extractErrorMessage(err) {
  if (!err) return ''
  if (typeof err === 'string') return err
  const candidates = [err.message, err.msg, err.error_description, err.error]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() && c !== '{}') return c
  }
  // Erros tipo AuthRetryableFetchError com corpo {}: usa o nome/código
  if (typeof err.name === 'string' && err.name && !err.name.startsWith('Auth')) return err.name
  return ''
}

/**
 * Traduz erros do Supabase Auth para PT-BR amigável.
 * Aceita string ou o objeto de erro completo.
 */
export function translateError(errOrMessage) {
  const message =
    typeof errOrMessage === 'string' ? errOrMessage : extractErrorMessage(errOrMessage)

  const FALLBACK = 'Erro inesperado no servidor. Aguarde um instante e tente de novo.'
  if (!message) return FALLBACK

  const rules = [
    ['Invalid login credentials', 'E-mail ou senha incorretos.'],
    ['User already registered', 'Este e-mail já está cadastrado. Tente entrar.'],
    ['already registered', 'Este e-mail já está cadastrado. Tente entrar.'],
    ['Password should be at least', 'A senha deve ter pelo menos 6 caracteres.'],
    ['weak password', 'Senha muito fraca. Use letras, números e símbolos.'],
    ['Email not confirmed', 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'],
    ['Unable to validate email', 'Formato de e-mail inválido.'],
    ['unexpected_failure', 'O servidor de autenticação teve uma falha. Tente de novo em instantes.'],
    ['Database error', 'O servidor teve um erro interno. Tente de novo em instantes.'],
    ['rate limit', 'Muitas tentativas. Aguarde alguns segundos e tente novamente.'],
    ['For security purposes', 'Aguarde alguns segundos antes de tentar novamente.'],
    ['Signups not allowed', 'Cadastros temporariamente desativados.'],
    ['profiles_username_key', 'Este nome de usuário já está em uso. Escolha outro.'],
    ['duplicate key', 'Este nome de usuário já está em uso. Escolha outro.'],
    ['Failed to fetch', 'Sem conexão com o servidor. Verifique sua internet.'],
    ['NetworkError', 'Sem conexão com o servidor. Verifique sua internet.'],
    ['fetch', 'Sem conexão com o servidor. Verifique sua internet.'],
  ]
  const lower = message.toLowerCase()
  for (const [key, text] of rules) {
    if (lower.includes(key.toLowerCase())) return text
  }
  return message
}
