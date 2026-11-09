import { useState } from "react";
import type { Snapshot, Transaction } from "../domain/finance";
import { rpc } from "../lib/api";
import { Form } from "./Form";
export function Classification({
  data,
  transaction,
  refresh,
}: {
  data: Snapshot;
  transaction: Transaction;
  refresh: () => Promise<void>;
}) {
  const [category, setCategory] = useState(transaction.category_id ?? "");
  return (
    <details>
      <summary>Classificar</summary>
      <label>
        Nova categoria
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Sem categoria</option>
          {data.categories
            .filter((c) => !c.archived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </label>
      <Form
        key={category}
        fields={[
          {
            name: "subcategory",
            label: "Nova subcategoria",
            required: false,
            options: data.subcategories
              .filter((s) => s.category_id === category)
              .map((s) => [s.id, s.name]),
          },
        ]}
        label="Salvar classificação"
        submit={async (v) => {
          await rpc("reclassify_transaction", {
            target: transaction.id,
            category: category || null,
            subcategory: v.subcategory || null,
          });
          await refresh();
        }}
      />
      <small>
        {data.transaction_classifications?.filter(
          (c) => c.transaction_id === transaction.id,
        ).length ?? 0}{" "}
        alterações registradas. A classificação anterior permanece no histórico
        de exportação.
      </small>
    </details>
  );
}
