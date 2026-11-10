import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const API = "https://api.pluggy.ai";
const corsHeadersBase = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

type ProviderItem = {
  id: string;
  status?: string;
  connector?: { name?: string };
  consentExpiresAt?: string | null;
};
type ProviderAccount = {
  id: string;
  itemId: string;
  type: "BANK" | "CREDIT" | string;
  name: string;
  subtype?: string;
};
type ProviderTransaction = {
  id: string;
  description?: string;
  descriptionRaw?: string | null;
  amount: number | string;
  date: string;
  status?: string;
};
type MeuConnection = {
  id: string;
  workspace_id: string;
  account_id: string;
  provider_code: string;
  pluggy_item_id: string | null;
  pluggy_account_id: string | null;
  status: string;
  scopes: string[];
};

function response(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeadersBase,
      ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
      "Content-Type": "application/json",
    },
  });
}

function itemIds(): string[] {
  const raw = Deno.env.get("MEUPLUGGY_ITEM_IDS") ?? "";
  const ids = raw
    .split(/[\s,;]+/)
    .map((id) => id.trim())
    .filter(Boolean);
  if (!ids.length || ids.length > 5 || new Set(ids).size !== ids.length) {
    throw new Error("Configuração de itens Meu Pluggy inválida.");
  }
  return ids;
}

async function authorize(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const ownerId = Deno.env.get("MEUPLUGGY_OWNER_USER_ID");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !ownerId || !url || !anonKey) {
    throw Object.assign(new Error("Meu Pluggy indisponível para esta sessão."), {
      status: 401,
    });
  }
  const db = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    throw Object.assign(new Error("Sessão inválida."), { status: 401 });
  }
  if (data.user.id !== ownerId) {
    throw Object.assign(new Error("A conexão Meu Pluggy pertence ao workspace do titular."), {
      status: 403,
    });
  }
  return { db, ownerId, ids: itemIds() };
}

function corsOrigin(req: Request): string | null {
  const origin = req.headers.get("Origin");
  if (!origin) return null;
  const allowed = (Deno.env.get("MEUPLUGGY_ALLOWED_ORIGINS") ?? "")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowed.includes(origin)) {
    throw Object.assign(new Error("Origem não autorizada."), { status: 403 });
  }
  return origin;
}

let cachedApiKey: string | undefined;
let apiKeyExpiresAt = 0;
async function apiKey(): Promise<string> {
  if (cachedApiKey && apiKeyExpiresAt > Date.now() + 60_000) return cachedApiKey;
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Credenciais do Meu Pluggy não configuradas.");
  const result = await fetch(`${API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!result.ok) throw new Error(`Falha de autenticação Pluggy (${result.status}).`);
  const payload = await result.json();
  if (typeof payload.apiKey !== "string") throw new Error("Resposta de autenticação inválida.");
  cachedApiKey = payload.apiKey;
  apiKeyExpiresAt = Date.now() + 7100_000;
  return cachedApiKey;
}

async function pluggy<T>(path: string, method = "GET"): Promise<T> {
  const key = await apiKey();
  const result = await fetch(new URL(path, API), {
    method,
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
  });
  if (!result.ok && !(method === "DELETE" && result.status === 404)) {
    throw new Error(`Falha na API Pluggy (${result.status}).`);
  }
  if (method === "DELETE" || result.status === 204) return undefined as T;
  return await result.json() as T;
}

async function itemAccounts(itemId: string): Promise<ProviderAccount[]> {
  const accounts: ProviderAccount[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const query = new URLSearchParams({ itemId, page: String(page), pageSize: "500" });
    const result = await pluggy<{
      results?: ProviderAccount[];
      totalPages?: number;
    }>(`/accounts?${query}`);
    accounts.push(...(result.results ?? []));
    totalPages = result.totalPages ?? 1;
    if (totalPages > 10) throw new Error("Limite de páginas de contas excedido.");
    page++;
  } while (page <= totalPages);
  return accounts.filter((account) => account.itemId === itemId);
}

function assertMeuPluggy(item: ProviderItem) {
  const connector = (item.connector?.name ?? "").toLocaleLowerCase("pt-BR").replace(/[^a-z]/g, "");
  if (connector !== "meupluggy") {
    throw Object.assign(
      new Error("O item configurado não usa o conector pessoal MeuPluggy."),
      { status: 403 },
    );
  }
}

function toCents(value: number | string): bigint {
  const text = String(value).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error("Valor monetário inválido recebido da Pluggy.");
  const decimals = match[3] ?? "";
  if (decimals.slice(2).replace(/0/g, "")) {
    throw new Error("A Pluggy retornou valor com precisão menor que um centavo.");
  }
  const cents = BigInt(match[2]) * 100n + BigInt(decimals.slice(0, 2).padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}

function proposal(tx: ProviderTransaction, accountType: string, providerAccountId: string) {
  if (!tx.id || tx.status === "PENDING") return null;
  const amount = toCents(tx.amount);
  if (amount === 0n) return null;
  const credit = accountType === "CREDIT";
  const nature = credit
    ? amount > 0n ? "expense" : "refund"
    : amount < 0n ? "expense" : "income";
  const cents = credit && amount > 0n
    ? -amount
    : credit ? -amount : amount;
  const date = String(tx.date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) {
    throw new Error("Data inválida recebida da Pluggy.");
  }
  const description = (tx.descriptionRaw || tx.description || "Lançamento Meu Pluggy").trim();
  if (!description) return null;
  return {
    description: description.slice(0, 500),
    amount_cents: cents.toString(),
    event_date: date,
    bank_date: date,
    competence: `${date.slice(0, 7)}-01`,
    nature,
    external_key: `meupluggy:${providerAccountId}:${tx.id}`,
    original_text: JSON.stringify(tx).slice(0, 10_000),
  };
}

async function transactions(accountId: string): Promise<ProviderTransaction[]> {
  const dateFrom = new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10);
  let path = `/v2/transactions?${new URLSearchParams({ accountId, dateFrom })}`;
  const rows: ProviderTransaction[] = [];
  for (let page = 0; page < 50; page++) {
    const result = await pluggy<{ results?: ProviderTransaction[]; next?: string | null }>(path);
    rows.push(...(result.results ?? []));
    if (!result.next) return rows;
    const next = new URL(result.next, API);
    if (next.origin !== API || next.pathname !== "/v2/transactions") {
      throw new Error("Cursor de paginação Pluggy inválido.");
    }
    path = `${next.pathname}${next.search}`;
  }
  throw new Error("Limite de páginas da Pluggy excedido; sincronização interrompida.");
}

async function readConnection(db: SupabaseClient, connectionId: string): Promise<MeuConnection> {
  const { data, error } = await db
    .from("open_finance_connections")
    .select("id,workspace_id,account_id,provider_code,pluggy_item_id,pluggy_account_id,status,scopes")
    .eq("id", connectionId)
    .single();
  if (error || !data) throw Object.assign(new Error("Vínculo Meu Pluggy indisponível."), { status: 404 });
  if (data.provider_code !== "meupluggy" || !data.pluggy_item_id || !data.pluggy_account_id) {
    throw Object.assign(new Error("Vínculo não é uma conta Meu Pluggy válida."), { status: 409 });
  }
  return data as MeuConnection;
}

Deno.serve(async (req) => {
  let origin: string | null = null;
  try {
    origin = corsOrigin(req);
    if (req.method === "OPTIONS") return response({ ok: true }, 200, origin);
    if (req.method !== "POST") return response({ error: "Método inválido." }, 405, origin);

    const { db, ids } = await authorize(req);
    const body = await req.json();
    const action = body.action;
    if (action === "accounts") {
      const configuredItems: MeuPluggyItem[] = [];
      for (const itemId of ids) {
        const { data: mappings } = await db
          .from("open_finance_connections")
          .select("pluggy_account_id,status,institution")
          .eq("provider_code", "meupluggy")
          .eq("pluggy_item_id", itemId);
        if (mappings?.length && mappings.every((mapping) => mapping.status === "revoked")) {
          configuredItems.push({
            itemId,
            institution: mappings[0].institution ?? "Meu Pluggy",
            status: "REVOKED",
            consentExpiresAt: null,
            accounts: [],
          });
          continue;
        }
        const [item, accounts] = await Promise.all([
          pluggy<ProviderItem>(`/items/${encodeURIComponent(itemId)}`),
          itemAccounts(itemId),
        ]);
        assertMeuPluggy(item);
        const revoked = new Set(
          (mappings ?? [])
            .filter((mapping) => mapping.status === "revoked")
            .map((mapping) => mapping.pluggy_account_id),
        );
        configuredItems.push({
          itemId,
          institution: item.connector?.name ?? "Meu Pluggy",
          status: item.status ?? "UNKNOWN",
          consentExpiresAt: item.consentExpiresAt ?? null,
          accounts: accounts.filter((account) => !revoked.has(account.id)),
        });
      }
      return response({ items: configuredItems }, 200, origin);
    }

    if (action === "synchronize") {
      const connection = await readConnection(db, String(body.connection_id ?? ""));
      if (connection.status !== "active" || !connection.scopes.includes("transactions")) {
        throw Object.assign(new Error("Vínculo inativo ou sem escopo de transações."), { status: 409 });
      }
      if (!ids.includes(connection.pluggy_item_id!)) {
        throw Object.assign(new Error("Item não autorizado nesta instalação."), { status: 403 });
      }
      const item = await pluggy<ProviderItem>(`/items/${encodeURIComponent(connection.pluggy_item_id!)}`);
      assertMeuPluggy(item);
      if (!item.consentExpiresAt || Date.parse(item.consentExpiresAt) <= Date.now()) {
        throw Object.assign(new Error("A autorização Meu Pluggy expirou. Renove-a no Dashboard da Pluggy."), { status: 409 });
      }
      if (["LOGIN_ERROR", "WAITING_USER_INPUT"].includes(item.status ?? "")) {
        throw Object.assign(new Error("A conexão Meu Pluggy exige nova autorização no Dashboard da Pluggy."), { status: 409 });
      }
      const accounts = await itemAccounts(connection.pluggy_item_id!);
      const providerAccount = accounts.find((account) => account.id === connection.pluggy_account_id);
      if (!providerAccount) throw Object.assign(new Error("Conta do provedor não pertence ao item configurado."), { status: 403 });
      const raw = await transactions(providerAccount.id);
      let rows = 0;
      let batches = 0;
      for (let offset = 0; offset < raw.length; offset += 500) {
        const page = raw.slice(offset, offset + 500);
        const proposals = page
          .map((transaction) => proposal(transaction, providerAccount.type, providerAccount.id))
          .filter((value): value is NonNullable<typeof value> => value !== null);
        const result = await db.rpc("meupluggy_stage_transactions", {
          p_connection: connection.id,
          p_hash: `meupluggy:${connection.id}:${crypto.randomUUID()}`,
          p_rows: proposals,
        });
        if (result.error) throw new Error("Não foi possível registrar a sincronização para revisão.");
        rows += Number(result.data?.rows ?? 0);
        if (result.data?.batch_id) batches++;
      }
      if (!raw.length) {
        const result = await db.rpc("meupluggy_stage_transactions", {
          p_connection: connection.id,
          p_hash: `meupluggy:${connection.id}:${crypto.randomUUID()}`,
          p_rows: [],
        });
        if (result.error) throw new Error("Não foi possível registrar a sincronização.");
      }
      return response({ rows, batches }, 200, origin);
    }

    if (action === "revoke-item") {
      const itemId = String(body.item_id ?? "");
      if (!ids.includes(itemId)) throw Object.assign(new Error("Item não autorizado nesta instalação."), { status: 403 });
      const { data: mappings, error } = await db
        .from("open_finance_connections")
        .select("id")
        .eq("provider_code", "meupluggy")
        .eq("pluggy_item_id", itemId)
        .eq("status", "active");
      if (error || !mappings?.length) throw Object.assign(new Error("Nenhum vínculo ativo encontrado."), { status: 404 });
      const revoked = await db.rpc("meupluggy_revoke_item", { p_item_id: itemId });
      if (revoked.error) throw new Error("Não foi possível revogar o acesso local.");
      try {
        await pluggy(`/items/${encodeURIComponent(itemId)}`, "DELETE");
        return response({ revoked: true, providerDeleted: true }, 200, origin);
      } catch {
        return response({ revoked: true, providerDeleted: false }, 200, origin);
      }
    }

    return response({ error: "Operação desconhecida." }, 400, origin);
  } catch (error) {
    const status = Number((error as { status?: number }).status ?? 500);
    const message = status < 500 && error instanceof Error
      ? error.message
      : "Não foi possível concluir a operação Meu Pluggy.";
    return response({ error: message }, status, origin);
  }
});

