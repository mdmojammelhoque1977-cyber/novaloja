-- =====================================================================
--  LOJA DE PROMOÇÕES – ESTRUTURA DO BANCO (Supabase / PostgreSQL)
--  Como usar: Supabase > SQL Editor > New query > cole TUDO > Run
--  Pode rodar de novo sem problema (o script é idempotente).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- CONFIGURAÇÕES DA LOJA (uma única linha, id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.configuracoes (
  id                int primary key default 1 check (id = 1),
  nome_loja         text not null default 'Climatizadores Natal',
  logo_url          text,
  whatsapp          text default '',            -- só números com DDI: 5562999999999
  telefone_exibicao text default '',            -- como aparece no site: (62) 99999-9999
  email_contato     text default '',
  cnpj              text default '',
  endereco_loja     text default '',
  faixa_topo        text default '🎄 NATAL ANTECIPADO • Ofertas por tempo limitado',
  titulo_ofertas    text default 'Ofertas de Natal Antecipado',
  data_fim_promo    timestamptz default '2026-12-25 00:00:00-03',
  aviso_frete       text default 'Consulte frete e prazo pelo WhatsApp',
  cor_primaria      text default '#8C1D40',
  cor_destaque      text default '#FFD23F',
  -- PIX
  pix_ativo         boolean not null default true,
  pix_tipo          text not null default 'cpf' check (pix_tipo in ('cpf','cnpj','telefone','email','aleatoria')),
  pix_chave         text default '',
  pix_nome          text default '',            -- nome do recebedor (como no banco)
  pix_cidade        text default '',
  desconto_pix      numeric(5,2) not null default 0 check (desconto_pix >= 0 and desconto_pix < 100),
  -- CARTÃO (via link de pagamento: Mercado Pago, InfinitePay, PagBank, etc.)
  cartao_ativo      boolean not null default true,
  cartao_link       text default '',
  cartao_instrucoes text default 'Clique no botão abaixo para pagar com cartão de crédito em ambiente seguro.',
  parcelas_max      int not null default 10 check (parcelas_max between 1 and 24),
  atualizado_em     timestamptz default now()
);
insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- CATEGORIAS, PRODUTOS, BANNERS
-- ---------------------------------------------------------------------
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  imagem_url  text,
  ordem       int not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz default now()
);

create table if not exists public.produtos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  descricao     text default '',
  categoria_id  uuid references public.categorias(id) on delete set null,
  preco_de      numeric(10,2),                       -- preço "de" (riscado)
  preco_por     numeric(10,2) not null check (preco_por > 0),
  imagens       text[] not null default '{}',        -- a 1ª é a principal
  selo          text default '',                     -- ex.: EXCLUSIVO SITE
  estoque       int,                                 -- vazio = sem controle de estoque
  destaque      boolean not null default false,
  ativo         boolean not null default true,
  ordem         int not null default 0,
  criado_em     timestamptz default now()
);

create table if not exists public.banners (
  id                uuid primary key default gen_random_uuid(),
  titulo            text default '',
  imagem_url        text not null,
  imagem_mobile_url text,
  link              text default '',
  ordem             int not null default 0,
  ativo             boolean not null default true,
  criado_em         timestamptz default now()
);

-- ---------------------------------------------------------------------
-- PERFIS DOS CLIENTES (ligados ao login do Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text,
  cpf           text,
  telefone      text,
  email         text,
  cep           text,
  rua           text,
  numero        text,
  complemento   text,
  bairro        text,
  cidade        text,
  uf            text,
  is_admin      boolean not null default false,
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- ---------------------------------------------------------------------
-- PEDIDOS – cada pedido recebe um número único (PED1001, PED1002, ...)
-- ---------------------------------------------------------------------
create sequence if not exists public.pedidos_numero_seq start 1001;

create table if not exists public.pedidos (
  id            uuid primary key default gen_random_uuid(),
  numero        bigint not null unique default nextval('public.pedidos_numero_seq'),
  codigo        text generated always as ('PED' || numero::text) stored,
  cliente_id    uuid references auth.users(id) on delete set null,
  cliente       jsonb not null default '{}',   -- cópia dos dados do cliente no momento da compra
  metodo        text not null check (metodo in ('pix','cartao')),
  subtotal      numeric(12,2) not null default 0,
  desconto      numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  status        text not null default 'aguardando_pagamento'
                check (status in ('aguardando_pagamento','pago','enviado','entregue','cancelado')),
  obs_admin     text default '',
  criado_em     timestamptz default now(),
  atualizado_em timestamptz default now()
);
create index if not exists pedidos_cliente_idx on public.pedidos(cliente_id);
create index if not exists pedidos_status_idx on public.pedidos(status);

create table if not exists public.pedido_itens (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references public.pedidos(id) on delete cascade,
  produto_id  uuid references public.produtos(id) on delete set null,
  nome        text not null,
  imagem      text,
  preco_unit  numeric(10,2) not null,
  quantidade  int not null check (quantidade > 0),
  total       numeric(12,2) not null
);
create index if not exists pedido_itens_pedido_idx on public.pedido_itens(pedido_id);

-- ---------------------------------------------------------------------
-- FUNÇÕES AUXILIARES
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.perfis where id = auth.uid()), false);
$$;

-- Cria o perfil automaticamente quando o cliente se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.perfis (id, email, nome, cpf, telefone, cep, rua, numero, complemento, bairro, cidade, uf)
  values (new.id, new.email, m->>'nome', m->>'cpf', m->>'telefone', m->>'cep', m->>'rua',
          m->>'numero', m->>'complemento', m->>'bairro', m->>'cidade', m->>'uf')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impede que um cliente se torne administrador sozinho
create or replace function public.proteger_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists perfis_proteger on public.perfis;
create trigger perfis_proteger before update on public.perfis
  for each row execute function public.proteger_perfil();

-- Cria o pedido com os preços do BANCO (o cliente não consegue alterar valores)
create or replace function public.criar_pedido(p_itens jsonb, p_metodo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_perfil   public.perfis;
  v_cfg      public.configuracoes;
  v_item     jsonb;
  v_prod     public.produtos;
  v_qtd      int;
  v_subtotal numeric(12,2) := 0;
  v_desc     numeric(12,2) := 0;
  v_pedido   public.pedidos;
begin
  if v_uid is null then
    raise exception 'Faça login para finalizar o pedido.';
  end if;

  select * into v_perfil from public.perfis where id = v_uid;
  if not found or coalesce(v_perfil.cpf,'') = '' or coalesce(v_perfil.rua,'') = ''
     or coalesce(v_perfil.cidade,'') = '' then
    raise exception 'Complete seu cadastro (CPF e endereço) antes de finalizar.';
  end if;

  select * into v_cfg from public.configuracoes where id = 1;
  if p_metodo not in ('pix','cartao') then
    raise exception 'Forma de pagamento inválida.';
  end if;
  if (p_metodo = 'pix' and not v_cfg.pix_ativo) or (p_metodo = 'cartao' and not v_cfg.cartao_ativo) then
    raise exception 'Esta forma de pagamento não está disponível no momento.';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Seu carrinho está vazio.';
  end if;
  if jsonb_array_length(p_itens) > 50 then
    raise exception 'Carrinho com itens demais.';
  end if;

  insert into public.pedidos (cliente_id, cliente, metodo)
  values (v_uid,
          jsonb_build_object(
            'nome', v_perfil.nome, 'cpf', v_perfil.cpf, 'telefone', v_perfil.telefone,
            'email', v_perfil.email, 'cep', v_perfil.cep, 'rua', v_perfil.rua,
            'numero', v_perfil.numero, 'complemento', v_perfil.complemento,
            'bairro', v_perfil.bairro, 'cidade', v_perfil.cidade, 'uf', v_perfil.uf),
          p_metodo)
  returning * into v_pedido;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := greatest(1, least(99, coalesce((v_item->>'qtd')::int, 1)));
    select * into v_prod from public.produtos
      where id = (v_item->>'id')::uuid and ativo = true
      for update;
    if not found then
      raise exception 'Um produto do carrinho não está mais disponível. Atualize o carrinho.';
    end if;
    if v_prod.estoque is not null and v_prod.estoque < v_qtd then
      raise exception 'Estoque insuficiente para "%". Disponível: %', v_prod.nome, v_prod.estoque;
    end if;

    insert into public.pedido_itens (pedido_id, produto_id, nome, imagem, preco_unit, quantidade, total)
    values (v_pedido.id, v_prod.id, v_prod.nome, v_prod.imagens[1], v_prod.preco_por, v_qtd, v_prod.preco_por * v_qtd);

    v_subtotal := v_subtotal + v_prod.preco_por * v_qtd;

    if v_prod.estoque is not null then
      update public.produtos set estoque = estoque - v_qtd where id = v_prod.id;
    end if;
  end loop;

  if p_metodo = 'pix' and v_cfg.desconto_pix > 0 then
    v_desc := round(v_subtotal * v_cfg.desconto_pix / 100, 2);
  end if;

  update public.pedidos
     set subtotal = v_subtotal, desconto = v_desc, total = v_subtotal - v_desc
   where id = v_pedido.id;

  return jsonb_build_object('id', v_pedido.id, 'codigo', v_pedido.codigo);
end $$;

revoke all on function public.criar_pedido(jsonb, text) from public, anon;
grant execute on function public.criar_pedido(jsonb, text) to authenticated;

-- ---------------------------------------------------------------------
-- SEGURANÇA (Row Level Security)
-- ---------------------------------------------------------------------
alter table public.configuracoes enable row level security;
alter table public.categorias    enable row level security;
alter table public.produtos      enable row level security;
alter table public.banners       enable row level security;
alter table public.perfis        enable row level security;
alter table public.pedidos       enable row level security;
alter table public.pedido_itens  enable row level security;

-- Configurações: todos leem, só admin altera
drop policy if exists cfg_ler on public.configuracoes;
create policy cfg_ler on public.configuracoes for select using (true);
drop policy if exists cfg_admin on public.configuracoes;
create policy cfg_admin on public.configuracoes for update using (public.is_admin()) with check (public.is_admin());

-- Categorias / Produtos / Banners: público vê os ativos, admin faz tudo
drop policy if exists cat_ler on public.categorias;
create policy cat_ler on public.categorias for select using (ativo or public.is_admin());
drop policy if exists cat_admin on public.categorias;
create policy cat_admin on public.categorias for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists prod_ler on public.produtos;
create policy prod_ler on public.produtos for select using (ativo or public.is_admin());
drop policy if exists prod_admin on public.produtos;
create policy prod_admin on public.produtos for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists ban_ler on public.banners;
create policy ban_ler on public.banners for select using (ativo or public.is_admin());
drop policy if exists ban_admin on public.banners;
create policy ban_admin on public.banners for all using (public.is_admin()) with check (public.is_admin());

-- Perfis: cliente vê/edita o próprio, admin vê todos
drop policy if exists perfil_ler on public.perfis;
create policy perfil_ler on public.perfis for select using (id = auth.uid() or public.is_admin());
drop policy if exists perfil_inserir on public.perfis;
create policy perfil_inserir on public.perfis for insert with check (id = auth.uid());
drop policy if exists perfil_editar on public.perfis;
create policy perfil_editar on public.perfis for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Pedidos: cliente vê os seus; admin vê e altera todos. Criação só pela função criar_pedido.
drop policy if exists ped_ler on public.pedidos;
create policy ped_ler on public.pedidos for select using (cliente_id = auth.uid() or public.is_admin());
drop policy if exists ped_admin_upd on public.pedidos;
create policy ped_admin_upd on public.pedidos for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists ped_admin_del on public.pedidos;
create policy ped_admin_del on public.pedidos for delete using (public.is_admin());

drop policy if exists itens_ler on public.pedido_itens;
create policy itens_ler on public.pedido_itens for select using (
  exists (select 1 from public.pedidos p where p.id = pedido_id
          and (p.cliente_id = auth.uid() or public.is_admin())));

-- ---------------------------------------------------------------------
-- ARMAZENAMENTO DE IMAGENS (bucket público "loja")
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('loja', 'loja', true)
on conflict (id) do update set public = true;

drop policy if exists loja_admin_insert on storage.objects;
create policy loja_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'loja' and public.is_admin());
drop policy if exists loja_admin_update on storage.objects;
create policy loja_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'loja' and public.is_admin());
drop policy if exists loja_admin_delete on storage.objects;
create policy loja_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'loja' and public.is_admin());

-- ---------------------------------------------------------------------
-- CATEGORIAS INICIAIS (pode editar/excluir no painel)
-- ---------------------------------------------------------------------
insert into public.categorias (nome, ordem)
select v.nome, v.ordem from (values
  ('Climatizadores', 1), ('Ventiladores', 2), ('Ar-condicionado', 3), ('Umidificadores', 4)
) as v(nome, ordem)
where not exists (select 1 from public.categorias);

-- =====================================================================
-- DEPOIS DE CRIAR SUA CONTA NO SITE, rode a linha abaixo trocando o
-- e-mail para virar ADMINISTRADOR:
--
--   update public.perfis set is_admin = true where email = 'seu@email.com';
-- =====================================================================
