import { useState, useEffect } from 'react'

export function useGeoLocation() {
  const [location, setLocation] = useState({ city: 'UNKNOWN', country: 'UNKNOWN' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        if (!res.ok) throw new Error('Failed to fetch location')
        const data = await res.json()
        setLocation({
          city: data.city || 'UNKNOWN',
          country: data.country_name || 'UNKNOWN',
        })
      } catch {
        setLocation({ city: 'UNKNOWN', country: 'UNKNOWN' })
      } finally {
        setLoading(false)
      }
    }

    fetchLocation()
  }, [])

  return { location, loading }
}
