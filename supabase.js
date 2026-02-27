import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufzpaufqyassaijzjxbx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmenBhdWZxeWFzc2FpanpqeGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTc1MjgsImV4cCI6MjA4Nzc5MzUyOH0.H2_yyaZUQPkGk_tPWLu8Zc-yN-N_m4UZtj9XKqCbgNY'

export const supabase = createClient(supabaseUrl, supabaseKey)