import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';
import { classifyTransaction, type ClassificationCandidate, type ClassificationRule } from '../../../packages/domain/src/classification.ts';
import { billCompetences, cardCompetence, cardStatementDates, projectInstallments } from '../../../packages/domain/src/cards.ts';
import { recognizeItauSalary } from '../../../packages/domain/src/forecast.ts';
import { accountTypeFromPluggy, cardLedgerSemantics, centsFromPluggy, institutionFromAccountName, ledgerSemantics, merchantName, MEU_PLUGGY_CONNECTOR_ID, rawCategory, sanitizedDescription, type PluggyAccount, type PluggyTransaction } from './pluggy-domain.ts';
import type { PluggyClient } from './pluggy-client.ts';
import { safeError } from './http.ts';

export type SyncTrigger = 'initial' | 'manual' | 'webhook' | 'resume';
export type SyncResult = { runId: string; importedAccounts: number; importedTransactions: number; skippedTransactions: number };

type ConnectionRow = {
  id: string;
  owner_id: string;
  item_id: string;
  last_success_at: string | null;
};

type CardConfig = { id: string; closingDay: number; dueDay: number };
type CardLedgerItem = {
  externalKey: string; externalTransactionId: string; description: string; amountCents: bigint; competence: string;
  nature: 'expense' | 'refund' | 'card_payment' | 'adjustment'; installmentNumber?: number; totalInstallments?: number;
  groupKey?: string; originalTransactionId?: string; providerBillId?: string;
};
type IncomeCandidate = { externalKey: string; description: string; institutionName: string };

function dateOnly(value: string): string {
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('pluggy_transaction_invalid_date');
  return date;
}

function incrementalFrom(lastSuccess: string | null): string | undefined {
  if (!lastSuccess) return undefined;
  const date = new Date(lastSuccess);
  date.setUTCDate(date.getUTCDate() - 3);
  return date.toISOString();
}

function accountProviderType(account: PluggyAccount): string {
  return `${account.type ?? 'UNKNOWN'}:${account.subtype ?? 'UNKNOWN'}`.slice(0, 120);
}

function installmentGroupDescription(description: string): string {
  return description.replace(/\s+\d{1,3}\s*\/\s*\d{1,3}\s*$/u, '').trim().toLocaleLowerCase('pt-BR');
}

const POSTGREST_IN_CHUNK_SIZE = 100;

async function selectInChunks(
  database: SupabaseClient,
  table: string,
  columns: string,
  ownerId: string,
  column: string,
  values: string[]
): Promise<Record<string, unknown>[]> {
  const uniqueValues = [...new Set(values)];
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; offset < uniqueValues.length; offset += POSTGREST_IN_CHUNK_SIZE) {
    const result = await database.from(table).select(columns).eq('owner_id', ownerId)
      .in(column, uniqueValues.slice(offset, offset + POSTGREST_IN_CHUNK_SIZE));
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
  }
  return rows;
}

function providerDay(value: string | number | null | undefined): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 31) return value;
  if (typeof value !== 'string') return undefined;
  if (/^\d{1,2}$/.test(value)) {
    const day = Number(value);
    return day >= 1 && day <= 31 ? day : undefined;
  }
  const match = /^\d{4}-\d{2}-(\d{2})/.exec(value);
  return match ? Number(match[1]) : undefined;
}

async function ensureCreditCard(database: SupabaseClient, ownerId: string, accountId: string, account: PluggyAccount): Promise<CardConfig | undefined> {
  const existing = await database.from('credit_cards').select('id,closing_day,due_day')
    .eq('owner_id', ownerId).eq('account_id', accountId).maybeSingle();
  if (existing.error) throw existing.error;
  const closingDay = providerDay(account.creditData?.balanceCloseDate ?? account.creditData?.closingDate);
  const dueDay = providerDay(account.creditData?.balanceDueDate ?? account.creditData?.dueDate);
  if (existing.data && Number(existing.data.closing_day) && Number(existing.data.due_day)) {
    return { id: String(existing.data.id), closingDay: Number(existing.data.closing_day), dueDay: Number(existing.data.due_day) };
  }
  if (!closingDay || !dueDay) return undefined;
  const rawLimit = account.creditData?.creditLimit;
  const creditLimit = rawLimit === null || rawLimit === undefined ? null : centsFromPluggy(rawLimit).toString();
  const stored = await database.from('credit_cards').upsert({
    owner_id: ownerId, account_id: accountId, closing_day: closingDay, due_day: dueDay, credit_limit_cents: creditLimit
  }, { onConflict: 'account_id' }).select('id').single();
  if (stored.error) throw stored.error;
  return { id: String(stored.data.id), closingDay, dueDay };
}

/**
 * D-056: no MeuPluggy a conexão é do agregador; o banco de cada conta (logo e reconhecimento de salário) vem da
 * lista de bancos conhecidos (`KNOWN_BANKS`) casada pelo nome da conta. Sem casamento, vale o nome da conexão.
 */
async function accountInstitution(
  database: SupabaseClient, connectorId: number | undefined, fallbackName: string, account: PluggyAccount, mappingId: string
): Promise<string> {
  if (connectorId !== MEU_PLUGGY_CONNECTOR_ID) return fallbackName;
  const bank = institutionFromAccountName(account.name ?? '');
  if (!bank) return fallbackName;
  const stored = await database.rpc('internal_set_pluggy_account_institution', {
    p_mapping_id: mappingId, p_connector_id: bank.id, p_institution_name: bank.name.slice(0, 100)
  });
  if (stored.error) throw stored.error;
  return bank.name;
}

async function ensureAccount(
  database: SupabaseClient,
  connection: ConnectionRow,
  account: PluggyAccount,
  institutionName: string
): Promise<{ mappingId: string; accountId: string; type: ReturnType<typeof accountTypeFromPluggy>; card?: CardConfig; created: boolean }> {
  const existing = await database.rpc('internal_get_pluggy_account', {
    p_owner_id: connection.owner_id, p_external_account_id: account.id
  }).maybeSingle();
  if (existing.error) throw existing.error;
  const type = accountTypeFromPluggy(account);
  if (existing.data) {
    const card = type === 'credit_card' ? await ensureCreditCard(database, connection.owner_id, existing.data.account_id, account) : undefined;
    return { mappingId: existing.data.mapping_id, accountId: existing.data.account_id, type, ...(card ? { card } : {}), created: false };
  }

  const accountName = (account.name?.trim() || institutionName).slice(0, 80);
  const createdAccount = await database.from('financial_accounts').insert({
    owner_id: connection.owner_id,
    name: accountName.length >= 2 ? accountName : 'Conta importada',
    account_type: type,
    opening_balance_cents: '0'
  }).select('id').single();
  if (createdAccount.error) throw createdAccount.error;

  const mapping = await database.rpc('internal_create_pluggy_account', {
    p_owner_id: connection.owner_id,
    p_connection_id: connection.id,
    p_external_account_id: account.id,
    p_account_id: createdAccount.data.id,
    p_provider_type: accountProviderType(account)
  });
  if (mapping.error) throw mapping.error;
  const card = type === 'credit_card' ? await ensureCreditCard(database, connection.owner_id, createdAccount.data.id, account) : undefined;
  return { mappingId: mapping.data as string, accountId: createdAccount.data.id, type, ...(card ? { card } : {}), created: true };
}

function transactionRows(
  connection: ConnectionRow,
  mappingId: string,
  accountId: string,
  accountType: ReturnType<typeof accountTypeFromPluggy>,
  card: CardConfig | undefined,
  institutionName: string,
  transactions: PluggyTransaction[]
): { raw: Record<string, unknown>[]; ledger: Record<string, unknown>[]; cardItems: CardLedgerItem[]; incomeCandidates: IncomeCandidate[]; candidates: { externalKey: string; candidate: ClassificationCandidate }[]; skipped: number } {
  const raw: Record<string, unknown>[] = [];
  const ledger: Record<string, unknown>[] = [];
  const candidates: { externalKey: string; candidate: ClassificationCandidate }[] = [];
  const cardItems: CardLedgerItem[] = [];
  const incomeCandidates: IncomeCandidate[] = [];
  let skipped = 0;
  for (const transaction of transactions) {
    try {
      const amount = centsFromPluggy(transaction.amount);
      if (amount === 0n) { skipped += 1; continue; }
      const eventDate = dateOnly(transaction.date);
      const description = sanitizedDescription(transaction.description);
      const category = rawCategory(transaction);
      const merchant = merchantName(transaction);
      const metadata = transaction.creditCardMetadata;
      raw.push({
        owner_id: connection.owner_id,
        connection_id: connection.id,
        pluggy_account_id: mappingId,
        external_transaction_id: transaction.id,
        provider_id: transaction.providerId?.slice(0, 200) ?? null,
        provider_status: transaction.status?.slice(0, 80) ?? null,
        description,
        amount_cents: amount.toString(),
        event_date: eventDate,
        provider_type: transaction.type?.slice(0, 80) ?? null,
        raw_category: category,
        merchant_name: merchant,
        installment_number: metadata?.installmentNumber ?? null,
        total_installments: metadata?.totalInstallments ?? null,
        installment_group_key: metadata?.installmentId ?? null,
        original_transaction_id: metadata?.originalTransactionId ?? null,
        provider_bill_id: metadata?.billId ?? null
      });
      const externalKey = `pluggy:${transaction.id}`;
      if (accountType === 'credit_card') {
        if (!card) continue;
        const semantics = cardLedgerSemantics(transaction);
        const { nature, reporting } = semantics;
        const competence = cardCompetence(eventDate, card);
        ledger.push({ owner_id: connection.owner_id, account_id: accountId, category_id: null, description,
          amount_cents: semantics.amountCents.toString(), nature, reporting, source: 'pluggy', event_date: eventDate, competence,
          classification_status: nature === 'adjustment' ? 'automatic' : 'uncategorized', external_key: externalKey });
        // Linha informativa (D-050): sem entrada na fatura, sem sugestão de categoria.
        if (nature === 'adjustment') continue;
        cardItems.push({ externalKey, externalTransactionId: transaction.id, description, amountCents: semantics.amountCents, competence, nature,
          ...(metadata?.installmentNumber ? { installmentNumber: metadata.installmentNumber } : {}),
          ...(metadata?.totalInstallments ? { totalInstallments: metadata.totalInstallments } : {}),
          ...(metadata?.installmentId ? { groupKey: metadata.installmentId } : {}),
          ...(metadata?.originalTransactionId ? { originalTransactionId: metadata.originalTransactionId } : {}),
          ...(metadata?.billId ? { providerBillId: metadata.billId } : {}) });
        if (nature === 'expense') candidates.push({ externalKey, candidate: { description, ...(merchant ? { merchant } : {}), accountId, nature } });
        continue;
      }
      const semantics = ledgerSemantics(transaction);
      ledger.push({
        owner_id: connection.owner_id,
        account_id: accountId,
        category_id: semantics.categoryId,
        description,
        amount_cents: amount.toString(),
        nature: semantics.nature,
        reporting: semantics.reporting,
        source: 'pluggy',
        event_date: eventDate,
        competence: eventDate.slice(0, 7),
        classification_status: semantics.classificationStatus,
        external_key: externalKey
      });
      if (semantics.nature === 'income' || semantics.nature === 'expense') {
        candidates.push({ externalKey, candidate: {
          description, ...(merchant ? { merchant } : {}), accountId, nature: semantics.nature
        } });
        if (semantics.nature === 'income') incomeCandidates.push({ externalKey, description, institutionName });
      }
    } catch {
      skipped += 1;
    }
  }
  // D-054: compra vai para a fatura que o banco informou (billId), não para a da data da compra original.
  const byBill = billCompetences(cardItems.map(item => ({ billId: item.providerBillId, competence: item.competence })));
  for (const item of cardItems) item.competence = (item.providerBillId && byBill.get(item.providerBillId)) || item.competence;
  const competenceByKey = new Map(cardItems.map(item => [item.externalKey, item.competence]));
  for (const row of ledger) row.competence = competenceByKey.get(String(row.external_key)) ?? row.competence;
  return { raw, ledger, cardItems, incomeCandidates, candidates, skipped };
}

async function persistCardArtifacts(database: SupabaseClient, ownerId: string, card: CardConfig, items: CardLedgerItem[]): Promise<void> {
  if (!items.length) return;
  const transactions = await selectInChunks(database, 'transactions', 'id,external_key', ownerId,
    'external_key', items.map(item => item.externalKey));
  const transactionByKey = new Map(transactions.map(row => [String(row.external_key), String(row.id)]));

  const projectionsByKey = new Map<string, ReturnType<typeof projectInstallments>>();
  const statementRows = new Map<string, Record<string, unknown>>();
  const addStatement = (competence: string, providerBillId?: string): void => {
    const current = statementRows.get(competence);
    if (current && (!providerBillId || current.provider_bill_id)) return;
    const dates = cardStatementDates(competence, card);
    statementRows.set(competence, { owner_id: ownerId, card_id: card.id, competence,
      closing_date: dates.closingDate, due_date: dates.dueDate, provider_bill_id: providerBillId ?? null });
  };

  for (const item of items) {
    addStatement(item.competence, item.providerBillId);
    if (item.nature !== 'expense' || !item.installmentNumber || !item.totalInstallments) continue;
    const magnitude = item.amountCents < 0n ? -item.amountCents : item.amountCents;
    const projections = projectInstallments(item.competence, item.installmentNumber, item.totalInstallments, magnitude);
    projectionsByKey.set(item.externalKey, projections);
    for (const projection of projections) addStatement(projection.dueCompetence);
  }

  const storedStatements = await database.from('card_statements').upsert([...statementRows.values()],
    { onConflict: 'owner_id,card_id,competence' }).select('id,competence');
  if (storedStatements.error) throw storedStatements.error;
  const statementByCompetence = new Map((storedStatements.data ?? [])
    .map(row => [String(row.competence), String(row.id)]));

  const entryRows = items.flatMap(item => {
    const transactionId = transactionByKey.get(item.externalKey);
    const statementId = statementByCompetence.get(item.competence);
    if (!transactionId || !statementId) return [];
    const entryType = item.nature === 'refund' ? 'refund' : item.nature === 'card_payment' ? 'payment' : 'purchase';
    return [{ owner_id: ownerId, statement_id: statementId, transaction_id: transactionId, entry_type: entryType }];
  });
  if (entryRows.length) {
    const entries = await database.from('card_statement_entries').upsert(entryRows, { onConflict: 'transaction_id' });
    if (entries.error) throw entries.error;
  }

  const refundItems = items.filter(item => item.originalTransactionId && item.nature === 'refund');
  if (refundItems.length) {
    const originals = await selectInChunks(database, 'transactions', 'id,external_key', ownerId,
      'external_key', refundItems.map(item => `pluggy:${item.originalTransactionId}`));
    const originalByKey = new Map(originals.map(row => [String(row.external_key), String(row.id)]));
    const linkRows = refundItems.flatMap(item => {
      const sourceId = transactionByKey.get(item.externalKey);
      const targetId = originalByKey.get(`pluggy:${item.originalTransactionId}`);
      return sourceId && targetId ? [{ owner_id: ownerId, source_transaction_id: sourceId,
        target_transaction_id: targetId, link_type: 'refund' }] : [];
    });
    if (linkRows.length) {
      const links = await database.from('transaction_links').upsert(linkRows,
        { onConflict: 'source_transaction_id,target_transaction_id,link_type', ignoreDuplicates: true });
      if (links.error) throw links.error;
    }
  }

  const projectedRows = new Map<string, Record<string, unknown>>();
  const postedRows = new Map<string, Record<string, unknown>>();
  for (const item of items) {
    const transactionId = transactionByKey.get(item.externalKey);
    const projections = projectionsByKey.get(item.externalKey);
    if (!transactionId || !projections || !item.totalInstallments) continue;
    const groupKey = item.groupKey ?? `${card.id}:${installmentGroupDescription(item.description)}:${item.totalInstallments}`;
    for (const projection of projections) {
      const statementId = statementByCompetence.get(projection.dueCompetence);
      if (!statementId) continue;
      const row = { owner_id: ownerId, card_id: card.id, statement_id: statementId,
        transaction_id: projection.status === 'posted' ? transactionId : null,
        purchase_group_key: groupKey, description: item.description, installment_number: projection.number,
        total_installments: item.totalInstallments, amount_cents: projection.amountCents.toString(),
        due_competence: projection.dueCompetence, status: projection.status };
      const key = `${groupKey}:${projection.number}`;
      (projection.status === 'posted' ? postedRows : projectedRows).set(key, row);
    }
  }
  if (projectedRows.size) {
    const projected = await database.from('card_installments').upsert([...projectedRows.values()],
      { onConflict: 'owner_id,purchase_group_key,installment_number', ignoreDuplicates: true });
    if (projected.error) throw projected.error;
  }
  if (postedRows.size) {
    const posted = await database.from('card_installments').upsert([...postedRows.values()],
      { onConflict: 'owner_id,purchase_group_key,installment_number' });
    if (posted.error) throw posted.error;
  }
}

const evidenceLabels = {
  merchant: 'Estabelecimento correspondente', alias: 'Alias confirmado', token: 'Token da descrição',
  account: 'Conta associada', nature: 'Natureza financeira'
} as const;

async function persistClassifications(
  database: SupabaseClient,
  ownerId: string,
  candidates: { externalKey: string; candidate: ClassificationCandidate }[],
  rules: ClassificationRule[]
): Promise<void> {
  if (!candidates.length || !rules.length) return;
  const transactions = await selectInChunks(database, 'transactions', 'id,external_key', ownerId,
    'external_key', candidates.map(item => item.externalKey));
  const transactionByKey = new Map(transactions.map(row => [row.external_key as string, row.id as string]));
  const rows = candidates.flatMap(item => {
    const transactionId = transactionByKey.get(item.externalKey);
    const result = classifyTransaction(item.candidate, rules);
    if (!transactionId || !result.categoryId || result.status === 'uncategorized') return [];
    return [{
      owner_id: ownerId,
      transaction_id: transactionId,
      category_id: result.categoryId,
      confidence_basis_points: result.confidenceBasisPoints,
      status: result.status,
      classifier_version: result.version,
      explanation: {
        normalizedDescription: result.normalizedDescription,
        evidence: result.evidence.map(evidence => ({ ...evidence, label: evidenceLabels[evidence.kind] }))
      }
    }];
  });
  if (!rows.length) return;
  const stored = await database.from('transaction_classifications')
    .upsert(rows, { onConflict: 'transaction_id', ignoreDuplicates: true });
  if (stored.error) throw stored.error;
}

async function persistIncomeRecognition(database: SupabaseClient, ownerId: string, candidates: IncomeCandidate[]): Promise<void> {
  const recognized = candidates.filter(item => recognizeItauSalary(item.description, item.institutionName));
  if (!recognized.length) return;
  const transactions = await selectInChunks(database, 'transactions', 'id,external_key', ownerId,
    'external_key', recognized.map(item => item.externalKey));
  const transactionByKey = new Map(transactions.map(row => [String(row.external_key), String(row.id)]));
  const transactionIds = [...transactionByKey.values()];
  if (!transactionIds.length) return;
  const existing = await selectInChunks(database, 'transaction_classifications', 'transaction_id', ownerId,
    'transaction_id', transactionIds);
  const classified = new Set(existing.map(row => String(row.transaction_id)));
  const rows = recognized.flatMap(item => {
    const transactionId = transactionByKey.get(item.externalKey);
    if (!transactionId || classified.has(transactionId)) return [];
    return [{ owner_id: ownerId, transaction_id: transactionId, category_id: 'salary', confidence_basis_points: 9500,
      status: 'automatic', classifier_version: 'income-v1', explanation: { evidence: [{ kind: 'alias',
        value: 'itau:salary-description', weightBasisPoints: 9500, label: 'Descrição de salário em conta Itaú' }] } }];
  });
  if (!rows.length) return;
  const stored = await database.from('transaction_classifications').upsert(rows, { onConflict: 'transaction_id', ignoreDuplicates: true });
  if (stored.error) throw stored.error;
}

async function loadClassificationRules(database: SupabaseClient, ownerId: string): Promise<ClassificationRule[]> {
  const result = await database.from('classification_rules')
    .select('id,category_id,evidence_type,pattern,weight_basis_points')
    .eq('owner_id', ownerId).eq('enabled', true);
  if (result.error) throw result.error;
  return (result.data ?? []).map(row => ({
    id: String(row.id), categoryId: String(row.category_id), kind: row.evidence_type as ClassificationRule['kind'],
    value: String(row.pattern), weightBasisPoints: Number(row.weight_basis_points)
  }));
}

async function persistTransactions(
  database: SupabaseClient,
  connection: ConnectionRow,
  mapped: Awaited<ReturnType<typeof ensureAccount>>,
  institutionName: string,
  transactions: PluggyTransaction[],
  rules: ClassificationRule[]
): Promise<{ imported: number; skipped: number }> {
  const rows = transactionRows(connection, mapped.mappingId, mapped.accountId, mapped.type, mapped.card, institutionName, transactions);
  let imported = 0;
  if (rows.raw.length) {
    const rawInsert = await database.rpc('internal_store_pluggy_transactions', { p_rows: rows.raw });
    if (rawInsert.error) throw rawInsert.error;
    imported = Number(rawInsert.data ?? 0);
  }
  if (rows.ledger.length) {
    const ledgerInsert = await database.from('transactions')
      .upsert(rows.ledger, { onConflict: 'owner_id,external_key', ignoreDuplicates: true });
    if (ledgerInsert.error) throw ledgerInsert.error;
  }
  if (mapped.card) await persistCardArtifacts(database, connection.owner_id, mapped.card, rows.cardItems);
  await persistIncomeRecognition(database, connection.owner_id, rows.incomeCandidates);
  await persistClassifications(database, connection.owner_id, rows.candidates, rules);
  // D-050: o casamento de pagamento de fatura roda no banco (gatilho após inserir lançamentos e itens de fatura).
  return { imported, skipped: rows.skipped };
}

async function findAccount(pluggy: PluggyClient, itemId: string, accountId: string): Promise<PluggyAccount> {
  const pageSize = 100;
  for (let page = 1; ; page += 1) {
    const response = await pluggy.getAccounts(itemId, page, pageSize);
    const account = response.results.find(candidate => candidate.id === accountId);
    if (account) return account;
    if (response.results.length < pageSize || (response.totalPages && page >= response.totalPages)) {
      throw new Error('pluggy_account_not_found');
    }
  }
}

export async function synchronizeTransactionUpdates(
  database: SupabaseClient,
  pluggy: PluggyClient,
  connectionId: string,
  ownerId: string,
  externalAccountId: string,
  transactionIds: string[]
): Promise<void> {
  const connectionResult = await database.from('pluggy_connections').select('id,owner_id,item_id,last_success_at')
    .eq('id', connectionId).eq('owner_id', ownerId).single();
  if (connectionResult.error) throw new Error('connection_not_found');
  const connection = connectionResult.data as ConnectionRow;
  const item = await pluggy.getItem(connection.item_id);
  if ((item.status ?? '').toUpperCase().includes('LOGIN')) throw new Error('pluggy_login_required');
  const institutionName = item.connector?.name?.trim() || 'Instituição conectada';
  const account = await findAccount(pluggy, connection.item_id, externalAccountId);
  const mapped = await ensureAccount(database, connection, account, institutionName);
  const accountInstitutionName = await accountInstitution(database, item.connector?.id, institutionName, account, mapped.mappingId);
  const rules = await loadClassificationRules(database, ownerId);

  for (let offset = 0; offset < transactionIds.length; offset += 500) {
    const ids = transactionIds.slice(offset, offset + 500);
    let cursor: string | null = null;
    do {
      const page = await pluggy.getTransactionsByIds(externalAccountId, ids, cursor);
      await persistTransactions(database, connection, mapped, accountInstitutionName, page.results, rules);
      cursor = page.next;
    } while (cursor);
  }

  await database.from('pluggy_connections').update({
    connector_id: item.connector?.id ?? null,
    institution_name: institutionName.slice(0, 100),
    last_source_updated_at: item.lastUpdatedAt ?? null,
    last_error: null,
    updated_at: new Date().toISOString()
  }).eq('id', connectionId).eq('owner_id', ownerId);
}

export async function synchronizeConnection(
  database: SupabaseClient,
  pluggy: PluggyClient,
  connectionId: string,
  ownerId: string,
  requestedTrigger: SyncTrigger
): Promise<SyncResult> {
  const connectionResult = await database.from('pluggy_connections').select('id,owner_id,item_id,last_success_at')
    .eq('id', connectionId).eq('owner_id', ownerId).single();
  if (connectionResult.error) throw new Error('connection_not_found');
  const connection = connectionResult.data as ConnectionRow;

  const previousFailure = await database.from('sync_runs').select('id').eq('connection_id', connectionId)
    .eq('status', 'failed').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (previousFailure.error) throw previousFailure.error;
  const trigger = previousFailure.data ? 'resume' : requestedTrigger;
  const runResult = await database.from('sync_runs').insert({
    owner_id: ownerId, connection_id: connectionId, trigger_type: trigger, status: 'running', started_at: new Date().toISOString()
  }).select('id').single();
  if (runResult.error) {
    if (runResult.error.code === '23505') throw new Error('sync_already_running');
    throw runResult.error;
  }
  const runId = runResult.data.id as string;
  let importedAccounts = 0;
  let importedTransactions = 0;
  let skippedTransactions = 0;

  try {
    const rules = await loadClassificationRules(database, ownerId);
    await database.from('pluggy_connections').update({
      status: 'updating', last_attempt_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString()
    }).eq('id', connectionId).eq('owner_id', ownerId);

    const item = await pluggy.getItem(connection.item_id);
    if ((item.status ?? '').toUpperCase().includes('LOGIN')) throw new Error('pluggy_login_required');
    const institutionName = item.connector?.name?.trim() || 'Instituição conectada';
    await database.from('pluggy_connections').update({
      connector_id: item.connector?.id ?? null,
      institution_name: institutionName.slice(0, 100),
      last_source_updated_at: item.lastUpdatedAt ?? null,
      updated_at: new Date().toISOString()
    }).eq('id', connectionId).eq('owner_id', ownerId);

    let accountPage = 1;
    const accountPageSize = 100;
    while (true) {
      const response = await pluggy.getAccounts(connection.item_id, accountPage, accountPageSize);
      for (const account of response.results) {
        const mapped = await ensureAccount(database, connection, account, institutionName);
        const accountInstitutionName = await accountInstitution(database, item.connector?.id, institutionName, account, mapped.mappingId);
        if (mapped.created) importedAccounts += 1;
        let transactionPage = 1;
        let transactionCursor: string | null = null;
        do {
          const createdAtFrom = mapped.type === 'credit_card' ? undefined : incrementalFrom(connection.last_success_at);
          const page = await pluggy.getTransactions(account.id, createdAtFrom, transactionCursor);
          const persisted = await persistTransactions(database, connection, mapped, accountInstitutionName, page.results, rules);
          skippedTransactions += persisted.skipped;
          importedTransactions += persisted.imported;
          await database.from('sync_runs').update({
            checkpoint: { accountPage, accountId: account.id, transactionPage, transactionCursor: page.next },
            imported_accounts: importedAccounts,
            imported_transactions: importedTransactions,
            skipped_transactions: skippedTransactions
          }).eq('id', runId);
          transactionCursor = page.next;
          transactionPage += 1;
        } while (transactionCursor);
      }
      if (response.results.length < accountPageSize || (response.totalPages && accountPage >= response.totalPages)) break;
      accountPage += 1;
    }

    const finishedAt = new Date().toISOString();
    await database.from('sync_runs').update({
      status: 'succeeded', imported_accounts: importedAccounts, imported_transactions: importedTransactions,
      skipped_transactions: skippedTransactions, finished_at: finishedAt
    }).eq('id', runId);
    await database.from('pluggy_connections').update({
      status: 'ready', last_success_at: finishedAt, last_error: null, updated_at: finishedAt
    }).eq('id', connectionId).eq('owner_id', ownerId);
    return { runId, importedAccounts, importedTransactions, skippedTransactions };
  } catch (error) {
    const message = safeError(error);
    const finishedAt = new Date().toISOString();
    await database.from('sync_runs').update({
      status: 'failed', imported_accounts: importedAccounts, imported_transactions: importedTransactions,
      skipped_transactions: skippedTransactions, error_code: message.split(':')[0], error_message: message, finished_at: finishedAt
    }).eq('id', runId);
    await database.from('pluggy_connections').update({
      status: message === 'pluggy_login_required' ? 'login_required' : 'error', last_error: message, updated_at: finishedAt
    }).eq('id', connectionId).eq('owner_id', ownerId);
    throw error;
  }
}
