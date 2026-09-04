// Browser-side Supabase client, used only for the Google OAuth handshake
// (see AuthContext's signInWithGoogle/onAuthStateChange). Every other
// interaction with Supabase goes through our FastAPI backend
// (backend/supabase_client.py) - this is the one exception, because the
// OAuth redirect flow has to happen client-side via Supabase's own SDK.
//
// The anon key is safe to ship to the browser by design (it's what it's
// for, protected by RLS) - unlike the service-role key, which only ever
// lives in backend/.env.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
