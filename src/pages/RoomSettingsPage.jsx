import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useRooms } from '../hooks/useRooms'
import { useRoomChannels } from '../hooks/useRoomChannels'

/**
 * ⚙️ Configurações do servidor (só o dono): renomear, gerenciar canais
 * de texto/voz (Migração v14) e fechar o servidor.
 */
export default function RoomSettingsPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { close } = useRooms()
  const { channels, loading: chLoading, available, add, rename, remove } = useRoomChannels(roomId)

  const [room, setRoom] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const [roomName, setRoomName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [msg, setMsg] = useState('') // feedback geral (ok/erro)
  const [isErr, setIsErr] = useState(false)

  const [newText, setNewText] = useState('')
  const [newVoice, setNewVoice] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)

  const isOwner = useMemo(
    () => room && user && room.created_by === user.id,
    [room, user]
  )

  useEffect(() => {
    if (!user || !roomId || !isSupabaseConfigured) return
    let cancelled = false
    supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) setNotFound(true)
        else {
          setRoom(data)
          setRoomName(data.name)
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, roomId])

  const say = (text, err = false) => {
    setIsErr(err)
    setMsg(text)
    window.setTimeout(() => setMsg(''), 3500)
  }

  const saveRoomName = async () => {
    if (savingName) return
    const name = roomName.trim()
    if (name.length < 2) return say('Nome do servidor: mín. 2 letras.', true)
    setSavingName(true)
    const { error } = await supabase
      .from('rooms')
      .update({ name })
      .eq('id', roomId)
      .eq('created_by', user.id)
    setSavingName(false)
    if (error) return say('Não consegui salvar o nome.', true)
    setRoom((r) => ({ ...r, name }))
    say('Nome do servidor salvo ✨')
  }

  const createChannel = async (type, raw, reset) => {
    if (busy) return
    setBusy(true)
    const res = await add(type, raw)
    setBusy(false)
    if (res.ok) {
      reset('')
      say(type === 'text' ? `Canal # criado 🎉` : `Canal 🔊 criado 🎉`)
    } else say(res.message, true)
  }

  const saveRename = async (c) => {
    if (busy) return
    setBusy(true)
    const res = await rename(c.id, editName)
    setBusy(false)
    if (!res.ok) return say(res.message, true)
    setEditingId(null)
    say('Canal renomeado ✏️')
  }

  const deleteChannel = async (c) => {
    if (busy) return
    const texts = channels.filter((x) => x.type === 'text')
    if (c.type === 'text' && texts.length <= 1) {
      return say('O servidor precisa manter pelo menos 1 canal de texto.', true)
    }
    const sure = window.confirm(
      c.type === 'text'
        ? `Apagar #${c.name}? As mensagens dele vão junto. Sem volta!`
        : `Apagar 🔊 ${c.name}?`
    )
    if (!sure) return
    setBusy(true)
    const res = await remove(c.id)
    setBusy(false)
    if (!res.ok) return say(res.message, true)
    say('Canal apagado 🗑️')
  }

  const closeServer = async () => {
    const sure = window.confirm(
      'Fechar o servidor? Ele sai da lista de todos. (Você pode criar outro quando quiser.)'
    )
    if (!sure) return
    const res = await close(roomId)
    if (res.ok) navigate('/salas', { replace: true })
    else say(res.message ?? 'Não consegui fechar.', true)
  }

  const ChannelRow = ({ c }) => (
    <li className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-soft dark:border-white/10 dark:bg-ink-900">
      <span className="text-base">{c.type === 'text' ? '💬' : '🔊'}</span>
      {editingId === c.id ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveRename(c)}
          className="min-w-0 flex-1 rounded-lg border border-violet-300 bg-white px-2 py-1 text-sm outline-none dark:border-violet-500/40 dark:bg-ink-800 dark:text-zinc-100"
          maxLength={24}
          autoFocus
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
          {c.type === 'text' ? `#${c.name}` : c.name}
        </span>
      )}
      {editingId === c.id ? (
        <>
          <button type="button" onClick={() => saveRename(c)} className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-violet-500">
            Salvar
          </button>
          <button type="button" onClick={() => setEditingId(null)} className="text-[11px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            Cancelar
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => { setEditingId(c.id); setEditName(c.name) }}
            aria-label={`Renomear ${c.name}`}
            title="Renomear"
            className="rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={() => deleteChannel(c)}
            aria-label={`Apagar ${c.name}`}
            title="Apagar"
            className="rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-500"
          >
            🗑️
          </button>
        </>
      )}
    </li>
  )

  if (loading) return <Spinner className="p-16" />

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900 dark:bg-ink-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-24 pt-6 sm:px-6 lg:pb-6">
        <div className="flex items-center gap-3">
          <Link
            to={`/salas/${roomId}`}
            aria-label="Voltar ao servidor"
            className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-500 transition hover:border-violet-400/50 hover:text-zinc-700 dark:border-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ←
          </Link>
          <h1 className="truncate text-base font-extrabold">
            ⚙️ Configurar{room ? ` · ${room.name}` : ' servidor'}
          </h1>
        </div>

        {notFound ? (
          <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-ink-900">
            <p className="text-3xl">🚪</p>
            <p className="mt-2 text-sm font-extrabold">Servidor não encontrado</p>
          </section>
        ) : !isOwner ? (
          <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-soft dark:border-white/10 dark:bg-ink-900">
            <p className="text-3xl">🔐</p>
            <p className="mt-2 text-sm font-extrabold">Só o dono do servidor pode configurar</p>
            <Link
              to={`/salas/${roomId}`}
              className="mt-4 inline-block rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-violet-500"
            >
              Voltar ao servidor
            </Link>
          </section>
        ) : (
          <div className="mt-5 space-y-5">
            {msg && (
              <p
                className={`rounded-2xl px-4 py-2.5 text-xs font-bold ${
                  isErr
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {msg}
              </p>
            )}

            {/* identidade */}
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
              <h2 className="text-sm font-extrabold">🏷️ Nome do servidor</h2>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={32}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-white/10 dark:bg-ink-950 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={saveRoomName}
                  disabled={savingName}
                  className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </section>

            {/* canais */}
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-soft dark:border-white/10 dark:bg-ink-900">
              <h2 className="text-sm font-extrabold">🧩 Canais</h2>
              {!available ? (
                <div className="mt-3 rounded-2xl border border-dashed border-amber-400/50 bg-amber-400/5 p-4 text-center">
                  <p className="text-2xl">🔧</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    A gestão de canais precisa da <strong>Migração v14</strong> (SETUP.md).
                    <br />
                    Até lá: todo servidor fica com um único <strong>💬 geral</strong> (como hoje). ✔️
                  </p>
                </div>
              ) : chLoading ? (
                <Spinner className="p-6" />
              ) : (
                <>
                  <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    💬 texto
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {channels.filter((c) => c.type === 'text').map((c) => (
                      <ChannelRow key={c.id} c={c} />
                    ))}
                  </ul>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createChannel('text', newText, setNewText)}
                      placeholder="novo-canal-de-texto"
                      maxLength={24}
                      className="w-full rounded-xl border border-dashed border-zinc-300 bg-transparent px-3.5 py-2 text-sm outline-none transition focus:border-violet-500 dark:border-white/15 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => createChannel('text', newText, setNewText)}
                      disabled={busy || !newText.trim()}
                      className="shrink-0 rounded-xl border border-violet-500/40 px-3.5 py-2 text-xs font-bold text-violet-600 transition hover:bg-violet-500/10 disabled:opacity-40 dark:text-violet-300"
                    >
                      ＋ texto
                    </button>
                  </div>

                  <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    🔊 voz <span className="ml-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">cap. 2</span>
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {channels.filter((c) => c.type === 'voice').map((c) => (
                      <ChannelRow key={c.id} c={c} />
                    ))}
                  </ul>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={newVoice}
                      onChange={(e) => setNewVoice(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createChannel('voice', newVoice, setNewVoice)}
                      placeholder="canal-de-voz"
                      maxLength={24}
                      className="w-full rounded-xl border border-dashed border-zinc-300 bg-transparent px-3.5 py-2 text-sm outline-none transition focus:border-violet-500 dark:border-white/15 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => createChannel('voice', newVoice, setNewVoice)}
                      disabled={busy || !newVoice.trim()}
                      className="shrink-0 rounded-xl border border-emerald-500/40 px-3.5 py-2 text-xs font-bold text-emerald-600 transition hover:bg-emerald-500/10 disabled:opacity-40 dark:text-emerald-400"
                    >
                      ＋ voz
                    </button>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                    💡 já dá pra criar os canais de voz e arrumar a casa — o áudio ao vivo entra no cap. 2.
                  </p>
                </>
              )}
            </section>

            {/* zona de perigo */}
            <section className="rounded-3xl border border-rose-300/50 bg-rose-500/5 p-5 dark:border-rose-500/30">
              <h2 className="text-sm font-extrabold text-rose-500">⚠️ Zona de cuidado</h2>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xs text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Fechar o servidor tira ele da lista de todo mundo. (Já já temos apagar de vez e
                  convites personalizáveis 😉)
                </p>
                <button
                  type="button"
                  onClick={closeServer}
                  className="shrink-0 rounded-xl border border-rose-500/50 px-4 py-2 text-xs font-bold text-rose-500 transition hover:bg-rose-500 hover:text-white"
                >
                  Fechar servidor
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
