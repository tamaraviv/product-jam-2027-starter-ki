-- Games table for Tic-tac-toe (no-center variant)
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),

  -- Who played and saved it
  owner_id uuid not null references auth.users (id) on delete cascade,

  -- Variant played ('no-center' for our username)
  variant text not null check (variant = 'no-center'),

  -- Ordered sequence of moves played (array of cell indices 0..8)
  moves jsonb not null,

  -- Outcome verified and calculated by the server
  result text not null check (result in ('x_won', 'o_won', 'draw')),

  created_at timestamptz not null default now()
);

-- Fast lookup of user's past games ordered newest first
create index if not exists games_owner_id_created_at_idx
  on public.games (owner_id, created_at desc);

-- Row Level Security: ON with NO policies (server uses secret key)
alter table public.games enable row level security;

