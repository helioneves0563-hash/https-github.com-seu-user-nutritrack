-- =========================================================
-- NutriTrack | RESET COMPLETO + RECRIAÇÃO (Supabase)
-- =========================================================
-- ATENÇÃO: este script remove as tabelas do app e todos os dados delas.
-- Não remove usuários de auth.users.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Limpeza (trigger/functions/policies/tabelas)
-- ---------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.generate_invite_code() cascade;
drop function if exists public.set_updated_at() cascade;

-- Storage policies antigas (se existirem)
drop policy if exists nt_storage_refeicoes_select on storage.objects;
drop policy if exists nt_storage_refeicoes_insert on storage.objects;
drop policy if exists nt_storage_refeicoes_update on storage.objects;
drop policy if exists nt_storage_refeicoes_delete on storage.objects;

-- Tabelas (ordem por dependência)
drop table if exists public.notificacoes cascade;
drop table if exists public.plano_alimentos cascade;
drop table if exists public.plano_refeicoes cascade;
drop table if exists public.planos_alimentares cascade;
drop table if exists public.feedbacks cascade;
drop table if exists public.registros_refeicoes cascade;
drop table if exists public.pacientes cascade;
drop table if exists public.nutricionistas cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('nutricionista', 'paciente')),
  nome text,
  sobrenome text,
  email text not null,
  telefone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_key on public.profiles (lower(email));

create table public.nutricionistas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  crn text,
  especialidade text,
  clinica text,
  codigo_convite text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  id_nutricionista uuid references public.nutricionistas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.registros_refeicoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  nutricionista_id uuid references public.nutricionistas(id) on delete set null,
  tipo text not null,
  descricao text,
  nota_paciente integer,
  foto_url text,
  foto_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid not null references public.registros_refeicoes(id) on delete cascade,
  nutricionista_id uuid not null references public.nutricionistas(id) on delete cascade,
  comentario text,
  texto text,
  emojis jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.planos_alimentares (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  nutricionista_id uuid not null references public.nutricionistas(id) on delete cascade,
  titulo text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plano_refeicoes (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.planos_alimentares(id) on delete cascade,
  nome text,
  horario text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plano_alimentos (
  id uuid primary key default gen_random_uuid(),
  refeicao_id uuid not null references public.plano_refeicoes(id) on delete cascade,
  nome text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_target uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  mensagem text,
  lida boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices
create index idx_pacientes_profile_id on public.pacientes(profile_id);
create index idx_pacientes_nutri on public.pacientes(id_nutricionista);
create index idx_registros_paciente on public.registros_refeicoes(paciente_id, created_at desc);
create index idx_registros_nutri on public.registros_refeicoes(nutricionista_id, created_at desc);
create index idx_feedback_registro on public.feedbacks(registro_id);
create index idx_planos_paciente on public.planos_alimentares(paciente_id, ativo, created_at desc);
create index idx_refeicoes_plano on public.plano_refeicoes(plano_id, ordem);
create index idx_alimentos_refeicao on public.plano_alimentos(refeicao_id, ordem);
create index idx_notif_user on public.notificacoes(user_target, lida, created_at desc);

-- ---------------------------------------------------------
-- Funções e triggers
-- ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_nutricionistas_updated_at
before update on public.nutricionistas
for each row execute function public.set_updated_at();

create trigger set_pacientes_updated_at
before update on public.pacientes
for each row execute function public.set_updated_at();

create trigger set_registros_updated_at
before update on public.registros_refeicoes
for each row execute function public.set_updated_at();

create trigger set_feedbacks_updated_at
before update on public.feedbacks
for each row execute function public.set_updated_at();

create trigger set_planos_updated_at
before update on public.planos_alimentares
for each row execute function public.set_updated_at();

create trigger set_plano_refeicoes_updated_at
before update on public.plano_refeicoes
for each row execute function public.set_updated_at();

create trigger set_plano_alimentos_updated_at
before update on public.plano_alimentos
for each row execute function public.set_updated_at();

create trigger set_notificacoes_updated_at
before update on public.notificacoes
for each row execute function public.set_updated_at();

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := 'NUTRI-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (
      select 1 from public.nutricionistas where codigo_convite = code
    );
  end loop;
  return code;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_codigo text;
  v_id_nutri uuid;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'paciente');
  if v_role not in ('nutricionista', 'paciente') then
    v_role := 'paciente';
  end if;

  insert into public.profiles (id, role, nome, sobrenome, email, telefone)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'sobrenome', ''),
    new.email,
    nullif(new.raw_user_meta_data->>'telefone', '')
  )
  on conflict (id) do update set
    role = excluded.role,
    nome = excluded.nome,
    sobrenome = excluded.sobrenome,
    email = excluded.email,
    telefone = coalesce(excluded.telefone, public.profiles.telefone),
    updated_at = now();

  if v_role = 'nutricionista' then
    insert into public.nutricionistas (profile_id, crn, especialidade, clinica, codigo_convite)
    values (
      new.id,
      nullif(new.raw_user_meta_data->>'crn', ''),
      nullif(new.raw_user_meta_data->>'especialidade', ''),
      nullif(new.raw_user_meta_data->>'clinica', ''),
      public.generate_invite_code()
    )
    on conflict (profile_id) do update set
      crn = coalesce(excluded.crn, public.nutricionistas.crn),
      especialidade = coalesce(excluded.especialidade, public.nutricionistas.especialidade),
      clinica = coalesce(excluded.clinica, public.nutricionistas.clinica),
      updated_at = now();
  else
    v_codigo := upper(coalesce(new.raw_user_meta_data->>'codigo_convite', ''));
    v_id_nutri := null;

    if v_codigo <> '' then
      select n.id into v_id_nutri
      from public.nutricionistas n
      where n.codigo_convite = v_codigo
      limit 1;
    end if;

    insert into public.pacientes (profile_id, id_nutricionista)
    values (new.id, v_id_nutri)
    on conflict (profile_id) do update set
      id_nutricionista = coalesce(excluded.id_nutricionista, public.pacientes.id_nutricionista),
      updated_at = now();
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill de usuários já existentes em auth.users
-- (para quem já tinha conta antes de rodar o script)
do $$
declare
  u record;
  v_role text;
  v_codigo text;
  v_id_nutri uuid;
begin
  for u in
    select id, email, raw_user_meta_data
    from auth.users
  loop
    v_role := coalesce(u.raw_user_meta_data->>'role', 'paciente');
    if v_role not in ('nutricionista', 'paciente') then
      v_role := 'paciente';
    end if;

    insert into public.profiles (id, role, nome, sobrenome, email, telefone)
    values (
      u.id,
      v_role,
      coalesce(u.raw_user_meta_data->>'nome', ''),
      coalesce(u.raw_user_meta_data->>'sobrenome', ''),
      coalesce(u.email, 'sem-email-' || u.id::text || '@placeholder.local'),
      nullif(u.raw_user_meta_data->>'telefone', '')
    )
    on conflict (id) do update set
      role = excluded.role,
      nome = excluded.nome,
      sobrenome = excluded.sobrenome,
      email = excluded.email,
      telefone = coalesce(excluded.telefone, public.profiles.telefone),
      updated_at = now();

    if v_role = 'nutricionista' then
      insert into public.nutricionistas (profile_id, crn, especialidade, clinica, codigo_convite)
      values (
        u.id,
        nullif(u.raw_user_meta_data->>'crn', ''),
        nullif(u.raw_user_meta_data->>'especialidade', ''),
        nullif(u.raw_user_meta_data->>'clinica', ''),
        public.generate_invite_code()
      )
      on conflict (profile_id) do update set
        crn = coalesce(excluded.crn, public.nutricionistas.crn),
        especialidade = coalesce(excluded.especialidade, public.nutricionistas.especialidade),
        clinica = coalesce(excluded.clinica, public.nutricionistas.clinica),
        updated_at = now();
    else
      v_codigo := upper(coalesce(u.raw_user_meta_data->>'codigo_convite', ''));
      v_id_nutri := null;

      if v_codigo <> '' then
        select n.id into v_id_nutri
        from public.nutricionistas n
        where n.codigo_convite = v_codigo
        limit 1;
      end if;

      insert into public.pacientes (profile_id, id_nutricionista)
      values (u.id, v_id_nutri)
      on conflict (profile_id) do update set
        id_nutricionista = coalesce(excluded.id_nutricionista, public.pacientes.id_nutricionista),
        updated_at = now();
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.nutricionistas enable row level security;
alter table public.pacientes enable row level security;
alter table public.registros_refeicoes enable row level security;
alter table public.feedbacks enable row level security;
alter table public.planos_alimentares enable row level security;
alter table public.plano_refeicoes enable row level security;
alter table public.plano_alimentos enable row level security;
alter table public.notificacoes enable row level security;

-- Profiles
create policy nt_profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.pacientes p
    join public.nutricionistas n on n.id = p.id_nutricionista
    where p.profile_id = public.profiles.id
      and n.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.nutricionistas n
    join public.pacientes p on p.id_nutricionista = n.id
    where n.profile_id = public.profiles.id
      and p.profile_id = auth.uid()
  )
);

create policy nt_profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Nutricionistas
create policy nt_nutri_select on public.nutricionistas
for select to authenticated
using (true);

create policy nt_nutri_update_own on public.nutricionistas
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Pacientes
create policy nt_pacientes_select on public.pacientes
for select to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.nutricionistas n
    where n.id = public.pacientes.id_nutricionista
      and n.profile_id = auth.uid()
  )
);

create policy nt_pacientes_update_own on public.pacientes
for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Registros
create policy nt_registros_select on public.registros_refeicoes
for select to authenticated
using (
  exists (
    select 1 from public.pacientes p
    where p.id = public.registros_refeicoes.paciente_id
      and p.profile_id = auth.uid()
  )
  or exists (
    select 1 from public.nutricionistas n
    where n.id = public.registros_refeicoes.nutricionista_id
      and n.profile_id = auth.uid()
  )
);

create policy nt_registros_insert_paciente on public.registros_refeicoes
for insert to authenticated
with check (
  exists (
    select 1 from public.pacientes p
    where p.id = public.registros_refeicoes.paciente_id
      and p.profile_id = auth.uid()
  )
);

create policy nt_registros_update_paciente on public.registros_refeicoes
for update to authenticated
using (
  exists (
    select 1 from public.pacientes p
    where p.id = public.registros_refeicoes.paciente_id
      and p.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.pacientes p
    where p.id = public.registros_refeicoes.paciente_id
      and p.profile_id = auth.uid()
  )
);

-- Feedbacks
create policy nt_feedbacks_select on public.feedbacks
for select to authenticated
using (
  exists (
    select 1
    from public.registros_refeicoes r
    join public.pacientes p on p.id = r.paciente_id
    where r.id = public.feedbacks.registro_id
      and p.profile_id = auth.uid()
  )
  or exists (
    select 1 from public.nutricionistas n
    where n.id = public.feedbacks.nutricionista_id
      and n.profile_id = auth.uid()
  )
);

create policy nt_feedbacks_insert_nutri on public.feedbacks
for insert to authenticated
with check (
  exists (
    select 1 from public.nutricionistas n
    where n.id = public.feedbacks.nutricionista_id
      and n.profile_id = auth.uid()
  )
);

-- Planos
create policy nt_planos_select on public.planos_alimentares
for select to authenticated
using (
  exists (
    select 1 from public.pacientes p
    where p.id = public.planos_alimentares.paciente_id
      and p.profile_id = auth.uid()
  )
  or exists (
    select 1 from public.nutricionistas n
    where n.id = public.planos_alimentares.nutricionista_id
      and n.profile_id = auth.uid()
  )
);

create policy nt_planos_insert_nutri on public.planos_alimentares
for insert to authenticated
with check (
  exists (
    select 1 from public.nutricionistas n
    where n.id = public.planos_alimentares.nutricionista_id
      and n.profile_id = auth.uid()
  )
);

create policy nt_planos_update_nutri on public.planos_alimentares
for update to authenticated
using (
  exists (
    select 1 from public.nutricionistas n
    where n.id = public.planos_alimentares.nutricionista_id
      and n.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.nutricionistas n
    where n.id = public.planos_alimentares.nutricionista_id
      and n.profile_id = auth.uid()
  )
);

create policy nt_plano_refeicoes_select on public.plano_refeicoes
for select to authenticated
using (
  exists (
    select 1
    from public.planos_alimentares pa
    join public.pacientes p on p.id = pa.paciente_id
    where pa.id = public.plano_refeicoes.plano_id
      and p.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.planos_alimentares pa
    join public.nutricionistas n on n.id = pa.nutricionista_id
    where pa.id = public.plano_refeicoes.plano_id
      and n.profile_id = auth.uid()
  )
);

create policy nt_plano_refeicoes_insert_nutri on public.plano_refeicoes
for insert to authenticated
with check (
  exists (
    select 1
    from public.planos_alimentares pa
    join public.nutricionistas n on n.id = pa.nutricionista_id
    where pa.id = public.plano_refeicoes.plano_id
      and n.profile_id = auth.uid()
  )
);

create policy nt_plano_alimentos_select on public.plano_alimentos
for select to authenticated
using (
  exists (
    select 1
    from public.plano_refeicoes pr
    join public.planos_alimentares pa on pa.id = pr.plano_id
    join public.pacientes p on p.id = pa.paciente_id
    where pr.id = public.plano_alimentos.refeicao_id
      and p.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.plano_refeicoes pr
    join public.planos_alimentares pa on pa.id = pr.plano_id
    join public.nutricionistas n on n.id = pa.nutricionista_id
    where pr.id = public.plano_alimentos.refeicao_id
      and n.profile_id = auth.uid()
  )
);

create policy nt_plano_alimentos_insert_nutri on public.plano_alimentos
for insert to authenticated
with check (
  exists (
    select 1
    from public.plano_refeicoes pr
    join public.planos_alimentares pa on pa.id = pr.plano_id
    join public.nutricionistas n on n.id = pa.nutricionista_id
    where pr.id = public.plano_alimentos.refeicao_id
      and n.profile_id = auth.uid()
  )
);

-- Notificações
create policy nt_notificacoes_select_own on public.notificacoes
for select to authenticated
using (user_target = auth.uid());

create policy nt_notificacoes_insert_authenticated on public.notificacoes
for insert to authenticated
with check (auth.uid() is not null);

create policy nt_notificacoes_update_own on public.notificacoes
for update to authenticated
using (user_target = auth.uid())
with check (user_target = auth.uid());

-- ---------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('refeicoes', 'refeicoes', true)
on conflict (id) do update set public = true;

create policy nt_storage_refeicoes_select on storage.objects
for select to authenticated
using (bucket_id = 'refeicoes');

create policy nt_storage_refeicoes_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'refeicoes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy nt_storage_refeicoes_update on storage.objects
for update to authenticated
using (bucket_id = 'refeicoes' and owner = auth.uid())
with check (bucket_id = 'refeicoes' and owner = auth.uid());

create policy nt_storage_refeicoes_delete on storage.objects
for delete to authenticated
using (bucket_id = 'refeicoes' and owner = auth.uid());

commit;
