// user-app/supabaseConfig.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase Config! Please check your .env file inside user-app/')
}

// Log connection info in development (without exposing the key)
if (__DEV__) {
  console.log('🔌 Supabase Connection:', {
    url: supabaseUrl,
    usingEnv: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    keyLength: supabaseAnonKey?.length || 0
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

