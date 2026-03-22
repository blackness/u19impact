import { useState } from 'react'
import GameCard, { Pill } from './GameCard'
import TeamSchedule from './TeamSchedule'
import Roster from './Roster'

export default function PoolView({ poolData, poolKey, favoriteTeam, teamEvents = [], allPools }) {
  const [expandedTeam, setExpandedTeam] = useState(null)
  const [mobileTab, setMobileTab] = useState('schedule') // 'schedule' | 'roster'

  if (!poolData) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--cond)', fontSize: 15, letterSpacing: '0.05em' }}>
      No data for Pool {poolKey}
    </div>
  )

  const { standings = [], weekends = [] } = poolData

  // Find next unplayed weekend with games
  const nextWeekend = weekends.find(wk => !wk.played && wk.games.length > 0)

  // Played weekends for results section
  const playedWeekends = weekends.filter(wk => wk.played && wk.games.length > 0)

  // Build game log per team
  const gameLog = buildGameLog(standings, weekends)

  // Collect OBL games for favorite team across all weekends (for merge)
  const oblGamesForFav = weekends.flatMap(wk =>
    wk.games
      .filter(g => !wk.played && (g.home === favoriteTeam || g.away === favoriteTeam))
      .map(g => ({ ...g, played: wk.played, _date: wk.date ? new Date(wk.date) : null, location: wk.location, address: wk.address }))
  )

  // Sort standings by BP then wins
  const sorted = [...standings].sort((a, b) => b.bp - a.bp || b.wins - a.wins || a.losses - b.losses)

  // Is this the favorite team's pool?
  const isFavPool = standings.some(t => t.name === favoriteTeam)

  return (
    <div>
      {/* ── MOBILE TAB BAR (hidden on desktop via CSS) ── */}
      {isFavPool && (
        <div className="mobile-tabs" style={{ display: 'flex', marginBottom: '1.25rem', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
          {[
            { key: 'schedule', label: 'Schedule' },
            { key: 'roster',   label: 'Roster' },
          ].map(t => (
            <button key={t.key} onClick={() => setMobileTab(t.key)} style={{
              flex: 1, padding: '9px', border: 'none',
              background: mobileTab === t.key ? 'var(--orange)' : 'var(--white)',
              color: mobileTab === t.key ? '#fff' : 'var(--ink-3)',
              fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
              borderRight: t.key === 'schedule' ? '1px solid var(--rule)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── ROSTER TAB (mobile only) ── */}
      {isFavPool && mobileTab === 'roster' && (
        <Roster inline={false} />
      )}

      {/* ── SCHEDULE TAB or non-fav pool ── */}
      {(!isFavPool || mobileTab === 'schedule') && (
        <>
          {/* ── TEAM SCHEDULE (fav pool) or NEXT OBA GAMES ── */}
          {isFavPool ? (
            <>
              <SectionLabel>Team schedule</SectionLabel>
              <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 6, overflow: 'hidden', marginBottom: '2rem', padding: '0.75rem' }}>
                <TeamSchedule
                  teamEvents={teamEvents}
                  oblGames={oblGamesForFav}
                  favoriteTeam={favoriteTeam}
                />
              </div>
            </>
          ) : (
            <NextGamesBlock weekend={nextWeekend} favoriteTeam={favoriteTeam} />
          )}

      {/* ── STANDINGS ── */}
      <SectionLabel>Standings — Pool {poolKey}</SectionLabel>
      <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 6, overflow: 'hidden', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 28 }} />
            <col />
            <col style={{ width: 36 }} />
            <col style={{ width: 36 }} />
            <col style={{ width: 50 }} />
            <col style={{ width: 24 }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--ink)' }}>
              {['#','Team','W','L','BP',''].map((h, i) => (
                <th key={i} style={{
                  fontFamily: 'var(--cond)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.13em', textTransform: 'uppercase', color: '#fff',
                  padding: '0.55rem 0.7rem', textAlign: i === 1 ? 'left' : 'center',
                  ...(h === 'BP' ? { cursor: 'help', textDecoration: 'underline', textDecorationStyle: 'dotted' } : {}),
                }} title={h === 'BP' ? 'Basis Points: OBL tiebreaker system' : undefined}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, i) => {
              const isK  = team.name === favoriteTeam
              const isEx = expandedTeam === team.name
              const pct  = (team.wins + team.losses) === 0 ? '—'
                : team.wins === team.wins + team.losses ? '1.000'
                : '.' + String(Math.round(team.pct * 1000)).padStart(3, '0')

              return (
                <>
                  <tr
                    key={team.name}
                    onClick={() => setExpandedTeam(isEx ? null : team.name)}
                    style={{
                      borderBottom: isEx ? 'none' : '1px solid var(--rule)',
                      background: isK ? 'var(--or-light)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '0.6rem 0.7rem', fontFamily: 'var(--cond)', fontSize: 12, color: 'var(--ink-4)', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '0.6rem 0.7rem', fontFamily: 'var(--cond)', fontSize: 14, fontWeight: 600, color: isK ? 'var(--orange)' : 'var(--ink)', textAlign: 'left' }}>
                      {team.name}{isK ? ' ★' : ''}
                    </td>
                    <td style={{ padding: '0.6rem 0.7rem', fontFamily: 'var(--cond)', fontSize: 14, color: 'var(--green)', fontWeight: 700, textAlign: 'center' }}>{team.wins}</td>
                    <td style={{ padding: '0.6rem 0.7rem', fontFamily: 'var(--cond)', fontSize: 14, color: 'var(--ink-2)', textAlign: 'center' }}>{team.losses}</td>
                    <td style={{ padding: '0.6rem 0.7rem', fontFamily: 'var(--cond)', fontSize: 13, color: 'var(--ink-2)', textAlign: 'center' }}>{team.bp || '—'}</td>
                    <td style={{ padding: '0.6rem 0.7rem', fontFamily: 'var(--cond)', fontSize: 12, color: isEx ? 'var(--orange)' : 'var(--ink-4)', textAlign: 'center', transition: 'transform 0.2s', transform: isEx ? 'rotate(90deg)' : 'none' }}>›</td>
                  </tr>

                  {/* Expanded game log */}
                  {isEx && (
                    <tr key={`${team.name}-log`}>
                      <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid var(--rule)' }}>
                        <div style={{
                          background: isK ? 'var(--or-light)' : '#f9f9f7',
                          borderTop: `1px solid ${isK ? 'var(--or-mid)' : 'var(--rule)'}`,
                          padding: '0.5rem 0.7rem 0.65rem 1.5rem',
                        }}>
                          {(gameLog[team.name] || []).length === 0 ? (
                            <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>No games recorded</div>
                          ) : (gameLog[team.name] || []).map((g, gi) => (
                            <div key={gi} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '0.3rem 0', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: 12,
                            }}>
                              <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>
                                vs {g.opp} <span style={{ fontSize: 10, color: 'var(--ink-4)', fontWeight: 400 }}>{g.ha}</span>
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {g.score
                                  ? <><span style={{ fontFamily: 'var(--cond)', fontSize: 15, fontWeight: 700, color: g.result === 'W' ? 'var(--green)' : 'var(--red)' }}>{g.score}</span><Pill result={g.result} /></>
                                  : <><span style={{ fontSize: 11, color: 'var(--ink-4)' }}>Upcoming</span><Pill result="U" /></>
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── RESULTS ── */}
      {playedWeekends.length > 0 && (
        <>
          <SectionLabel style={{ marginTop: '2rem' }}>Results</SectionLabel>
          {playedWeekends.map(wk => (
            <WeekendBlock key={wk.num} weekend={wk} favoriteTeam={favoriteTeam} />
          ))}
        </>
      )}
        </>
      )}
    </div>
  )
}

function NextGamesBlock({ weekend, favoriteTeam }) {
  if (!weekend) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.8rem 1rem', background: 'var(--white)',
        border: '1px solid var(--rule)', borderRadius: 6,
        borderLeft: '3px solid var(--ink-4)', marginBottom: '2rem',
      }}>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 18, color: 'var(--ink-4)', flexShrink: 0 }}>—</div>
        <div>
          <div style={{ fontFamily: 'var(--cond)', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
            No games scheduled yet
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            Schedules are typically posted 1–2 weeks before game day
          </div>
        </div>
      </div>
    )
  }

  const myGames    = favoriteTeam ? weekend.games.filter(g => g.home === favoriteTeam || g.away === favoriteTeam) : []
  const otherGames = weekend.games.filter(g => !myGames.includes(g))
  const venueLine  = weekend.location || null

  return (
    <div style={{ background: 'var(--orange)', borderRadius: 6, overflow: 'hidden', marginBottom: '2rem' }}>
      {/* Header */}
      <div style={{ padding: '0.9rem 1.1rem 0.6rem' }}>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: 3 }}>
          Next up — Weekend {weekend.num}
        </div>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {weekend.date || 'Date TBD'}
        </div>
        {venueLine && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>
            <strong style={{ color: '#fff', fontWeight: 600 }}>{weekend.location}</strong>
            {weekend.address ? ` · ${weekend.address}` : ''}
          </div>
        )}
      </div>

      {/* Favorite team games */}
      {myGames.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.15)', borderTop: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1.1rem' }}>
          <div style={{ fontFamily: 'var(--cond)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: '0.45rem' }}>
            {favoriteTeam?.split(' ')[0]} games
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {myGames.map((g, i) => {
              const isHome = g.home === favoriteTeam
              const opp    = isHome ? g.away : g.home
              return (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.22)', borderRadius: 4,
                  padding: '6px 10px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', borderLeft: '3px solid #fff',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--cond)', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
                      {favoriteTeam?.split(' - ')[0]} <span style={{ fontWeight: 300, opacity: 0.7 }}>vs</span> {opp}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                      {isHome ? 'Home' : 'Away'}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--cond)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {g.time}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rest of day */}
      {otherGames.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', padding: '0.5rem 1.1rem 0.7rem' }}>
          <div style={{ fontFamily: 'var(--cond)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
            Rest of the day
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {otherGames.map((g, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 8px', borderRadius: 3, background: 'rgba(0,0,0,0.12)',
                fontSize: 12, color: 'rgba(255,255,255,0.82)',
              }}>
                <span>{g.home} vs {g.away}</span>
                <span style={{ fontFamily: 'var(--cond)', fontSize: 11, color: 'rgba(255,255,255,0.55)', marginLeft: 8, whiteSpace: 'nowrap' }}>{g.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WeekendBlock({ weekend, favoriteTeam }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem 1rem', marginBottom: '0.8rem' }}>
        <span style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--orange)' }}>
          Weekend {weekend.num}
        </span>
        <span style={{ fontFamily: 'var(--cond)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
          {weekend.date || 'Date TBD'}
        </span>
        {weekend.location && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 'auto', textAlign: 'right', lineHeight: 1.3 }}>
            <strong style={{ display: 'block', color: 'var(--ink-2)', fontWeight: 600, fontSize: 12 }}>{weekend.location}</strong>
            {weekend.address}
          </div>
        )}
      </div>
      {weekend.games.map((g, i) => (
        <GameCard key={i} game={g} favoriteTeam={favoriteTeam} />
      ))}
    </div>
  )
}

function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-3)',
      borderBottom: '1px solid var(--rule)', paddingBottom: '0.4rem', marginBottom: '1.1rem',
      ...style,
    }}>
      {children}
    </div>
  )
}

function buildGameLog(standings, weekends) {
  const log = {}
  standings.forEach(t => { log[t.name] = [] })
  weekends.forEach(wk => {
    wk.games.forEach(g => {
      const played  = g.hs !== null && g.as !== null
      const homeWon = played && g.hs > g.as
      if (log[g.home] !== undefined) {
        log[g.home].push({ opp: g.away, ha: 'H', wk: wk.num,
          score: played ? `${g.hs}–${g.as}` : null,
          result: played ? (homeWon ? 'W' : 'L') : 'U' })
      }
      if (log[g.away] !== undefined) {
        log[g.away].push({ opp: g.home, ha: 'A', wk: wk.num,
          score: played ? `${g.as}–${g.hs}` : null,
          result: played ? (!homeWon ? 'W' : 'L') : 'U' })
      }
    })
  })
  return log
}
