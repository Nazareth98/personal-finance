import assert from "node:assert/strict";
import pg from "pg";
import { setTimeout as delay } from "node:timers/promises";
export async function concurrencySecurity(db, url, { a, wa }) {
  const first = new pg.Client({ connectionString: url }),
    second = new pg.Client({ connectionString: url });
  await first.connect();
  await second.connect();
  let checks = 0;
  try {
    for (const c of [first, second])
      await c.query(
        `set role authenticated;select set_config('request.jwt.claim.sub','${a}',false)`,
      );
    const account = (
      await first.query(
        "select id from public.financial_accounts where workspace_id=$1 and kind='checking'",
        [wa],
      )
    ).rows[0].id;
    const intent = (
      await first.query(
        "select public.mock_connection_intent($1,'Nubank',array['accounts','transactions']) data",
        [account],
      )
    ).rows[0].data;
    await first.query("select public.mock_authorize($1,$2)", [
      intent.connection_id,
      intent.state,
    ]);
    const pid1 = (await first.query("select pg_backend_pid() id")).rows[0].id,
      pid2 = (await second.query("select pg_backend_pid() id")).rows[0].id;
    async function blocked(pid) {
      for (let i = 0; i < 100; i++) {
        const count = (
          await db.query("select cardinality(pg_blocking_pids($1)) n", [pid])
        ).rows[0].n;
        if (count > 0) {
          checks++;
          return;
        }
        await delay(20);
      }
      throw new Error("Lock de conexão não bloqueou operação concorrente");
    }
    await first.query("begin");
    await first.query("select public.mock_sync($1)", [intent.connection_id]);
    const revoke = second.query(
      "select public.mock_consent_action($1,'revoke')",
      [intent.connection_id],
    );
    await blocked(pid2);
    await first.query("commit");
    await revoke;
    await assert.rejects(() =>
      first.query("select public.mock_sync($1)", [intent.connection_id]),
    );
    checks++;
    await first.query("select public.mock_consent_action($1,'renew')", [
      intent.connection_id,
    ]);
    const before = (
      await first.query("select count(*)::int n from public.import_raw_rows")
    ).rows[0].n;
    await second.query("begin");
    await second.query("select public.mock_consent_action($1,'revoke')", [
      intent.connection_id,
    ]);
    const rejected = assert.rejects(() =>
      first.query("select public.mock_sync($1)", [intent.connection_id]),
    );
    await blocked(pid1);
    await second.query("commit");
    await rejected;
    checks++;
    assert.equal(
      (await first.query("select count(*)::int n from public.import_raw_rows"))
        .rows[0].n,
      before,
    );
    checks++;
  } finally {
    await first.query("rollback").catch(() => {});
    await second.query("rollback").catch(() => {});
    await first.end();
    await second.end();
  }
  return checks;
}
