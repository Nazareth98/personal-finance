import assert from "node:assert/strict";
export async function concurrencySecurity(db, _url, { a }) {
  await db.query(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${a}',false)`);
  await assert.rejects(() => db.query("select public.mock_connection_intent(gen_random_uuid(),'Synthetic',array['accounts'])"));
  await assert.rejects(() => db.query("select public.pluggy_register_connection(gen_random_uuid(),'synthetic',array['accounts'],'Synthetic','synthetic')"));
  return 2;
}
