import { Pill } from './GameCard'

const TYPE_CONFIG = {
  practice:        { label:'Practice',    color:'#185FA5', bg:'#E6F1FB', border:'#85B7EB' },
  game:            { label:'Game',        color:'#993408', bg:'#fff0ea', border:'#ffd5bc' },
  tournament_game: { label:'Tournament',  color:'#854F0B', bg:'#FAEEDA', border:'#FAC775' },
  obl:             { label:'OBA Game',    color:'#993408', bg:'#fff0ea', border:'#ffd5bc' },
  other:           { label:'Event',       color:'#5F5E5A', bg:'#F1EFE8', border:'#B4B2A9' },
}

export default function TeamSchedule({ teamEvents, oblGames, favoriteTeam }) {
  const all = mergeAndSort(teamEvents, oblGames, favoriteTeam)

  if (!all.length) return (
    <div style={{ padding:'1.5rem', textAlign:'center', color:'var(--ink-4)', fontFamily:'var(--cond)', fontSize:14, letterSpacing:'0.05em', textTransform:'uppercase' }}>
      No upcoming events
    </div>
  )

  const grouped = groupByDate(all)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
      {grouped.map(({ dateLabel, events }) => (
        <div key={dateLabel}>
          <div style={{ fontFamily:'var(--cond)', fontSize:11, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', borderBottom:'1px solid var(--rule)', paddingBottom:'0.4rem', marginBottom:'0.75rem' }}>
            {dateLabel}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {events.map((ev,i) => <EventCard key={ev.id||i} event={ev} favoriteTeam={favoriteTeam} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function EventCard({ event, favoriteTeam }) {
  const cfg    = TYPE_CONFIG[event._source] || TYPE_CONFIG.other
  const isGame = event._source === 'obl' || event._source === 'game' || event._source === 'tournament_game'
  const played = event._source === 'obl' && event.hs !== null

  const timeStr = event.start_time
    ? new Date(event.start_time).toLocaleTimeString('en-CA', { hour:'numeric', minute:'2-digit' })
    : event.time || null
  const endStr = event.end_time
    ? new Date(event.end_time).toLocaleTimeString('en-CA', { hour:'numeric', minute:'2-digit' })
    : null

  // Build maps URL from address or location name
  const mapQuery = event.address || event.location
  const mapsUrl  = mapQuery
    ? `https://maps.apple.com/?q=${encodeURIComponent(mapQuery)}`
    : null

  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:8, overflow:'hidden' }}>
      {/* Header bar: type label left, time right */}
      <div style={{ background:cfg.color, padding:'4px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:9, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.8)' }}>
          {event.tournament_name || cfg.label}{event.is_recurring ? ' · Recurring' : ''}
        </span>
        {timeStr && (
          <span style={{ fontFamily:'var(--cond)', fontSize:12, fontWeight:600, color:'#fff', whiteSpace:'nowrap' }}>
            {timeStr}{endStr ? ` – ${endStr}` : ''}
          </span>
        )}
      </div>

      {/* Date + location row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'5px 12px', borderBottom:`1px solid ${cfg.border}`, background:'rgba(255,255,255,0.45)' }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:11, fontWeight:600, color:cfg.color, letterSpacing:'0.04em' }}>
          {event.start_time
            ? new Date(event.start_time).toLocaleDateString('en-CA', { weekday:'short', month:'short', day:'numeric' })
            : event._date
              ? new Date(event._date).toLocaleDateString('en-CA', { weekday:'short', month:'short', day:'numeric' })
              : 'Date TBD'}
        </span>
        {event.location && (
          mapsUrl
            ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily:'var(--cond)', fontSize:11, fontWeight:600, color:cfg.color, textDecoration:'none', display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink:0 }}>
                  <path d="M8 1C5.24 1 3 3.24 3 6c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.75A1.75 1.75 0 1 1 8 4.25a1.75 1.75 0 0 1 0 3.5z" fill="currentColor"/>
                </svg>
                {event.location}
              </a>
            : <span style={{ fontFamily:'var(--cond)', fontSize:11, fontWeight:600, color:cfg.color }}>{event.location}</span>
        )}
      </div>

      <div style={{ padding:'10px 12px' }}>
        {isGame ? (
          played
            ? <PlayedGame event={event} favoriteTeam={favoriteTeam} cfg={cfg} />
            : <UpcomingGame event={event} favoriteTeam={favoriteTeam} cfg={cfg} />
        ) : (
          <PracticeCard event={event} cfg={cfg} />
        )}
      </div>
    </div>
  )
}

// Upcoming game — full detail layout
function UpcomingGame({ event, favoriteTeam, cfg }) {
  const isObl  = event._source === 'obl'
  const isHome = isObl ? event.home === favoriteTeam : event.is_home
  const opp    = isObl ? (event.home === favoriteTeam ? event.away : event.home) : event.opponent
  const venue  = event.location

  return (
    <div>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div>
          <div style={{ fontFamily:'var(--cond)', fontSize:18, fontWeight:800, color:cfg.color, lineHeight:1.1 }}>
            {favoriteTeam?.split(' - ')[0]}
          </div>
          <div style={{ fontFamily:'var(--cond)', fontSize:12, fontWeight:600, color:'var(--ink-3)', marginTop:1 }}>
            vs {opp}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--cond)', fontSize:12, fontWeight:700, color:'var(--ink)', background:'rgba(255,255,255,0.6)', border:`1px solid ${cfg.border}`, borderRadius:4, padding:'2px 8px', display:'inline-block' }}>
            {isHome ? 'Home' : 'Away'}
          </div>
        </div>
      </div>
      {event.notes && (
        <div style={{ fontSize:11, color:'var(--ink-3)', fontStyle:'italic', marginTop:4 }}>{event.notes}</div>
      )}
    </div>
  )
}

// Played OBA game — score layout
function PlayedGame({ event, favoriteTeam, cfg }) {
  const homeWon = event.hs > event.as
  const awayWon = event.as > event.hs
  const kHome   = event.home === favoriteTeam
  const kAway   = event.away === favoriteTeam
  const kWon    = (kHome && homeWon) || (kAway && awayWon)

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:8 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--cond)', fontSize:14, fontWeight:700, textTransform:'uppercase', color: kHome?cfg.color:homeWon?'var(--ink)':'var(--ink-4)' }}>{event.home}</div>
          <div style={{ fontSize:10, color:'var(--ink-4)' }}>Home</div>
          {kHome && <Pill result={kWon?'W':'L'} />}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ fontFamily:'var(--cond)', fontSize:28, fontWeight:800, color:homeWon?'var(--ink)':'var(--ink-4)' }}>{event.hs}</span>
          <span style={{ fontFamily:'var(--cond)', fontSize:16, color:'var(--ink-4)' }}>–</span>
          <span style={{ fontFamily:'var(--cond)', fontSize:28, fontWeight:800, color:awayWon?'var(--ink)':'var(--ink-4)' }}>{event.as}</span>
        </div>
        <div style={{ textAlign:'left' }}>
          <div style={{ fontFamily:'var(--cond)', fontSize:14, fontWeight:700, textTransform:'uppercase', color: kAway?cfg.color:awayWon?'var(--ink)':'var(--ink-4)' }}>{event.away}</div>
          <div style={{ fontSize:10, color:'var(--ink-4)' }}>Away</div>
          {kAway && <Pill result={kWon?'W':'L'} />}
        </div>
      </div>
      {event.location && (
        <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:6, paddingTop:6, borderTop:`1px solid ${cfg.border}` }}>
          {event.location}{event.address?` · ${event.address}`:''}
        </div>
      )}
    </div>
  )
}

function PracticeCard({ event, cfg }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div>
        <div style={{ fontFamily:'var(--cond)', fontSize:15, fontWeight:700, color:cfg.color }}>{event.title||'Practice'}</div>
        {event.location && <div style={{ fontSize:11, color:'var(--ink-3)', marginTop:2 }}>{event.location}{event.address?` · ${event.address}`:''}</div>}
        {event.notes    && <div style={{ fontSize:11, color:'var(--ink-3)', fontStyle:'italic', marginTop:2 }}>{event.notes}</div>}
      </div>
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function mergeAndSort(teamEvents, oblGames, favoriteTeam) {
  const now   = new Date()
  const items = []

  for (const ev of teamEvents) {
    if (ev.type === 'practice') continue   // practices go in sidebar only
    if (new Date(ev.start_time) >= now) {
      items.push({ ...ev, _source: ev.type, _sortKey: new Date(ev.start_time).getTime() })
    }
  }

  for (const g of oblGames) {
    if (!g.played && (g.home === favoriteTeam || g.away === favoriteTeam) && g._date) {
      items.push({ ...g, _source:'obl', _sortKey: g._date.getTime() })
    }
  }

  return items.sort((a,b) => a._sortKey - b._sortKey)
}

function groupByDate(events) {
  const groups = {}
  const today  = new Date(); today.setHours(0,0,0,0)
  const tmrw   = new Date(today); tmrw.setDate(tmrw.getDate()+1)

  for (const ev of events) {
    const d = new Date(ev.start_time || ev._sortKey); d.setHours(0,0,0,0)
    let label
    if (d.getTime()===today.getTime())     label = 'Today'
    else if (d.getTime()===tmrw.getTime()) label = 'Tomorrow'
    else label = d.toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'})
    if (!groups[label]) groups[label]=[]
    groups[label].push(ev)
  }
  return Object.entries(groups).map(([dateLabel,events])=>({dateLabel,events}))
}
