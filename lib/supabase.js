import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase env vars not set. Copy .env.example to .env.local and fill in your values.')
}

// Supports both old (eyJ...) and new (sb_publishable_...) key formats
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: (...args) => fetch(...args),
    },
  }
)

// Helper: get current session user
export async function getCurrentUser() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) return null
    return session.user
  } catch (e) {
    console.error('getCurrentUser error:', e)
    return null
  }
}

// Helper: get member profile with role
export async function getMemberProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) return null
    return data
  } catch (e) {
    console.error('getMemberProfile error:', e)
    return null
  }
}

// Helper: check if user is admin
export async function isAdmin(userId) {
  const profile = await getMemberProfile(userId)
  return profile?.role === 'admin'
}
