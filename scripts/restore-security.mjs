import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function restoreSecurity(db, { a, b, wa, wb }) {
  let checks = 0;
  const as = async (id) =>
    db.query(
      `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`,
    );
  const denied = async (backup) => {
    await assert.rejects(() =>
      db.query("select public.restore_backup($1,true)", [backup]),
    );
    checks++;
  };
  await as(a);
  const backup = (await db.query("select public.workspace_snapshot() data"))
    .rows[0].data;
  assert.equal(
    (await db.query("select public.restore_backup($1,false) data", [backup]))
      .rows[0].data.new,
    0,
  );
  checks++;
  const conflicting = structuredClone(backup);
  conflicting.financial_accounts[0].name = "Alteração conflitante";
  await denied(conflicting);
  const forged = structuredClone(backup);
  forged.categories.push({
    id: randomUUID(),
    workspace_id: wb,
    name: "Invasão sintética",
    archived: false,
  });
  await denied(forged);
  await as(b);
  await denied(backup);
  const ownBackup = (await db.query("select public.workspace_snapshot() data"))
    .rows[0].data;
  await denied({...ownBackup,profile:backup.profile});
  ownBackup.categories.push({
    ...backup.categories[0],
    workspace_id: wb,
    name: "Categoria independente B",
  });
  await db.query("select public.restore_backup($1,true)", [ownBackup]);
  assert.equal(
    (
      await db.query("select name from public.categories where id=$1", [
        backup.categories[0].id,
      ])
    ).rows[0].name,
    "Categoria independente B",
  );
  checks++;
  await as(a);
  assert.equal(
    (
      await db.query("select name from public.categories where id=$1", [
        backup.categories[0].id,
      ])
    ).rows[0].name,
    backup.categories[0].name,
  );
  checks++;
  await assert.rejects(() =>
    db.query(
      "insert into public.categories(id,workspace_id,name) values($1,$2,$3)",
      [randomUUID(), wa, "ID escolhido"],
    ),
  );
  checks++;
  await assert.rejects(() =>
    db.query(
      "update public.financial_accounts set id=$1 where workspace_id=$2",
      [randomUUID(), wa],
    ),
  );
  checks++;
  await assert.rejects(() =>
    db.query(
      "update public.financial_accounts set kind='credit' where workspace_id=$1 and kind='checking'",
      [wa],
    ),
  );
  checks++;
  // Simula perda em banco descartável; jamais roda em base de usuário.
  await db.query("reset role");
  const order = [
    "financial_accounts",
    "categories",
    "subcategories",
    "categorization_rules",
    "credit_cards",
    "budget_allocations",
    "savings_goals",
    "payslips",
    "transactions",
    "import_batches",
    "import_raw_rows",
    "review_decisions",
    "source_links",
    "open_finance_connections",
    "open_finance_consents",
    "open_finance_sync_runs",
    "billing_statements",
    "billing_payments",
    "installment_purchases",
    "installment_occurrences",
    "payslip_items",
    "payslip_bases",
    "transaction_classifications",
    "audit_events",
  ];
  await db.query("begin");
  for (const t of [...order].reverse())
    await db.query(`delete from public.${t} where workspace_id=$1`, [wa]);
  await db.query("commit");
  await as(a);
  const restored = (
    await db.query("select public.restore_backup($1,true) data", [backup])
  ).rows[0].data;
  assert.equal(restored.applied, true);
  checks++;
  const after = (await db.query("select public.workspace_snapshot() data"))
    .rows[0].data;
  for (const t of order.filter(
    (t) => !["audit_events", "open_finance_connections"].includes(t),
  )) {
    assert.deepEqual(after[t], backup[t]);
    checks++;
  }
  assert.ok(
    after.meupluggy_connections.every((c) => c.status === "revoked"),
  );
  checks++;
  assert.equal(
    (await db.query("select public.restore_backup($1,true) data", [backup]))
      .rows[0].data.new,
    0,
  );
  checks++;
  await db.query("reset role");
  return checks;
}
