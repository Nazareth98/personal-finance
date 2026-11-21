import type { ReactNode } from 'react';
import type { ConnectionsState } from '../integrations/useConnections';
import type { LedgerState } from '../ledger/useLedger';

export type PageProps = {
  ledger?: LedgerState;
  connections?: ConnectionsState;
  headerAction?: ReactNode;
  /** Conteúdo logo abaixo do título (ex.: Primeiros passos na Visão geral, D-067). */
  intro?: ReactNode;
};
