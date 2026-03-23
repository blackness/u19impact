import { useState, useEffect } from 'react'

const SUPABASE_URL  = 'https://sclhzmgdafotyiynrjwr.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjbGh6bWdkYWZvdHlpeW5yandyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNDIyMzMsImV4cCI6MjA4NjcxODIzM30.lNrQF2Bpe7f2dno0rZ9XzqGSzyFi3vwKkLny8VPnBH8'
const STATS_URL     = 'https://statstream-basketball.vercel.app'
const KINGSTON      = 'Kingston Impact - Wallace'

async function fetchCompletedGames() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/games?status=eq.completed&select=id,home_team,home_score,away_score,game_settings,updated_at&order=updated_at.desc&limit=50`,
    { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
  )
  if (!res.ok) return []
  return res.json()
}

async function fetchCompletedTeamEvents() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/team_events?team_id=eq.kingston_impact_wallace&type=in.(game,tournament_game)&select=id,title,opponent,is_home,home_score:start_time,tournament_name,start_time&order=start_time.desc&limit=50`,
    { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
  )
  if (!res.ok) return []
  return res.json()
}

function buildResults(statsGames, oblGames, favoriteTeam) {
  const results = []

  // Stats app games
  for (const g of statsGames) {
    const s      = g.game_settings || {}
    const isHome = s.isHome ?? true
    const opp    = s.opponent || 'Opponent'
    const our    = isHome ? g.home_score : g.away_score
    const their  = isHome ? g.away_score  : g.home_score
    const won    = our > their
    const date   = new Date(g.updated_at)
    results.push({
      id:       g.id,
      date,
      opponent: opp,
      ourScore: our,
      oppScore: their,
      won,
      isHome,
      source:   'stats',
      type:     'Game',
    })
  }

  // OBA games
  for (const g of oblGames) {
    if (g.hs === null) continue
    const isHome = g.home === favoriteTeam
    const our    = isHome ? g.hs : g.as
    const their  = isHome ? g.as : g.hs
    const won    = our > their
    results.push({
      id:       `obl_${g.home}_${g.away}_${g.time}`,
      date:     null,
      opponent: isHome ? g.away : g.home,
      ourScore: our,
      oppScore: their,
      won,
      isHome,
      source:   'obl',
      type:     'OBA',
    })
  }

  return results.sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date - a.date
  })
}

export default function Results({ oblGames = [], favoriteTeam = KINGSTON, limit = null, showLink = false }) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompletedGames().then(games => {
      const built = buildResults(games, oblGames, favoriteTeam)
      setResults(limit ? built.slice(0, limit) : built)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [oblGames.length])

  if (loading) return (
    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--cond)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      Loading results…
    </div>
  )

  if (!results.length) return (
    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--cond)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      No results yet
    </div>
  )

  return (
    <div>
      {results.map((r, i) => (
        <ResultRow key={r.id} result={r} last={i === results.length - 1} />
      ))}
      {showLink && (
        <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--rule)', textAlign: 'center' }}>
          <a href="/results" style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', textDecoration: 'none' }}>
            See all results →
          </a>
        </div>
      )}
    </div>
  )
}

function ResultRow({ result: r, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0.55rem 1rem',
      borderBottom: last ? 'none' : '1px solid var(--rule)',
    }}>
      {/* W/L pill */}
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        background: r.won ? 'var(--green-bg)' : 'var(--red-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 800,
        color: r.won ? 'var(--green)' : 'var(--red)',
      }}>
        {r.won ? 'W' : 'L'}
      </div>

      {/* Game info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          vs {r.opponent}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
          {r.type} · {r.isHome ? 'Home' : 'Away'}
          {r.date ? ` · ${r.date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : ''}
        </div>
      </div>

      {/* Score */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 16, fontWeight: 800, color: r.won ? 'var(--green)' : 'var(--red)' }}>
          {r.ourScore}–{r.oppScore}
        </div>
      </div>

      {/* Box score link */}
      <a
        href={STATS_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{ flexShrink: 0, fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-4)', textDecoration: 'none', padding: '3px 6px', border: '1px solid var(--rule)', borderRadius: 4 }}
      >
        Stats →
      </a>
    </div>
  )
}
