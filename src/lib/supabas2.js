import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
import.meta.env.VITE_SUPABASE_URL || 'https://sclhzmgdafotyiynrjwr.supabase.co',
    import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_N1UhoXnqybNEFCGBMdWXWg_BujE6Eh-'
)

// All OBL divisions with their sheet IDs
export const DIVISIONS = [
  // Boys
  { id: 'u19_men',  label: 'U19 Men',  gender: 'Boys', sheetId: '1vMVuV4Lqa1QXeFw6MfB1aNkd__OsftPM0uxGuch7odk' },
  { id: 'u17_boys', label: 'U17 Boys', gender: 'Boys', sheetId: '15EsKfhla4Kww-R77JktBGYw1oYcLr2CACBNKUbkwaWE' },
  { id: 'u16_boys', label: 'U16 Boys', gender: 'Boys', sheetId: '1LDFHO0hyElvlMl6uwtMaJZDkX9PTY-Wa0_s18c5hujE' },
  { id: 'u15_boys', label: 'U15 Boys', gender: 'Boys', sheetId: '1SxrSkAcvihWzGyrtqMpdpIxV9mT2oWVHD9TU3hEC2ns' },
  { id: 'u14_boys', label: 'U14 Boys', gender: 'Boys', sheetId: '1dBwIW3BtlBaC1JM_RcyYx9CB26rxSlg1ucDxEktVGmM' },
  { id: 'u13_boys', label: 'U13 Boys', gender: 'Boys', sheetId: '1y41zrly5wm_ojqarEy0gCVbEqNraJBgaKPMF0F4yODU' },
  { id: 'u12_boys', label: 'U12 Boys', gender: 'Boys', sheetId: '13cHjyJNcWYqDzYlto4NoQ4j0wK3dAdudFmcO4RhcvFk' },
  { id: 'u11_boys', label: 'U11 Boys', gender: 'Boys', sheetId: '1SeETQjJ_djw7T83zl6VTGAeSJWxKru2j8L84RF77ifE' },
  { id: 'u10_boys', label: 'U10 Boys', gender: 'Boys', sheetId: '1bpKGdRfkyc4SPYoQUXwsGEkXiQy9AqxPDM_bx5Ly0IY' },
  { id: 'u9_boys',  label: 'U9 Boys',  gender: 'Boys', sheetId: '1IH_IRDqLJbU3DqcP7iWJ-EYDGUXPRwE14Kf2JJQaouk' },
  // Girls
  { id: 'u19_women', label: 'U19 Women', gender: 'Girls', sheetId: '1r8ea2bbxrweYdBCZ58lz4-LqCogmES6OPktZ-1hvGEQ' },
  { id: 'u17_girls', label: 'U17 Girls', gender: 'Girls', sheetId: '1T1EVLwieZUOA8SiNYzdV25WN2QG2iYUma2ju9cqW-hE' },
  { id: 'u16_girls', label: 'U16 Girls', gender: 'Girls', sheetId: '180BEGWeegyGcup7dsCToKJHcREQm1NHBvbwGA_ihotE' },
  { id: 'u15_girls', label: 'U15 Girls', gender: 'Girls', sheetId: '1lVcaQay0uGQgTMblyI-ig1AVKZFum52h_Ehe3R-6wcs' },
  { id: 'u14_girls', label: 'U14 Girls', gender: 'Girls', sheetId: '1TKTdfmnIsELG7_s-xvJXt8iB7B92k9NvhVafA646WK0' },
  { id: 'u13_girls', label: 'U13 Girls', gender: 'Girls', sheetId: '1yu1c-wZLfwDF4M62R9sS9XYquTX_34ImBQTwAhG2Inw' },
  { id: 'u12_girls', label: 'U12 Girls', gender: 'Girls', sheetId: '1ttmyQnD9h1PLMEpoTbigUsN692nmdbqfjjeatm5J7yM' },
  { id: 'u11_girls', label: 'U11 Girls', gender: 'Girls', sheetId: '1niiuPmD2NeW5fSXSUaia3AflmDfG2m6YTysowiCzfj8' },
  { id: 'u10_girls', label: 'U10 Girls', gender: 'Girls', sheetId: '1uIChNpE4sz5u16NQLGY5qKOaGrYExXRjqV38bOCsxbg' },
]

// Fetch a single division's cached data from Supabase
export async function fetchDivision(divisionId) {
  const { data, error } = await supabase
    .from('obl_schedule_cache')
    .select('data, fetched_at')
    .eq('id', divisionId)
    .single()

  if (error) throw error
  return { pools: data.data, fetchedAt: new Date(data.fetched_at) }
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
