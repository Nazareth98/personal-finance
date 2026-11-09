import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function financialSecurity(db, { a, b, wa, wb }) {
  let checks = 0;
  const denied = async (sql, args = []) => {
    try {
      await db.query(sql, args);
    } catch (e) {
      assert.ok(
        ["42501", "23503", "23514", "P0001"].includes(e.code),
        `${e.code}: ${e.message}`,
      );
      checks++;
      return;
    }
    throw new Error("Operação proibida foi aceita");
  };
  const as = async (id) =>
    db.query(
      `reset role; set role authenticated; select set_config('request.jwt.claim.sub','${id}',false)`,
    );
  await as(a);
  const account = (
    await db.query(
      "insert into public.financial_accounts(workspace_id,name,kind) values($1,'Conta sintética A','checking') returning id",
      [wa],
    )
  ).rows[0].id;
  const dest = (
    await db.query(
      "insert into public.financial_accounts(workspace_id,name,kind) values($1,'Reserva fictícia','savings') returning id",
      [wa],
    )
  ).rows[0].id;
  const category = (
    await db.query(
      "insert into public.categories(workspace_id,name) values($1,'Categoria sintética') returning id",
      [wa],
    )
  ).rows[0].id;
  await db.query(
    "insert into public.subcategories(workspace_id,category_id,name) values($1,$2,'Subcategoria sintética')",
    [wa, category],
  );
  await db.query(
    "insert into public.categorization_rules(workspace_id,category_id,keyword) values($1,$2,'loja fictícia')",
    [wa, category],
  );
  await db.query(
    "insert into public.credit_cards(workspace_id,account_id,closing_day,due_day,limit_cents) values($1,$2,5,12,100000)",
    [
      wa,
      (
        await db.query(
          "insert into public.financial_accounts(workspace_id,name,kind) values($1,'Cartão sintético','credit') returning id",
          [wa],
        )
      ).rows[0].id,
    ],
  );
  await db.query(
    "insert into public.budget_allocations(workspace_id,category_id,period,cadence,fixed_cents) values($1,$2,'2026-01-01','monthly',10000)",
    [wa, category],
  );
  await db.query(
    "insert into public.savings_goals(workspace_id,account_id,name,target_cents) values($1,$2,'Objetivo sintético',10000)",
    [wa, dest],
  );
  await db.query(
    "insert into public.payslips(workspace_id,competence,employer,earnings_cents,deductions_cents,advance_cents,net_cents) values($1,'2026-01-01','Vínculo sintético',600000,100000,200000,300000)",
    [wa],
  );
  const p = {
    account_id: account,
    category_id: category,
    description: "Compra fictícia",
    amount_cents: "-1050",
    nature: "expense",
    event_date: "2026-01-03",
    bank_date: "2026-01-04",
    competence: "2026-02-01",
    source_key: randomUUID(),
  };
  const tx = (await db.query("select public.record_transaction($1) id", [p]))
    .rows[0].id;
  const invalidProposals = [
    { ...p, amount_cents: "1.23" },
    { ...p, event_date: "2026-02-30" },
    { ...p, competence: "2026-02-02" },
    { ...p, nature: "unsupported" },
    { ...p, installment_index: 4, installment_count: 3 },
    { ...p, description: null },
  ];
  for (const proposal of invalidProposals) {
    await assert.rejects(() =>
      db.query("select public.stage_import($1,$2,$3,$4)", [
        account,
        randomUUID(),
        "invalid-test",
        JSON.stringify([p, proposal]),
      ]),
    );
    checks++;
  }
  assert.equal(
    (await db.query("select count(*)::int n from public.import_batches"))
      .rows[0].n,
    0,
  );
  checks++;
  assert.equal(
    (await db.query("select public.record_transaction($1) id", [p])).rows[0].id,
    tx,
  );
  checks++;
  await db.query("select public.record_transaction($1)", [
    {
      ...p,
      nature: "contribution",
      counterpart_account_id: dest,
      source_key: randomUUID(),
    },
  ]);
  assert.equal(
    (
      await db.query(
        "select sum(amount_cents)::text n from public.transactions where nature='contribution'",
      )
    ).rows[0].n,
    "0",
  );
  checks++;
  const batch = (
    await db.query("select public.stage_import($1,$2,$3,$4) id", [
      account,
      "synthetic-file",
      "csv-v1",
      JSON.stringify([p, p]),
    ])
  ).rows[0].id;
  assert.equal(
    (
      await db.query("select public.stage_import($1,$2,$3,$4) id", [
        account,
        "synthetic-file",
        "csv-v1",
        "[]",
      ])
    ).rows[0].id,
    batch,
  );
  checks++;
  const rows = (
    await db.query("select id from public.import_raw_rows order by row_index")
  ).rows;
  const imported = (
    await db.query("select public.review_import($1,'approve') id", [rows[0].id])
  ).rows[0].id;
  assert.equal(
    (
      await db.query("select public.review_import($1,'approve') id", [
        rows[0].id,
      ])
    ).rows[0].id,
    imported,
  );
  checks++;
  await db.query("select public.review_import($1,'approve')", [rows[1].id]);
  assert.equal(
    (await db.query("select count(*)::int n from public.transactions")).rows[0]
      .n,
    5,
  );
  checks++;
  const intent = (
    await db.query(
      "select public.mock_connection_intent($1,'Caixa',array['accounts','transactions']) data",
      [account],
    )
  ).rows[0].data;
  await denied(
    "select public.mock_connection_intent($1,'Caixa',array['credit_cards'])",
    [account],
  );
  await denied("select public.mock_sync($1)", [intent.connection_id]);
  await denied("select public.mock_authorize($1,$2)", [
    intent.connection_id,
    randomUUID(),
  ]);
  await db.query("select public.mock_authorize($1,$2)", [
    intent.connection_id,
    intent.state,
  ]);
  await denied("select public.mock_authorize($1,$2)", [
    intent.connection_id,
    intent.state,
  ]);
  assert.equal(
    (
      await db.query("select public.mock_sync($1,true) data", [
        intent.connection_id,
      ])
    ).rows[0].data.status,
    "error",
  );
  checks++;
  assert.equal(
    (
      await db.query(
        "select cursor from public.open_finance_connections where id=$1",
        [intent.connection_id],
      )
    ).rows[0].cursor,
    0,
  );
  checks++;
  const sync = (
    await db.query("select public.mock_sync($1) data", [intent.connection_id])
  ).rows[0].data;
  assert.equal(sync.rows, 1);
  checks++;
  await db.query("select public.mock_consent_action($1,'revoke')", [
    intent.connection_id,
  ]);
  await denied("select public.mock_sync($1)", [intent.connection_id]);
  await db.query("select public.mock_consent_action($1,'renew')", [
    intent.connection_id,
  ]);
  await db.query("reset role");
  await db.query(
    "update public.open_finance_connections set expires_at=now()-interval '1 day' where id=$1",
    [intent.connection_id],
  );
  await as(a);
  await denied("select public.mock_sync($1)", [intent.connection_id]);
  await db.query("select public.mock_consent_action($1,'renew')", [
    intent.connection_id,
  ]);
  // Uma origem manual e uma origem mock da mesma compra são vinculadas por revisão humana.
  const mockRow = (
    await db.query(
      "select id,proposal from public.import_raw_rows where batch_id=$1",
      [sync.batch_id],
    )
  ).rows[0];
  const manual = (
    await db.query("select public.record_transaction($1) id", [
      { ...mockRow.proposal, account_id: account, source_key: randomUUID() },
    ])
  ).rows[0].id;
  await db.query("select public.review_import($1,'link','{}',$2)", [
    mockRow.id,
    manual,
  ]);
  const beforeHybrid = (
    await db.query("select count(*)::int n from public.transactions")
  ).rows[0].n;
  const again = (
    await db.query("select public.stage_import($1,$2,$3,$4) id", [
      account,
      "second-source",
      "csv-v1",
      JSON.stringify([mockRow.proposal]),
    ])
  ).rows[0].id;
  const againRow = (
    await db.query("select id from public.import_raw_rows where batch_id=$1", [
      again,
    ])
  ).rows[0].id;
  await db.query("select public.review_import($1,'approve')", [againRow]);
  assert.equal(
    (await db.query("select count(*)::int n from public.transactions")).rows[0]
      .n,
    beforeHybrid,
  );
  checks++;
  const { detailsSecurity } = await import("./details-security.mjs");
  checks += await detailsSecurity(db, { wa, account, category, tx });
  const snap = (await db.query("select public.workspace_snapshot() data"))
    .rows[0].data;
  assert.equal(typeof snap.transactions[0].amount_cents, "string");
  checks++;
  await as(b);
  const acctB = (
    await db.query(
      "insert into public.financial_accounts(workspace_id,name,kind) values($1,'Conta sintética B','checking') returning id",
      [wb],
    )
  ).rows[0].id;
  for (const table of Object.keys(snap).filter((k) => Array.isArray(snap[k]))) {
    assert.equal(
      (
        await db.query(
          `select count(*)::int n from public.${table} where workspace_id=$1`,
          [wa],
        )
      ).rows[0].n,
      0,
    );
    checks++;
    await denied(`delete from public.${table} where workspace_id=$1`, [wa]);
    if (snap[table][0]) {
      const columns = Object.keys(snap[table][0]).filter(
        (k) => !["id", "created_at"].includes(k),
      );
      await denied(
        `insert into public.${table}(${columns.join(",")}) select ${columns.join(",")} from jsonb_populate_record(null::public.${table},$1)`,
        [snap[table][0]],
      );
    }
    const writable = [
      "financial_accounts",
      "categories",
      "subcategories",
      "categorization_rules",
      "credit_cards",
      "budget_allocations",
      "savings_goals",
      "payslips",
    ];
    if (writable.includes(table)) {
      // Existing rows are invisible to UPDATE. No exception is expected.
      const col = Object.keys(snap[table][0]).find(
        (k) => !["id", "workspace_id", "created_at"].includes(k),
      );
      const update = await db.query(
        `update public.${table} set ${col}=${col} where workspace_id=$1`,
        [wa],
      );
      assert.equal(update.rowCount, 0);
      checks++;
    } else {
      await denied(
        `update public.${table} set workspace_id=workspace_id where workspace_id=$1`,
        [wa],
      );
    }
  }
  await denied(
    "insert into public.financial_accounts(workspace_id,name,kind) values($1,'Intrusão','checking')",
    [wa],
  );
  await denied(
    "insert into public.categorization_rules(workspace_id,keyword,category_id) values($1,'teste',$2)",
    [wb, category],
  );
  await denied("select public.record_transaction($1)", [
    { ...p, account_id: account, source_key: randomUUID() },
  ]);
  await denied("select public.record_transaction($1)", [
    { ...p, account_id: acctB, source_key: randomUUID() },
  ]);
  await denied("select public.void_transaction($1)", [tx]);
  await denied("select public.review_import($1,'approve')", [rows[0].id]);
  await denied("select public.stage_import($1,'test','csv','[]')", [account]);
  await denied("select public.mock_sync($1)", [intent.connection_id]);
  await denied("select public.mock_consent_action($1,'renew')", [
    intent.connection_id,
  ]);
  await denied("select * from private.connection_intents");
  assert.equal(
    (await db.query("select public.workspace_snapshot() data")).rows[0].data
      .transactions.length,
    0,
  );
  checks++;
  await as(a);
  await denied("select public.record_transaction($1)", [
    {
      ...p,
      source_key: randomUUID(),
      nature: "transfer",
      counterpart_account_id: acctB,
    },
  ]);
  const before = (
    await db.query("select count(*)::int n from public.transactions")
  ).rows[0].n;
  await denied("select public.record_transaction($1)", [
    {
      ...p,
      source_key: randomUUID(),
      nature: "transfer",
      counterpart_account_id: randomUUID(),
    },
  ]);
  assert.equal(
    (await db.query("select count(*)::int n from public.transactions")).rows[0]
      .n,
    before,
  );
  checks++;
  await db.query("set role anon");
  await denied("select * from public.transactions");
  await denied("select public.workspace_snapshot()");
  await db.query("reset role");
  // Todas as tabelas financeiras devem manter RLS habilitado.
  const unsecured = (
    await db.query(
      "select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity",
    )
  ).rows;
  assert.deepEqual(unsecured, []);
  checks++;
  return checks;
}
