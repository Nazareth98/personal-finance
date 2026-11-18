import { Button, Icon, PlusIcon } from '@personal-finance/ui';

/**
 * Ação principal de uma tela (D-039): botão primário com “+” no cabeçalho, sempre antes das ações
 * globais. Só uma por tela; ações secundárias ficam no conteúdo.
 */
export function PageAction({ label, onClick, loading = false }: { label: string; onClick: () => void; loading?: boolean }) {
  return <Button className="page-action" loading={loading} onClick={onClick}><Icon icon={PlusIcon} size="sm" />{label}</Button>;
}
