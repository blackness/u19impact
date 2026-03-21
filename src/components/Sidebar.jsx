import { useState } from 'react'

export default function Sidebar({
  pools, poolKeys, activePool, onSwitchPool,
  favoriteTeam, favoritePool, onSetFavorite, division,
  teamEvents = [],
}) {
  const [editingFavorite, setEditingFavorite] = useState(false)

  const poolA = pools?.[favoritePool || activePool]
  const kSt   = poolA?.standings?.find(t => t.name === favoriteTeam)
  const sorted = kSt ? [...(poolA?.standings || [])].sort((a, b) => b.bp - a.bp || b.wins - a.wins) : []
  const kRank  = kSt ? sorted.findIndex(t => t.name === favoriteTeam) + 1 : 0

  let nextGame = null, nextWeekend = null
  if (poolA && favoriteTeam) {
    for (const wk of poolA.weekends || []) {
      const g = wk.games.find(g => !wk.played && (g.home === favoriteTeam || g.away === favoriteTeam))
      if (g) { nextGame = g; nextWeekend = wk; break }
    }
  }

  const upcomingPractices = teamEvents
    .filter(e => e.type === 'practice' && new Date(e.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 4)

  const allTeams = pools
    ? Object.values(pools).flatMap(pd => pd.standings?.map(t => t.name) || [])
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {kSt && (
        <SbCard>
          <SbHead right={<span style={{ background: 'var(--or-light)', color: 'var(--orange)', fontSize: 9, padding: '1px 6px', borderRadius: 2, fontFamily: 'var(--cond)', fontWeight: 700, letterSpacing: '0.1em' }}>Pool {favoritePool}</span>}>
            {favoriteTeam}
          </SbHead>
          <div style={{ padding: '1.1rem 1rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ fontFamily: 'var(--cond)', fontSize: 50, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              {kSt.wins}–{kSt.losses}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--orange)' }}>{division?.label}</div>
              {kRank > 0 && <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{ordinal(kRank)} in pool</div>}
              {kSt.bp > 0 && <div style={{ fontFamily: 'var(--cond)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginTop: 3 }}>{kSt.bp} BP</div>}
            </div>
          </div>
        </SbCard>
      )}

      {nextGame && nextWeekend && (
        <SbCard>
          <SbHead right={<span style={{ fontSize: 9, color: 'var(--ink-3)' }}>Wk {nextWeekend.num}</span>}>Next game</SbHead>
          <div style={{ padding: '0.9rem 1rem' }}>
            <div style={{ fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 4 }}>{nextWeekend.date || 'Date TBD'}</div>
            <div style={{ fontFamily: 'var(--cond)', fontSize: 19, fontWeight: 700, lineHeight: 1.1, color: 'var(--ink)' }}>
              {favoriteTeam?.split(' - ')[0]} <span style={{ fontWeight: 300, color: 'var(--ink-3)' }}>vs</span> {nextGame.home === favoriteTeam ? nextGame.away : nextGame.home}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{nextGame.time} · {nextGame.home === favoriteTeam ? 'Home' : 'Away'}</div>
            {nextWeekend.location && (
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: '0.6rem', borderTop: '1px solid var(--rule)', paddingTop: '0.6rem', lineHeight: 1.4 }}>
                {nextWeekend.location}{nextWeekend.address ? <><br />{nextWeekend.address}</> : null}
              </div>
            )}
          </div>
        </SbCard>
      )}

      {upcomingPractices.length > 0 && (
        <SbCard>
          <SbHead>Upcoming practices</SbHead>
          <div>
            {upcomingPractices.map((p, i) => {
              const dt    = new Date(p.start_time)
              const endDt = p.end_time ? new Date(p.end_time) : null
              const day   = dt.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
              const tStr  = dt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
              const eStr  = endDt ? endDt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }) : null
              return (
                <div key={p.id || i} style={{ padding: '0.5rem 1rem', borderBottom: i < upcomingPractices.length - 1 ? '1px solid var(--rule)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--cond)', fontSize: 13, fontWeight: 600, color: '#185FA5' }}>{p.title || 'Practice'}</div>
                    {p.location && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.location}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{day}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{tStr}{eStr ? ` – ${eStr}` : ''}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </SbCard>
      )}

      <SbCard>
        <SbHead right={
          <button onClick={() => setEditingFavorite(!editingFavorite)} style={{ background: 'none', border: 'none', fontSize: 10, color: 'var(--orange)', fontFamily: 'var(--cond)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
            {editingFavorite ? 'Done' : 'Change'}
          </button>
        }>My team</SbHead>
        {editingFavorite ? (
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {allTeams.map(name => (
              <button key={name} onClick={() => { onSetFavorite(name); setEditingFavorite(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: name === favoriteTeam ? 'var(--or-light)' : 'none', border: 'none', borderBottom: '1px solid var(--rule)', padding: '0.55rem 1rem', fontFamily: 'var(--cond)', fontSize: 13, fontWeight: name === favoriteTeam ? 700 : 500, color: name === favoriteTeam ? 'var(--orange)' : 'var(--ink)', cursor: 'pointer' }}>
                {name}{name === favoriteTeam ? ' ★' : ''}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: '0.75rem 1rem', fontFamily: 'var(--cond)', fontSize: 15, fontWeight: 700, color: 'var(--orange)' }}>{favoriteTeam || 'None set'}</div>
        )}
      </SbCard>

      <SbCard>
        <SbHead>All pools</SbHead>
        <div>
          {poolKeys.map(p => (
            <button key={p} onClick={() => onSwitchPool(p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.5rem 1rem', borderBottom: '1px solid var(--rule)', border: 'none', background: p === activePool ? 'var(--or-light)' : 'transparent', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: p === activePool ? 'var(--orange)' : 'var(--ink)' }}>Pool {p}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{pools?.[p]?.standings?.length || '—'} teams</span>
            </button>
          ))}
        </div>
      </SbCard>

    </div>
  )
}

function SbCard({ children }) {
  return <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 6, overflow: 'hidden' }}>{children}</div>
}

function SbHead({ children, right }) {
  return (
    <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--rule)', fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{children}</span>{right}
    </div>
  )
}

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
