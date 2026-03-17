import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ufdzcxycgprgvigyotnk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZHpjeHljZ3ByZ3ZpZ3lvdG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNDMxMDQsImV4cCI6MjA4ODcxOTEwNH0.YaE1OhMC_KBf1VgqBtd7EcWDXlUMjDGAGGyk2Is5r1k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
