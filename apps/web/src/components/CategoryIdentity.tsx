import type { Category, CategoryColorKey, CategoryIconKey } from '@personal-finance/domain';
import {
  Icon,
  CategoryBriefcaseIcon, CategoryBusIcon, CategoryCarIcon, CategoryEducationIcon, CategoryFuelIcon,
  CategoryGameIcon, CategoryGiftIcon, CategoryHealthIcon, CategoryHomeIcon, CategoryLandmarkIcon,
  CategoryPiggyBankIcon, CategoryReceiptIcon, CategoryRepeatIcon, CategoryShoppingCartIcon,
  CategorySparklesIcon, CategoryTagIcon, CategoryTransferIcon, CategoryTravelIcon, CategoryUtensilsIcon,
  CategoryWalletIcon, type LucideIcon
} from '@personal-finance/ui';

export const categoryIcons: Record<CategoryIconKey, { label: string; icon: LucideIcon }> = {
  home: { label: 'Casa', icon: CategoryHomeIcon }, receipt: { label: 'Conta', icon: CategoryReceiptIcon },
  'shopping-cart': { label: 'Compras', icon: CategoryShoppingCartIcon }, utensils: { label: 'Alimentação', icon: CategoryUtensilsIcon },
  car: { label: 'Carro', icon: CategoryCarIcon }, bus: { label: 'Transporte público', icon: CategoryBusIcon },
  fuel: { label: 'Combustível', icon: CategoryFuelIcon }, 'heart-pulse': { label: 'Saúde', icon: CategoryHealthIcon },
  sparkles: { label: 'Destaque', icon: CategorySparklesIcon }, gamepad: { label: 'Lazer', icon: CategoryGameIcon },
  repeat: { label: 'Recorrência', icon: CategoryRepeatIcon }, 'graduation-cap': { label: 'Educação', icon: CategoryEducationIcon },
  plane: { label: 'Viagem', icon: CategoryTravelIcon }, landmark: { label: 'Instituição', icon: CategoryLandmarkIcon },
  gift: { label: 'Presente', icon: CategoryGiftIcon }, briefcase: { label: 'Trabalho', icon: CategoryBriefcaseIcon },
  wallet: { label: 'Carteira', icon: CategoryWalletIcon }, 'arrow-left-right': { label: 'Transferência', icon: CategoryTransferIcon },
  'piggy-bank': { label: 'Reserva', icon: CategoryPiggyBankIcon }, tag: { label: 'Etiqueta', icon: CategoryTagIcon }
};

export const categoryColors: Record<CategoryColorKey, string> = {
  'chart-category-1': 'Azul', 'chart-category-2': 'Verde-água', 'chart-category-3': 'Violeta',
  'chart-category-4': 'Âmbar', 'chart-category-5': 'Cinza'
};

export function CategoryIdentityIcon({ iconKey, colorKey }: Pick<Category, 'iconKey' | 'colorKey'>) {
  return <span className={`category-identity__icon category-identity__icon--${colorKey}`} aria-hidden="true"><Icon icon={categoryIcons[iconKey].icon} size="sm" /></span>;
}

export function CategoryIdentity({ category, name = category.name }: { category: Pick<Category, 'iconKey' | 'colorKey' | 'name'>; name?: string }) {
  return <span className="category-identity"><CategoryIdentityIcon iconKey={category.iconKey} colorKey={category.colorKey} /><strong>{name}</strong></span>;
}
