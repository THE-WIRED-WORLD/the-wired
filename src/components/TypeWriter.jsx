import { useState, useEffect, useRef } from 'react'

export default function TypeWriter({ lines, onComplete, charDelay = 50, lineDelay = 500 }) {
  const [displayedLines, setDisplayedLines] = useState([])
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const containerRef = useRef(null)

  useEffect(() => {
    if (currentLineIndex >= lines.length) {
      setIsTyping(false)
      onComplete?.()
      return
    }

    const currentLine = lines[currentLineIndex]

    // Handle special line types
    if (currentLine.type === 'progress') {
      setDisplayedLines(prev => {
        const newLines = [...prev]
        if (newLines.length <= currentLineIndex) {
          newLines.push({ ...currentLine, text: '' })
        }
        return newLines
      })

      const totalSteps = 10
      let step = 0
      const progressInterval = setInterval(() => {
        step++
        const blocks = '\u2588'.repeat(step)
        const empty = '\u2591'.repeat(totalSteps - step)
        const percent = Math.round((step / totalSteps) * 100)
        setDisplayedLines(prev => {
          const newLines = [...prev]
          newLines[currentLineIndex] = {
            ...currentLine,
            text: `${blocks}${empty} ${percent}%`
          }
          return newLines
        })
        if (step >= totalSteps) {
          clearInterval(progressInterval)
          setTimeout(() => {
            setCurrentLineIndex(prev => prev + 1)
            setCurrentCharIndex(0)
          }, lineDelay)
        }
      }, 100)

      return () => clearInterval(progressInterval)
    }

    if (currentLine.type === 'counter') {
      setDisplayedLines(prev => {
        const newLines = [...prev]
        if (newLines.length <= currentLineIndex) {
          newLines.push({ ...currentLine, text: currentLine.prefix || '' })
        }
        return newLines
      })

      const target = currentLine.value
      const duration = 1500
      const steps = 30
      const stepTime = duration / steps
      let step = 0

      const counterInterval = setInterval(() => {
        step++
        const current = Math.round((step / steps) * target)
        setDisplayedLines(prev => {
          const newLines = [...prev]
          newLines[currentLineIndex] = {
            ...currentLine,
            text: `${currentLine.prefix || ''}${current.toLocaleString()}`
          }
          return newLines
        })
        if (step >= steps) {
          clearInterval(counterInterval)
          setDisplayedLines(prev => {
            const newLines = [...prev]
            newLines[currentLineIndex] = {
              ...currentLine,
              text: `${currentLine.prefix || ''}${target.toLocaleString()}`
            }
            return newLines
          })
          setTimeout(() => {
            setCurrentLineIndex(prev => prev + 1)
            setCurrentCharIndex(0)
          }, lineDelay)
        }
      }, stepTime)

      return () => clearInterval(counterInterval)
    }

    // Glitch effect: type text, corrupt it, then replace with new text
    if (currentLine.type === 'glitch') {
      const original = currentLine.text
      const replacement = currentLine.replaceTo
      const glitchChars = '\u2588\u2593\u2592\u2591\u00a4\u00a7\u00b6\u00d7\u00f8\u03a3\u03a8\u03a9\u2206\u2261\u2302'

      // Phase 1: type original text
      if (currentCharIndex < original.length) {
        const timeout = setTimeout(() => {
          setDisplayedLines(prev => {
            const newLines = [...prev]
            if (newLines.length <= currentLineIndex) {
              newLines.push({ ...currentLine, text: '' })
            }
            newLines[currentLineIndex] = {
              ...currentLine,
              text: original.slice(0, currentCharIndex + 1)
            }
            return newLines
          })
          setCurrentCharIndex(prev => prev + 1)
        }, charDelay)
        return () => clearTimeout(timeout)
      }

      // Phase 2: hold, then corrupt, then replace
      let phase = 0
      const totalPhases = 12
      const glitchInterval = setInterval(() => {
        phase++
        if (phase <= 3) {
          // Hold the original briefly
        } else if (phase <= 9) {
          // Corrupt progressively
          const corrupted = original.split('').map((ch, i) => {
            if (ch === ' ') return ' '
            const corruptChance = (phase - 3) / 6
            return Math.random() < corruptChance
              ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
              : ch
          }).join('')
          setDisplayedLines(prev => {
            const newLines = [...prev]
            newLines[currentLineIndex] = { ...currentLine, text: corrupted }
            return newLines
          })
        } else if (phase === 10) {
          // Full corruption
          const fullCorrupt = original.split('').map(ch =>
            ch === ' ' ? ' ' : glitchChars[Math.floor(Math.random() * glitchChars.length)]
          ).join('')
          setDisplayedLines(prev => {
            const newLines = [...prev]
            newLines[currentLineIndex] = { ...currentLine, text: fullCorrupt }
            return newLines
          })
        } else if (phase === 11) {
          // Replace with new text
          setDisplayedLines(prev => {
            const newLines = [...prev]
            newLines[currentLineIndex] = {
              ...currentLine,
              text: replacement,
              green: currentLine.replaceGreen || false,
            }
            return newLines
          })
        } else {
          clearInterval(glitchInterval)
          setTimeout(() => {
            setCurrentLineIndex(prev => prev + 1)
            setCurrentCharIndex(0)
          }, currentLine.delay || 800)
        }
      }, 150)

      return () => clearInterval(glitchInterval)
    }

    // Normal text typing
    const text = currentLine.text || currentLine
    if (currentCharIndex === 0) {
      setDisplayedLines(prev => {
        const newLines = [...prev]
        if (newLines.length <= currentLineIndex) {
          newLines.push({ ...currentLine, text: '' })
        }
        return newLines
      })
    }

    if (currentCharIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev]
          newLines[currentLineIndex] = {
            ...currentLine,
            text: text.slice(0, currentCharIndex + 1)
          }
          return newLines
        })
        setCurrentCharIndex(prev => prev + 1)
      }, charDelay)
      return () => clearTimeout(timeout)
    } else {
      const timeout = setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1)
        setCurrentCharIndex(0)
      }, currentLine.delay || lineDelay)
      return () => clearTimeout(timeout)
    }
  }, [currentLineIndex, currentCharIndex, lines, charDelay, lineDelay, onComplete])

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [displayedLines])

  return (
    <div ref={containerRef} className="overflow-y-auto h-full">
      {displayedLines.map((line, i) => {
        const className = line.green ? 'terminal-text-green' : 'terminal-text'
        const isBlank = line.type === 'blank'
        return (
          <div key={i} className={`${className} text-lg sm:text-xl md:text-2xl leading-relaxed`}>
            {isBlank ? '\u00A0' : (line.text || '')}
            {i === currentLineIndex && isTyping && (
              <span className="cursor-blink">_</span>
            )}
          </div>
        )
      })}
      {!isTyping && (
        <div className="terminal-text text-lg sm:text-xl md:text-2xl leading-relaxed">
          <span className="cursor-blink">_</span>
        </div>
      )}
    </div>
  )
}
