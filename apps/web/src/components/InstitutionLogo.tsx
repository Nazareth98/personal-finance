import { LogoAvatar } from '@personal-finance/ui';
import type { AccountInstitution } from '../ledger/contracts';

/** Ícones de instituição servidos pelo Pluggy por id de conector (o mesmo usado no Pluggy Connect). */
export const institutionLogoUrl = (connectorId: number) => `https://cdn.pluggy.ai/assets/connector-icons/${connectorId}.svg`;

/** Logo do banco da conta (D-052); conta manual ou sem conector mostra o monograma do nome. */
export function InstitutionLogo({ accountId, accountName, institutions, size = 'md' }: {
  accountId: string; accountName: string; institutions?: readonly AccountInstitution[]; size?: 'sm' | 'md' | 'lg';
}) {
  const institution = institutions?.find(item => item.accountId === accountId);
  return <LogoAvatar name={institution?.name ?? accountName} size={size}
    {...(institution?.connectorId ? { src: institutionLogoUrl(institution.connectorId) } : {})} />;
}
