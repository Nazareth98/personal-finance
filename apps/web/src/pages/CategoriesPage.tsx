import { useMemo, useState, type FormEvent } from 'react';
import type { Category, CategoryColorKey, CategoryIconKey } from '@personal-finance/domain';
import { ArchiveIcon, Badge, Button, Card, CategoriesIcon, DataState, DataTable, DeleteIcon, Dialog, EditIcon, EmptyState, FormMessage, Icon, Input, MoveDownIcon, MoveUpIcon, RadioGroup, Select, StatusOkIcon, useToast, VisualSelect, type DataTableColumn } from '@personal-finance/ui';
import { CategoryIdentity, CategoryIdentityIcon, categoryColors, categoryIcons } from '../components/CategoryIdentity';
import type { LedgerState } from '../ledger/useLedger';
import type { PageProps } from './PageProps';
import { PageAction } from '../components/PageAction';
import { buildCategoryPanels, type CategoryFilter, type CategoryRowView } from '../lib/category-panels';
import { formatCentsBRL, formatCompetence } from '../lib/demo-transactions';

const applicabilityLabels: Record<Category['applicability'], string> = {
  income: 'Receita', expense: 'Despesa', neutral: 'Movimento neutro'
};

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

const pad = (value: number) => String(value).padStart(2, '0');
const currentMonth = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`; };
const filterOptions: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Todas' }, { value: 'expense', label: 'Despesas' }, { value: 'income', label: 'Receitas' }, { value: 'neutral', label: 'Neutras' }
];
const STRUCTURAL_PREVIEW = 6;

function formatPercent(basisPoints: number) {
  const decimals = basisPoints % 100;
  return `${Math.trunc(basisPoints / 100)}${decimals ? `,${String(decimals).padStart(2, '0')}` : ''}%`;
}

export function CategoriesPage({ ledger, headerAction }: PageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [showAllSystem, setShowAllSystem] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [removing, setRemoving] = useState<Category | null>(null);
  const month = currentMonth();
  const panels = useMemo(() => buildCategoryPanels({
    categories: ledger?.data?.categories ?? [], budgets: ledger?.data?.budgets ?? [], transactions: ledger?.data?.transactions ?? [], month, filter, query
  }), [ledger?.data, month, filter, query]);

  if (!ledger) return <div className="template-page"><div className="template-heading"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Categorias</h1><p className="muted">A gestão de categorias fica disponível no modo autenticado.</p></div><div className="template-heading__actions">{headerAction}</div></div></div>;

  const custom = panels.custom.map(row => row.category);
  const columns = (kind: 'custom' | 'system' | 'archived'): DataTableColumn<CategoryRowView>[] => [
    { mobile: 'primary', key: 'name', header: 'Categoria', headerIcon: CategoriesIcon, sortable: true, sortValue: row => row.category.name, cell: row => <CategoryIdentity category={row.category} /> },
    { mobile: 'detail', key: 'applicability', header: 'Aplicação', sortable: true, sortValue: row => applicabilityLabels[row.category.applicability], cell: row => <Badge>{applicabilityLabels[row.category.applicability]}</Badge> },
    { mobile: 'value', key: 'month', header: `Em ${formatCompetence(month)}`, align: 'end', sortable: true, sortValue: row => row.monthCents,
      cell: row => row.monthCents > 0n
        ? <a href={`#transactions?period=${month}&category=${row.category.id}`}>{row.category.applicability === 'income' ? '+ ' : row.category.applicability === 'expense' ? '− ' : ''}{formatCentsBRL(row.monthCents)}</a>
        : <span className="muted" title={row.idle ? 'Sem lançamentos nas últimas 6 competências' : undefined}>{row.idle ? 'Sem uso' : '—'}</span> },
    { mobile: 'detail', key: 'budget', header: 'Meta', cell: row => row.budgetBasisPoints ? <Badge tone="transfer">Meta {formatPercent(row.budgetBasisPoints)}</Badge> : <span className="muted">—</span> },
    { mobile: 'footer', key: 'actions', header: 'Ações', align: 'end', cell: row => {
      const category = row.category;
      if (kind === 'system') return <span className="muted">Protegida</span>;
      if (kind === 'archived') return <span className="muted">Somente histórico</span>;
      const index = custom.findIndex(item => item.id === category.id);
      return <div className="category-actions">
        <Button size="sm" variant="ghost" aria-label={`Mover ${category.name} para cima`} disabled={index <= 0 || Boolean(query) || filter !== 'all'} onClick={() => void ledger.moveCategory(category.id, -1)}><Icon icon={MoveUpIcon} size="sm"/></Button>
        <Button size="sm" variant="ghost" aria-label={`Mover ${category.name} para baixo`} disabled={index === custom.length - 1 || Boolean(query) || filter !== 'all'} onClick={() => void ledger.moveCategory(category.id, 1)}><Icon icon={MoveDownIcon} size="sm"/></Button>
        <Button size="sm" variant="ghost" aria-label={`Editar ${category.name}`} onClick={() => { setSelected(category); setEditorOpen(true); }}><Icon icon={EditIcon} size="sm"/></Button>
        <Button size="sm" variant="ghost" aria-label={`Arquivar ${category.name}`} onClick={() => setRemoving(category)}><Icon icon={ArchiveIcon} size="sm"/></Button>
      </div>;
    } }
  ];
  const systemRows = showAllSystem || query || filter !== 'all' ? panels.system : panels.system.slice(0, STRUCTURAL_PREVIEW);
  const empty = panels.custom.length + panels.system.length + panels.archived.length === 0;

  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">ORGANIZAÇÃO</p><h1>Categorias</h1><p className="muted">Gerencie categorias sem perder lançamentos, metas, regras ou histórico.</p></div>
      <div className="template-heading__actions"><PageAction label="Nova categoria" onClick={() => { setSelected(null); setEditorOpen(true); }} />{headerAction}</div></div>
    <section className="summary-strip" aria-label="Resumo das categorias">
      <div><span className="muted">Ativas</span><strong>{panels.activeCount}</strong><span className="muted">{panels.activeCount - panels.customCount} estruturais · {panels.customCount} personalizadas</span></div>
      <div><span className="muted">Com meta</span><strong>{panels.budgetedCount}</strong><span className="muted">Tetos em Orçamentos</span></div>
      <div><span className="muted">Despesas em {formatCompetence(month)}</span><strong>{panels.expenseCents > 0n ? `− ${formatCentsBRL(panels.expenseCents)}` : formatCentsBRL(0n)}</strong><span className="muted">Confirmadas ou automáticas</span></div>
      <div><span className="muted">Sem uso em 6 meses</span><strong>{panels.idleCount}</strong><span className={panels.idleCount ? 'status-tone--approaching' : 'muted'}>{panels.idleCount ? 'Candidatas a arquivar' : 'Todas em uso'}</span></div>
    </section>
    <div className="category-filters">
      <Input label="Buscar categorias" value={query} placeholder="Nome da categoria" onChange={event => setQuery(event.target.value)} />
      <div className="budget-period-kind" role="group" aria-label="Aplicação">
        {filterOptions.map(option => <Button key={option.value} size="sm" variant={filter === option.value ? 'secondary' : 'ghost'} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>{option.label}</Button>)}
      </div>
    </div>
    <DataState status={ledger.status === 'idle' ? 'loading' : ledger.status} kind="table" rows={6} columns={5} errorDescription={ledger.error} onRetry={() => void ledger.reload()}>
      {empty ? <EmptyState title="Nenhuma categoria encontrada" description="Altere a busca ou o filtro e tente novamente." /> : <>
        {panels.custom.length > 0 && <section className="status-group" aria-labelledby="categories-custom">
          <h2 id="categories-custom" className="status-group__title status-tone--within"><Icon icon={EditIcon} size="sm" />Personalizadas<span className="muted"> · {panels.custom.length}</span></h2>
          <Card className="template-table-card"><DataTable ariaLabel="Categorias personalizadas" columns={columns('custom')} rows={panels.custom} getRowKey={row => row.category.id} /></Card>
        </section>}
        {panels.system.length > 0 && <section className="status-group" aria-labelledby="categories-system">
          <h2 id="categories-system" className="status-group__title status-tone--within"><Icon icon={StatusOkIcon} size="sm" />Estruturais<span className="muted"> · {panels.system.length}</span></h2>
          <Card className="template-table-card"><DataTable ariaLabel="Categorias estruturais" columns={columns('system')} rows={systemRows} getRowKey={row => row.category.id} />
            {systemRows.length < panels.system.length && <div className="category-more"><Button variant="ghost" size="sm" onClick={() => setShowAllSystem(true)}>Ver as {panels.system.length} estruturais</Button></div>}
          </Card>
        </section>}
        {panels.archived.length > 0 && <section className="status-group" aria-labelledby="categories-archived">
          <h2 id="categories-archived" className="status-group__title status-tone--within"><Icon icon={ArchiveIcon} size="sm" />Arquivadas<span className="muted"> · {panels.archived.length}</span></h2>
          <Card className="template-table-card"><DataTable ariaLabel="Categorias arquivadas" columns={columns('archived')} rows={panels.archived} getRowKey={row => row.category.id} /></Card>
        </section>}
      </>}
    </DataState>
    <CategoryEditor key={selected?.id ?? 'new'} category={selected} open={editorOpen} onClose={() => setEditorOpen(false)} ledger={ledger}/>
    <CategoryRemoval key={removing?.id ?? 'none'} category={removing} onClose={() => setRemoving(null)} ledger={ledger}/>
  </div>;
}
