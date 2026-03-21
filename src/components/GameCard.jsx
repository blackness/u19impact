export default function GameCard({ game, favoriteTeam }) {
  const { home, away, hs, as: as_, time, played } = game
  const isK     = home === favoriteTeam || away === favoriteTeam
  const homeWon = played && hs > as_
  const awayWon = played && as_ > hs
  const kHome   = home === favoriteTeam
  const kAway   = away === favoriteTeam
  const kWon    = played && ((kHome && homeWon) || (kAway && awayWon))

  return (
    <div style={{
      background: isK ? 'var(--or-light)' : 'var(--white)',
      border: `1px solid ${isK ? 'var(--or-mid)' : 'var(--rule)'}`,
      borderRadius: 5, marginBottom: 5, overflow: 'hidden',
      opacity: !played ? 0.75 : 1,
    }}>
      {/* Time bar */}
      <div style={{
        fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: isK ? 'var(--orange)' : 'var(--ink-3)',
        padding: '0.28rem 1.1rem',
        borderBottom: `1px solid ${isK ? 'var(--or-mid)' : 'var(--rule)'}`,
        background: isK ? 'rgba(232,80,10,0.04)' : 'rgba(0,0,0,0.015)',
      }}>
        {time}
      </div>

      {/* Score row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.1rem',
      }}>
        {/* Home */}
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: 'var(--cond)', fontSize: 16, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.1,
            color: home === favoriteTeam ? 'var(--orange)'
                 : played ? (homeWon ? 'var(--ink)' : 'var(--ink-4)') : 'var(--ink)',
          }}>
            {home}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>Home</div>
          {kHome && played && (
            <div style={{ marginTop: 3 }}>
              <Pill result={kWon ? 'W' : 'L'} />
            </div>
          )}
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {played ? (
            <>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 34, fontWeight: 800, lineHeight: 1, color: homeWon ? 'var(--ink)' : 'var(--ink-4)', minWidth: 38, textAlign: 'center' }}>{hs}</span>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 18, fontWeight: 300, color: 'var(--ink-4)' }}>–</span>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 34, fontWeight: 800, lineHeight: 1, color: awayWon ? 'var(--ink)' : 'var(--ink-4)', minWidth: 38, textAlign: 'center' }}>{as_}</span>
            </>
          ) : (
            <span style={{
              fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-4)',
              padding: '0.25rem 0.55rem', border: '1px solid var(--rule)', borderRadius: 3,
            }}>vs</span>
          )}
        </div>

        {/* Away */}
        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily: 'var(--cond)', fontSize: 16, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.1,
            color: away === favoriteTeam ? 'var(--orange)'
                 : played ? (awayWon ? 'var(--ink)' : 'var(--ink-4)') : 'var(--ink)',
          }}>
            {away}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>Away</div>
          {kAway && played && (
            <div style={{ marginTop: 3 }}>
              <Pill result={kWon ? 'W' : 'L'} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Pill({ result }) {
  const styles = {
    W: { background: 'var(--green-bg)', color: 'var(--green)' },
    L: { background: 'var(--red-bg)',   color: 'var(--red)'   },
    U: { background: '#f0f0ee',         color: 'var(--ink-4)' },
  }
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: 'var(--cond)', fontSize: 9, fontWeight: 800,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '2px 5px', borderRadius: 2,
      ...styles[result],
    }}>
      {result}
    </span>
  )
}
