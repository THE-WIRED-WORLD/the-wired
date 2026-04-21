import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SOULS_MIN = Number(import.meta.env.VITE_SOULS_MIN) || 1

export function useSession() {
  const [soulsOnline, setSoulsOnline] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setSoulsOnline(SOULS_MIN)
      return
    }

    const timeout = setTimeout(() => {
      setSoulsOnline(prev => prev === null ? SOULS_MIN : prev)
    }, 5000)

    const channel = supabase.channel('souls', {
      config: { presence: { key: crypto.randomUUID() } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        clearTimeout(timeout)
        const state = channel.presenceState()
        setSoulsOnline(Math.max(SOULS_MIN, Object.keys(state).length))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      clearTimeout(timeout)
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [])

  return { soulsOnline }
}
