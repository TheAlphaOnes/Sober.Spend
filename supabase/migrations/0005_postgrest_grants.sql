-- PostgREST only advertises tables granted to its API roles.
-- Without this, the JS client reports: Could not find the table
-- 'public.categories' in the schema cache — even though Postgres
-- already has the table.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.categories, public.expenses, public.settings
  TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
