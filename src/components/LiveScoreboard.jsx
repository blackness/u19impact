import { useEffect, useState, useRef } from 'react'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON

// Fetch today's in-progress or recently completed game
export async function fetchLiveGame() {
  const today      = new Date()
  const startOfDay = new Date(today); startOfDay.setHours(0,0,0,0)
  const endOfDay   = new Date(today); endOfDay.setHours(23,59,59,999)

  let url = `${SUPABASE_URL}/rest/v1/games` +
    `?scheduled_date=gte.${startOfDay.toISOString()}` +
    `&scheduled_date=lte.${endOfDay.toISOString()}` +
    `&status=in.(in-progress,completed)` +
    `&select=id,status,home_team,home_score,away_score,period,time_remaining,tracker_active,timer_running,recent_plays,stats,active_players,game_settings,team_id` +
    `&order=updated_at.desc&limit=1`

  let res  = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } })
  let rows = res.ok ? await res.json() : []
  if (rows?.length) return rows[0]

  // Fallback: any in-progress game updated in last 12 hours
  const twelveHoursAgo = new Date(today.getTime() - 12 * 60 * 60 * 1000)
  url = `${SUPABASE_URL}/rest/v1/games` +
    `?status=eq.in-progress` +
    `&updated_at=gte.${twelveHoursAgo.toISOString()}` +
    `&select=id,status,home_team,home_score,away_score,period,time_remaining,tracker_active,timer_running,recent_plays,stats,active_players,game_settings,team_id` +
    `&order=updated_at.desc&limit=1`

  res  = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } })
  rows = res.ok ? await res.json() : []
  return rows?.[0] || null
}

// ── Compact final score card ─────────────────────────────────────────────────
export function FinalScoreCard({ game, favoriteTeam, onDismiss }) {
  const settings = game.game_settings || {}
  const isHome   = settings.isHome ?? true
  const opponent = settings.opponent || 'Opponent'
  const ourScore = isHome ? game.home_score : game.away_score
  const oppScore = isHome ? game.away_score : game.home_score
  const won      = ourScore > oppScore
  const ourName  = favoriteTeam?.split(' - ')[0] || 'Kingston'

  return (
    <div style={{ background:'var(--ink)', borderRadius:10, overflow:'hidden', marginBottom:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color:'#4ade80' }}>Final</span>
        <span style={{ fontFamily:'var(--cond)', fontSize:14, fontWeight:700, color:'#fff' }}>{ourName}</span>
        <span style={{ fontFamily:'var(--cond)', fontSize:11, color:'rgba(255,255,255,0.4)' }}>vs {opponent}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:24, fontWeight:900, color: won?'#fff':'rgba(255,255,255,0.5)' }}>{ourScore}</span>
        <span style={{ fontFamily:'var(--cond)', fontSize:14, color:'rgba(255,255,255,0.25)' }}>—</span>
        <span style={{ fontFamily:'var(--cond)', fontSize:24, fontWeight:900, color: won?'rgba(255,255,255,0.5)':'#fff' }}>{oppScore}</span>
        <span style={{ fontFamily:'var(--cond)', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4, background: won?'rgba(74,222,128,0.15)':'rgba(239,68,68,0.15)', color: won?'#4ade80':'#ef4444', marginLeft:4 }}>
          {won ? 'W' : ourScore === oppScore ? 'T' : 'L'}
        </span>
      </div>
    </div>
  )
}

// ── Live scoreboard ──────────────────────────────────────────────────────────
export default function LiveScoreboard({ game, favoriteTeam, players = [], onDismiss }) {
  const [data, setData]         = useState(game)
  const [timeLeft, setTimeLeft] = useState(game?.time_remaining || 0)
  const timerRef                = useRef(null)

  useEffect(() => { setData(game); setTimeLeft(game?.time_remaining || 0) }, [game])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (data?.timer_running && data?.status === 'in-progress') {
      timerRef.current = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [data?.timer_running, data?.status, data?.time_remaining])

  if (!data) return null

  const settings   = data.game_settings || {}
  const isHome     = settings.isHome ?? true
  const opponent   = settings.opponent || 'Opponent'
  const ourScore   = isHome ? data.home_score : data.away_score
  const theirScore = isHome ? data.away_score  : data.home_score
  const ourName    = favoriteTeam?.split(' - ')[0] || 'Kingston'
  const isLive     = data.status === 'in-progress'
  const isFinal    = data.status === 'completed'
  const totalPer   = settings.totalPeriods || 4
  const perLabel   = totalPer === 2 ? 'Half' : 'Q'
  const mins       = Math.floor(timeLeft / 60)
  const secs       = String(timeLeft % 60).padStart(2, '0')
  const clockStr   = `${mins}:${secs}`
  const winning    = ourScore > theirScore
  const losing     = ourScore < theirScore
  const plays      = (data.recent_plays || []).slice(0, 5)

  // Build full roster box score — all players, on-floor highlighted
  const statsMap     = data.stats || {}
  const activeUuids  = new Set(data.active_players || [])

  // Merge roster players with stats, fall back to stats _name/_number if not in roster
  const allPlayerLines = (() => {
    const seen = new Set()
    const lines = []

    // Start with roster players so order is by number
    for (const p of players) {
      seen.add(p.id)
      const s      = statsMap[p.id] || {}
      const pts    = s.pts  || 0
      const reb    = (s.dreb || 0) + (s.oreb || 0)
      const ast    = s.ast  || 0
      const stl    = s.stl  || 0
      const blk    = s.blk  || 0
      const onFloor = activeUuids.has(p.id)
      lines.push({ uuid: p.id, name: p.name, number: p.number || '—', pts, reb, ast, stl, blk, onFloor, hasStats: pts+reb+ast+stl+blk > 0 })
    }

    // Add any stats-only players not in roster
    for (const [uuid, s] of Object.entries(statsMap)) {
      if (seen.has(uuid)) continue
      const pts    = s.pts  || 0
      const reb    = (s.dreb || 0) + (s.oreb || 0)
      const ast    = s.ast  || 0
      const stl    = s.stl  || 0
      const blk    = s.blk  || 0
      const onFloor = activeUuids.has(uuid)
      lines.push({ uuid, name: s._name || 'Player', number: s._number || '—', pts, reb, ast, stl, blk, onFloor, hasStats: pts+reb+ast+stl+blk > 0 })
    }

    // Sort: on-floor first (by number), then bench with stats, then bench no stats
    return lines.sort((a, b) => {
      if (a.onFloor !== b.onFloor) return a.onFloor ? -1 : 1
      if (a.hasStats !== b.hasStats) return a.hasStats ? -1 : 1
      return (parseInt(a.number) || 99) - (parseInt(b.number) || 99)
    })
  })()

  // Team totals from all players
  const totals = allPlayerLines.reduce((acc, p) => {
    acc.pts += p.pts; acc.reb += p.reb; acc.ast += p.ast
    acc.stl += p.stl; acc.blk += p.blk; return acc
  }, { pts:0, reb:0, ast:0, stl:0, blk:0 })

  return (
    <div style={{ background:'var(--ink)', borderRadius:10, overflow:'hidden', marginBottom:'1.5rem' }}>

      {/* Header — LIVE badge + clock */}
      <div style={{ padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {isLive && <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#ef4444', animation:'liveblink 1.2s ease-in-out infinite', flexShrink:0 }} />}
          <style>{`@keyframes liveblink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          <span style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color: isLive?'#ef4444':'#4ade80' }}>
            {isLive ? 'Live' : 'Final'}
          </span>
          {isLive && (
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontFamily:'var(--cond)', fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', lineHeight:1 }}>{clockStr}</span>
              <span style={{ fontFamily:'var(--cond)', fontSize:12, color:'rgba(255,255,255,0.45)' }}>
                {data.timer_running ? `${perLabel}${data.period}` : `${perLabel}${data.period} ⏸`}
              </span>
            </div>
          )}
          {isFinal && <span style={{ fontFamily:'var(--cond)', fontSize:13, color:'rgba(255,255,255,0.5)' }}>{perLabel}{data.period} · Full time</span>}
        </div>
        {settings.location && (
          <span style={{ fontFamily:'var(--cond)', fontSize:10, color:'rgba(255,255,255,0.35)' }}>{settings.location}</span>
        )}
      </div>

      {/* Score */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', padding:'0.5rem 1rem 0.75rem', gap:8 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color: isHome?'var(--orange)':'rgba(255,255,255,0.5)', marginBottom:2 }}>{ourName}</div>
          <div style={{ fontFamily:'var(--cond)', fontSize:56, fontWeight:900, lineHeight:1, color: winning?'#fff':losing?'rgba(255,255,255,0.4)':'#fff' }}>{ourScore}</div>
          <div style={{ fontFamily:'var(--cond)', fontSize:9, color: isHome?'var(--orange)':'rgba(255,255,255,0.4)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:2 }}>{isHome?'Home':'Away'}</div>
        </div>
        <div style={{ fontFamily:'var(--cond)', fontSize:24, fontWeight:300, color:'rgba(255,255,255,0.2)', textAlign:'center' }}>—</div>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'rgba(255,255,255,0.5)', marginBottom:2 }}>{opponent}</div>
          <div style={{ fontFamily:'var(--cond)', fontSize:56, fontWeight:900, lineHeight:1, color: losing?'#fff':winning?'rgba(255,255,255,0.4)':'#fff' }}>{theirScore}</div>
          <div style={{ fontFamily:'var(--cond)', fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:2 }}>{isHome?'Away':'Home'}</div>
        </div>
      </div>

      {/* Team totals bar */}
      <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(255,255,255,0.08)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        {[['PTS',totals.pts],['REB',totals.reb],['AST',totals.ast],['STL',totals.stl],['BLK',totals.blk]].map(([label,val],i) => (
          <div key={label} style={{ flex:1, textAlign:'center', padding:'7px 0', borderRight: i<4?'1px solid rgba(255,255,255,0.08)':'none' }}>
            <div style={{ fontFamily:'var(--cond)', fontSize:16, fontWeight:700, color:'#fff', lineHeight:1 }}>{val}</div>
            <div style={{ fontFamily:'var(--cond)', fontSize:9, fontWeight:600, letterSpacing:'0.1em', color:'rgba(255,255,255,0.35)', marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Box score — full roster */}
      {allPlayerLines.length > 0 && (
        <div style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
          {/* Header row */}
          <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 36px 36px 36px 36px 36px', gap:0, padding:'4px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <div />
            <div style={{ fontFamily:'var(--cond)', fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>Player</div>
            {['PTS','REB','AST','STL','BLK'].map(h => (
              <div key={h} style={{ fontFamily:'var(--cond)', fontSize:9, fontWeight:700, letterSpacing:'0.08em', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', textAlign:'center' }}>{h}</div>
            ))}
          </div>

          {allPlayerLines.map((p) => {
            const on = p.onFloor
            return (
              <div key={p.uuid} style={{
                display:'grid', gridTemplateColumns:'28px 1fr 36px 36px 36px 36px 36px',
                gap:0, padding:'5px 14px',
                background: on ? 'rgba(232,80,10,0.12)' : 'transparent',
                borderBottom:'1px solid rgba(255,255,255,0.04)',
              }}>
                {/* Number */}
                <div style={{ fontFamily:'var(--cond)', fontSize:11, fontWeight:700, color: on ? 'var(--orange)' : 'rgba(255,255,255,0.25)', alignSelf:'center' }}>
                  {p.number}
                </div>

                {/* Name + ON badge */}
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight: on ? 700 : 500, color: on ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                    {p.name}
                  </span>
                  {on && (
                    <span style={{ fontFamily:'var(--cond)', fontSize:8, fontWeight:800, letterSpacing:'0.08em', background:'var(--orange)', color:'#fff', padding:'1px 4px', borderRadius:2 }}>
                      ON
                    </span>
                  )}
                </div>

                {/* Stats */}
                {[p.pts, p.reb, p.ast, p.stl, p.blk].map((val, i) => (
                  <div key={i} style={{
                    fontFamily:'var(--cond)', fontSize:13, fontWeight: val > 0 ? 700 : 400,
                    color: val >= 10 ? 'var(--orange)' : val > 0 ? (on ? '#fff' : 'rgba(255,255,255,0.7)') : 'rgba(255,255,255,0.15)',
                    textAlign:'center', alignSelf:'center',
                  }}>
                    {val > 0 ? val : '—'}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Recent plays */}
      {plays.length > 0 && (
        <div style={{ padding:'4px 0' }}>
          {plays.map((p, i) => {
            const isOurs = (isHome && p.team==='home') || (!isHome && p.team==='away')
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 14px', background: i===0?'rgba(255,255,255,0.05)':'transparent' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background: isOurs?'var(--orange)':'rgba(255,255,255,0.2)', flexShrink:0 }} />
                <div style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight: isOurs?600:400, color: isOurs?'#fff':'rgba(255,255,255,0.45)', flex:1 }}>{p.description}</div>
                <div style={{ fontFamily:'var(--cond)', fontSize:10, color:'rgba(255,255,255,0.25)', whiteSpace:'nowrap' }}>{perLabel}{p.period} · {p.time}</div>
                {p.points > 0 && <div style={{ fontFamily:'var(--cond)', fontSize:12, fontWeight:700, color: isOurs?'var(--orange)':'rgba(255,255,255,0.25)', minWidth:20, textAlign:'right' }}>+{p.points}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding:'6px 14px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
          {isLive ? (data.tracker_active ? 'Scorekeeper active' : 'Scorekeeper inactive') : 'Game complete'}
        </span>
        {isFinal && onDismiss && (
          <button onClick={onDismiss} style={{ background:'none', border:'none', fontFamily:'var(--cond)', fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer' }}>Dismiss</button>
        )}
      </div>
    </div>
  )
}

function StatPill({ label, val, hi = false }) {
  return (
    <div style={{ textAlign:'center', minWidth:28 }}>
      <div style={{ fontFamily:'var(--cond)', fontSize:14, fontWeight:700, lineHeight:1, color: hi?'var(--orange)':'rgba(255,255,255,0.85)' }}>{val}</div>
      <div style={{ fontFamily:'var(--cond)', fontSize:8, letterSpacing:'0.08em', color:'rgba(255,255,255,0.3)' }}>{label}</div>
    </div>
  )
}
