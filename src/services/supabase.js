import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.');
}

export const supabase = createClient(url, anonKey);

function fallbackEmail(user) {
  return user?.email || `${user?.id || 'user'}@local.invalid`;
}

function buildInviteCode(userId) {
  return `NUTRI-${String(userId || '').slice(0, 6).toUpperCase()}`;
}

async function ensureProfile(user, forcedRole = null) {
  if (!user?.id) return null;

  const metadata = user.user_metadata || {};
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  const role = forcedRole || existingProfile?.role || metadata.role || 'paciente';

  const profilePayload = {
    id: user.id,
    role,
    nome: metadata.nome || '',
    sobrenome: metadata.sobrenome || '',
    email: fallbackEmail(user),
    telefone: metadata.telefone || null,
    updated_at: new Date().toISOString()
  };

  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });

  if (profileErr) throw new Error(profileErr.message);

  if (role === 'nutricionista') {
    const inviteCode = metadata.codigo_convite || buildInviteCode(user.id);
    const { error: nutriErr } = await supabase
      .from('nutricionistas')
      .upsert(
        {
          profile_id: user.id,
          codigo_convite: inviteCode,
          crn: metadata.crn || null,
          especialidade: metadata.especialidade || null,
          clinica: metadata.clinica || null
        },
        { onConflict: 'profile_id' }
      );

    if (nutriErr) throw new Error(nutriErr.message);
  }

  if (role === 'paciente') {
    const codigoConvite = (metadata.codigo_convite || '').trim().toUpperCase();
    let idNutricionista = null;

    if (codigoConvite) {
      const { data: nutriByCode, error: nutriCodeErr } = await supabase
        .from('nutricionistas')
        .select('id')
        .eq('codigo_convite', codigoConvite)
        .maybeSingle();

      if (nutriCodeErr) throw new Error(nutriCodeErr.message);
      idNutricionista = nutriByCode?.id || null;
    }

    const { error: pacienteErr } = await supabase
      .from('pacientes')
      .upsert(
        {
          profile_id: user.id,
          id_nutricionista: idNutricionista
        },
        { onConflict: 'profile_id' }
      );

    if (pacienteErr) throw new Error(pacienteErr.message);
  }

  const { data: profile, error: profileReadErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileReadErr) throw new Error(profileReadErr.message);
  return profile;
}

async function signInAndEnsure(email, password, role) {
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(signIn.error.message);
  const user = signIn.data.user;
  await ensureProfile(user, role);
  return signIn.data;
}

export const authApi = {
  async currentSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },

  async currentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user;
  },

  async currentProfile() {
    const user = await this.currentUser();
    if (!user) return null;
    return ensureProfile(user);
  },

  async login(email, password) {
    return signInAndEnsure(email, password, null);
  },

  async signupNutri(payload) {
    const { nome, sobrenome, email, senha, crn, especialidade } = payload;

    const signUp = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          role: 'nutricionista',
          nome,
          sobrenome,
          crn: crn || null,
          especialidade: especialidade || null
        }
      }
    });

    if (signUp.error) throw new Error(signUp.error.message);

    await signInAndEnsure(email, senha, 'nutricionista');
  },

  async signupPaciente(payload) {
    const { nome, sobrenome, email, senha, telefone, codigoConvite } = payload;

    const signUp = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          role: 'paciente',
          nome,
          sobrenome,
          telefone: telefone || null,
          codigo_convite: (codigoConvite || '').trim().toUpperCase() || null
        }
      }
    });

    if (signUp.error) throw new Error(signUp.error.message);

    await signInAndEnsure(email, senha, 'paciente');
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  onAuthChange(cb) {
    return supabase.auth.onAuthStateChange(cb);
  }
};

export const nutriApi = {
  async me() {
    const user = await authApi.currentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('nutricionistas')
      .select('*, profiles!inner(id, nome, sobrenome, email, role)')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  async patients() {
    const me = await this.me();
    if (!me?.id) return [];

    const { data, error } = await supabase
      .from('pacientes')
      .select('id, profile_id, created_at, profiles!inner(id, nome, sobrenome, email)')
      .eq('id_nutricionista', me.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async activePlan(pacienteId) {
    const { data, error } = await supabase
      .from('planos_alimentares')
      .select('*')
      .eq('paciente_id', pacienteId)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  async savePlan(pacienteId, titulo, observacoes) {
    const me = await this.me();
    if (!me?.id) throw new Error('Nutricionista não encontrada.');

    const { error: disableErr } = await supabase
      .from('planos_alimentares')
      .update({ ativo: false })
      .eq('paciente_id', pacienteId);

    if (disableErr) throw new Error(disableErr.message);

    const { data, error } = await supabase
      .from('planos_alimentares')
      .insert({
        paciente_id: pacienteId,
        nutricionista_id: me.id,
        titulo: titulo || 'Plano alimentar',
        observacoes: observacoes || '',
        ativo: true
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async history(pacienteId) {
    const { data, error } = await supabase
      .from('registros_refeicoes')
      .select('id, tipo, descricao, foto_url, created_at, feedbacks(id, comentario, texto, created_at)')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
};

export const pacienteApi = {
  async me() {
    const user = await authApi.currentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('pacientes')
      .select('id, profile_id, id_nutricionista, created_at, profiles!inner(id, nome, sobrenome, email, role)')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  async myPlan() {
    const me = await this.me();
    if (!me?.id) return null;

    const { data, error } = await supabase
      .from('planos_alimentares')
      .select('*')
      .eq('paciente_id', me.id)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  },

  async myHistory() {
    const me = await this.me();
    if (!me?.id) return [];

    const { data, error } = await supabase
      .from('registros_refeicoes')
      .select('id, tipo, descricao, foto_url, created_at, feedbacks(id, comentario, texto, created_at)')
      .eq('paciente_id', me.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }
};
