import { useState, useEffect, useRef } from 'react'

export default function GameCountdown({ teamEvents, oblGames, favoriteTeam }) {
  const [now, setNow] = useState(new Date())
  const timerRef = useRef(null)

  // Tick every second
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const nextGame = findNextGame(teamEvents, oblGames, favoriteTeam, now)
  if (!nextGame) return null

  const diffMs   = nextGame.time - now.getTime()
  if (diffMs <= 0) return null  // game time passed, live scoreboard takes over

  const totalSec = Math.floor(diffMs / 1000)
  const hours    = Math.floor(totalSec / 3600)
  const mins     = Math.floor((totalSec % 3600) / 60)
  const secs     = totalSec % 60

  const isClose  = hours === 0  // under 1 hour — show seconds
  const isSoon   = hours < 3    // within 3 hours — show countdown

  if (!isSoon) return null  // only show countdown when within 3 hours

  return (
    <div style={{ background:'var(--ink)', borderRadius:10, overflow:'hidden', marginBottom:'1.5rem' }}>

      {/* Header */}
      <div style={{ padding:'6px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--orange)' }}>
          Game day
        </span>
        {nextGame.location && (
          <a
            href={`https://maps.apple.com/?q=${encodeURIComponent(nextGame.location)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontFamily:'var(--cond)', fontSize:10, color:'rgba(255,255,255,0.4)', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}
          >
            <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
              <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 1 1 8 4.25a1.75 1.75 0 0 1 0 3.5z" fill="currentColor"/>
            </svg>
            {nextGame.location}
          </a>
        )}
      </div>

      {/* Matchup */}
      <div style={{ padding:'0.5rem 1rem 0.75rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div>
          <div style={{ fontFamily:'var(--cond)', fontSize:20, fontWeight:800, color:'#fff', lineHeight:1.1 }}>
            {favoriteTeam?.split(' - ')[0]}
          </div>
          <div style={{ fontFamily:'var(--cond)', fontSize:13, color:'rgba(255,255,255,0.5)', marginTop:1 }}>
            vs {nextGame.opponent}
          </div>
          <div style={{ fontFamily:'var(--cond)', fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3 }}>
            {nextGame.isHome ? 'Home' : 'Away'} · {new Date(nextGame.time).toLocaleTimeString('en-CA', { hour:'numeric', minute:'2-digit' })}
          </div>
        </div>

        {/* Countdown */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
            {hours > 0 && (
              <>
                <span style={{ fontFamily:'var(--cond)', fontSize:36, fontWeight:900, lineHeight:1, color:'#fff' }}>{hours}</span>
                <span style={{ fontFamily:'var(--cond)', fontSize:13, color:'rgba(255,255,255,0.4)', marginRight:6 }}>h</span>
              </>
            )}
            <span style={{ fontFamily:'var(--cond)', fontSize:36, fontWeight:900, lineHeight:1, color:'#fff' }}>{String(mins).padStart(2,'0')}</span>
            <span style={{ fontFamily:'var(--cond)', fontSize:13, color:'rgba(255,255,255,0.4)', marginRight: isClose ? 6 : 0 }}>m</span>
            {isClose && (
              <>
                <span style={{ fontFamily:'var(--cond)', fontSize:36, fontWeight:900, lineHeight:1, color:'var(--orange)' }}>{String(secs).padStart(2,'0')}</span>
                <span style={{ fontFamily:'var(--cond)', fontSize:13, color:'rgba(255,255,255,0.4)' }}>s</span>
              </>
            )}
          </div>
          <div style={{ fontFamily:'var(--cond)', fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:2 }}>
            Until tip-off
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function findNextGame(teamEvents, oblGames, favoriteTeam, now) {
  const candidates = []

  // Team events (ad-hoc games, tournament games)
  for (const ev of teamEvents) {
    if (ev.type === 'practice') continue
    const t = new Date(ev.start_time).getTime()
    if (t > now.getTime()) {
      candidates.push({
        time:     t,
        opponent: ev.opponent || ev.title || 'TBD',
        location: ev.location,
        isHome:   ev.is_home ?? true,
      })
    }
  }

  // OBL games for favorite team
  for (const g of oblGames) {
    if (g._date && g._date.getTime() > now.getTime()) {
      const isHome = g.home === favoriteTeam
      candidates.push({
        time:     g._date.getTime(),
        opponent: isHome ? g.away : g.home,
        location: g.location,
        isHome,
      })
    }
  }

  if (!candidates.length) return null
  return candidates.sort((a, b) => a.time - b.time)[0]
}
