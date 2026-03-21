import { useState } from 'react'

export default function Masthead({
  division, divisions, onSwitchDivision,
  pools, activePool, onSwitchPool,
  fetchedAt, loading, onRefresh,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const boys  = divisions.filter(d => d.gender === 'Boys')
  const girls = divisions.filter(d => d.gender === 'Girls')

  const timeStr = fetchedAt
    ? fetchedAt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <>
      {/* ── MASTHEAD ── */}
      <header style={{
        background: 'var(--white)',
        borderBottom: '2px solid var(--ink)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto', padding: '0 1.5rem',
          display: 'flex', alignItems: 'stretch', gap: 0,
        }}>
          {/* Brand + division picker trigger */}
          <button
            onClick={() => setPickerOpen(true)}
            style={{
              background: 'none', border: 'none', textAlign: 'left',
              padding: '1rem 1.5rem 1rem 0',
              borderRight: '1px solid var(--rule)',
              flexShrink: 0, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 1,
            }}
          >
            <div style={{ fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--orange)' }}>
              Ontario Basketball League
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 26, fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1, textTransform: 'uppercase', color: 'var(--ink)' }}>
                {division?.label ?? 'Select Division'}
              </span>
              <span style={{ color: 'var(--orange)', fontSize: 14, marginTop: 2 }}>▾</span>
            </div>
            <div style={{ fontFamily: 'var(--cond)', fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
              2025 / 26 Season
            </div>
          </button>

          {/* Pool tabs */}
          <nav style={{
            display: 'flex', alignItems: 'stretch',
            overflowX: 'auto', scrollbarWidth: 'none',
            paddingLeft: '0.5rem', flex: 1,
          }}>
            {pools.map(p => (
              <button
                key={p}
                onClick={() => onSwitchPool(p)}
                style={{
                  background: 'none', border: 'none',
                  borderBottom: `3px solid ${activePool === p ? 'var(--orange)' : 'transparent'}`,
                  fontFamily: 'var(--cond)', fontSize: 13, fontWeight: 600,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: activePool === p ? 'var(--orange)' : 'var(--ink-3)',
                  padding: '0 0.9rem', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                  display: 'flex', alignItems: 'center',
                }}
              >
                Pool {p}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── STATUS BAR ── */}
      <div style={{ background: 'var(--ink)', color: 'var(--white)', padding: '0.4rem 1.5rem' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--cond)', fontSize: 11, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: loading ? '#facc15' : '#4ade80',
              animation: 'blink 2.5s ease-in-out infinite',
            }} />
            <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
            {loading ? 'Loading…' : timeStr ? `Updated ${timeStr}` : 'Ready'}
          </span>
          <button
            onClick={onRefresh}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.22)',
              color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--cond)',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '2px 9px', borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── DIVISION PICKER OVERLAY ── */}
      {pickerOpen && (
        <div
          onClick={() => setPickerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: 80,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--white)',
              borderRadius: 10, border: '1px solid var(--rule)',
              width: 360, maxWidth: '95vw',
              maxHeight: '70vh', overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            <div style={{ padding: '1rem 1.25rem 0.5rem', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                Select Division
              </span>
              <button onClick={() => setPickerOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {[{ label: 'Boys', items: boys }, { label: 'Girls', items: girls }].map(group => (
              <div key={group.label}>
                <div style={{ padding: '0.5rem 1.25rem 0.25rem', fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--orange)' }}>
                  {group.label}
                </div>
                {group.items.map(d => (
                  <button
                    key={d.id}
                    onClick={() => { onSwitchDivision(d.id); setPickerOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      background: d.id === division?.id ? 'var(--or-light)' : 'none',
                      border: 'none', borderBottom: '1px solid var(--rule)',
                      padding: '0.65rem 1.25rem', cursor: 'pointer',
                      fontFamily: 'var(--cond)', fontSize: 16, fontWeight: d.id === division?.id ? 700 : 500,
                      color: d.id === division?.id ? 'var(--orange)' : 'var(--ink)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {d.label}
                    {d.id === division?.id && <span style={{ marginLeft: 8, fontSize: 12 }}>✓</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
