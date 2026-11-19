import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from './Icon';

export type PaginationProps = { page: number; pageSize: number; totalItems: number; onPageChange: (page: number) => void };

/** Páginas visíveis: primeira, última e vizinhas da atual; o resto vira reticências (D-043). */
export function pageItems(current: number, pages: number): (number | 'gap')[] {
  const wanted = new Set([1, pages, current - 1, current, current + 1].filter(page => page >= 1 && page <= pages));
  if (current <= 3) [2, 3, 4].forEach(page => page <= pages && wanted.add(page));
  if (current >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach(page => page >= 1 && wanted.add(page));
  const sorted = [...wanted].sort((a, b) => a - b), items: (number | 'gap')[] = [];
  sorted.forEach((page, index) => { if (index && page - sorted[index - 1]! > 1) items.push('gap'); items.push(page); });
  return items;
}

export function Pagination({ page, pageSize, totalItems, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(totalItems / pageSize)), current = Math.min(Math.max(1, page), pages);
  const start = totalItems === 0 ? 0 : (current - 1) * pageSize + 1, end = Math.min(totalItems, current * pageSize);
  const count = new Intl.NumberFormat('pt-BR');
  return <nav className="ui-pagination" aria-label="Paginação">
    <span className="ui-pagination__summary" aria-live="polite">
      <strong>{count.format(start)}–{count.format(end)}</strong> de {count.format(totalItems)}
      <span className="ui-pagination__sr"> registros · Página {current} de {pages}</span>
    </span>
    <div className="ui-pagination__actions">
      <button type="button" className="ui-pagination__step" aria-label="Página anterior" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
        <Icon icon={ChevronLeft} size="sm" /><span className="ui-pagination__step-label">Anterior</span>
      </button>
      <ol className="ui-pagination__pages">
        {pageItems(current, pages).map((item, index) => item === 'gap'
          ? <li key={`gap-${index}`} className="ui-pagination__gap" aria-hidden="true">…</li>
          : <li key={item}><button type="button" className="ui-pagination__page" aria-label={`Página ${item}`}
            aria-current={item === current ? 'page' : undefined} onClick={() => item !== current && onPageChange(item)}>{item}</button></li>)}
      </ol>
      <span className="ui-pagination__compact" aria-hidden="true">{current} / {pages}</span>
      <button type="button" className="ui-pagination__step" aria-label="Próxima página" disabled={current >= pages} onClick={() => onPageChange(current + 1)}>
        <span className="ui-pagination__step-label">Próxima</span><Icon icon={ChevronRight} size="sm" />
      </button>
    </div>
  </nav>;
}
