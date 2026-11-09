import { useState } from "react";
import { brl, cents, type Snapshot } from "../domain/finance";
import { Form } from "./Form";
import { CategorySubcategoryFields } from "./CategorySubcategoryFields";
import { save } from "../lib/api";
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
    <section>
      <h2>Editar cadastros</h2>
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
            })
          }
        />
      )}
      <p>
        Arquivar preserva referências e histórico. Regras alteradas só sugerem
        categorias para linhas ainda pendentes.
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
    <section>
      <h2>Editar objetivo</h2>
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
