import type { Category, CategoryColorKey, CategoryIconKey } from '@personal-finance/domain';
import {
  Icon,
  CategoryBriefcaseIcon, CategoryBusIcon, CategoryCarIcon, CategoryEducationIcon, CategoryFuelIcon,
  CategoryGameIcon, CategoryGiftIcon, CategoryHealthIcon, CategoryHomeIcon, CategoryLandmarkIcon,
  CategoryPiggyBankIcon, CategoryReceiptIcon, CategoryRepeatIcon, CategoryShoppingCartIcon,
  CategorySparklesIcon, CategoryTagIcon, CategoryTransferIcon, CategoryTravelIcon, CategoryUtensilsIcon,
  CategoryWalletIcon, CategoryPetIcon, CategoryClothingIcon, CategoryPhoneIcon, CategoryInternetIcon, CategoryEnergyIcon,
  CategoryWaterIcon, CategoryBookIcon, CategoryMusicIcon, CategoryGymIcon, CategoryCoffeeIcon, CategoryStreamingIcon,
  CategoryBeautyIcon, CategoryMaintenanceIcon, CategoryPharmacyIcon, CategoryInsuranceIcon, CategoryTaxIcon,
  CategoryInvestmentIcon, CategoryDonationIcon, CategoryEventIcon, CategoryBikeIcon, type LucideIcon
} from '@personal-finance/ui';

/** `keywords` alimenta a busca do seletor (“luz” acha Energia); não aparece na tela. */
export const categoryIcons: Record<CategoryIconKey, { label: string; icon: LucideIcon; keywords?: string }> = {
  home: { label: 'Casa', icon: CategoryHomeIcon, keywords: 'moradia aluguel lar condomínio' },
  receipt: { label: 'Conta', icon: CategoryReceiptIcon, keywords: 'boleto fatura recibo' },
  'shopping-cart': { label: 'Compras', icon: CategoryShoppingCartIcon, keywords: 'mercado supermercado feira' },
  utensils: { label: 'Alimentação', icon: CategoryUtensilsIcon, keywords: 'restaurante comida refeição delivery' },
  car: { label: 'Carro', icon: CategoryCarIcon, keywords: 'veículo automóvel uber aplicativo' },
  bus: { label: 'Transporte público', icon: CategoryBusIcon, keywords: 'ônibus metrô trem' },
  fuel: { label: 'Combustível', icon: CategoryFuelIcon, keywords: 'gasolina posto etanol' },
  'heart-pulse': { label: 'Saúde', icon: CategoryHealthIcon, keywords: 'médico plano hospital consulta' },
  sparkles: { label: 'Destaque', icon: CategorySparklesIcon, keywords: 'especial extra' },
  gamepad: { label: 'Lazer', icon: CategoryGameIcon, keywords: 'jogos diversão games' },
  repeat: { label: 'Recorrência', icon: CategoryRepeatIcon, keywords: 'assinatura mensal' },
  'graduation-cap': { label: 'Educação', icon: CategoryEducationIcon, keywords: 'escola curso faculdade' },
  plane: { label: 'Viagem', icon: CategoryTravelIcon, keywords: 'férias passagem hotel' },
  landmark: { label: 'Instituição', icon: CategoryLandmarkIcon, keywords: 'banco governo' },
  gift: { label: 'Presente', icon: CategoryGiftIcon, keywords: 'aniversário natal' },
  briefcase: { label: 'Trabalho', icon: CategoryBriefcaseIcon, keywords: 'salário emprego' },
  wallet: { label: 'Carteira', icon: CategoryWalletIcon, keywords: 'dinheiro' },
  'arrow-left-right': { label: 'Transferência', icon: CategoryTransferIcon, keywords: 'pix ted' },
  'piggy-bank': { label: 'Reserva', icon: CategoryPiggyBankIcon, keywords: 'caixinha poupança' },
  tag: { label: 'Etiqueta', icon: CategoryTagIcon, keywords: 'outros geral' },
  'paw-print': { label: 'Pet', icon: CategoryPetIcon, keywords: 'cachorro gato veterinário ração' },
  shirt: { label: 'Vestuário', icon: CategoryClothingIcon, keywords: 'roupa calçado sapato' },
  smartphone: { label: 'Celular', icon: CategoryPhoneIcon, keywords: 'telefone plano' },
  wifi: { label: 'Internet', icon: CategoryInternetIcon, keywords: 'banda larga wi-fi' },
  zap: { label: 'Energia', icon: CategoryEnergyIcon, keywords: 'luz elétrica eletricidade' },
  droplet: { label: 'Água', icon: CategoryWaterIcon, keywords: 'saneamento esgoto' },
  'book-open': { label: 'Livros', icon: CategoryBookIcon, keywords: 'leitura livraria' },
  music: { label: 'Música', icon: CategoryMusicIcon, keywords: 'show spotify' },
  dumbbell: { label: 'Academia', icon: CategoryGymIcon, keywords: 'esporte treino' },
  coffee: { label: 'Café', icon: CategoryCoffeeIcon, keywords: 'padaria lanche' },
  film: { label: 'Streaming', icon: CategoryStreamingIcon, keywords: 'cinema filme série assinatura' },
  scissors: { label: 'Beleza', icon: CategoryBeautyIcon, keywords: 'cabelo salão estética' },
  wrench: { label: 'Manutenção', icon: CategoryMaintenanceIcon, keywords: 'conserto reparo oficina' },
  pill: { label: 'Farmácia', icon: CategoryPharmacyIcon, keywords: 'remédio medicamento' },
  shield: { label: 'Seguros', icon: CategoryInsuranceIcon, keywords: 'seguro proteção' },
  percent: { label: 'Impostos', icon: CategoryTaxIcon, keywords: 'taxa tributo iptu ipva juros' },
  'trending-up': { label: 'Investimentos', icon: CategoryInvestmentIcon, keywords: 'rendimento ações' },
  'hand-heart': { label: 'Doações', icon: CategoryDonationIcon, keywords: 'caridade ajuda' },
  ticket: { label: 'Eventos', icon: CategoryEventIcon, keywords: 'ingresso festa' },
  bike: { label: 'Bicicleta', icon: CategoryBikeIcon, keywords: 'mobilidade' }
};

export const categoryColors: Record<CategoryColorKey, string> = {
  'chart-category-1': 'Azul', 'chart-category-2': 'Verde-água', 'chart-category-3': 'Violeta',
  'chart-category-4': 'Âmbar', 'chart-category-5': 'Cinza', 'chart-category-6': 'Rosa',
  'chart-category-7': 'Ciano', 'chart-category-8': 'Laranja', 'chart-category-9': 'Índigo', 'chart-category-10': 'Oliva'
};

export function CategoryIdentityIcon({ iconKey, colorKey }: Pick<Category, 'iconKey' | 'colorKey'>) {
  return <span className={`category-identity__icon category-identity__icon--${colorKey}`} aria-hidden="true"><Icon icon={categoryIcons[iconKey].icon} size="sm" /></span>;
}

export function CategoryIdentity({ category, name = category.name }: { category: Pick<Category, 'iconKey' | 'colorKey' | 'name'>; name?: string }) {
  return <span className="category-identity"><CategoryIdentityIcon iconKey={category.iconKey} colorKey={category.colorKey} /><strong>{name}</strong></span>;
}
