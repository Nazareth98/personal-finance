import { useState } from "react";
import { Pencil, PiggyBank } from "lucide-react";
import {
  brl,
  cents,
  natureLabels,
  type Snapshot,
} from "../domain/finance";
import { Form } from "./Form";
import { CategorySubcategoryFields } from "./CategorySubcategoryFields";
import { save } from "../lib/api";
import { SectionTitle } from "./SectionTitle";
export function CategoryEditors({
  data,
  refresh,
}: {
  data: Snapshot;
  refresh: () => Promise<void>;
}) {
  const [id, setId] = useState(""),
    [ruleId, setRuleId] = useState(""),
    [subcategoryId, setSubcategoryId] = useState("");
  const category = data.categories.find((c) => c.id === id),
    rule = data.categorization_rules.find((r) => r.id === ruleId),
    sub = data.subcategories.find((s) => s.id === subcategoryId);
  async function edit(table: string, id: string, v: Record<string, unknown>) {
    await save(table, v, id);
    await refresh();
  }
  return (
    <section className="workflow-section editor-section">
      <SectionTitle icon={Pencil} title="Editar cadastros" description="Edite categorias, subcategorias e regras sem apagar referências do histórico." help={<><p>Selecione uma categoria, subcategoria ou regra para editar seus dados. Arquivar uma categoria preserva suas referências no histórico.</p><p>Regras alteradas sugerem classificações para linhas pendentes e não mudam movimentos já aprovados.</p></>} />
      <label>
        Categoria para editar
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Selecione</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {category && (
        <Form
          key={id}
          fields={[
            { name: "name", label: "Nome da categoria", value: category.name },
            {
              name: "archived",
              label: "Estado da categoria",
              value: String(category.archived),
              options: [
                ["false", "Ativa"],
                ["true", "Arquivada"],
              ],
            },
          ]}
          submit={(v) =>
            edit("categories", id, {
              name: v.name,
              archived: v.archived === "true",
            })
          }
        />
      )}
      <label>
        Subcategoria para editar
        <select
          value={subcategoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
        >
          <option value="">Selecione</option>
          {data.subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {sub && (
        <Form
          key={subcategoryId}
          fields={[
            { name: "name", label: "Nome da subcategoria", value: sub.name },
          ]}
          submit={(v) => edit("subcategories", subcategoryId, v)}
        />
      )}
      <label>
        Regra para editar
        <select value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
          <option value="">Selecione</option>
          {data.categorization_rules.map((r) => (
            <option key={r.id} value={r.id}>
              {r.keyword}
            </option>
          ))}
        </select>
      </label>
      {rule && (
        <Form
          key={ruleId}
          fields={[
            {
              name: "keyword",
              label: "Palavra-chave da regra",
              value: rule.keyword,
            },
            {
              name: "priority",
              label: "Nova prioridade",
              type: "number",
              value: String(rule.priority),
            },
            {
              name: "account_id",
              label: "Conta observada (opcional)",
              required: false,
              value: rule.account_id ?? "",
              options: data.financial_accounts
                .filter((account) => !account.archived)
                .map((account) => [account.id, `${account.name} · ${account.institution}`]),
              help: "Limita a regra ao extrato desta conta.",
            },
            {
              name: "amount_direction",
              label: "Direção na conta observada",
              value: rule.amount_direction ?? "any",
              options: [
                ["any", "Entrada ou saída"],
                ["debit", "Somente saída"],
                ["credit", "Somente entrada"],
              ],
            },
            {
              name: "transaction_nature",
              label: "Tipo de movimentação para automação",
              required: false,
              value: rule.transaction_nature ?? "",
              options: Object.entries(natureLabels),
              help: "O tipo é independente da categoria e define o efeito financeiro.",
            },
            {
              name: "counterpart_account_id",
              label: "Conta de contrapartida (quando exigida)",
              required: false,
              value: rule.counterpart_account_id ?? "",
              options: data.financial_accounts
                .filter((account) => !account.archived)
                .map((account) => [account.id, `${account.name} · ${account.institution}`]),
            },
            {
              name: "auto_approve",
              label: "Aprovação automática",
              value: String(rule.auto_approve ?? false),
              options: [
                ["false", "Não; manter para revisão"],
                ["true", "Sim; somente se completa e sem duplicidade"],
              ],
              help: "A regra ainda será bloqueada por campos ausentes, contrapartida ou possível duplicidade.",
            },
          ]}
          children={
            <CategorySubcategoryFields
              data={data}
              categoryId={rule.category_id}
              subcategoryId={rule.subcategory_id ?? ""}
            />
          }
          submit={(v) =>
            edit("categorization_rules", ruleId, {
              keyword: v.keyword,
              priority: Number(v.priority),
              category_id: v.category_id,
              subcategory_id: v.subcategory_id || null,
              account_id: v.account_id || null,
              amount_direction: v.amount_direction,
              transaction_nature: v.transaction_nature || null,
              counterpart_account_id: v.counterpart_account_id || null,
              auto_approve: v.auto_approve === "true",
            })
          }
        />
      )}
      <p>
        Arquivar preserva referências e histórico. Regras alteradas podem ser
        reaplicadas às linhas pendentes; movimentos já aprovados não são alterados.
      </p>
    </section>
  );
}
export function GoalEditor({
  data,
  refresh,
}: {
  data: Snapshot;
  refresh: () => Promise<void>;
}) {
  const [id, setId] = useState("");
  const goal = data.savings_goals.find((g) => g.id === id);
  return (
    <section className="workflow-section editor-section">
      <SectionTitle icon={PiggyBank} title="Editar objetivo" description="Atualize o nome, a meta ou o prazo do objetivo selecionado." help={<><p>Selecione um objetivo e altere seu nome, valor ou prazo. Essas alterações não criam aporte, resgate nem outro movimento.</p><p>Para alterar o saldo, registre um aporte ou resgate em Lançamentos usando a conta de caixinha associada.</p></>} />
      <label>
        Objetivo
        <select value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Selecione</option>
          {data.savings_goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      {goal && (
        <Form
          key={id}
          fields={[
            { name: "name", label: "Nome do objetivo", value: goal.name },
            {
              name: "target",
              label: "Nova meta (R$)",
              value: brl(goal.target_cents),
            },
            {
              name: "deadline",
              label: "Novo prazo",
              type: "date",
              required: false,
              value: goal.deadline ?? "",
            },
          ]}
          submit={async (v) => {
            await save(
              "savings_goals",
              {
                name: v.name,
                target_cents: cents(v.target).toString(),
                deadline: v.deadline || null,
              },
              id,
            );
            await refresh();
          }}
        />
      )}
    </section>
  );
}
