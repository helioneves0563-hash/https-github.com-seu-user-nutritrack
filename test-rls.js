import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    // Tenta ler nutricionistas para ver se a tabela existe / tem rls bloqueando
    const { data: n, error: ne } = await supabase.from('nutricionistas').select('*').limit(1);
    console.log("Nutricionistas RLS/Table:", { ne, len: n?.length });
    
    // Ler pacientes
    const { data: p, error: pe } = await supabase.from('pacientes').select('*').limit(1);
    console.log("Pacientes RLS/Table:", { pe, len: p?.length });
}
check();
