create extension if not exists pgcrypto;

create table if not exists public.scriptforge_health (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key,
  user_id uuid references public.users(id) on delete set null,
  title text not null,
  source_novel text not null default '未命名原著',
  source_author text not null default '未知作者',
  chapter_count integer not null default 0,
  status text not null default 'idle',
  script_id uuid,
  task_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.scripts (
  id uuid primary key,
  project_id uuid references public.projects(id) on delete set null,
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
  project_id uuid references public.projects(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  task_type text not null default 'convert',
  steps jsonb not null default '[]'::jsonb,
  current_step text,
  status text not null,
  progress double precision not null default 0,
  error_message text,
  step_results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_exports (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  script_id uuid references public.scripts(id) on delete set null,
  format text not null,
  status text not null default 'done',
  download_url text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.distribution_jobs (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  title text not null,
  description text not null default '',
  resolution text not null default '1080p',
  ratio text not null default '9:16',
  duration integer not null default 60,
  watermark boolean not null default true,
  generate_audio boolean not null default true,
  platforms jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  video_url text,
  external_docs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_scripts_project_id on public.scripts(project_id);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_script_id on public.tasks(script_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_exports_project_id on public.project_exports(project_id);
create index if not exists idx_distribution_jobs_project_id on public.distribution_jobs(project_id);
create index if not exists idx_distribution_jobs_status on public.distribution_jobs(status);

alter table public.users disable row level security;
alter table public.projects disable row level security;
alter table public.scripts disable row level security;
alter table public.tasks disable row level security;
alter table public.project_exports disable row level security;
alter table public.distribution_jobs disable row level security;
alter table public.scriptforge_health disable row level security;
