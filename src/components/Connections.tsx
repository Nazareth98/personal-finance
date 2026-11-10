import { useState } from "react";
import type { Snapshot } from "../domain/finance";
import { meuPluggy, type MeuPluggyItem } from "../meupluggy/client";

export function Connections({
  data,
  refresh,
  openAccounts,
}: {
  data: Snapshot;
  refresh: () => Promise<void>;
  openAccounts: () => void;
}) {
  const [items, setItems] = useState<MeuPluggyItem[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const connections = (data.meupluggy_connections ?? []).filter(
    (connection) => connection.provider_code === "meupluggy",
  );

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadItems() {
    await run(async () => {
      const result = await meuPluggy.listAccounts();
      setItems(result.items);
      setMessage(
        result.items.length
          ? `${result.items.length} conexão(ões) encontrada(s) no Meu Pluggy.`
          : "Nenhuma conta foi retornada. Confira as conexões no Meu Pluggy e tente novamente.",
      );
    });
  }

  return (
    <section>
      <h2>Meu Pluggy</h2>
      <p>
        Esta conexão pessoal importa somente os dados do titular autorizado. Ela
        não oferece conexão bancária para outros usuários do aplicativo.
      </p>
      <ol>
        <li>Conecte suas instituições em meu.pluggy.ai.</li>
        <li>
          No Dashboard da Pluggy, autorize o conector MeuPluggy para sua
          aplicação e copie os IDs dos itens.
        </li>
        <li>
          O responsável pela implantação configura credenciais, IDs dos itens e
          o usuário proprietário nos secrets da Edge Function.
        </li>
        <li>Carregue as contas, vincule cada uma à conta local correspondente e sincronize.</li>
      </ol>
      <p>
        Os movimentos passam pela revisão manual antes de entrar no livro. A
        autorização do Meu Pluggy precisa ser renovada no Dashboard quando
        expirar; sincronizar não renova consentimento.
      </p>
      <button disabled={busy} onClick={() => void loadItems()}>
        {busy ? "Consultando…" : "Carregar minhas contas Meu Pluggy"}
      </button>
      {message && <p role="status">{message}</p>}

      {items.map((item) => {
        const expired =
          item.consentExpiresAt !== null &&
          new Date(item.consentExpiresAt).getTime() <= Date.now();
        const unavailable =
          expired || ["LOGIN_ERROR", "WAITING_USER_INPUT"].includes(item.status);
        const itemConnections = connections.filter(
          (connection) => connection.pluggy_item_id === item.itemId,
        );
        const revoked =
          itemConnections.length > 0 &&
          itemConnections.every((connection) => connection.status === "revoked");

        return (
          <article key={item.itemId}>
            <h3>{item.institution}</h3>
            <p>
              Acesso: {revoked ? "revogado neste aplicativo" : expired ? "consentimento expirado" : item.status}
              {item.consentExpiresAt &&
                ` · validade ${new Date(item.consentExpiresAt).toLocaleDateString("pt-BR")}`}
            </p>
            {item.accounts.map((providerAccount) => {
              const mapping = itemConnections.find(
                (connection) =>
                  connection.pluggy_account_id === providerAccount.id,
              );
              const key = `${item.itemId}:${providerAccount.id}`;
              const expectedKind = providerAccount.type === "CREDIT" ? "credit" : null;
              const localAccounts = data.financial_accounts.filter(
                (account) =>
                  !account.archived &&
                  (expectedKind
                    ? account.kind === expectedKind
                    : ["checking", "cash", "savings"].includes(account.kind)),
              );
              const selected =
                selections[key] ?? mapping?.account_id ?? "";

              return (
                <div key={providerAccount.id} className="card-row">
                  <strong>
                    {providerAccount.name} · {providerAccount.type === "CREDIT" ? "Cartão" : "Conta"}
                  </strong>
                  {mapping && mapping.status === "active" ? (
                    <>
                      <p>
                        Vinculada a {data.financial_accounts.find((account) => account.id === mapping.account_id)?.name ?? "conta local"}
                      </p>
                      <button
                        disabled={busy || unavailable || revoked}
                        onClick={() =>
                          void run(async () => {
                            const result = await meuPluggy.synchronize(mapping.id);
                            setMessage(
                              `${result.rows} lançamento(s) novo(s) enviado(s) para revisão.`,
                            );
                          })
                        }
                      >
                        Sincronizar
                      </button>
                    </>
                  ) : localAccounts.length === 0 ? (
                    <div>
                      <p>
                        {providerAccount.type === "CREDIT"
                          ? "Cadastre primeiro uma conta financeira do tipo Cartão de crédito. Depois volte aqui para vinculá-la e, em Contas e cartões, configure fechamento, vencimento e limite."
                          : "Cadastre primeiro uma conta local compatível (corrente ou investimento). Depois volte aqui para fazer o vínculo."}
                      </p>
                      <button type="button" onClick={openAccounts}>
                        Ir para Contas e cartões
                      </button>
                    </div>
                  ) : (
                    <div className="actions">
                      <label>
                        Conta local correspondente
                        <select
                          value={selected}
                          disabled={unavailable || revoked}
                          onChange={(event) =>
                            setSelections((current) => ({
                              ...current,
                              [key]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Selecione</option>
                          {localAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        disabled={busy || unavailable || revoked || !selected || !item.consentExpiresAt}
                        onClick={() =>
                          void run(async () => {
                            await meuPluggy.linkAccount({
                              account: selected,
                              itemId: item.itemId,
                              providerAccountId: providerAccount.id,
                              providerAccountType: providerAccount.type,
                              institution: item.institution,
                              consentExpiresAt: item.consentExpiresAt!,
                            });
                            setMessage("Conta vinculada. Você já pode sincronizar os lançamentos.");
                          })
                        }
                      >
                        Vincular conta
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {itemConnections.some((connection) => connection.status === "active") && (
              <button
                className="secondary"
                disabled={busy || revoked}
                onClick={() => {
                  if (
                    window.confirm(
                      "Revogar o item Meu Pluggy neste aplicativo? A ação também remove o item da aplicação Pluggy e não apaga lançamentos já aprovados.",
                    )
                  )
                    void run(async () => {
                      const result = await meuPluggy.revokeItem(item.itemId);
                      setMessage(
                        result.providerDeleted
                          ? "Acesso local revogado e item excluído na Pluggy."
                          : "Acesso local revogado. A exclusão remota falhou; remova o item no Dashboard da Pluggy.",
                      );
                    });
                }}
              >
                Revogar item Meu Pluggy
              </button>
            )}
          </article>
        );
      })}
      {connections.length > 0 && (
        <p>
          {connections.filter((connection) => connection.status === "active").length} vínculo(s) ativo(s) neste workspace.
        </p>
      )}
    </section>
  );
}
