import { useEffect, useState } from 'react'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON

// Fetch today's in-progress or recently completed game
// Accepts games with today's scheduled_date OR null scheduled_date (legacy games)
export async function fetchLiveGame() {
  const today      = new Date()
  const startOfDay = new Date(today); startOfDay.setHours(0,0,0,0)
  const endOfDay   = new Date(today); endOfDay.setHours(23,59,59,999)

  // First try: games scheduled for today
  let url = `${SUPABASE_URL}/rest/v1/games` +
    `?scheduled_date=gte.${startOfDay.toISOString()}` +
    `&scheduled_date=lte.${endOfDay.toISOString()}` +
    `&status=in.in-progress,completed` +
    `&select=id,status,home_team,home_score,away_score,period,time_remaining,tracker_active,timer_running,recent_plays,stats,game_settings` +
    `&order=updated_at.desc&limit=1`

  let res  = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } })
  let rows = res.ok ? await res.json() : []

  if (rows?.length) return rows[0]

  // Fallback: any in-progress game updated in the last 12 hours (handles null scheduled_date)
  const twelveHoursAgo = new Date(today.getTime() - 12 * 60 * 60 * 1000)
  url = `${SUPABASE_URL}/rest/v1/games` +
    `?status=eq.in-progress` +
    `&updated_at=gte.${twelveHoursAgo.toISOString()}` +
    `&select=id,status,home_team,home_score,away_score,period,time_remaining,tracker_active,timer_running,recent_plays,stats,game_settings` +
    `&order=updated_at.desc&limit=1`

  res  = await fetch(url, { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } })
  rows = res.ok ? await res.json() : []
  return rows?.[0] || null
}

export default function LiveScoreboard({ game, favoriteTeam, onDismiss }) {
  const [data, setData] = useState(game)

  // Subscribe to realtime updates on this specific game row
  useEffect(() => {
    if (!game?.id) return
    const { createClient } = window.__supabaseClient || {}

    // Use raw WebSocket subscription
    const wsUrl = SUPABASE_URL.replace('https://', 'wss://') +
      `/realtime/v1/websocket?apikey=${SUPABASE_ANON}&vsn=1.0.0`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      ws.send(JSON.stringify({
        topic:   'realtime:public:games',
        event:   'phx_join',
        payload: {
          config: {
            broadcast:  { self: false },
            postgres_changes: [{ event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${game.id}` }]
          }
        },
        ref: '1',
      }))
    }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.payload?.data?.record) {
        setData(msg.payload.data.record)
      }
    }

    return () => ws.close()
  }, [game?.id])

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
  const secLeft    = data.time_remaining || 0
  const mins       = Math.floor(secLeft / 60)
  const secs       = String(secLeft % 60).padStart(2, '0')
  const clockStr   = `${mins}:${secs}`
  const winning    = ourScore > theirScore
  const losing     = ourScore < theirScore
  const plays      = (data.recent_plays || []).slice(0, 6)

  // Compute team totals from stats JSONB
  const stats   = data.stats || {}
  const totals  = Object.values(stats).reduce((acc, p) => {
    acc.pts  += p.pts  || 0
    acc.reb  += (p.dreb || 0) + (p.oreb || 0)
    acc.ast  += p.ast  || 0
    acc.stl  += p.stl  || 0
    acc.blk  += p.blk  || 0
    return acc
  }, { pts:0, reb:0, ast:0, stl:0, blk:0 })

  return (
    <div style={{ background:'var(--ink)', borderRadius:10, overflow:'hidden', marginBottom:'1.5rem' }}>

      {/* Live / Final badge */}
      <div style={{ padding:'6px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {isLive && (
            <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#ef4444', animation:'liveblink 1.2s ease-in-out infinite' }} />
          )}
          <style>{`@keyframes liveblink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
          <span style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color: isLive?'#ef4444':'#4ade80' }}>
            {isLive ? 'Live' : 'Final'}
          </span>
          {isLive && (
            <span style={{ fontFamily:'var(--cond)', fontSize:11, color:'rgba(255,255,255,0.5)', letterSpacing:'0.05em' }}>
              {perLabel}{data.period} · {data.timer_running ? clockStr : `${clockStr} ⏸`}
            </span>
          )}
          {isFinal && (
            <span style={{ fontFamily:'var(--cond)', fontSize:11, color:'rgba(255,255,255,0.5)' }}>
              {perLabel}{data.period} · Full time
            </span>
          )}
        </div>
        {settings.location && (
          <span style={{ fontFamily:'var(--cond)', fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.04em' }}>
            {settings.location}
          </span>
        )}
      </div>

      {/* Scoreboard */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', padding:'0.5rem 1rem 1rem', gap:8 }}>
        {/* Our team */}
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color: isHome?'var(--orange)':'rgba(255,255,255,0.5)', marginBottom:2 }}>
            {ourName}
          </div>
          <div style={{ fontFamily:'var(--cond)', fontSize:56, fontWeight:900, lineHeight:1, color: winning?'#fff':losing?'rgba(255,255,255,0.5)':'#fff' }}>
            {ourScore}
          </div>
          <div style={{ fontFamily:'var(--cond)', fontSize:9, color: isHome?'var(--orange)':'rgba(255,255,255,0.4)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:2 }}>
            {isHome ? 'Home' : 'Away'}
          </div>
        </div>

        {/* Separator */}
        <div style={{ fontFamily:'var(--cond)', fontSize:24, fontWeight:300, color:'rgba(255,255,255,0.25)', textAlign:'center' }}>—</div>

        {/* Opponent */}
        <div style={{ textAlign:'left' }}>
          <div style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'rgba(255,255,255,0.5)', marginBottom:2 }}>
            {opponent}
          </div>
          <div style={{ fontFamily:'var(--cond)', fontSize:56, fontWeight:900, lineHeight:1, color: losing?'#fff':winning?'rgba(255,255,255,0.5)':'#fff' }}>
            {theirScore}
          </div>
          <div style={{ fontFamily:'var(--cond)', fontSize:9, color:'rgba(255,255,255,0.4)', letterSpacing:'0.12em', textTransform:'uppercase', marginTop:2 }}>
            {isHome ? 'Away' : 'Home'}
          </div>
        </div>
      </div>

      {/* Team stat totals */}
      <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(255,255,255,0.08)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        {[
          { label:'PTS', val: totals.pts  },
          { label:'REB', val: totals.reb  },
          { label:'AST', val: totals.ast  },
          { label:'STL', val: totals.stl  },
          { label:'BLK', val: totals.blk  },
        ].map((s,i) => (
          <div key={s.label} style={{ flex:1, textAlign:'center', padding:'8px 0', borderRight: i<4?'1px solid rgba(255,255,255,0.08)':'none' }}>
            <div style={{ fontFamily:'var(--cond)', fontSize:16, fontWeight:700, color:'#fff', lineHeight:1 }}>{s.val}</div>
            <div style={{ fontFamily:'var(--cond)', fontSize:9, fontWeight:600, letterSpacing:'0.1em', color:'rgba(255,255,255,0.4)', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent plays feed */}
      {plays.length > 0 && (
        <div style={{ padding:'0.5rem 0' }}>
          {plays.map((p, i) => {
            const isOurs = (isHome && p.team === 'home') || (!isHome && p.team === 'away')
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 14px', background: i===0?'rgba(255,255,255,0.05)':'transparent' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background: isOurs?'var(--orange)':'rgba(255,255,255,0.25)', flexShrink:0 }} />
                <div style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight: isOurs?600:400, color: isOurs?'#fff':'rgba(255,255,255,0.5)', flex:1 }}>
                  {p.description}
                </div>
                <div style={{ fontFamily:'var(--cond)', fontSize:10, color:'rgba(255,255,255,0.3)', whiteSpace:'nowrap' }}>
                  {perLabel}{p.period} · {p.time}
                </div>
                {p.points > 0 && (
                  <div style={{ fontFamily:'var(--cond)', fontSize:12, fontWeight:700, color: isOurs?'var(--orange)':'rgba(255,255,255,0.3)', minWidth:20, textAlign:'right' }}>
                    +{p.points}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Bottom label */}
      <div style={{ padding:'6px 14px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
          {isLive ? (data.tracker_active ? 'Scorekeeper active' : 'Scorekeeper inactive') : 'Game complete'}
        </span>
        {isFinal && onDismiss && (
          <button onClick={onDismiss} style={{ background:'none', border:'none', fontFamily:'var(--cond)', fontSize:9, color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer' }}>
            Dismiss
          </button>
        )}
      </div>

    </div>
  )
}
