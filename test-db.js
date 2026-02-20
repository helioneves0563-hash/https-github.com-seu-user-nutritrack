import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.replace('VITE_SUPABASE_URL=', '').trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
});

const supabase = createClient(url, key);

async function check() {
    console.log("---- NUTRICIONISTAS ----");
    const { data: n, error: ne } = await supabase.from('nutricionistas').select('*').limit(5);
    console.log(ne ? "ERRO:" : "DATA:", ne || n);

    console.log("\n---- PACIENTES ----");
    const { data: p, error: pe } = await supabase.from('pacientes').select('*').limit(5);
    console.log(pe ? "ERRO:" : "DATA:", pe || p);

    console.log("\n---- TESTE DE QUERY LISTAR PACIENTES ----");
    if (n && n.length > 0) {
        const nutriId = n[0].id;
        const { data: list, error: listErr } = await supabase
            .from('pacientes')
            .select(`*`)
            .eq('id_nutricionista', nutriId);
        console.log("Pacientes do nutri " + nutriId + ":", listErr || list);
    }
}
check();
