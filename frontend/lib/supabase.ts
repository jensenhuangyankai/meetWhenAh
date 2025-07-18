import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database table types based on your Python backend
export interface User {
  id: string
  name: string
  telegram_user_id?: string
  created_at?: string
}

export interface Event {
  id: string
  name: string
  description?: string
  creator_id: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  timezone: string
  created_at?: string
}

export interface EventMember {
  id: string
  event_id: string
  user_id: string
  joined_at?: string
}

export interface UserAvailability {
  id: string
  user_id: string
  event_id: string
  available_slots: any[] // JSON array
  created_at?: string
  updated_at?: string
}
