import { useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import {
  provider,
  type ConnectionIntent,
  type Scope,
} from "../open-finance/provider";
import { pluggyClient } from "../open-finance/pluggy-client";
import type { Snapshot } from "../domain/finance";
import { Form } from "./Form";

export function Connections({
  data,
  refresh,
}: {
  data: Snapshot;
  refresh: () => Promise<void>;
}) {
  const [providerType, setProviderType] = useState<"pluggy" | "mock">("pluggy");
  const [targetAccount, setTargetAccount] = useState<string>(
    data.financial_accounts[0]?.id || "",
  );
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [intent, setIntent] = useState<ConnectionIntent | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const mockAdapter = provider("mock");
  const pluggyAdapter = provider("pluggy");

  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartPluggyConnect() {
    if (!targetAccount) {
      setMessage("Selecione uma conta local de destino para vincular.");
      return;
    }
    setBusy(true);
    setMessage("Obtendo autorização segura com a Pluggy…");
    try {
      const token = await pluggyClient.getConnectToken();
      setConnectToken(token);
      setMessage("");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? `Falha ao iniciar Pluggy Connect: ${e.message}`
          : "Não foi possível iniciar o Pluggy Connect.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section>
        <h2>Conexões Open Finance</h2>
        <p>
          Conecte suas contas bancárias e cartões de crédito para importar
          lançamentos automaticamente via Open Finance da Pluggy.
        </p>

        <div className="actions" style={{ marginBottom: "16px" }}>
          <button
            type="button"
            className={providerType === "pluggy" ? "" : "secondary"}
            onClick={() => {
              setProviderType("pluggy");
              setMessage("");
            }}
          >
            Pluggy Open Finance (Oficial / Sandbox)
          </button>
          <button
            type="button"
            className={providerType === "mock" ? "" : "secondary"}
            onClick={() => {
              setProviderType("mock");
              setMessage("");
            }}
          >
            Ambiente Simulado (Mock)
          </button>
        </div>

        {providerType === "pluggy" ? (
          <div>
            <p className="notice">
              <strong>Integração Pluggy:</strong> Suporta bancos brasileiros (Itaú,
              Nubank, Bradesco, BB, Santander, etc.) e o ambiente Pluggy Bank (Sandbox).
              As transações importadas vão para a tela de revisão antes de entrar no seu extrato.
            </p>

            <label>
              Conta local de destino:
              <select
                value={targetAccount}
                onChange={(e) => setTargetAccount(e.target.value)}
              >
                {data.financial_accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.institution}) · {a.kind}
                  </option>
                ))}
              </select>
            </label>

            <div className="actions">
              <button
                type="button"
                disabled={busy || !targetAccount}
                onClick={() => void handleStartPluggyConnect()}
              >
                {busy ? "Preparando…" : "Conectar Instituição (Pluggy Connect)"}
              </button>
            </div>

            {connectToken && (
              <PluggyConnect
                connectToken={connectToken}
                includeSandbox={true}
                onSuccess={(itemData) => {
                  setConnectToken(null);
                  void action(async () => {
                    setMessage("Conexão autorizada! Registrando e importando lançamentos…");
                    const itemId = itemData.item?.id;
                    const institutionName =
                      itemData.item?.connector?.name || "Instituição Pluggy";

                    await pluggyAdapter.completeAuthorization({
                      connection_id: "",
                      state: "",
                      provider: "pluggy",
                      itemId,
                      account: targetAccount,
                      institution: institutionName,
                      scopes: ["accounts", "transactions"] as Scope[],
                    });

                    // Procura o ID da conexão recém-criada ou atualizada
                    const updatedSnapshot = await refresh().then(() => data);
                    const newConn = updatedSnapshot.open_finance_connections?.find(
                      (c: any) => (c as any).pluggy_item_id === itemId,
                    );

                    if (newConn) {
                      const syncRes = await pluggyAdapter.synchronize(newConn.id);
                      setMessage(
                        `Conectado ao ${institutionName} com sucesso! ${syncRes.rows ?? 0} movimento(s) importados para revisão.`,
                      );
                    } else {
                      setMessage(`Conectado ao ${institutionName} com sucesso!`);
                    }
                  });
                }}
                onError={(error) => {
                  setConnectToken(null);
                  setMessage(
                    `Falha na conexão Pluggy: ${error?.message || "Erro desconhecido"}`,
                  );
                }}
                onClose={() => {
                  setConnectToken(null);
                }}
              />
            )}
          </div>
        ) : (
          <div>
            <p className="notice">
              Somente dados fictícios. Nenhuma conexão com Itaú, Nubank ou Caixa é
              feita. O consentimento simulado permite testar o fluxo de leitura e revisão.
            </p>
            <Form
              fields={[
                {
                  name: "account",
                  label: "Conta local para o sandbox",
                  options: data.financial_accounts.map((a) => [a.id, a.name]),
                },
                {
                  name: "institution",
                  label: "Cenário de instituição",
                  options: [
                    ["Itaú", "Itaú (simulado)"],
                    ["Nubank", "Nubank (simulado)"],
                    ["Caixa", "Caixa (simulado, cobertura parcial)"],
                  ],
                },
              ]}
              label="Preparar consentimento"
              submit={async (v) => {
                setIntent(
                  await mockAdapter.createConnectionIntent({
                    account: v.account,
                    institution: v.institution,
                    scopes: ["accounts", "transactions"] as Scope[],
                  }),
                );
                await refresh();
              }}
            />
            {intent && (
              <div className="notice">
                <p>
                  Autorizo a geração de movimentos fictícios neste workspace, para
                  testar o fluxo de leitura e revisão.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      await mockAdapter.completeAuthorization(intent);
                      setIntent(null);
                    })
                  }
                >
                  Confirmar consentimento simulado
                </button>
              </div>
            )}
          </div>
        )}

        {message && <p role="status" style={{ fontWeight: 600 }}>{message}</p>}
      </section>

      <div className="cards">
        {data.open_finance_connections?.map((c) => {
          const expired = new Date(c.expires_at) <= new Date();
          const active = c.status === "active" && !expired;
          const isPluggy = (c as any).provider_code === "pluggy" || Boolean((c as any).pluggy_item_id);
          const currentAdapter = isPluggy ? pluggyAdapter : mockAdapter;

          return (
            <article key={c.id}>
              <h2>
                {c.institution} · {isPluggy ? "Pluggy" : "Mock"}
              </h2>
              <p>
                Conta vinculada:{" "}
                <strong>
                  {
                    data.financial_accounts.find((a) => a.id === c.account_id)
                      ?.name || "Conta não encontrada"
                  }
                </strong>
              </p>
              <p>
                Status:{" "}
                {c.status === "revoked"
                  ? "Revogado"
                  : expired
                    ? "Precisa renovar consentimento"
                    : c.status === "active"
                      ? "Conectado e ativo"
                      : c.status === "pending"
                        ? "Aguardando autorização"
                        : "Falhou"}
              </p>
              <small>
                Escopos: {c.scopes.join(", ")} · validade{" "}
                {new Date(c.expires_at).toLocaleDateString("pt-BR")}
              </small>
              <p>
                Última sincronização:{" "}
                {c.last_sync_at
                  ? new Date(c.last_sync_at).toLocaleString("pt-BR")
                  : "Ainda não realizada"}
              </p>
              <div className="actions">
                <button
                  disabled={!active || busy}
                  onClick={() =>
                    void action(async () => {
                      const result = await currentAdapter.synchronize(c.id);
                      setMessage(
                        `${result.rows ?? 0} movimento(s) recebido(s). Consulte a aba "Importar e revisar". ${result.has_more ? "Há outra página disponível." : ""}`,
                      );
                    })
                  }
                >
                  Sincronizar lançamentos
                </button>
                <button
                  className="secondary"
                  disabled={c.status === "pending" || busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Renovar consentimento por mais 90 dias?",
                      )
                    )
                      void action(() => currentAdapter.renewConsent(c.id));
                  }}
                >
                  Renovar
                </button>
                <button
                  className="secondary"
                  disabled={c.status === "revoked" || busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Revogar consentimento e impedir novas sincronizações? Seu histórico local será preservado.",
                      )
                    )
                      void action(() => currentAdapter.revokeConnection(c.id));
                  }}
                >
                  Revogar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
