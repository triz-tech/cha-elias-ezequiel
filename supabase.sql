-- RIFA ELIAS & EZEQUIEL
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.raffle_settings (
  id boolean primary key default true,
  title text not null default 'Rifa do Elias & Ezequiel',
  price numeric(10,2) not null default 15,
  quantity integer not null default 50,
  prize_percent numeric(5,2) not null default 20,
  draw_date date not null default '2026-10-01',
  instagram_1 text not null default '@wandersonpz',
  instagram_2 text not null default '@duda_gentill',
  pix_key text not null default '',
  pix_name text not null default 'ELIAS EZEQUIEL',
  pix_city text not null default 'RIO DE JANEIRO',
  intro text not null default 'Uma rifa feita com carinho para ajudar na chegada dos nossos gêmeos.'
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  relationship text not null,
  message text,
  quantity integer not null check (quantity > 0),
  total_amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  ticket_numbers integer[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

alter table public.reservations
  add column if not exists expires_at timestamptz not null default (now() + interval '30 minutes');

create table if not exists public.tickets (
  number integer primary key,
  status text not null default 'available' check (status in ('available','pending','paid')),
  reservation_id uuid references public.reservations(id) on delete set null
);

insert into public.raffle_settings(id) values (true)
on conflict (id) do nothing;

insert into public.tickets(number)
select g from generate_series(1, 50) g
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.raffle_settings enable row level security;
alter table public.reservations enable row level security;
alter table public.tickets enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "public read settings" on public.raffle_settings;
create policy "public read settings" on public.raffle_settings for select using (true);

-- Importante: o público NÃO pode consultar a tabela de cotas.
-- Os números e seus estados ficam visíveis somente no painel dos pais.
drop policy if exists "public read tickets" on public.tickets;
drop policy if exists "admins read tickets" on public.tickets;
create policy "admins read tickets" on public.tickets for select using (public.is_admin());

-- Só admins conseguem ler reservas.
drop policy if exists "admins read reservations" on public.reservations;
create policy "admins read reservations" on public.reservations for select using (public.is_admin());

create or replace function public.reserve_tickets(
  p_name text,
  p_relationship text,
  p_message text,
  p_quantity integer
)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.reservations;
  nums integer[];
  q public.raffle_settings;
  total numeric(10,2);
begin
  -- Libera automaticamente reservas pendentes vencidas antes de escolher novos números.
  update public.tickets t
  set status = 'available', reservation_id = null
  where t.reservation_id in (
    select r.id from public.reservations r
    where r.status = 'pending' and r.expires_at <= now()
  );

  update public.reservations
  set status = 'cancelled'
  where status = 'pending' and expires_at <= now();

  if p_quantity < 1 or p_quantity > 10 then
    raise exception 'Escolha entre 1 e 10 cotas.';
  end if;

  -- A linha de configurações funciona como um "cadeado" para duas compras simultâneas.
  select * into q from public.raffle_settings where id = true for update;

  select array_agg(number order by number)
    into nums
    from (
      select number from public.tickets
      where status = 'available' and number <= q.quantity
      order by number
      limit p_quantity
    ) x;

  if nums is null or array_length(nums,1) < p_quantity then
    raise exception 'Não há cotas disponíveis em quantidade suficiente.';
  end if;

  total := q.price * p_quantity;

  insert into public.reservations(buyer_name,relationship,message,quantity,total_amount,status,ticket_numbers)
  values(trim(p_name),trim(p_relationship),nullif(trim(p_message),''),p_quantity,total,'pending',nums)
  returning * into r;

  update public.tickets
  set status = 'pending', reservation_id = r.id
  where number = any(nums);

  return r;
end;
$$;

create or replace function public.set_reservation_status(
  p_reservation_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  if p_status not in ('paid','cancelled') then raise exception 'Status inválido.'; end if;

  select status into current_status
  from public.reservations
  where id = p_reservation_id
  for update;

  if current_status is null then raise exception 'Reserva não encontrada.'; end if;
  if current_status <> 'pending' then
    raise exception 'Esta reserva já foi finalizada e não pode ser alterada.';
  end if;

  update public.reservations
  set status = p_status
  where id = p_reservation_id;

  if p_status = 'paid' then
    update public.tickets set status = 'paid'
    where reservation_id = p_reservation_id;
  else
    update public.tickets set status = 'available', reservation_id = null
    where reservation_id = p_reservation_id;
  end if;
end;
$$;

create or replace function public.admin_update_settings(
  p_price numeric,
  p_quantity integer,
  p_prize_percent numeric,
  p_draw_date date,
  p_instagram_1 text,
  p_instagram_2 text,
  p_pix_key text,
  p_pix_name text,
  p_pix_city text,
  p_intro text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  max_number integer;
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  if p_price <= 0 or p_quantity < 1 or p_prize_percent < 0 or p_prize_percent > 100 then
    raise exception 'Confira valor, quantidade e percentual.';
  end if;

  select coalesce(max(number),0) into max_number
  from public.tickets
  where status <> 'available';

  if p_quantity < max_number then
    raise exception 'A quantidade não pode ficar abaixo da maior cota já reservada/paga (%).', max_number;
  end if;

  update public.raffle_settings
  set price=p_price, quantity=p_quantity, prize_percent=p_prize_percent,
      draw_date=p_draw_date, instagram_1=p_instagram_1, instagram_2=p_instagram_2,
      pix_key=coalesce(p_pix_key,''), pix_name=p_pix_name, pix_city=p_pix_city, intro=p_intro
  where id=true;

  insert into public.tickets(number)
  select g from generate_series(1,p_quantity) g
  on conflict do nothing;
end;
$$;

-- Para o primeiro administrador:
-- 1) Crie uma conta em Authentication > Users > Add user.
-- 2) Copie o UUID desse usuário.
-- 3) Rode:
-- insert into public.profiles(id, role) values ('COLE-O-UUID-AQUI','admin');
