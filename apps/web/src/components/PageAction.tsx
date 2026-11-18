import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Button, Icon, PlusIcon } from '@personal-finance/ui';

/** Lugar no cabeçalho do app (mobile) onde a ação principal da tela aparece (D-041). */
export const PageActionSlotContext = createContext<HTMLElement | null>(null);

/**
 * Ação principal de uma tela (D-039): botão primário com “+” no cabeçalho, sempre antes das ações
 * globais. Só uma por tela. Até 1000 px aparece compacta no cabeçalho do app, com `shortLabel`;
 * o CSS mostra só uma das duas cópias por vez.
 */
export function PageAction({ label, shortLabel, onClick, loading = false }: { label: string; shortLabel: string; onClick: () => void; loading?: boolean }) {
  const slot = useContext(PageActionSlotContext);
  return <>
    <Button className="page-action" loading={loading} onClick={onClick}><Icon icon={PlusIcon} size="sm" />{label}</Button>
    {slot && createPortal(<Button size="sm" className="page-action page-action--bar" aria-label={label} loading={loading} onClick={onClick}>
      <Icon icon={PlusIcon} size="sm" />{shortLabel}</Button>, slot)}
  </>;
}
