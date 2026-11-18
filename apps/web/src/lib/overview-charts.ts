import { addCompetenceMonths, cardStatementSummary, ledgerTotals, type CardInstallment, type CardStatement, type CardStatementEntry, type TransactionContract } from '@personal-finance/domain';
import type { CashFlowPoint, ColumnPoint, TrendPoint } from '@personal-finance/ui';
import { formatCompetence, formatCompetenceAxis } from './demo-transactions.ts';

/** Competências em ordem cronológica terminando em `end` (inclusive). */
export function competenceWindow(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addCompetenceMonths(end, index - count + 1));
}

/** Receitas e despesas por competência com os mesmos totais do livro. */
export function cashFlowSeries(transactions: readonly TransactionContract[], months: readonly string[]): CashFlowPoint[] {
  return months.map(month => {
    const totals = ledgerTotals(transactions.filter(row => row.competence === month));
    return { label: formatCompetence(month), axisLabel: formatCompetenceAxis(month), incomeCents: totals.incomeCents, expenseCents: totals.expenseCents };
  });
}

/** Resultado acumulado dentro da janela, começando do zero no primeiro mês. */
export function cumulativeResultSeries(flow: readonly CashFlowPoint[]): TrendPoint[] {
  let running = 0n;
  return flow.map(point => {
    running += point.incomeCents - point.expenseCents;
    return { label: point.label, valueCents: running };
  });
}

/**
 * Compromissos de cartão por competência de vencimento: compras menos estornos das faturas
 * já registradas mais parcelas futuras projetadas. Meses após `period` são marcados como previstos.
 */
export function cardCommitmentSeries(input: {
  statements: readonly CardStatement[];
  entries: readonly CardStatementEntry[];
  transactions: readonly TransactionContract[];
  installments: readonly CardInstallment[];
  months: readonly string[];
  period: string;
}): (ColumnPoint & { competence: string })[] {
  return input.months.map(month => {
    const statementCents = input.statements.filter(statement => statement.competence === month).reduce((sum, statement) => {
      const summary = cardStatementSummary(statement, input.entries, input.transactions);
      return sum + (summary.purchasesCents > summary.refundsCents ? summary.purchasesCents - summary.refundsCents : 0n);
    }, 0n);
    const projectedCents = input.installments
      .filter(installment => installment.status === 'projected' && installment.dueCompetence === month)
      .reduce((sum, installment) => sum + installment.amountCents, 0n);
    return { competence: month, label: formatCompetence(month), axisLabel: formatCompetenceAxis(month), valueCents: statementCents + projectedCents,
      projected: month > input.period, current: month === input.period };
  });
}
