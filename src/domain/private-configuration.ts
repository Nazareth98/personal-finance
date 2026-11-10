export type PrivateCategoryItem = {
  order: number;
  category: string;
  subcategory: string | null;
  nature: string;
};

export type PrivateRuleItem = {
  priority: number;
  keyword: string;
  category: string;
  subcategory: string | null;
  matchMode: "contains_literal";
  isActive: boolean;
  requiresFinancialNatureReview: boolean;
};

export type PrivateConfiguration = {
  categories: PrivateCategoryItem[];
  rules: PrivateRuleItem[];
  categoryCount: number;
  subcategoryCount: number;
  rulesRequiringNatureReview: number;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePackage(text: string, label: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${label}: o arquivo não contém JSON válido.`);
  }
  if (!record(parsed) || !Array.isArray(parsed.items)) {
    throw new Error(`${label}: esperado um objeto JSON com uma lista "items".`);
  }
  return parsed.items;
}

export function parsePrivateConfiguration(
  categoriesText: string,
  rulesText: string,
): PrivateConfiguration {
  const categoryRows = parsePackage(categoriesText, "Categorias");
  const ruleRows = parsePackage(rulesText, "Regras");
  if (!categoryRows.length || categoryRows.length > 1000) {
    throw new Error("O arquivo de categorias está vazio ou excede 1.000 linhas.");
  }
  if (!ruleRows.length || ruleRows.length > 2000) {
    throw new Error("O arquivo de regras está vazio ou excede 2.000 linhas.");
  }

  const categories: PrivateCategoryItem[] = categoryRows.map((row, index) => {
    if (!record(row)) throw new Error(`Linha ${index + 1} de categoria inválida.`);
    const { order, category, subcategory, nature } = row;
    if (
      typeof order !== "number" ||
      !Number.isSafeInteger(order) ||
      Number(order) < 0 ||
      typeof category !== "string" ||
      !category.trim() ||
      category.length > 100 ||
      (subcategory !== null && subcategory !== undefined &&
        (typeof subcategory !== "string" || subcategory.length > 100)) ||
      typeof nature !== "string" ||
      !nature.trim() ||
      nature.length > 80
    ) {
      throw new Error(`Linha ${index + 1} de categoria contém campos inválidos.`);
    }
    return {
      order: Number(order),
      category,
      subcategory: typeof subcategory === "string" ? subcategory : null,
      nature,
    };
  });

  const natureByCategory = new Map<string, Set<string>>();
  const natureByPair = new Map<string, string>();
  const subcategories = new Set<string>();
  for (const row of categories) {
    const categoryNatures = natureByCategory.get(row.category) ?? new Set<string>();
    categoryNatures.add(row.nature);
    natureByCategory.set(row.category, categoryNatures);
    if (row.subcategory?.trim()) {
      const pair = `${row.category}\u0000${row.subcategory}`;
      const priorNature = natureByPair.get(pair);
      if (priorNature !== undefined && priorNature !== row.nature) {
        throw new Error("Uma subcategoria está associada a naturezas diferentes.");
      }
      natureByPair.set(pair, row.nature);
      subcategories.add(pair);
    }
  }

  const rules: PrivateRuleItem[] = ruleRows.map((row, index) => {
    if (!record(row)) throw new Error(`Linha ${index + 1} de regra inválida.`);
    const {
      priority,
      keyword,
      category,
      subcategory,
      matchMode,
      isActive,
      requiresFinancialNatureReview,
    } = row;
    if (
      typeof priority !== "number" ||
      !Number.isSafeInteger(priority) ||
      typeof keyword !== "string" ||
      !keyword.trim() ||
      keyword.length > 200 ||
      typeof category !== "string" ||
      !natureByCategory.has(category) ||
      (subcategory !== null && subcategory !== undefined &&
        typeof subcategory !== "string") ||
      (typeof subcategory === "string" && subcategory !== "" &&
        !subcategories.has(`${category}\u0000${subcategory}`)) ||
      matchMode !== "contains_literal" ||
      typeof isActive !== "boolean" ||
      typeof requiresFinancialNatureReview !== "boolean"
    ) {
      throw new Error(`Linha ${index + 1} de regra contém campos ou referências inválidos.`);
    }
    return {
      priority: Number(priority),
      keyword,
      category,
      subcategory: typeof subcategory === "string" && subcategory ? subcategory : null,
      matchMode,
      isActive,
      requiresFinancialNatureReview,
    };
  });

  return {
    categories,
    rules,
    categoryCount: natureByCategory.size,
    subcategoryCount: subcategories.size,
    rulesRequiringNatureReview: rules.filter(
      (rule) => rule.requiresFinancialNatureReview,
    ).length,
  };
}

export async function hashPrivateConfiguration(
  categoriesText: string,
  rulesText: string,
): Promise<string> {
  const bytes = new TextEncoder().encode(`${categoriesText}\u0000${rulesText}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
