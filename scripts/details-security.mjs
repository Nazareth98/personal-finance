import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function detailsSecurity(db, { wa, account, category, tx }) {
  let checks = 0;
  const card = (
    await db.query(
      "select id from public.financial_accounts where workspace_id=$1 and kind='credit'",
      [wa],
    )
  ).rows[0].id;
  const purchase = (
    await db.query("select public.plan_installments($1) id", [
      {
        account_id: card,
        category_id: category,
        description: "Compra parcelada fictícia",
        event_date: "2026-01-20",
        first_competence: "2026-02-01",
        total_cents: "10001",
        installments: 3,
      },
    ])
  ).rows[0].id;
  const occurrences = (
    await db.query(
      "select * from public.installment_occurrences where purchase_id=$1 order by occurrence",
      [purchase],
    )
  ).rows;
  assert.deepEqual(
    occurrences.map((o) => String(o.amount_cents)),
    ["3334", "3334", "3333"],
  );
  checks++;
  assert.equal(
    (
      await db.query(
        "select sum(amount_cents)::text n from public.installment_occurrences where purchase_id=$1",
        [purchase],
      )
    ).rows[0].n,
    "10001",
  );
  checks++;
  const actual = (
    await db.query("select public.confirm_installment($1) id", [
      occurrences[0].id,
    ])
  ).rows[0].id;
  assert.equal(
    (
      await db.query("select public.confirm_installment($1) id", [
        occurrences[0].id,
      ])
    ).rows[0].id,
    actual,
  );
  checks++;
  const statement = (
    await db.query(
      "insert into public.billing_statements(workspace_id,account_id,competence,due_date,declared_cents) values($1,$2,'2026-02-01','2026-03-05',3334) returning id",
      [wa, card],
    )
  ).rows[0].id;
  const request = randomUUID();
  const payment = (
    await db.query(
      "select public.pay_statement($1,$2,'2026-03-05','3334',$3) id",
      [statement, account, request],
    )
  ).rows[0].id;
  assert.equal(
    (
      await db.query(
        "select public.pay_statement($1,$2,'2026-03-05','3334',$3) id",
        [statement, account, request],
      )
    ).rows[0].id,
    payment,
  );
  checks++;
  assert.equal(
    (
      await db.query(
        "select sum(amount_cents)::text n from public.transactions where account_id=$1 and status='approved'",
        [card],
      )
    ).rows[0].n,
    "0",
  );
  checks++;
  await db.query("select public.reclassify_transaction($1,$2)", [tx, category]);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.transaction_classifications where transaction_id=$1",
        [tx],
      )
    ).rows[0].n,
    1,
  );
  checks++;
  const payslip = (
    await db.query("select id from public.payslips where workspace_id=$1", [wa])
  ).rows[0].id;
  await db.query(
    "insert into public.payslip_items(workspace_id,payslip_id,code,description,kind,amount_cents) values($1,$2,'SYN','Rubrica sintética','earning',600000)",
    [wa, payslip],
  );
  await db.query(
    "insert into public.payslip_bases(workspace_id,payslip_id,name,amount_cents) values($1,$2,'Base sintética',600000)",
    [wa, payslip],
  );
  const liability = (
    await db.query(
      "insert into public.financial_accounts(workspace_id,name,kind) values($1,'Passivo sintético','loan') returning id",
      [wa],
    )
  ).rows[0].id;
  const loan = {
    account_id: account,
    counterpart_account_id: liability,
    description: "Empréstimo fictício",
    amount_cents: "50000",
    nature: "loan",
    event_date: "2026-03-01",
    bank_date: "2026-03-01",
    competence: "2026-03-01",
    source_key: randomUUID(),
  };
  await db.query("select public.record_transaction($1)", [loan]);
  assert.equal(
    (
      await db.query(
        "select sum(amount_cents)::text n from public.transactions where nature='loan'",
      )
    ).rows[0].n,
    "0",
  );
  checks++;
  await assert.rejects(() =>
    db.query("select public.record_transaction($1)", [
      { ...loan, amount_cents: "60000" },
    ]),
  );
  checks++;
  return checks;
}
