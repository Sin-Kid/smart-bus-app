// src/supabaseConfig.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase Config! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

// Log connection info in development (without exposing the key)
if (import.meta.env.DEV) {
  console.log('🔌 Supabase Connection:', {
    url: supabaseUrl,
    usingEnv: !!import.meta.env.VITE_SUPABASE_URL,
    keyLength: supabaseAnonKey?.length || 0
  })
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

