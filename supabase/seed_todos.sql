-- Create the todos table for the Sober.Spend app.
--
-- Design:
--   - id: auto-incrementing primary key
--   - name: the todo text (required)
--   - is_complete: boolean, defaults to false
--   - created_at: timestamptz, defaults to now
--
-- Security:
--   - RLS enabled (public is an exposed schema)
--   - SELECT open to anon + authenticated (no auth flow in app yet)
--   - INSERT/UPDATE/DELETE for authenticated only
--   - No SECURITY DEFINER, no user_metadata in auth decisions
--   - When auth is added, tighten SELECT to per-user ownership.

create table if not exists public.todos (
  id bigint generated always as identity primary key,
  name text not null,
  is_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS (required for any table in an exposed schema).
alter table public.todos enable row level security;

-- SELECT: public read (app has no auth flow yet).
create policy "Public can read todos"
  on public.todos
  for select
  to anon, authenticated
  using ( true );

-- INSERT: any client can insert (app has no auth flow yet).
create policy "Anyone can insert todos"
  on public.todos
  for insert
  to anon, authenticated
  with check ( true );

-- UPDATE: authenticated users can update (USING + WITH CHECK).
create policy "Authenticated can update todos"
  on public.todos
  for update
  to authenticated
  using ( true )
  with check ( true );

-- DELETE: authenticated users can delete.
create policy "Authenticated can delete todos"
  on public.todos
  for delete
  to authenticated
  using ( true );

-- Seed a few sample rows so the app has something to display.
insert into public.todos (name) values
  ('Learn Supabase'),
  ('Build Sober.Spend'),
  ('Ship to production')
on conflict do nothing;
