import { Pill } from './GameCard'

const TYPE_CONFIG = {
  practice:        { label: 'Practice',   color: '#185FA5', bg: '#E6F1FB', border: '#85B7EB' },
  game:            { label: 'Game',       color: '#993408', bg: '#fff0ea', border: '#ffd5bc' },
  tournament_game: { label: 'Tournament', color: '#854F0B', bg: '#FAEEDA', border: '#FAC775' },
  obl:             { label: 'OBA Game',   color: '#993408', bg: '#fff0ea', border: '#ffd5bc' },
  other:           { label: 'Event',      color: '#5F5E5A', bg: '#F1EFE8', border: '#B4B2A9' },
}

export default function TeamSchedule({ teamEvents, oblGames, favoriteTeam }) {
  const all = mergeAndSort(teamEvents, oblGames, favoriteTeam)

  if (!all.length) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--cond)', fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        No upcoming events
      </div>
    )
  }

  // Group by date
  const grouped = groupByDate(all)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {grouped.map(({ dateLabel, events }) => (
        <div key={dateLabel}>
          <div style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', borderBottom: '1px solid var(--rule)', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
            {dateLabel}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {events.map((ev, i) => (
              <EventCard key={ev.id || i} event={ev} favoriteTeam={favoriteTeam} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EventCard({ event, favoriteTeam }) {
  const cfg = TYPE_CONFIG[event._source] || TYPE_CONFIG.other
  const time = event.start_time
    ? new Date(event.start_time).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : null
  const endTime = event.end_time
    ? new Date(event.end_time).toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : null

  const isGameType = event._source === 'obl' || event._source === 'game' || event._source === 'tournament_game'
  const isPractice = event._source === 'practice'

  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Type bar */}
      <div style={{
        background: cfg.color,
        padding: '3px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontFamily: 'var(--cond)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
          {event.tournament_name || cfg.label}
          {event.is_recurring ? ' · Recurring' : ''}
        </span>
        {time && (
          <span style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 600, color: '#fff' }}>
            {time}{endTime ? ` – ${endTime}` : ''}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '8px 12px' }}>
        {isGameType ? (
          <GameContent event={event} favoriteTeam={favoriteTeam} cfg={cfg} />
        ) : (
          <PracticeContent event={event} cfg={cfg} />
        )}
      </div>
    </div>
  )
}

function GameContent({ event, favoriteTeam, cfg }) {
  const isObl = event._source === 'obl'
  const home = isObl ? event.home : (event.is_home ? favoriteTeam : event.opponent)
  const away = isObl ? event.away : (event.is_home ? event.opponent : favoriteTeam)
  const played = isObl && event.hs !== null
  const homeWon = played && event.hs > event.as
  const awayWon = played && event.as > event.hs
  const kHome = home === favoriteTeam
  const kAway = away === favoriteTeam
  const kWon = played && ((kHome && homeWon) || (kAway && awayWon))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--cond)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', color: kHome ? cfg.color : played ? (homeWon ? 'var(--ink)' : 'var(--ink-4)') : 'var(--ink)' }}>
            {home}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>Home</div>
          {kHome && played && <Pill result={kWon ? 'W' : 'L'} />}
        </div>

        <div style={{ textAlign: 'center' }}>
          {played ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 28, fontWeight: 800, color: homeWon ? 'var(--ink)' : 'var(--ink-4)' }}>{event.hs}</span>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 16, color: 'var(--ink-4)' }}>–</span>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 28, fontWeight: 800, color: awayWon ? 'var(--ink)' : 'var(--ink-4)' }}>{event.as}</span>
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', padding: '3px 8px', border: '1px solid var(--rule)', borderRadius: 3 }}>vs</span>
          )}
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{ fontFamily: 'var(--cond)', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', color: kAway ? cfg.color : played ? (awayWon ? 'var(--ink)' : 'var(--ink-4)') : 'var(--ink)' }}>
            {away}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>Away</div>
          {kAway && played && <Pill result={kWon ? 'W' : 'L'} />}
        </div>
      </div>

      {(event.location || event.address) && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {event.location}{event.address ? ` · ${event.address}` : ''}
        </div>
      )}
    </div>
  )
}

function PracticeContent({ event, cfg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 15, fontWeight: 700, color: cfg.color }}>
          {event.title || 'Practice'}
        </div>
        {event.location && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
            {event.location}{event.address ? ` · ${event.address}` : ''}
          </div>
        )}
        {event.notes && (
          <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, fontStyle: 'italic' }}>{event.notes}</div>
        )}
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────
function mergeAndSort(teamEvents, oblGames, favoriteTeam) {
  const now = new Date()
  const items = []

  // Team events — games and other events only, NO practices
  for (const ev of teamEvents) {
    if (ev.type === 'practice') continue
    if (new Date(ev.start_time) >= now) {
      items.push({ ...ev, _source: ev.type, _sortKey: new Date(ev.start_time).getTime() })
    }
  }

  // OBL games — only upcoming unplayed ones involving favorite team
  for (const g of oblGames) {
    if (!g.played && (g.home === favoriteTeam || g.away === favoriteTeam) && g._date) {
      items.push({ ...g, _source: 'obl', _sortKey: g._date.getTime() })
    }
  }

  return items.sort((a, b) => a._sortKey - b._sortKey)
}

function groupByDate(events) {
  const groups = {}
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  for (const ev of events) {
    const d = new Date(ev.start_time || ev._sortKey)
    d.setHours(0, 0, 0, 0)
    let label
    if (d.getTime() === today.getTime()) label = 'Today'
    else if (d.getTime() === tomorrow.getTime()) label = 'Tomorrow'
    else label = d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })

    if (!groups[label]) groups[label] = []
    groups[label].push(ev)
  }

  return Object.entries(groups).map(([dateLabel, events]) => ({ dateLabel, events }))
}
