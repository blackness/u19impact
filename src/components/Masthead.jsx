import { useState } from 'react'

export default function Masthead({
  division, divisions, onSwitchDivision,
  pools, activePool, onSwitchPool,
  fetchedAt, loading, onRefresh, isLive = false,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const boys  = divisions.filter(d => d.gender === 'Boys')
  const girls = divisions.filter(d => d.gender === 'Girls')
  const timeStr = fetchedAt
    ? fetchedAt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
    : null

  return (
    <>
      <header style={{ background: 'var(--white)', borderBottom: '2px solid var(--ink)', position: 'sticky', top: 0, zIndex: 50, width: '100%' }}>
        <div style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: '0 1rem', display: 'flex', alignItems: 'stretch', minWidth: 0 }}>

          {/* Brand / division picker */}
          <button onClick={() => setPickerOpen(true)} style={{
            background: 'none', border: 'none', textAlign: 'left',
            padding: '0.75rem 1rem 0.75rem 0',
            borderRight: '1px solid var(--rule)', flexShrink: 0, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: 1,
          }}>
            <div style={{ fontFamily: 'var(--cond)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--orange)' }}>
              OBL
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 20, fontWeight: 800, lineHeight: 1, textTransform: 'uppercase', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                {division?.label ?? 'Select'}
              </span>
              <span style={{ color: 'var(--orange)', fontSize: 12 }}>▾</span>
            </div>
            <div style={{ fontFamily: 'var(--cond)', fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>2025/26</div>
          </button>

          {/* Pool tabs — scrollable, fills remaining space */}
          <nav style={{
            display: 'flex', alignItems: 'stretch', flex: 1, minWidth: 0,
            overflowX: 'auto', scrollbarWidth: 'none', paddingLeft: '0.5rem',
          }}>
            <style>{`nav::-webkit-scrollbar{display:none}`}</style>
            {pools.map(p => (
              <button key={p} onClick={() => onSwitchPool(p)} style={{
                background: 'none', border: 'none', flexShrink: 0,
                borderBottom: `3px solid ${activePool === p ? 'var(--orange)' : 'transparent'}`,
                fontFamily: 'var(--cond)', fontSize: 13, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: activePool === p ? 'var(--orange)' : 'var(--ink-3)',
                padding: '0 0.75rem', cursor: 'pointer',
                transition: 'color .15s, border-color .15s',
                display: 'flex', alignItems: 'center', minHeight: 56,
              }}>
                {p}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Status bar */}
      <div style={{ background: 'var(--ink)', color: 'var(--white)', padding: '0.35rem 1rem', width: '100%' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--cond)', fontSize: 11, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
            {isLive && (
              <>
                <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#ef4444', animation:'liveblink 1.2s ease-in-out infinite' }} />
                <style>{`@keyframes liveblink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
                <span style={{ color:'#ef4444', fontWeight:700, letterSpacing:'0.1em', fontSize:10 }}>LIVE</span>
                <span style={{ color:'rgba(255,255,255,0.3)' }}>·</span>
              </>
            )}
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: loading ? '#facc15' : '#4ade80', animation: 'blink 2.5s ease-in-out infinite' }} />
            <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
            {loading ? 'Loading…' : timeStr ? `Updated ${timeStr}` : 'Ready'}
          </span>
          <button onClick={onRefresh} style={{ background: 'none', border: '1px solid rgba(255,255,255,.22)', color: 'rgba(255,255,255,.65)', fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, cursor: 'pointer' }}>
            ↻
          </button>
        </div>
      </div>

      {/* Division picker overlay */}
      {pickerOpen && (
        <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 70 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--white)', borderRadius: 10, border: '1px solid var(--rule)', width: 340, maxWidth: '95vw', maxHeight: '75vh', overflowY: 'auto' }}>
            <div style={{ padding: '0.85rem 1.25rem 0.5rem', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Select Division</span>
              <button onClick={() => setPickerOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink-3)', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {[{ label: 'Boys', items: boys }, { label: 'Girls', items: girls }].map(group => (
              <div key={group.label}>
                <div style={{ padding: '0.5rem 1.25rem 0.25rem', fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--orange)' }}>{group.label}</div>
                {group.items.map(d => (
                  <button key={d.id} onClick={() => { onSwitchDivision(d.id); setPickerOpen(false) }} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: d.id === division?.id ? 'var(--or-light)' : 'none',
                    border: 'none', borderBottom: '1px solid var(--rule)',
                    padding: '0.65rem 1.25rem', cursor: 'pointer',
                    fontFamily: 'var(--cond)', fontSize: 16,
                    fontWeight: d.id === division?.id ? 700 : 500,
                    color: d.id === division?.id ? 'var(--orange)' : 'var(--ink)',
                  }}>
                    {d.label}{d.id === division?.id ? ' ✓' : ''}
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
