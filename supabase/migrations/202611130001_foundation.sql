create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

comment on schema private is 'Objetos internos não expostos pela Data API.';
