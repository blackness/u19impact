import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || 'https://sclhzmgdafotyiynrjwr.supabase.co',
    import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_N1UhoXnqybNEFCGBMdWXWg_BujE6Eh-'
)

