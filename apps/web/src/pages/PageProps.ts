import type { ReactNode } from 'react';
import type { ConnectionsState } from '../integrations/useConnections';
import type { LedgerState } from '../ledger/useLedger';

export type PageProps = {
  ledger?: LedgerState;
  connections?: ConnectionsState;
  headerAction?: ReactNode;
};
