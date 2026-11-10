import { supabase } from "../lib/supabase";

export interface MeuPluggyAccount {
  id: string;
  type: "BANK" | "CREDIT";
  name: string;
  subtype?: string;
}

export interface MeuPluggyItem {
  itemId: string;
  institution: string;
  status: string;
  consentExpiresAt: string | null;
  accounts: MeuPluggyAccount[];
}

export interface MeuPluggyConnection {
  connectionId: string;
  itemId: string;
  providerAccountId: string;
  accountId: string;
  expiresAt: string | null;
  status: string;
}

async function invoke<T>(
  action: string,
  values: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error("Supabase não está configurado.");
  const { data, error } = await supabase.functions.invoke("meupluggy-api", {
    body: { action, ...values },
  });
  if (error) throw new Error("Não foi possível concluir a operação do Meu Pluggy.");
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export const meuPluggy = {
  listAccounts: () => invoke<{ items: MeuPluggyItem[] }>("accounts"),
  synchronize: (connectionId: string) =>
    invoke<{ rows: number; batches: number }>("synchronize", {
      connection_id: connectionId,
    }),
  revokeItem: (itemId: string) =>
    invoke<{ revoked: boolean; providerDeleted: boolean }>("revoke-item", {
      item_id: itemId,
    }),
  async linkAccount(input: {
    account: string;
    itemId: string;
    providerAccountId: string;
    providerAccountType: "BANK" | "CREDIT";
    institution: string;
    consentExpiresAt: string;
  }): Promise<string> {
    if (!supabase) throw new Error("Supabase não está configurado.");
    const { data, error } = await supabase.rpc("meupluggy_register_connection", {
      p_account: input.account,
      p_item_id: input.itemId,
      p_provider_account_id: input.providerAccountId,
      p_provider_account_type: input.providerAccountType,
      p_institution: input.institution,
      p_consent_expires_at: input.consentExpiresAt,
    });
    if (error) throw new Error("Não foi possível vincular as contas selecionadas.");
    return data as string;
  },
};
