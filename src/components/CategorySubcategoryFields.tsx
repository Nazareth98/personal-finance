import { useState } from "react";
import type { Category, Snapshot } from "../domain/finance";

export function CategorySubcategoryFields({
  data,
  categoryId = "",
  subcategoryId = "",
  categoryName = "category_id",
  subcategoryName = "subcategory_id",
  requiredCategory = true,
}: {
  data: Pick<Snapshot, "categories" | "subcategories">;
  categoryId?: string;
  subcategoryId?: string;
  categoryName?: string;
  subcategoryName?: string;
  requiredCategory?: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState(categoryId);
  const [selectedSubcategory, setSelectedSubcategory] = useState(() =>
    data.subcategories.some(
      (subcategory) =>
        subcategory.id === subcategoryId &&
        subcategory.category_id === categoryId,
    )
      ? subcategoryId
      : "",
  );
  const categories: Category[] = data.categories.filter(
    (category) => !category.archived || category.id === selectedCategory,
  );
  const subcategories = data.subcategories.filter(
    (subcategory) => subcategory.category_id === selectedCategory,
  );

  return (
    <>
      <label>
        Categoria
        <select
          aria-label="Categoria"
          value={selectedCategory}
          required={requiredCategory}
          onChange={(event) => {
            setSelectedCategory(event.target.value);
            setSelectedSubcategory("");
          }}
        >
          <option value="">Selecione</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input type="hidden" name={categoryName} value={selectedCategory} />
      </label>
      <label>
        Subcategoria
        <select
          aria-label="Subcategoria"
          value={selectedSubcategory}
          disabled={!selectedCategory || subcategories.length === 0}
          onChange={(event) => setSelectedSubcategory(event.target.value)}
        >
          <option value="">Sem subcategoria</option>
          {subcategories.map((subcategory) => (
            <option key={subcategory.id} value={subcategory.id}>
              {subcategory.name}
            </option>
          ))}
        </select>
        <input
          type="hidden"
          name={subcategoryName}
          value={selectedSubcategory}
        />
      </label>
    </>
  );
}
