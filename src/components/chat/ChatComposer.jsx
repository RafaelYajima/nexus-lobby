import { useState } from 'react'

/**
 * Barra de digitar estilo Discord: uma única barra com textarea e botão enviar embutido.
 * @props placeholder, maxChars, onSend(text) → Promise<{ok, message?}>
 */
export default function ChatComposer({ placeholder, maxChars = 500, onSend }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e?.preventDefault()
    if (sending || !draft.trim()) return
    setSending(true)
    setErr('')
    const res = await onSend(draft)
    setSending(false)
    if (res?.ok) setDraft('')
    else setErr(res?.message ?? 'Não consegui enviar essa mensagem.')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit}>
      {err && <p className="mb-2 text-xs text-rose-500">{err}</p>}
      <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-soft transition focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/30 dark:border-white/10 dark:bg-ink-800">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={maxChars}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-32 w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed text-zinc-800 outline-none placeholder-zinc-400 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Enviar mensagem"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-base text-white shadow-neon-violet transition hover:bg-violet-500 active:scale-95 disabled:bg-zinc-300 disabled:shadow-none disabled:opacity-60 dark:disabled:bg-zinc-700"
        >
          ➤
        </button>
      </div>
      <p className="mt-1.5 hidden text-[10px] text-zinc-400 sm:block dark:text-zinc-500">
        Enter envia · Shift+Enter quebra linha · até {maxChars} caracteres
      </p>
    </form>
  )
}
