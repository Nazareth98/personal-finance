import { useMemo, useState, type FormEvent } from 'react';
import type { Category, CategoryColorKey, CategoryIconKey } from '@personal-finance/domain';
import {
  ArchiveIcon, Badge, Button, Card, CategoriesIcon, DataState, DataTable, DeleteIcon, Dialog, EditIcon,
  EmptyState, FormMessage, Icon, Input, MoveDownIcon, MoveUpIcon, PlusIcon, RadioGroup, Select, useToast, VisualSelect,
  CategoryBriefcaseIcon, CategoryBusIcon, CategoryCarIcon, CategoryEducationIcon, CategoryFuelIcon,
  CategoryGameIcon, CategoryGiftIcon, CategoryHealthIcon, CategoryHomeIcon, CategoryLandmarkIcon,
  CategoryPiggyBankIcon, CategoryReceiptIcon, CategoryRepeatIcon, CategoryShoppingCartIcon,
  CategorySparklesIcon, CategoryTagIcon, CategoryTransferIcon, CategoryTravelIcon, CategoryUtensilsIcon,
  CategoryWalletIcon, type DataTableColumn, type LucideIcon
} from '@personal-finance/ui';
import type { LedgerState } from '../ledger/useLedger';
import type { PageProps } from './PageProps';

const applicabilityLabels: Record<Category['applicability'], string> = {
  income: 'Receita', expense: 'Despesa', neutral: 'Movimento neutro'
};

const categoryIcons: Record<CategoryIconKey, { label: string; icon: LucideIcon }> = {
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

const categoryColors: Record<CategoryColorKey, string> = {
  'chart-category-1': 'Azul', 'chart-category-2': 'Verde-água', 'chart-category-3': 'Violeta',
  'chart-category-4': 'Âmbar', 'chart-category-5': 'Cinza'
};

function CategoryIdentityIcon({ iconKey, colorKey }: Pick<Category, 'iconKey' | 'colorKey'>) {
  return <span className={`category-identity__icon category-identity__icon--${colorKey}`} aria-hidden="true"><Icon icon={categoryIcons[iconKey].icon} size="sm" /></span>;
}

function CategoryIdentity({ category, name = category.name }: { category: Pick<Category, 'iconKey' | 'colorKey' | 'name'>; name?: string }) {
  return <span className="category-identity"><CategoryIdentityIcon iconKey={category.iconKey} colorKey={category.colorKey} /><strong>{name}</strong></span>;
}

function CategoryEditor({ category, open, onClose, ledger }: {
  category: Category | null; open: boolean; onClose: () => void; ledger: LedgerState;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [applicability, setApplicability] = useState<Category['applicability']>('expense');
  const [iconKey, setIconKey] = useState<CategoryIconKey>(category?.iconKey ?? 'tag');
  const [colorKey, setColorKey] = useState<CategoryColorKey>(category?.colorKey ?? 'chart-category-1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();

  function close() { setError(''); onClose(); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName.length < 2) { setError('Informe um nome com pelo menos 2 caracteres.'); return; }
    setLoading(true); setError('');
    try {
      if (category) await ledger.updateCategory(category.id, { name: nextName, iconKey, colorKey });
      else await ledger.createCategory({ name: nextName, applicability, iconKey, colorKey });
      notify({ message: category ? 'Categoria atualizada.' : 'Categoria criada.', tone: 'success' });
      close();
    } catch { setError('Não foi possível salvar a categoria. Verifique se o nome já existe.'); }
    finally { setLoading(false); }
  }

  return <Dialog open={open} onClose={close} title={category ? 'Editar categoria' : 'Nova categoria'}
    description={category ? 'Nome, ícone e cor também aparecem no histórico.' : 'A aplicabilidade restringe onde a categoria pode ser selecionada.'}>
    <form className="transaction-form" noValidate onSubmit={submit}>
      <Input label="Nome" value={name} maxLength={60} required onChange={event => setName(event.target.value)} />
      <div className="category-visual-fields">
        <VisualSelect label="Ícone" value={iconKey} onChange={value => setIconKey(value as CategoryIconKey)}
          options={Object.entries(categoryIcons).map(([value, option]) => ({ value, label: option.label, visual: <CategoryIdentityIcon iconKey={value as CategoryIconKey} colorKey={colorKey} /> }))} />
        <VisualSelect label="Cor" value={colorKey} onChange={value => setColorKey(value as CategoryColorKey)}
          options={Object.entries(categoryColors).map(([value, label]) => ({ value, label, visual: <CategoryIdentityIcon iconKey={iconKey} colorKey={value as CategoryColorKey} /> }))} />
      </div>
      <div className="category-preview" aria-label="Prévia da categoria"><span className="muted">Prévia</span><CategoryIdentity category={{ name: name.trim() || 'Nome da categoria', iconKey, colorKey }} /></div>
      {!category && <RadioGroup legend="Aplica-se a" name="category-applicability" value={applicability} required
        options={[{ value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }, { value: 'neutral', label: 'Movimento neutro' }]}
        onChange={value => setApplicability(value as Category['applicability'])} />}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions"><Button variant="secondary" onClick={close}>Cancelar</Button><Button type="submit" loading={loading}>Salvar categoria</Button></div>
    </form>
  </Dialog>;
}

function CategoryRemoval({ category, onClose, ledger }: { category: Category | null; onClose: () => void; ledger: LedgerState }) {
  const [replacement, setReplacement] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  const replacements = (ledger.data?.categories ?? []).filter(item => item.id !== category?.id && !item.archivedAt
    && item.applicability === category?.applicability).map(item => ({ value: item.id, label: item.name }));

  async function archive() {
    if (!category) return;
    setLoading(true); setError('');
    try {
      await ledger.archiveCategory({ categoryId: category.id, ...(replacement ? { replacementCategoryId: replacement } : {}) });
      notify({ message: replacement ? 'Categoria reatribuída e arquivada.' : 'Categoria arquivada sem alterar o histórico.', tone: 'success' });
      onClose();
    } catch { setError('Não foi possível arquivar a categoria.'); }
    finally { setLoading(false); }
  }
  async function remove() {
    if (!category) return;
    setLoading(true); setError('');
    try { await ledger.deleteCategory(category.id); notify({ message: 'Categoria excluída.', tone: 'success' }); onClose(); }
    catch { setError('A categoria possui dependências e não pode ser excluída. Arquive-a para preservar o histórico.'); }
    finally { setLoading(false); }
  }

  return <Dialog open={Boolean(category)} onClose={onClose} title="Arquivar ou excluir categoria"
    description={category ? `“${category.name}” deixará de aparecer em novos formulários.` : undefined}>
    <div className="transaction-form">
      {category?.dependencyCount ? <><FormMessage tone="hint">Há {category.dependencyCount.toLocaleString('pt-BR')} referência(s). Você pode preservá-las ou reatribuir os usos atuais antes de arquivar.</FormMessage>
        <Select label="Reatribuir para (opcional)" value={replacement} placeholder="Preservar categoria no histórico" options={replacements} onChange={event => setReplacement(event.target.value)} /></>
        : <FormMessage tone="hint">Esta categoria nunca foi utilizada e também pode ser excluída definitivamente.</FormMessage>}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="transaction-form__actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button>
        {!category?.dependencyCount && <Button variant="danger" loading={loading} onClick={() => void remove()}><Icon icon={DeleteIcon} size="sm"/>Excluir definitivamente</Button>}
        <Button loading={loading} onClick={() => void archive()}><Icon icon={ArchiveIcon} size="sm"/>Arquivar</Button>
      </div>
    </div>
  </Dialog>;
}

export function CategoriesPage({ ledger, headerAction }: PageProps) {
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);
  const categories = ledger?.data?.categories ?? [];
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return normalized ? categories.filter(category => category.name.toLocaleLowerCase('pt-BR').includes(normalized)) : categories;
  }, [categories, query]);

  if (!ledger) return <div className="template-page"><div className="template-heading"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Categorias</h1><p className="muted">A gestão de categorias fica disponível no modo autenticado.</p></div><div className="template-heading__actions">{headerAction}</div></div></div>;

  const custom = categories.filter(category => category.type === 'custom' && !category.archivedAt);
  const columns: DataTableColumn<Category>[] = [
    { key: 'name', header: 'Categoria', headerIcon: CategoriesIcon, cell: category => <CategoryIdentity category={category} /> },
    { key: 'applicability', header: 'Aplicação', cell: category => <Badge>{applicabilityLabels[category.applicability]}</Badge> },
    { key: 'type', header: 'Origem', cell: category => <Badge tone={category.type === 'system' ? 'neutral' : 'income'}>{category.type === 'system' ? 'Estrutural' : 'Personalizada'}</Badge> },
    { key: 'status', header: 'Estado', cell: category => <Badge tone={category.archivedAt ? 'expense' : 'neutral'}>{category.archivedAt ? 'Arquivada' : 'Ativa'}</Badge> },
    { key: 'dependencies', header: 'Referências', align: 'end', cell: category => category.dependencyCount.toLocaleString('pt-BR') },
    { key: 'actions', header: 'Ações', cell: category => category.type === 'system' ? <span className="muted">Protegida</span> : category.archivedAt ? <span className="muted">Somente histórico</span> : <div className="category-actions">
      <Button size="sm" variant="ghost" aria-label={`Mover ${category.name} para cima`} disabled={custom.findIndex(item => item.id === category.id) <= 0} onClick={() => void ledger.moveCategory(category.id, -1)}><Icon icon={MoveUpIcon} size="sm"/></Button>
      <Button size="sm" variant="ghost" aria-label={`Mover ${category.name} para baixo`} disabled={custom.findIndex(item => item.id === category.id) === custom.length - 1} onClick={() => void ledger.moveCategory(category.id, 1)}><Icon icon={MoveDownIcon} size="sm"/></Button>
      <Button size="sm" variant="ghost" aria-label={`Editar ${category.name}`} onClick={() => { setSelected(category); setEditorOpen(true); }}><Icon icon={EditIcon} size="sm"/></Button>
      <Button size="sm" variant="ghost" aria-label={`Arquivar ${category.name}`} onClick={() => setRemoving(category)}><Icon icon={ArchiveIcon} size="sm"/></Button>
    </div> }
  ];

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Categorias</h1><p className="muted">Gerencie categorias sem perder lançamentos, metas, regras ou histórico.</p></div><div className="template-heading__actions"><Button variant="secondary" onClick={() => { setSelected(null); setEditorOpen(true); }}><Icon icon={PlusIcon} size="sm"/>Nova categoria</Button>{headerAction}</div></div>
    <Card className="template-table-card"><div className="category-toolbar"><Input label="Buscar categorias" value={query} placeholder="Nome da categoria" onChange={event => setQuery(event.target.value)} /></div>
      <DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={6} columns={6} errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
        {rows.length ? <DataTable ariaLabel="Categorias financeiras" columns={columns} rows={rows} getRowKey={category => category.id} /> : <EmptyState title="Nenhuma categoria encontrada" description="Altere a busca e tente novamente." />}
      </DataState>
    </Card>
    <CategoryEditor key={selected?.id ?? 'new'} category={selected} open={editorOpen} onClose={() => setEditorOpen(false)} ledger={ledger}/>
    <CategoryRemoval key={removing?.id ?? 'none'} category={removing} onClose={() => setRemoving(null)} ledger={ledger}/>
  </div>;
}
