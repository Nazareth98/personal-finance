import { useEffect, useId, useState, type FormEvent } from 'react';
import { fixedItemLastValue, normalizeClassificationText, similarWithoutFixed, suggestFixedItemName, type TransactionContract } from '@personal-finance/domain';
import { Button, CategoryRepeatIcon, Checkbox, CloseIcon, Dialog, FormMessage, Input, PlusIcon, RadioGroup, Select, VisualSelect, useToast, type VisualSelectOption } from '@personal-finance/ui';
import type { SemanticConfirmation } from '../ledger/contracts';
import type { LedgerState } from '../ledger/useLedger';
import { formatCentsBRL, formatCompetence, formatDateTime, formatLocalDate } from '../lib/demo-transactions';
import { statementChoices } from '../lib/statement-choices';
import { MAX_BULK_CONFIRMATIONS, similarTransactions } from '../lib/similar-transactions';
import { InstitutionLogo } from './InstitutionLogo';
import { OptionTile, accountOption, categoryOption, savingsBoxOption, transactionOption } from './visual-options';
import { natureHints } from '../lib/help-content';

type ReviewNature = SemanticConfirmation['nature'];

const natureLabels: Record<ReviewNature, string> = {
  income: 'Receita', expense: 'Despesa', own_transfer: 'Transferência entre contas próprias',
  card_payment: 'Pagamento de fatura', savings_contribution: 'Aporte em caixinha', savings_withdrawal: 'Resgate de caixinha'
};

function daysApart(first: string, second: string): number {
  const utc = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.abs(utc(first) - utc(second)) / 86_400_000;
}

export function ClassificationReviewForm({ transaction, onClose, ledger }: {
  transaction: TransactionContract | null;
  onClose: () => void;
  ledger: LedgerState;
}) {
  const [nature, setNature] = useState<ReviewNature>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [relationId, setRelationId] = useState('');
  const [scope, setScope] = useState<'one' | 'similar'>('one');
  const [includeConfirmed, setIncludeConfirmed] = useState(false);
  const [error, setError] = useState('');
  /** D-084: '' = não é fixo; 'new' = criar; senão o id do fixo. */
  const [fixedChoice, setFixedChoice] = useState('');
  const [fixedName, setFixedName] = useState('');
  const [linkSimilarFixed, setLinkSimilarFixed] = useState(true);
  const [loading, setLoading] = useState(false);
  const formId = useId();
  const { notify } = useToast();
  const data = ledger.data;
  const semanticOverride = data?.semanticOverrides.find(item => item.transactionId === transaction?.id);

  useEffect(() => {
    if (!transaction) return;
    setNature(transaction.nature as ReviewNature);
    setCategoryId(transaction.categoryId ?? '');
    const link = data?.links.find(item => item.type === 'own_transfer'
      && (item.sourceTransactionId === transaction.id || item.targetTransactionId === transaction.id));
    const payment = data?.cardStatementEntries.find(item => item.type === 'payment' && item.transactionId === transaction.id);
    const movement = data?.savingsMovements.find(item => item.transactionId === transaction.id);
    const counterpartId = semanticOverride?.counterpartTransactionId
      ?? (link ? (link.sourceTransactionId === transaction.id ? link.targetTransactionId : link.sourceTransactionId) : undefined);
    const counterpart = data?.transactions.find(item => item.id === counterpartId);
    setRelationId(counterpart
      ? (counterpart.source === 'manual' ? `account:${counterpart.accountId}` : `transaction:${counterpart.id}`)
      : semanticOverride?.statementId ?? semanticOverride?.savingsBoxId ?? payment?.statementId ?? movement?.savingsBoxId ?? '');
    setError('');
    const key = normalizeClassificationText(transaction.description);
    const linkedFixed = data?.fixedItemLinks?.find(item => item.transactionId === transaction.id)?.fixedItemId;
    const suggestedFixed = data?.fixedItems?.find(item => !item.endedAt && item.matchKey === key && item.nature === transaction.nature)?.id;
    setFixedChoice(linkedFixed ?? suggestedFixed ?? '');
    setFixedName(suggestFixedItemName(transaction.description));
    setLinkSimilarFixed(true);
  }, [data, semanticOverride, transaction]);
  useEffect(() => { setScope('one'); setIncludeConfirmed(false); }, [transaction?.id]);

  const natureOptions = transaction
    ? (transaction.amountCents < 0n
      ? ['expense', 'own_transfer', 'card_payment', 'savings_contribution']
      : ['income', 'own_transfer', 'savings_withdrawal'])
      .map(value => ({ value, label: natureLabels[value as ReviewNature] }))
    : [];
  const categoryOptions = (data?.categories ?? [])
    .filter(category => !category.archivedAt && category.applicability === nature)
    .map(categoryOption);
  const counterpartOptions = transaction ? (data?.transactions ?? []).filter(candidate =>
    candidate.id !== transaction.id && candidate.source === 'pluggy' && candidate.accountId !== transaction.accountId
    && candidate.amountCents + transaction.amountCents === 0n && daysApart(candidate.eventDate, transaction.eventDate) <= 3
  ).map(candidate => ({ ...transactionOption(candidate, data?.accounts ?? [], data?.institutions, `transaction:${candidate.id}`), group: 'Lançamento importado' })) : [];
  // Conta conectada receberá o próprio lado pela importação; registrar outro duplicaria o saldo.
  const connectedAccountIds = new Set((data?.transactions ?? []).filter(item => item.source === 'pluggy').map(item => item.accountId));
  const counterpartAccountOptions = transaction ? (data?.accounts ?? []).filter(account =>
    account.id !== transaction.accountId && account.type !== 'credit_card' && !connectedAccountIds.has(account.id)
  ).map(account => ({ ...accountOption(account, data?.institutions, `Registrar ${transaction.amountCents < 0n ? 'entrada' : 'saída'} em ${account.name}`),
    value: `account:${account.id}`, group: 'Conta sem importação' })) : [];
  const categoryNames = new Map((data?.categories ?? []).map(category => [category.id, category.name]));
  const accountNames = new Map((data?.accounts ?? []).map(account => [account.id, account.name]));
  // D-060: só categoria em lote; vínculos (transferência, fatura, caixinha) dependem do par e seguem um a um.
  const similar = transaction && (nature === 'income' || nature === 'expense') && categoryId
    ? similarTransactions(transaction, data?.transactions ?? [], categoryId) : { unconfirmed: [], confirmed: [] };
  const bulkTargets = [...similar.unconfirmed, ...(includeConfirmed ? similar.confirmed : [])].slice(0, MAX_BULK_CONFIRMATIONS - 1);
  const hasSimilar = similar.unconfirmed.length + similar.confirmed.length > 0;
  const bulk = scope === 'similar' && hasSimilar && bulkTargets.length > 0;
  const previousVersions = (data?.reviewHistory ?? []).filter(item => item.transactionId === transaction?.id);
  // D-051: fatura nomeada pelo vencimento, com período de compras, valores e situação; sugerida primeiro.
  const choices = transaction && nature === 'card_payment' ? statementChoices({
    payment: transaction, statements: data?.cardStatements ?? [], entries: data?.cardStatementEntries ?? [],
    cards: data?.creditCards ?? [], transactions: data?.transactions ?? []
  }) : [];
  const shortDate = (date: string) => formatLocalDate(date).slice(0, 5);
  const statementOptions: VisualSelectOption[] = choices.map(choice => ({
    value: choice.statementId,
    label: `${data?.accounts.find(account => account.id === choice.accountId)?.name ?? 'Cartão'} · vence ${shortDate(choice.dueDate)}`,
    description: `Fatura de ${formatCompetence(choice.competence)} · compras de ${shortDate(choice.periodStart)} a ${shortDate(choice.closingDate)}`,
    aside: <><strong>{formatCentsBRL(choice.openCents)}</strong>{choice.status === 'paid' ? 'quitada' : `em aberto de ${formatCentsBRL(choice.totalCents)}`}</>,
    visual: <InstitutionLogo accountId={choice.accountId} accountName={data?.accounts.find(account => account.id === choice.accountId)?.name ?? 'Cartão'} institutions={data?.institutions} />,
    group: choice.suggested ? 'Sugerida' : choice.status === 'paid' ? 'Já pagas' : 'Em aberto',
    ...(choice.suggested ? { badge: { label: 'Mesmo valor', tone: 'accent' as const } }
      : choice.status === 'partial' ? { badge: { label: 'Parcial', tone: 'warning' as const } }
        : choice.status === 'paid' ? { badge: { label: 'Paga', tone: 'success' as const } } : {})
  }));
  const chosen = choices.find(choice => choice.statementId === relationId);
  const paymentAmount = transaction ? (transaction.amountCents < 0n ? -transaction.amountCents : transaction.amountCents) : 0n;
  const statementHint = chosen
    ? chosen.openCents === paymentAmount || chosen.totalCents === paymentAmount
      ? `Pendente após o vínculo: ${formatCentsBRL(chosen.openAfterCents)}.`
      : `O pagamento (${formatCentsBRL(paymentAmount)}) difere do em aberto (${formatCentsBRL(chosen.openCents)}). Pendente após o vínculo: ${formatCentsBRL(chosen.openAfterCents)}.`
    : 'A fatura leva o mês do vencimento. A sugerida tem o mesmo valor do pagamento.';
  const savingsOptions = (data?.savingsBoxes ?? []).map(savingsBoxOption);
  const relation = nature === 'own_transfer'
    ? { label: 'Outro lado da transferência', placeholder: 'Selecione o lançamento ou a conta de destino',
      options: [...counterpartOptions, ...counterpartAccountOptions] }
    : nature === 'card_payment'
      ? { label: 'Fatura paga', placeholder: 'Selecione a fatura', options: statementOptions }
      : nature === 'savings_contribution' || nature === 'savings_withdrawal'
        ? { label: 'Caixinha', placeholder: 'Selecione a caixinha', options: savingsOptions }
        : null;

  // Sem fatura escolhida, a sugerida única já vem marcada (o proprietário ainda confirma).
  const suggestedStatement = choices.filter(choice => choice.suggested);
  useEffect(() => {
    if (nature === 'card_payment' && !relationId && suggestedStatement.length === 1) setRelationId(suggestedStatement[0]!.statementId);
  }, [nature, relationId, suggestedStatement.length, suggestedStatement[0]?.statementId]);

  // D-084: lançamento fixo (receita ou despesa). Só aparece quando a instância já tem a estrutura de fixos.
  const fixedAvailable = Boolean(data?.fixedItems) && (nature === 'income' || nature === 'expense');
  const currentFixed = transaction ? data?.fixedItemLinks?.find(item => item.transactionId === transaction.id)?.fixedItemId ?? '' : '';
  const fixedKey = transaction ? normalizeClassificationText(transaction.description) : '';
  const similarFixed = transaction && fixedAvailable ? similarWithoutFixed(transaction, data?.transactions ?? [], data?.fixedItemLinks ?? [])
    .filter(item => (nature === 'income') === (item.amountCents > 0n)) : [];
  const fixedOptions: VisualSelectOption[] = fixedAvailable ? [
    { value: '', label: 'Não é fixo', visual: <OptionTile icon={CloseIcon} /> },
    ...(data?.fixedItems ?? []).filter(item => !item.endedAt && item.nature === nature)
      .sort((a, b) => Number(b.matchKey === fixedKey) - Number(a.matchKey === fixedKey)
        || Number(b.categoryId === categoryId) - Number(a.categoryId === categoryId) || a.name.localeCompare(b.name, 'pt-BR'))
      .map(item => {
        const last = fixedItemLastValue(item.id, data?.fixedItemLinks ?? [], data?.transactions ?? []);
        return { value: item.id, label: item.name, visual: <OptionTile icon={CategoryRepeatIcon} />,
          description: last.competence ? `Último: ${formatCentsBRL(last.cents)} em ${formatCompetence(last.competence)}` : 'Sem lançamentos ainda',
          ...(item.matchKey === fixedKey ? { badge: { label: 'Sugerido', tone: 'accent' as const } } : {}),
          group: item.categoryId === categoryId ? 'Fixos desta categoria' : 'Outros fixos' };
      }),
    { value: 'new', label: `Criar fixo “${fixedName.trim() || 'Novo fixo'}”`, visual: <OptionTile icon={PlusIcon} />,
      description: 'O valor deste lançamento vira a previsão dos próximos meses', group: 'Novo' }
  ] : [];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!transaction) return;
    if ((nature === 'income' || nature === 'expense') && !categoryId) {
      setError('Selecione a categoria confirmada.'); return;
    }
    if (fixedAvailable && fixedChoice === 'new' && fixedName.trim().length < 2) {
      setError('Dê um nome ao fixo com pelo menos 2 letras.'); return;
    }
    if (relation && !relationId) {
      setError(`Selecione ${nature === 'own_transfer' ? 'o outro lado da transferência' : nature === 'card_payment' ? 'a fatura' : 'a caixinha'}.`); return;
    }
    setLoading(true);
    setError('');
    try {
      if ((nature !== 'income' && nature !== 'expense') || nature !== transaction.nature) {
        await ledger.confirmTransactionSemantics({
          transactionId: transaction.id, nature,
          ...(nature === 'own_transfer' && relationId.startsWith('transaction:') ? { counterpartTransactionId: relationId.slice('transaction:'.length) } : {}),
          ...(nature === 'own_transfer' && relationId.startsWith('account:') ? { counterpartAccountId: relationId.slice('account:'.length) } : {}),
          ...(nature === 'card_payment' ? { statementId: relationId } : {}),
          ...(nature === 'savings_contribution' || nature === 'savings_withdrawal' ? { savingsBoxId: relationId } : {})
        });
      }
      if (nature === 'income' || nature === 'expense') {
        await ledger.confirmClassification({ transactionId: transaction.id, categoryId,
          ...(bulk ? { similarTransactionIds: bulkTargets.map(item => item.id) } : {}) });
      }
      let fixedMessage = '';
      if (fixedAvailable) {
        if (fixedChoice === 'new') {
          const linked = await ledger.createFixedItem({ transactionId: transaction.id, name: fixedName.trim(), categoryId, linkSimilar: linkSimilarFixed && similarFixed.length > 0 });
          fixedMessage = ` Fixo “${fixedName.trim()}” criado${linked ? ` com mais ${linked} ${linked === 1 ? 'lançamento' : 'lançamentos'}` : ''}.`;
        } else if (fixedChoice && (fixedChoice !== currentFixed || (linkSimilarFixed && similarFixed.length > 0))) {
          await ledger.setTransactionFixedItem(transaction.id, fixedChoice, linkSimilarFixed && similarFixed.length > 0);
          fixedMessage = ' Vinculado ao fixo.';
        } else if (!fixedChoice && currentFixed) {
          await ledger.setTransactionFixedItem(transaction.id, null, false);
          fixedMessage = ' Desvinculado do fixo.';
        }
      }
      notify({ message: (bulk
        ? `Categoria confirmada em ${bulkTargets.length + 1} lançamentos.`
        : nature === 'income' || nature === 'expense'
        ? 'Revisão confirmada e alias aprendido.'
        : 'Natureza e vínculo confirmados.') + fixedMessage, tone: 'success' });
      onClose();
    } catch {
      setError('Não foi possível confirmar a revisão. Confira o vínculo e tente novamente.');
    } finally { setLoading(false); }
  }

  return <Dialog open={Boolean(transaction)} onClose={onClose} title="Revisar lançamento"
    description={transaction ? `Defina o efeito financeiro de “${transaction.description}”. O registro importado não será alterado.` : undefined}
    footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" form={formId} loading={loading}>{bulk ? `Confirmar em ${bulkTargets.length + 1} lançamentos` : 'Confirmar revisão'}</Button></>}>
    <form id={formId} className="transaction-form" noValidate onSubmit={submit}>
      <Select label="Natureza financeira" value={nature} options={natureOptions} required hint={natureHints[nature] ?? 'O que aconteceu com esse dinheiro?'}
        onChange={event => { setNature(event.target.value as ReviewNature); setCategoryId(''); setRelationId(''); setError(''); }} />
      {(nature === 'income' || nature === 'expense') && <VisualSelect label="Categoria confirmada" value={categoryId}
        options={categoryOptions} searchable={categoryOptions.length > 8} required onChange={setCategoryId} />}
      {fixedAvailable && <VisualSelect label="Lançamento fixo" value={fixedChoice} options={fixedOptions} searchable={fixedOptions.length > 8}
        hint="Fixo é o lançamento que se repete todo mês, mesmo com valor diferente. A previsão usa o valor do último mês completo."
        onChange={value => { setFixedChoice(value); setError(''); }} />}
      {fixedAvailable && fixedChoice === 'new' && <Input label="Nome do fixo" value={fixedName} required maxLength={80}
        onChange={event => setFixedName(event.target.value)} />}
      {fixedAvailable && fixedChoice && similarFixed.length > 0 && <Checkbox checked={linkSimilarFixed} onChange={event => setLinkSimilarFixed(event.target.checked)}
        label={`Vincular também ${similarFixed.length === 1 ? 'o lançamento igual' : `os ${similarFixed.length} lançamentos iguais`} sem fixo`} />}
      {relation && nature === 'card_payment'
        ? <VisualSelect label={relation.label} value={relationId} placeholder={relation.placeholder} options={statementOptions}
          required hint={statementHint} onChange={setRelationId} />
        : relation && <VisualSelect label={relation.label} value={relationId} placeholder={relation.placeholder}
          options={relation.options} searchable={relation.options.length > 8} required onChange={setRelationId} />}
      {hasSimilar && <div className="review-scope">
        <RadioGroup legend="Aplicar a" name={`${formId}-scope`} value={scope} onChange={value => setScope(value as 'one' | 'similar')}
          options={[{ value: 'one', label: 'Só este lançamento' },
            { value: 'similar', label: `Este e os iguais (${similar.unconfirmed.length + similar.confirmed.length})` }]}
          hint={scope === 'one'
            ? similar.unconfirmed.length
              ? `Os ${similar.unconfirmed.length} iguais ainda não confirmados recebem a categoria como sugestão automática.`
              : 'Os iguais que você já confirmou não mudam.'
            : 'Mesma descrição, em qualquer conta. Todos ficam confirmados por você.'} />
        {scope === 'similar' && similar.confirmed.length > 0 && <Checkbox checked={includeConfirmed} onChange={event => setIncludeConfirmed(event.target.checked)}
          label={`Incluir ${similar.confirmed.length === 1 ? 'o que' : `os ${similar.confirmed.length} que`} você já confirmou em outra categoria`} />}
        {bulk && <section className="review-scope__preview" aria-label="O que vai mudar">
          <p className="muted">O que vai mudar · {bulkTargets.length + 1} lançamentos</p>
          <ul>{[transaction!, ...bulkTargets].map(item => <li key={item.id}>
            <span className="muted">{formatLocalDate(item.eventDate)}</span>
            <span>{accountNames.get(item.accountId) ?? 'Conta'} · {item.categoryId ? categoryNames.get(item.categoryId) ?? 'Categoria removida' : 'Sem categoria'} → <strong>{categoryNames.get(categoryId) ?? 'Categoria'}</strong>
              {item.classificationStatus === 'confirmed' ? <span className="muted"> · confirmado por você</span> : null}</span>
            <span className="review-scope__amount">{formatCentsBRL(item.amountCents < 0n ? -item.amountCents : item.amountCents)}</span>
          </li>)}</ul>
        </section>}
      </div>}
      {previousVersions.length > 0 && <section className="review-versions" aria-label="Versões anteriores">
        <p className="muted">Versões anteriores ({previousVersions.length}) — preservadas ao confirmar uma nova revisão.</p>
        <ul>{previousVersions.map(item => <li key={item.id}>
          {formatDateTime(item.supersededAt)} · {item.type === 'semantics'
            ? `Natureza: ${item.nature ? natureLabels[item.nature] : 'Não informada'}`
            : `Categoria: ${item.categoryId ? categoryNames.get(item.categoryId) ?? 'Categoria removida' : 'Sem categoria'}`}
        </li>)}</ul>
      </section>}
      {error && <FormMessage tone="error">{error}</FormMessage>}    </form>
  </Dialog>;
}
