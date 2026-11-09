import { writeFile } from "node:fs/promises";
export async function generateTypes(db) {
  const rows = (
    await db.query(
      "select table_name,column_name,udt_name,is_nullable,domain_name from information_schema.columns where table_schema='public' order by table_name,ordinal_position",
    )
  ).rows;
  let out =
    "// Gerado do PostgreSQL após aplicar migrations. npm run types:generate\nexport interface DatabaseRows {\n";
  const tables = [...new Set(rows.map((r) => r.table_name))];
  for (const t of tables) {
    out += `  ${t}: {\n`;
    for (const r of rows.filter((r) => r.table_name === t)) {
      let type =
        r.udt_name === "bool"
          ? "boolean"
          : ["int4", "int2"].includes(r.udt_name)
            ? "number"
            : r.udt_name === "jsonb"
              ? "unknown"
              : r.udt_name === "_text"
                ? "string[]"
                : "string";
      if (r.is_nullable === "YES") type += " | null";
      out += `    ${r.column_name}: ${type};\n`;
    }
    out += "  };\n";
  }
  out += "}\n";
  await writeFile("src/lib/database.types.ts", out);
}
