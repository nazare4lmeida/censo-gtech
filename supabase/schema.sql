-- ============================================================
-- Censo Geração Tech · tabelas do painel admin
-- Rodar UMA vez no SQL Editor do Supabase (Project > SQL Editor > New query).
-- ============================================================

create table if not exists public.alunos (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  email           text,
  telefone        text,
  linkedin        text,
  cidade          text,
  genero          text,
  trabalha_tech   text,            -- 'Sim' | 'Não' | 'Sem resposta'
  area_tech       text,            -- resposta de "Área de tecnologia?"
  gt_listas       text,            -- ex.: 'GT 1, GT 2'
  origem          text,
  edicao          text,            -- última edição (censo)
  curso_superior  text,
  naturalidade    text,
  raca            text,
  pcd             text,
  qual_pcd        text,
  confianca       text,
  observacoes     text,
  detalhes        jsonb not null default '{}'::jsonb,  -- demais colunas da planilha
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index if not exists alunos_nome_idx   on public.alunos (nome);
create index if not exists alunos_email_idx  on public.alunos (lower(email));
create index if not exists alunos_cidade_idx on public.alunos (cidade);
create index if not exists alunos_genero_idx on public.alunos (genero);
create index if not exists alunos_tec_idx    on public.alunos (trabalha_tech);

create table if not exists public.alteracoes (
  id         bigint generated always as identity primary key,
  aluno_id   uuid,                 -- sem chave estrangeira: o histórico continua mesmo após excluir
  acao       text not null,        -- 'criou' | 'editou' | 'excluiu' | 'importou'
  antes      jsonb,
  depois     jsonb,
  criado_em  timestamptz not null default now()
);

create index if not exists alteracoes_aluno_idx on public.alteracoes (aluno_id, criado_em desc);

-- Acesso só pelo servidor (chave service_role, que ignora o RLS).
-- Sem políticas: a chave pública (anon) não consegue ler nem escrever.
alter table public.alunos     enable row level security;
alter table public.alteracoes enable row level security;
