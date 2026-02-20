import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://eafeyvzxywfibguwymil.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZmV5dnp4eXdmaWJndXd5bWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTM4NzksImV4cCI6MjA4NzA4OTg3OX0.I8hbFQcNNUz_V3UC1mkg2JFV0QFfa4mhXbeFlx038Rk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnostico() {
    console.log("Conectando ao Supabase...");
    try {
        const { data, error } = await supabase.auth.getSession();
        console.log("getSession() retornou:", { error: error?.message, temSessao: !!data?.session });

        console.log("Testando listagem anonima de algo...");
        const res = await supabase.from('pacientes').select('*').limit(1);
        console.log("Select pacientes (req anonima):", res.error?.message || "Sucesso (provavelmente 0 rows devido ao RLS)");

    } catch (e) {
        console.error("Deu exception global:", e);
    }

    console.log("Fim do timeout simulado.");
    process.exit(0);
}

diagnostico();
