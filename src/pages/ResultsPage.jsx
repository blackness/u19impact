import Results from '../components/Results'

export default function ResultsPage() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/" style={{ fontFamily: 'var(--cond)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--orange)', textDecoration: 'none' }}>
          ← Back
        </a>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--orange)', marginTop: '1rem' }}>
          Kingston Impact · U19
        </div>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 28, fontWeight: 800, color: 'var(--ink)' }}>
          All Results
        </div>
      </div>
      <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
        <Results limit={null} showLink={false} />
      </div>
    </div>
  )
}
