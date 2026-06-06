create table if not exists public.scriptforge_health (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scripts (
  id uuid primary key,
  title text not null,
  type text not null,
  original_text text not null,
  processed_text text,
  main_plot text,
  characters jsonb not null default '[]'::jsonb,
  scenes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key,
  script_id uuid not null references public.scripts(id) on delete cascade,
  steps jsonb not null default '[]'::jsonb,
  current_step text,
  status text not null,
  progress double precision not null default 0,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_tasks_script_id on public.tasks(script_id);
create index if not exists idx_tasks_status on public.tasks(status);
