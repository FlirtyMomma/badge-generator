import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akbllygsuehesbpbeaqg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_32IWRIqe1CSNeSFOf2LHNA_8Z59LS9_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);