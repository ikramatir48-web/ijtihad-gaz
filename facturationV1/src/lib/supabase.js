import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ugnmuxhgwiexuuetvbtd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnbm11eGhnd2lleHV1ZXR2YnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDU1MTMsImV4cCI6MjA4OTE4MTUxM30.Lln_7C5ynzk2VHR378RuK1GlzQUHEyek-E0sAwiS9Mg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
