import { useState, useMemo } from 'react'
import TypeWriter from './TypeWriter'
import CRTEffect from './CRTEffect'
import { useGeoLocation } from '../hooks/useGeoLocation'
import { useSession } from '../hooks/useSession'

function formatTimestamp() {
  const now = new Date()
  return now.toISOString().replace('T', ' ').split('.')[0] + ' UTC'
}

export default function Terminal() {
  const { location, loading: geoLoading } = useGeoLocation()
  const { soulsOnline } = useSession()
  const [ready, setReady] = useState(false)

  const dataReady = !geoLoading && soulsOnline !== null

  const lines = useMemo(() => {
    if (!dataReady) return []

    const physicalLocation = `${location.city}, ${location.country}`

    return [
      { text: 'INITIALIZING...', delay: 800 },
      { text: 'ACCESSING THE WIRED...', delay: 800 },
      { text: 'CONNECTION ESTABLISHED', delay: 600 },
      { type: 'blank' },
      { type: 'blank' },
      { text: 'SCANNING GLOBAL NETWORK...', delay: 600 },
      { text: 'DETECTING SOULS...', delay: 800 },
      { type: 'blank' },
      { type: 'progress' },
      { type: 'blank' },
      { text: `TIMESTAMP: ${formatTimestamp()}`, delay: 400 },
      {
        type: 'glitch',
        text: `YOUR LOCATION: ${physicalLocation}`,
        replaceTo: 'YOUR LOCATION: HERE / THERE / SOMEWHERE',
        replaceGreen: true,
        delay: 800,
      },
      { type: 'counter', prefix: 'SOULS CONNECTED TO THE WIRED: ', value: soulsOnline },
      { type: 'blank' },
      { text: 'YOU ARE NOT ALONE.', green: true, delay: 1000 },
      { text: 'YOU ARE PART OF THE WIRED.', green: true, delay: 500 },
    ]
  }, [dataReady, location, soulsOnline])

  if (!dataReady) {
    return (
      <CRTEffect>
        <div className="h-full flex items-center justify-center">
          <span className="terminal-text text-2xl cursor-blink">_</span>
        </div>
      </CRTEffect>
    )
  }

  return (
    <CRTEffect>
      <div className="h-full p-6 sm:p-10 md:p-16">
        <TypeWriter
          lines={lines}
          charDelay={40}
          lineDelay={400}
          onComplete={() => setReady(true)}
        />
      </div>
    </CRTEffect>
  )
}
