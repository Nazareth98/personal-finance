// Banco descartável: nunca aplica migrations a uma base existente.
import pg from "pg";
import { URL } from "node:url";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const admin = new pg.Client({
  connectionString:
    process.env.TEST_PG_URL ?? "postgresql://postgres@127.0.0.1:55439/postgres",
});
await admin.connect();
const name = `finance_test_${randomUUID().replaceAll("-", "")}`;
await admin.query(`create database ${name}`);
const url = new URL(
  process.env.TEST_PG_URL ?? "postgresql://postgres@127.0.0.1:55439/postgres",
);
url.pathname = `/${name}`;
const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
let checks = 0;
async function check(sql, expected) {
  const r = await db.query(sql);
  assert.equal(r.rows[0].n, expected);
  checks++;
}
async function denied(sql) {
  try {
    await db.query(sql);
  } catch (e) {
    assert.ok(["42501", "23503", "23514", "P0001"].includes(e.code), e.code);
    checks++;
    return;
  }
  throw new Error("Operação proibida foi aceita");
}
try {
  await db.query(`do $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists(select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; end $$;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security; grant usage on schema storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated;
    grant usage on schema public to authenticated,anon;`);
  for (const f of (await readdir("supabase/migrations")).sort())
    await db.query(await readFile(`supabase/migrations/${f}`, "utf8"));
  const a = randomUUID(),
    b = randomUUID();
  await db.query("insert into auth.users values($1),($2)", [a, b]);
  const ws = (await db.query("select id,owner_id from public.workspaces")).rows;
  const wa = ws.find((x) => x.owner_id === a).id,
    wb = ws.find((x) => x.owner_id === b).id;
  await db.query(
    `set role authenticated; select set_config('request.jwt.claim.sub','${a}',false)`,
  );
  await check("select count(*)::int n from public.profiles", 1);
  await check("select count(*)::int n from public.workspaces", 1);
  await check("select count(*)::int n from public.workspace_members", 1);
  await check(
    `select count(*)::int n from public.workspaces where id='${wb}'`,
    0,
  );
  await denied(
    `insert into public.workspace_members values('${wb}','${a}','owner')`,
  );
  await denied(`update public.workspaces set owner_id='${a}' where id='${wb}'`);
  await denied(`delete from public.workspaces where id='${wb}'`);
  await db.query(
    `insert into storage.objects(bucket_id,name) values('financial-files','${wa}/synthetic.csv')`,
  );
  await denied(
    `insert into storage.objects(bucket_id,name) values('financial-files','${wb}/synthetic.csv')`,
  );
  await denied(
    `insert into storage.objects(bucket_id,name) values('financial-files','${wa}/../secret')`,
  );
  await db.query(`select set_config('request.jwt.claim.sub','${b}',false)`);
  await check("select count(*)::int n from storage.objects", 0);
  await db.query(`reset role`);
  // Extensões de testes de domínio rodam com os mesmos usuários sintéticos.
  try {
    const { financialSecurity } = await import("./financial-security.mjs");
    checks += await financialSecurity(db, { a, b, wa, wb });
  } catch (e) {
    if (e.code !== "ERR_MODULE_NOT_FOUND") throw e;
  }
  console.log(`PostgreSQL: ${checks} verificações de segurança aprovadas.`);
} finally {
  await db.end();
  await admin.query(`drop database ${name} with (force)`);
  await admin.end();
}
