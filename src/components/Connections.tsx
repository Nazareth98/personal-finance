import { useState } from "react";
import {
  provider,
  type ConnectionIntent,
  type Scope,
} from "../open-finance/provider";
import type { Snapshot } from "../domain/finance";
import { Form } from "./Form";
export function Connections({
  data,
  refresh,
}: {
  data: Snapshot;
  refresh: () => Promise<void>;
}) {
  const [intent, setIntent] = useState<ConnectionIntent | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const adapter = provider("mock");
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
  return (
    <>
      <section>
        <h2>Open Finance · ambiente simulado</h2>
        <p className="notice">
          Somente dados fictícios. Nenhuma conexão com Itaú, Nubank ou Caixa é
          feita. A integração real está desabilitada.
        </p>
        <p>
          O consentimento simulado permite leitura de conta e transações por 90
          dias. A sincronização coloca dados na revisão; só sua aprovação os
          contabiliza. Ao revogar, o histórico local permanece e novas
          sincronizações são bloqueadas.
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
              await adapter.createConnectionIntent({
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
                  await adapter.completeAuthorization(intent);
                  setIntent(null);
                })
              }
            >
              Confirmar consentimento simulado
            </button>
          </div>
        )}
        <p role="status">{message}</p>
      </section>
      <div className="cards">
        {data.open_finance_connections?.map((c) => {
          const expired = new Date(c.expires_at) <= new Date();
          const active = c.status === "active" && !expired;
          return (
            <article key={c.id}>
              <h2>{c.institution} · mock</h2>
              <p>
                {
                  data.financial_accounts.find((a) => a.id === c.account_id)
                    ?.name
                }
              </p>
              <p>
                {c.status === "revoked"
                  ? "Revogado"
                  : expired
                    ? "Precisa renovar consentimento"
                    : c.status === "active"
                      ? "Conectado"
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
              <small>
                Faturas não disponíveis neste adaptador. Use importação manual.
                O cenário Caixa simula cobertura parcial.
              </small>
              <div className="actions">
                <button
                  disabled={!active || busy}
                  onClick={() =>
                    void action(async () => {
                      const result = await adapter.synchronize(c.id);
                      setMessage(
                        `${result.rows ?? 0} movimento(s) recebido(s). Consulte a revisão. ${result.has_more ? "Há outra página disponível." : ""}`,
                      );
                    })
                  }
                >
                  Sincronizar página
                </button>
                <button
                  className="secondary"
                  disabled={c.status === "pending" || busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Renovar consentimento simulado por mais 90 dias?",
                      )
                    )
                      void action(() => adapter.renewConsent(c.id));
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
                      void action(() => adapter.revokeConnection(c.id));
                  }}
                >
                  Revogar
                </button>
                <button
                  className="secondary"
                  disabled={!active || busy}
                  onClick={() =>
                    void action(async () => {
                      await adapter.synchronize(c.id, true);
                      setMessage(
                        "Falha de rede simulada. Cursor preservado; tente novamente manualmente.",
                      );
                    })
                  }
                >
                  Testar falha
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
