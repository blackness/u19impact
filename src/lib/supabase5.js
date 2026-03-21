import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON
)

// All OBL divisions with their sheet IDs
export const DIVISIONS = [
  // Boys
  { id: 'u19_men_2526',  label: 'U19 Men',  gender: 'Boys', sheetId: '1vMVuV4Lqa1QXeFw6MfB1aNkd__OsftPM0uxGuch7odk' },
  { id: 'u17_boys_2526', label: 'U17 Boys', gender: 'Boys', sheetId: '15EsKfhla4Kww-R77JktBGYw1oYcLr2CACBNKUbkwaWE' },
  { id: 'u16_boys_2526', label: 'U16 Boys', gender: 'Boys', sheetId: '1LDFHO0hyElvlMl6uwtMaJZDkX9PTY-Wa0_s18c5hujE' },
  { id: 'u15_boys_2526', label: 'U15 Boys', gender: 'Boys', sheetId: '1SxrSkAcvihWzGyrtqMpdpIxV9mT2oWVHD9TU3hEC2ns' },
  { id: 'u14_boys_2526', label: 'U14 Boys', gender: 'Boys', sheetId: '1dBwIW3BtlBaC1JM_RcyYx9CB26rxSlg1ucDxEktVGmM' },
  { id: 'u13_boys_2526', label: 'U13 Boys', gender: 'Boys', sheetId: '1y41zrly5wm_ojqarEy0gCVbEqNraJBgaKPMF0F4yODU' },
  { id: 'u12_boys_2526', label: 'U12 Boys', gender: 'Boys', sheetId: '13cHjyJNcWYqDzYlto4NoQ4j0wK3dAdudFmcO4RhcvFk' },
  { id: 'u11_boys_2526', label: 'U11 Boys', gender: 'Boys', sheetId: '1SeETQjJ_djw7T83zl6VTGAeSJWxKru2j8L84RF77ifE' },
  { id: 'u10_boys_2526', label: 'U10 Boys', gender: 'Boys', sheetId: '1bpKGdRfkyc4SPYoQUXwsGEkXiQy9AqxPDM_bx5Ly0IY' },
  { id: 'u9_boys_2526',  label: 'U9 Boys',  gender: 'Boys', sheetId: '1IH_IRDqLJbU3DqcP7iWJ-EYDGUXPRwE14Kf2JJQaouk' },
  // Girls
  { id: 'u19_women_2526', label: 'U19 Women', gender: 'Girls', sheetId: '1r8ea2bbxrweYdBCZ58lz4-LqCogmES6OPktZ-1hvGEQ' },
  { id: 'u17_girls_2526', label: 'U17 Girls', gender: 'Girls', sheetId: '1T1EVLwieZUOA8SiNYzdV25WN2QG2iYUma2ju9cqW-hE' },
  { id: 'u16_girls_2526', label: 'U16 Girls', gender: 'Girls', sheetId: '180BEGWeegyGcup7dsCToKJHcREQm1NHBvbwGA_ihotE' },
  { id: 'u15_girls_2526', label: 'U15 Girls', gender: 'Girls', sheetId: '1lVcaQay0uGQgTMblyI-ig1AVKZFum52h_Ehe3R-6wcs' },
  { id: 'u14_girls_2526', label: 'U14 Girls', gender: 'Girls', sheetId: '1TKTdfmnIsELG7_s-xvJXt8iB7B92k9NvhVafA646WK0' },
  { id: 'u13_girls_2526', label: 'U13 Girls', gender: 'Girls', sheetId: '1yu1c-wZLfwDF4M62R9sS9XYquTX_34ImBQTwAhG2Inw' },
  { id: 'u12_girls_2526', label: 'U12 Girls', gender: 'Girls', sheetId: '1ttmyQnD9h1PLMEpoTbigUsN692nmdbqfjjeatm5J7yM' },
  { id: 'u11_girls_2526', label: 'U11 Girls', gender: 'Girls', sheetId: '1niiuPmD2NeW5fSXSUaia3AflmDfG2m6YTysowiCzfj8' },
  { id: 'u10_girls_2526', label: 'U10 Girls', gender: 'Girls', sheetId: '1uIChNpE4sz5u16NQLGY5qKOaGrYExXRjqV38bOCsxbg' },
]

// Fetch a single division's cached data from Supabase
export async function fetchDivision(divisionId) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/obl_schedule_cache?id=eq.${divisionId}&select=data,fetched_at`
  const res = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_ANON,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON}`,
      'Content-Type': 'application/json',
    }
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const rows = await res.json()
  console.log('fetchDivision rows:', rows?.length, divisionId)
  if (!rows || rows.length === 0) throw new Error(`No cache found for ${divisionId}`)
  return { pools: rows[0].data, fetchedAt: new Date(rows[0].fetched_at) }
}

// Subscribe to realtime updates for a division
export function subscribeToDivision(divisionId, onUpdate) {
  return supabase
    .channel(`cache:${divisionId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'obl_schedule_cache',
      filter: `id=eq.${divisionId}`,
    }, onUpdate)
    .subscribe()
}

// Fetch team events (one-off practices, games, tournament games)
export async function fetchTeamEvents(teamId = 'kingston_impact_wallace') {
  const now = new Date().toISOString()
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/team_events?team_id=eq.${teamId}&start_time=gte.${now}&select=*&order=start_time.asc`
  const res = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_ANON,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON}`,
    }
  })
  if (!res.ok) throw new Error(`team_events HTTP ${res.status}`)
  return res.json()
}

// Fetch recurring patterns and expand into instances for next 90 days
export async function fetchRecurringEvents(teamId = 'kingston_impact_wallace') {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/recurring_events?team_id=eq.${teamId}&select=*`
  const res = await fetch(url, {
    headers: {
      'apikey': import.meta.env.VITE_SUPABASE_ANON,
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON}`,
    }
  })
  if (!res.ok) throw new Error(`recurring_events HTTP ${res.status}`)
  const patterns = await res.json()
  return expandRecurring(patterns)
}

function expandRecurring(patterns) {
  const DAY_MAP = { SUN:0, MON:1, TUE:2, WED:3, THU:4, FRI:5, SAT:6 }
  const instances = []
  const now = new Date()
  const horizon = new Date(now)
  horizon.setDate(horizon.getDate() + 90)

  for (const p of patterns) {
    const from  = p.active_from  ? new Date(p.active_from)  : now
    const until = p.active_until ? new Date(p.active_until) : horizon
    const end   = until < horizon ? until : horizon
    const start = from > now ? from : now
    const [sh, sm] = p.start_time.split(':').map(Number)
    const [eh, em] = p.end_time ? p.end_time.split(':').map(Number) : [sh + 2, sm]
    const cur = new Date(start)
    cur.setHours(0, 0, 0, 0)

    while (cur <= end) {
      const dayName = Object.keys(DAY_MAP).find(k => DAY_MAP[k] === cur.getDay())
      if (p.days_of_week.includes(dayName)) {
        const startDt = new Date(cur)
        startDt.setHours(sh, sm, 0, 0)
        const endDt = new Date(cur)
        endDt.setHours(eh, em, 0, 0)
        instances.push({
          id: `rec_${p.id}_${cur.toISOString().split('T')[0]}`,
          type: 'practice',
          title: p.title || 'Practice',
          location: p.location,
          address: p.address,
          notes: p.notes,
          start_time: startDt.toISOString(),
          end_time: endDt.toISOString(),
          is_recurring: true,
        })
      }
      cur.setDate(cur.getDate() + 1)
    }
  }
  return instances
}
