import { useEffect, useMemo, useRef } from 'react'
import { useUnread } from '../context/UnreadContext'
import { usePresence } from '../context/PresenceContext'
import { useFriends } from '../hooks/useFriends'
import { playMessageDing, playFriendOnlineChime } from '../lib/sound'

/**
 * Vigia global de notificações sonoras (não renderiza nada):
 *  - total de não-lidas SUBIU → ding
 *  - amigo ENTROU online (dif de presença) → chime
 * Estado inicial nunca toca (evita "chuva de sons" ao abrir o app).
 */
export default function NotificationSounds() {
  const { totalUnread } = useUnread()
  const { others } = usePresence()
  const { friends } = useFriends()

  const friendIds = useMemo(() => new Set(friends.map((f) => f.userId)), [friends])
  const prevTotal = useRef(null)
  const prevOnlineFriends = useRef(null)

  useEffect(() => {
    if (prevTotal.current === null) {
      prevTotal.current = totalUnread
      return
    }
    if (totalUnread > prevTotal.current) playMessageDing()
    prevTotal.current = totalUnread
  }, [totalUnread])

  useEffect(() => {
    const now = new Set()
    for (const o of others) if (friendIds.has(o.id)) now.add(o.id)

    const prev = prevOnlineFriends.current
    if (prev) {
      for (const id of now) {
        if (!prev.has(id)) {
          playFriendOnlineChime()
          break
        }
      }
    }
    prevOnlineFriends.current = now
  }, [others, friendIds])

  return null
}
