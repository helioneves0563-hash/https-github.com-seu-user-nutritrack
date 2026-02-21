import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(url && anonKey);

export const supabase = hasSupabaseConfig ? createClient(url, anonKey) : null;

function assertSupabaseConfigured() {
  if (!supabase) {
    throw new Error('Projeto sem configuração Supabase no ambiente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.');
  }
}

function fallbackEmail(user) {
  return user?.email || `${user?.id || 'user'}@local.invalid`;
}

function buildInviteCode(userId) {
  return `NUTRI-${String(userId || '').slice(0, 6).toUpperCase()}`;
}

async function fileToDataUrl(file) {
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function ensureProfile(user, forcedRole = null) {
  assertSupabaseConfigured();
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
  assertSupabaseConfigured();
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(signIn.error.message);
  const user = signIn.data.user;
  await ensureProfile(user, role);
  return signIn.data;
}

export const authApi = {
  async currentSession() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },

  async currentUser() {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user;
  },

  async currentProfile() {
    if (!supabase) return null;
    const user = await this.currentUser();
    if (!user) return null;
    return ensureProfile(user);
  },

  async login(email, password) {
    assertSupabaseConfigured();
    return signInAndEnsure(email, password, null);
  },

  async signupNutri(payload) {
    assertSupabaseConfigured();
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
    assertSupabaseConfigured();
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
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  onAuthChange(cb) {
    if (!supabase) {
      return {
        data: {
          subscription: { unsubscribe: () => {} }
        }
      };
    }
    return supabase.auth.onAuthStateChange(cb);
  }
};

export const nutriApi = {
  async me() {
    assertSupabaseConfigured();
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
    assertSupabaseConfigured();
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
    assertSupabaseConfigured();
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
    assertSupabaseConfigured();
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

    const { data: pacienteProfile } = await supabase
      .from('pacientes')
      .select('profile_id')
      .eq('id', pacienteId)
      .maybeSingle();

    if (pacienteProfile?.profile_id) {
      await supabase.from('notificacoes').insert({
        user_target: pacienteProfile.profile_id,
        titulo: 'Plano atualizado',
        mensagem: 'Sua nutricionista atualizou seu plano alimentar.'
      });
    }

    return data;
  },

  async history(pacienteId) {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('registros_refeicoes')
      .select('id, tipo, descricao, foto_url, created_at, feedbacks(id, comentario, texto, created_at)')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async sendFeedback(registroId, texto) {
    assertSupabaseConfigured();
    const me = await this.me();
    if (!me?.id) throw new Error('Nutricionista não encontrada.');
    if (!texto?.trim()) throw new Error('Digite um comentário.');

    const { data, error } = await supabase
      .from('feedbacks')
      .insert({
        registro_id: registroId,
        nutricionista_id: me.id,
        comentario: texto.trim()
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    const { data: registro } = await supabase
      .from('registros_refeicoes')
      .select('paciente_id')
      .eq('id', registroId)
      .maybeSingle();

    if (registro?.paciente_id) {
      const { data: pacienteProfile } = await supabase
        .from('pacientes')
        .select('profile_id')
        .eq('id', registro.paciente_id)
        .maybeSingle();

      if (pacienteProfile?.profile_id) {
        await supabase.from('notificacoes').insert({
          user_target: pacienteProfile.profile_id,
          titulo: 'Feedback da nutricionista',
          mensagem: 'Você recebeu um novo comentário na refeição.'
        });
      }
    }

    return data;
  }
};

export const pacienteApi = {
  async me() {
    assertSupabaseConfigured();
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
    assertSupabaseConfigured();
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
    assertSupabaseConfigured();
    const me = await this.me();
    if (!me?.id) return [];

    const { data, error } = await supabase
      .from('registros_refeicoes')
      .select('id, tipo, descricao, foto_url, created_at, feedbacks(id, comentario, texto, created_at)')
      .eq('paciente_id', me.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async sendMeal({ tipo, descricao, arquivo }) {
    assertSupabaseConfigured();
    const me = await this.me();
    if (!me?.id) throw new Error('Perfil de paciente não encontrado.');

    const fotoUrl = await fileToDataUrl(arquivo);

    const { data, error } = await supabase
      .from('registros_refeicoes')
      .insert({
        paciente_id: me.id,
        nutricionista_id: me.id_nutricionista,
        tipo: tipo || 'almoco',
        descricao: descricao || '',
        foto_url: fotoUrl
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    if (me.id_nutricionista) {
      const { data: nutriProfile } = await supabase
        .from('nutricionistas')
        .select('profile_id')
        .eq('id', me.id_nutricionista)
        .maybeSingle();

      if (nutriProfile?.profile_id) {
        await supabase.from('notificacoes').insert({
          user_target: nutriProfile.profile_id,
          titulo: 'Nova refeição enviada',
          mensagem: 'Paciente enviou uma refeição para análise.'
        });
      }
    }

    return data;
  }
};

export const notificacoesApi = {
  async list(limit = 15) {
    assertSupabaseConfigured();
    const user = await authApi.currentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('user_target', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async countUnread() {
    assertSupabaseConfigured();
    const user = await authApi.currentUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notificacoes')
      .select('*', { head: true, count: 'exact' })
      .eq('user_target', user.id)
      .eq('lida', false);

    if (error) throw new Error(error.message);
    return count || 0;
  },

  async markAllRead() {
    assertSupabaseConfigured();
    const user = await authApi.currentUser();
    if (!user) return;

    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('user_target', user.id)
      .eq('lida', false);

    if (error) throw new Error(error.message);
  },

  async subscribe(onInsert) {
    assertSupabaseConfigured();
    const user = await authApi.currentUser();
    if (!user) return { unsubscribe: () => {} };

    const channel = supabase
      .channel(`notificacoes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `user_target=eq.${user.id}`
        },
        (payload) => onInsert?.(payload.new)
      )
      .subscribe();

    return {
      unsubscribe: () => supabase.removeChannel(channel)
    };
  }
};
