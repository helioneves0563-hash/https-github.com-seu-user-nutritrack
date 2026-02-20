import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
// Default seguro: roda localmente. Para usar Supabase, defina VITE_USE_LOCAL_DATA=false.
const USE_SUPABASE = HAS_SUPABASE && import.meta.env.VITE_USE_LOCAL_DATA === 'false';
const STORAGE_KEY = 'nutritrack_local_db_v1';

const authListeners = new Set();
const notifListeners = new Set();

function emitAuth(event, session) {
  authListeners.forEach((cb) => cb(event, session));
}

function emitNotif(notif) {
  notifListeners.forEach((cb) => cb(notif));
}

function newId(prefix) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefix}_${id}`;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultState() {
  return {
    users: [],
    currentUserId: null,
    refeicoes: [],
    notifications: [],
    planos: []
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      refeicoes: Array.isArray(parsed.refeicoes) ? parsed.refeicoes : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      planos: Array.isArray(parsed.planos) ? parsed.planos : []
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentLocalUser(state = loadState()) {
  if (!state.currentUserId) return null;
  return state.users.find((u) => u.id === state.currentUserId) || null;
}

function getPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      nome: user.nome,
      sobrenome: user.sobrenome,
      role: user.role
    }
  };
}

function buildProfile(user) {
  if (!user) return null;
  return {
    id: user.id,
    nome: user.nome,
    sobrenome: user.sobrenome,
    telefone: user.telefone || '',
    role: user.role,
    created_at: user.created_at,
    nutricionistas: user.nutricionista ? [user.nutricionista] : [],
    pacientes: user.paciente ? [user.paciente] : []
  };
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

function safeRole(role) {
  return role === 'nutricionista' ? 'nutricionista' : 'paciente';
}

function normalizeNotifListArgs(args) {
  if (typeof args === 'number') {
    return { limite: args, apenasNaoLidas: false };
  }
  return {
    limite: args?.limite ?? 30,
    apenasNaoLidas: Boolean(args?.apenasNaoLidas)
  };
}

function normalizeMeals(meals = []) {
  return (meals || []).map((meal, idx) => ({
    id: meal.id || newId('plan_meal'),
    type: meal.type || 'Refeição',
    time: meal.time || '12:00',
    items: Array.isArray(meal.items) ? meal.items : [],
    ordem: idx
  }));
}

const realSupabase = USE_SUPABASE ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function createLocalSupabaseProxy() {
  return {
    from(table) {
      const ctx = {
        table,
        mode: 'select',
        values: null,
        selectOptions: null
      };

      return {
        select(_fields, options) {
          ctx.mode = 'select';
          ctx.selectOptions = options || null;
          return this;
        },
        update(values) {
          ctx.mode = 'update';
          ctx.values = values;
          return this;
        },
        async eq(field, value) {
          const state = loadState();

          if (ctx.mode === 'select' && table === 'pacientes' && ctx.selectOptions?.head) {
            const count = state.users.filter((u) => u.paciente?.id_nutricionista === value).length;
            return { count, error: null };
          }

          if (ctx.mode === 'update' && table === 'profiles') {
            const user = state.users.find((u) => u.id === value);
            if (!user) return { data: null, error: { message: 'Usuário não encontrado' } };

            if ('nome' in ctx.values) user.nome = ctx.values.nome;
            if ('sobrenome' in ctx.values) user.sobrenome = ctx.values.sobrenome;
            if ('telefone' in ctx.values) user.telefone = ctx.values.telefone;
            saveState(state);
            return { data: buildProfile(user), error: null };
          }

          if (ctx.mode === 'update' && table === 'nutricionistas') {
            const user = state.users.find((u) => {
              if (field === 'id') return u.nutricionista?.id === value;
              if (field === 'profile_id') return u.id === value;
              return false;
            });

            if (!user?.nutricionista) {
              return { data: null, error: { message: 'Nutricionista não encontrada' } };
            }

            user.nutricionista = {
              ...user.nutricionista,
              ...ctx.values
            };
            saveState(state);
            return { data: user.nutricionista, error: null };
          }

          return { data: null, error: null };
        }
      };
    }
  };
}

export const supabase = USE_SUPABASE ? realSupabase : createLocalSupabaseProxy();

export const auth = {
  async cadastrarNutricionista({ nome, sobrenome, email, senha, crn, especialidade, clinica }) {
    if (USE_SUPABASE) {
      const { data, error } = await realSupabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            role: 'nutricionista',
            nome,
            sobrenome,
            crn: crn || null,
            especialidade: especialidade || null,
            clinica: clinica || null
          }
        }
      });
      if (error) throw new Error(error.message);
      return data;
    }

    const state = loadState();
    if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('E-mail já cadastrado.');
    }

    const id = newId('user');
    const createdAt = nowIso();
    const codigo_convite = `NUTRI-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    state.users.push({
      id,
      email,
      senha,
      nome,
      sobrenome,
      telefone: '',
      role: 'nutricionista',
      created_at: createdAt,
      nutricionista: {
        id: newId('nutri'),
        profile_id: id,
        crn,
        especialidade,
        clinica: clinica || '',
        codigo_convite,
        created_at: createdAt
      },
      paciente: null
    });

    saveState(state);
    return { user: { id, email } };
  },

  async cadastrarPaciente({ nome, sobrenome, email, senha, telefone, codigoConvite }) {
    if (USE_SUPABASE) {
      const { data, error } = await realSupabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            role: 'paciente',
            nome,
            sobrenome,
            telefone: telefone || null,
            codigo_convite: codigoConvite || null
          }
        }
      });
      if (error) throw new Error(error.message);
      return data;
    }

    const state = loadState();
    if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('E-mail já cadastrado.');
    }

    const id = newId('user');
    const createdAt = nowIso();

    let idNutricionista = null;
    if (codigoConvite) {
      const nutriUser = state.users.find((u) => u.nutricionista?.codigo_convite === codigoConvite.trim().toUpperCase());
      if (!nutriUser?.nutricionista) {
        throw new Error('Código de convite inválido.');
      }
      idNutricionista = nutriUser.nutricionista.id;
    }

    state.users.push({
      id,
      email,
      senha,
      nome,
      sobrenome,
      telefone: telefone || '',
      role: 'paciente',
      created_at: createdAt,
      nutricionista: null,
      paciente: {
        id: newId('paciente'),
        profile_id: id,
        id_nutricionista: idNutricionista,
        created_at: createdAt
      }
    });

    saveState(state);
    return { user: { id, email } };
  },

  async login(email, senha) {
    if (USE_SUPABASE) {
      const { data, error } = await realSupabase.auth.signInWithPassword({
        email,
        password: senha
      });
      if (error) throw new Error(error.message);
      return data;
    }

    const state = loadState();
    const user = state.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha
    );

    if (!user) {
      throw new Error('Credenciais inválidas.');
    }

    state.currentUserId = user.id;
    saveState(state);

    const session = { user: getPublicUser(user) };
    emitAuth('SIGNED_IN', session);
    return { user: session.user, session };
  },

  async logout() {
    if (USE_SUPABASE) {
      const { error } = await realSupabase.auth.signOut();
      if (error) throw new Error(error.message);
      return;
    }

    const state = loadState();
    state.currentUserId = null;
    saveState(state);
    emitAuth('SIGNED_OUT', null);
  },

  async recuperarSenha(email) {
    if (USE_SUPABASE) {
      const { error } = await realSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/nova-senha`
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const state = loadState();
    const userExists = state.users.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!userExists) {
      throw new Error('E-mail não encontrado.');
    }
    return { ok: true };
  },

  async atualizarSenha(novaSenha) {
    if (USE_SUPABASE) {
      const { error } = await realSupabase.auth.updateUser({ password: novaSenha });
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const state = loadState();
    const user = getCurrentLocalUser(state);
    if (!user) throw new Error('Sessão inválida.');

    user.senha = novaSenha;
    saveState(state);
    return { ok: true };
  },

  onAuthChange(callback) {
    if (USE_SUPABASE) {
      return realSupabase.auth.onAuthStateChange(callback);
    }

    authListeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          }
        }
      }
    };
  },

  async sessaoAtual() {
    if (USE_SUPABASE) {
      const { data } = await realSupabase.auth.getSession();
      return data.session;
    }

    const user = getCurrentLocalUser();
    return user ? { user: getPublicUser(user) } : null;
  },

  async perfilAtual() {
    if (USE_SUPABASE) {
      const { data: userData } = await realSupabase.auth.getUser();
      if (!userData.user) return null;

      const { data, error } = await realSupabase
        .from('profiles')
        .select('*, nutricionistas(*), pacientes(*)')
        .eq('id', userData.user.id)
        .single();

      if (error) throw new Error(error.message);
      return data;
    }

    const user = getCurrentLocalUser();
    return buildProfile(user);
  }
};

export const refeicoes = {
  async registrar({ tipo, descricao, notaPaciente, arquivo }) {
    if (USE_SUPABASE) {
      const { data: userData } = await realSupabase.auth.getUser();
      if (!userData.user) throw new Error('Sessão inválida.');

      const { data: paciente, error: errPac } = await realSupabase
        .from('pacientes')
        .select('id, id_nutricionista')
        .eq('profile_id', userData.user.id)
        .single();

      if (errPac) throw new Error(errPac.message);

      let fotoUrl = null;
      let fotoPath = null;

      if (arquivo) {
        const ext = arquivo.name.split('.').pop();
        const caminho = `${userData.user.id}/${Date.now()}.${ext}`;
        const { error: errUp } = await realSupabase.storage
          .from('refeicoes')
          .upload(caminho, arquivo, { cacheControl: '3600', upsert: false });

        if (errUp) throw new Error(errUp.message);

        fotoPath = caminho;
        const { data: urlData } = realSupabase.storage.from('refeicoes').getPublicUrl(caminho);
        fotoUrl = urlData.publicUrl;
      }

      const { data, error } = await realSupabase
        .from('registros_refeicoes')
        .insert({
          paciente_id: paciente.id,
          nutricionista_id: paciente.id_nutricionista,
          tipo,
          descricao,
          nota_paciente: notaPaciente,
          foto_url: fotoUrl,
          foto_path: fotoPath
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (paciente.id_nutricionista) {
        const { data: nutriProfile } = await realSupabase
          .from('nutricionistas')
          .select('profile_id')
          .eq('id', paciente.id_nutricionista)
          .maybeSingle();

        if (nutriProfile?.profile_id) {
          await realSupabase.from('notificacoes').insert({
            user_target: nutriProfile.profile_id,
            titulo: 'Nova refeição registrada',
            mensagem: 'Um paciente enviou nova refeição para avaliação.'
          });
        }
      }

      return data;
    }

    const state = loadState();
    const user = getCurrentLocalUser(state);
    if (!user || user.role !== 'paciente' || !user.paciente) {
      throw new Error('Apenas pacientes podem registrar refeições.');
    }

    const foto_url = await fileToDataUrl(arquivo);
    const meal = {
      id: newId('meal'),
      paciente_id: user.paciente.id,
      nutricionista_id: user.paciente.id_nutricionista,
      tipo: tipo || 'almoco',
      descricao: descricao || '',
      nota_paciente: notaPaciente || null,
      foto_url,
      created_at: nowIso(),
      feedbacks: []
    };

    state.refeicoes.push(meal);

    if (meal.nutricionista_id) {
      state.notifications.unshift({
        id: newId('notif'),
        user_target: meal.nutricionista_id,
        titulo: 'Nova refeição registrada',
        mensagem: `${user.nome} enviou uma nova refeição para avaliação.`,
        lida: false,
        created_at: nowIso()
      });
      emitNotif(state.notifications[0]);
    }

    saveState(state);
    return meal;
  },

  async minhasRefeicoes({ limite = 20, pagina = 0 } = {}) {
    if (USE_SUPABASE) {
      const { data: userData } = await realSupabase.auth.getUser();
      if (!userData.user) throw new Error('Sessão inválida.');

      const { data: paciente } = await realSupabase
        .from('pacientes')
        .select('id')
        .eq('profile_id', userData.user.id)
        .single();

      const { data, error } = await realSupabase
        .from('registros_refeicoes')
        .select('*, feedbacks (id, comentario, texto, emojis, created_at)')
        .eq('paciente_id', paciente.id)
        .order('created_at', { ascending: false })
        .range(pagina * limite, (pagina + 1) * limite - 1);

      if (error) throw new Error(error.message);
      return data;
    }

    const user = getCurrentLocalUser();
    if (!user?.paciente) return [];

    return loadState()
      .refeicoes
      .filter((r) => r.paciente_id === user.paciente.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(pagina * limite, (pagina + 1) * limite);
  }
};

export const feedbacks = {
  async enviar({ registroId, texto }) {
    if (USE_SUPABASE) {
      const { data: userData } = await realSupabase.auth.getUser();
      if (!userData.user) throw new Error('Sessão inválida.');

      const { data: nutri } = await realSupabase
        .from('nutricionistas')
        .select('id')
        .eq('profile_id', userData.user.id)
        .single();

      const { data, error } = await realSupabase
        .from('feedbacks')
        .insert({
          registro_id: registroId,
          nutricionista_id: nutri.id,
          comentario: texto
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const { data: registro } = await realSupabase
        .from('registros_refeicoes')
        .select('paciente_id')
        .eq('id', registroId)
        .maybeSingle();

      if (registro?.paciente_id) {
        const { data: paciente } = await realSupabase
          .from('pacientes')
          .select('profile_id')
          .eq('id', registro.paciente_id)
          .maybeSingle();

        if (paciente?.profile_id) {
          await realSupabase.from('notificacoes').insert({
            user_target: paciente.profile_id,
            titulo: 'Feedback recebido',
            mensagem: 'Sua nutricionista enviou feedback sobre uma refeição.'
          });
        }
      }

      return data;
    }

    const state = loadState();
    const user = getCurrentLocalUser(state);
    if (!user?.nutricionista) throw new Error('Apenas nutricionistas podem enviar feedback.');

    const registro = state.refeicoes.find((r) => r.id === registroId);
    if (!registro) throw new Error('Registro de refeição não encontrado.');

    const fb = {
      id: newId('feedback'),
      comentario: texto,
      created_at: nowIso(),
      nutricionista_id: user.nutricionista.id
    };

    registro.feedbacks = [fb];

    const pacienteUser = state.users.find((u) => u.paciente?.id === registro.paciente_id);
    if (pacienteUser) {
      state.notifications.unshift({
        id: newId('notif'),
        user_target: pacienteUser.id,
        titulo: 'Feedback recebido',
        mensagem: `${user.nome} enviou feedback sobre sua refeição.`,
        lida: false,
        created_at: nowIso()
      });
      emitNotif(state.notifications[0]);
    }

    saveState(state);
    return fb;
  }
};

export const nutricionistas = {
  async listarPacientes() {
    if (USE_SUPABASE) {
      const { data: userData } = await realSupabase.auth.getUser();
      if (!userData.user) return [];

      const { data: nutriData, error: nutriErr } = await realSupabase
        .from('nutricionistas')
        .select('id')
        .eq('profile_id', userData.user.id)
        .single();

      if (nutriErr || !nutriData) return [];

      const { data, error } = await realSupabase
        .from('pacientes')
        .select(`
          *,
          profiles (id, nome, sobrenome, avatar_url, email),
          registros_refeicoes (
            id, tipo, descricao, foto_url, created_at,
            feedbacks (id, comentario, texto)
          )
        `)
        .eq('id_nutricionista', nutriData.id)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }

    const state = loadState();
    const user = getCurrentLocalUser(state);
    if (!user?.nutricionista) return [];

    const patients = state.users.filter((u) => u.paciente?.id_nutricionista === user.nutricionista.id);

    return patients.map((patient) => {
      const registros = state.refeicoes
        .filter((r) => r.paciente_id === patient.paciente.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return {
        id: patient.paciente.id,
        created_at: patient.created_at,
        profiles: {
          id: patient.id,
          nome: patient.nome,
          sobrenome: patient.sobrenome,
          email: patient.email,
          avatar_url: null
        },
        registros_refeicoes: registros
      };
    });
  },

  async historicoPaciente(pacienteId) {
    if (USE_SUPABASE) {
      const { data, error } = await realSupabase
        .from('registros_refeicoes')
        .select('*, feedbacks (id, comentario, texto, created_at)')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    }

    const state = loadState();
    return state.refeicoes
      .filter((r) => r.paciente_id === pacienteId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async planoPaciente(pacienteId) {
    if (USE_SUPABASE) {
      const { data, error } = await realSupabase
        .from('planos_alimentares')
        .select(`
          *,
          plano_refeicoes (
            id, nome, horario, ordem,
            plano_alimentos (id, nome, ordem)
          )
        `)
        .eq('paciente_id', pacienteId)
        .eq('ativo', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const meals = (data.plano_refeicoes || [])
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map((r) => ({
          id: r.id,
          type: r.nome || 'Refeição',
          time: r.horario || '12:00',
          items: (r.plano_alimentos || [])
            .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
            .map((a) => a.nome)
        }));

      return {
        id: data.id,
        paciente_id: data.paciente_id,
        titulo: data.titulo || 'Plano alimentar',
        objetivo: data.observacoes || '',
        meals,
        updated_at: data.updated_at || data.created_at
      };
    }

    const state = loadState();
    const plano = state.planos
      .filter((p) => p.paciente_id === pacienteId)
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))[0];

    return plano || null;
  },

  async salvarPlanoPaciente(pacienteId, payload) {
    if (USE_SUPABASE) {
      const { data: userData } = await realSupabase.auth.getUser();
      if (!userData.user) throw new Error('Sessão inválida.');

      const { data: nutri } = await realSupabase
        .from('nutricionistas')
        .select('id')
        .eq('profile_id', userData.user.id)
        .single();

      await realSupabase
        .from('planos_alimentares')
        .update({ ativo: false })
        .eq('paciente_id', pacienteId);

      const { data: novoPlano, error: planoErr } = await realSupabase
        .from('planos_alimentares')
        .insert({
          paciente_id: pacienteId,
          nutricionista_id: nutri.id,
          titulo: payload.titulo || 'Plano alimentar',
          observacoes: payload.objetivo || '',
          ativo: true
        })
        .select()
        .single();

      if (planoErr) throw new Error(planoErr.message);

      for (let idx = 0; idx < (payload.meals || []).length; idx += 1) {
        const meal = payload.meals[idx];
        const { data: refeicao, error: refErr } = await realSupabase
          .from('plano_refeicoes')
          .insert({
            plano_id: novoPlano.id,
            nome: meal.type,
            horario: meal.time,
            ordem: idx
          })
          .select()
          .single();
        if (refErr) throw new Error(refErr.message);

        const alimentos = (meal.items || []).map((item, itemIdx) => ({
          refeicao_id: refeicao.id,
          nome: item,
          ordem: itemIdx
        }));
        if (alimentos.length > 0) {
          const { error: alimErr } = await realSupabase.from('plano_alimentos').insert(alimentos);
          if (alimErr) throw new Error(alimErr.message);
        }
      }

      const { data: paciente } = await realSupabase
        .from('pacientes')
        .select('profile_id')
        .eq('id', pacienteId)
        .maybeSingle();

      if (paciente?.profile_id) {
        await realSupabase.from('notificacoes').insert({
          user_target: paciente.profile_id,
          titulo: 'Plano atualizado',
          mensagem: 'Seu plano alimentar foi atualizado.'
        });
      }

      return this.planoPaciente(pacienteId);
    }

    const state = loadState();
    const user = getCurrentLocalUser(state);
    if (!user?.nutricionista) throw new Error('Apenas nutricionistas podem criar planos.');

    const planoNormalizado = {
      id: newId('plano'),
      paciente_id: pacienteId,
      nutricionista_id: user.nutricionista.id,
      titulo: payload.titulo || 'Plano alimentar',
      objetivo: payload.objetivo || '',
      meals: normalizeMeals(payload.meals || []),
      created_at: nowIso(),
      updated_at: nowIso()
    };

    const planoExistenteIdx = state.planos.findIndex((p) => p.paciente_id === pacienteId);
    if (planoExistenteIdx >= 0) {
      state.planos[planoExistenteIdx] = {
        ...state.planos[planoExistenteIdx],
        ...planoNormalizado,
        id: state.planos[planoExistenteIdx].id,
        created_at: state.planos[planoExistenteIdx].created_at || nowIso()
      };
    } else {
      state.planos.push(planoNormalizado);
    }

    const pacienteUser = state.users.find((u) => u.paciente?.id === pacienteId);
    if (pacienteUser) {
      state.notifications.unshift({
        id: newId('notif'),
        user_target: pacienteUser.id,
        titulo: 'Novo plano alimentar',
        mensagem: `${user.nome} atualizou seu plano alimentar.`,
        lida: false,
        created_at: nowIso()
      });
      emitNotif(state.notifications[0]);
    }

    saveState(state);
    return this.planoPaciente(pacienteId);
  }
};

export const notificacoes = {
  async listar(args) {
    if (USE_SUPABASE) {
      const { limite, apenasNaoLidas } = normalizeNotifListArgs(args);

      let query = realSupabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite);

      if (apenasNaoLidas) {
        query = query.eq('lida', false);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    }

    const { limite, apenasNaoLidas } = normalizeNotifListArgs(args);
    const state = loadState();
    const user = getCurrentLocalUser(state);
    if (!user) return [];

    return state.notifications
      .filter((n) => n.user_target === user.id)
      .filter((n) => (apenasNaoLidas ? !n.lida : true))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limite);
  },

  async contarNaoLidas() {
    const lista = await this.listar({ limite: 200, apenasNaoLidas: true });
    return lista.length;
  },

  assinar(callback) {
    if (USE_SUPABASE) {
      const channelName = `notificacoes_${Math.random().toString(36).slice(2)}`;
      const channel = realSupabase.channel(channelName);

      realSupabase.auth.getUser().then(({ data }) => {
        const userId = data?.user?.id;
        if (!userId) return;

        channel
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notificacoes',
              filter: `user_target=eq.${userId}`
            },
            (payload) => callback(payload.new)
          )
          .subscribe();
      });

      return {
        unsubscribe: () => {
          realSupabase.removeChannel(channel);
        }
      };
    }

    notifListeners.add(callback);
    return {
      unsubscribe: () => notifListeners.delete(callback)
    };
  },

  async marcarTodasLidas() {
    if (USE_SUPABASE) {
      const { data: userData } = await realSupabase.auth.getUser();
      if (!userData.user) return { ok: true };

      const { error } = await realSupabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_target', userData.user.id)
        .eq('lida', false);

      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const state = loadState();
    const user = getCurrentLocalUser(state);
    if (!user) return { ok: true };

    state.notifications = state.notifications.map((n) =>
      n.user_target === user.id ? { ...n, lida: true } : n
    );

    saveState(state);
    return { ok: true };
  }
};

export const pacientes = {
  async meuPerfil() {
    return auth.perfilAtual();
  },
  async meuPlano() {
    if (USE_SUPABASE) {
      const { data: userData } = await realSupabase.auth.getUser();
      if (!userData.user) return null;

      const { data: paciente } = await realSupabase
        .from('pacientes')
        .select('id')
        .eq('profile_id', userData.user.id)
        .single();

      if (!paciente?.id) return null;
      return nutricionistas.planoPaciente(paciente.id);
    }

    const state = loadState();
    const user = getCurrentLocalUser(state);
    if (!user?.paciente) return null;
    return nutricionistas.planoPaciente(user.paciente.id);
  }
};

export const planos = {
  async meuPlano() {
    return null;
  }
};

console.info(
  USE_SUPABASE
    ? '[NutriTrack] Executando com Supabase configurado.'
    : '[NutriTrack] Executando em modo local (sem Supabase). Use VITE_USE_LOCAL_DATA=false para voltar ao Supabase.'
);
