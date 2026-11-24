import { useEffect, useState } from 'react'

export default function AnimatedNumber({ value = 0, duration = 900 }) {
  const target = Number(value) || 0
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frame = 0
    let start = 0
    let raf = 0
    setDisplay(0)
    const tick = (now) => {
      if (!start) start = now
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(target * eased))
      if (progress < 1) raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [target, duration])

  return <>{new Intl.NumberFormat('th-TH').format(display)}</>
}
