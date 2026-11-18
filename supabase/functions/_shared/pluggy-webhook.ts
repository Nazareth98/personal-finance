export type TransactionWebhook = { accountId: string; transactionIds: string[] };

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function webhookItemId(payload: Record<string, unknown>): string | null {
  const data = objectValue(payload.data);
  const item = objectValue(data.item);
  const value = payload.itemId ?? data.itemId ?? item.id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function transactionWebhook(payload: Record<string, unknown>): TransactionWebhook | null {
  const data = objectValue(payload.data);
  const accountId = payload.accountId ?? data.accountId;
  const sourceIds = payload.transactionIds ?? data.transactionIds;
  if (typeof accountId !== 'string' || accountId.length === 0 || accountId.length > 200
    || !Array.isArray(sourceIds) || sourceIds.length > 1000) return null;
  const transactionIds = [...new Set(sourceIds.filter((value): value is string =>
    typeof value === 'string' && value.length > 0 && value.length <= 200))];
  return transactionIds.length ? { accountId, transactionIds } : null;
}
