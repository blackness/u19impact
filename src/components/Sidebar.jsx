import { useState } from 'react'
import Roster from './Roster'
import NotifyButton from './NotifyButton'
import Results from './Results'

export default function Sidebar({
  pools, poolKeys, activePool, onSwitchPool,
  favoriteTeam, favoritePool, onSetFavorite, division,
  teamEvents = [],
}) {
  const [editingFavorite, setEditingFavorite] = useState(false)

  const poolA  = pools?.[favoritePool || activePool]
  const kSt    = poolA?.standings?.find(t => t.name === favoriteTeam)
  const sorted = kSt ? [...(poolA?.standings || [])].sort((a,b) => b.bp-a.bp||b.wins-a.wins) : []
  const kRank  = kSt ? sorted.findIndex(t => t.name === favoriteTeam) + 1 : 0

  const oblGamesForFav = (poolA?.weekends || [])
    .flatMap(wk => wk.games.filter(g => g.hs !== null && (g.home === favoriteTeam || g.away === favoriteTeam)))

  const upcomingPractices = teamEvents
    .filter(e => e.type === 'practice' && new Date(e.start_time) >= new Date())
    .sort((a,b) => new Date(a.start_time)-new Date(b.start_time))
    .slice(0, 4)

  const allTeams = pools
    ? Object.values(pools).flatMap(pd => pd.standings?.map(t => t.name) || [])
    : []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

      {/* Recent Results */}
      <SbCard>
        <SbHead right={<a href="/results" style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--orange)', textDecoration:'none' }}>All →</a>}>
          Recent Results
        </SbHead>
        <Results limit={5} showLink={false} favoriteTeam={favoriteTeam} oblGames={oblGamesForFav} />
      </SbCard>

      {/* Roster */}
      <SbCard>
        <SbHead>Roster</SbHead>
        <Roster inline={true} />
      </SbCard>

      {/* OBA Standings */}
      {kSt && (
        <SbCard>
          <SbHead right={<span style={{ background:'var(--or-light)', color:'var(--orange)', fontSize:9, padding:'1px 6px', borderRadius:2, fontFamily:'var(--cond)', fontWeight:700, letterSpacing:'0.1em' }}>Pool {favoritePool}</span>}>
            OBA Standings
          </SbHead>
          <div style={{ padding:'1rem', display:'flex', alignItems:'center', gap:'0.9rem' }}>
            <div style={{ fontFamily:'var(--cond)', fontSize:50, fontWeight:800, lineHeight:1, letterSpacing:'-0.02em', color:'var(--ink)' }}>
              {kSt.wins}–{kSt.losses}
            </div>
            <div>
              <div style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--orange)' }}>{division?.label}</div>
              {kRank > 0 && <div style={{ fontSize:12, color:'var(--ink-3)' }}>{ordinal(kRank)} in pool</div>}
              {kSt.bp > 0 && <div style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:600, color:'var(--ink-2)', marginTop:3 }}>{kSt.bp} BP</div>}
            </div>
          </div>
        </SbCard>
      )}

    </div>
  )
}

function SbCard({ children }) {
  return <div style={{ background:'var(--white)', border:'1px solid var(--rule)', borderRadius:6, overflow:'hidden' }}>{children}</div>
}
function SbHead({ children, right }) {
  return (
    <div style={{ padding:'0.6rem 1rem', borderBottom:'1px solid var(--rule)', fontFamily:'var(--cond)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-3)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <span>{children}</span>{right}
    </div>
  )
}
function ordinal(n) {
  const s=['th','st','nd','rd'],v=n%100
  return n+(s[(v-20)%10]||s[v]||s[0])
}
