import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vglkxfjihhnkwxqohpbw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbGt4ZmppaGhua3d4cW9ocGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNDU5MDksImV4cCI6MjA2MDYyMTkwOX0.ksigYHQDfOvcvTSIoOtFu6TBzZomUwchiJWHiSEcXUM';
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
