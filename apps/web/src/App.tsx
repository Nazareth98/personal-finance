import { BrandMark, Card } from '@personal-finance/ui';
import { AuthGate } from './auth/AuthGate';
import { createSupabaseClient, SupabaseAuthGateway } from './auth/supabase-auth';
import { DashboardApp } from './DashboardApp';
import { SupabaseLedgerRepository } from './ledger/supabase-ledger';
import { SupabaseConnectionsRepository } from './integrations/supabase-connections';

const demoMode = import.meta.env.MODE === 'test';
const supabase = demoMode ? null : createSupabaseClient();
const authGateway = supabase ? new SupabaseAuthGateway(supabase) : null;
const ledgerRepository = supabase ? new SupabaseLedgerRepository(supabase) : undefined;
const connectionsRepository = supabase ? new SupabaseConnectionsRepository(supabase) : undefined;

export default function App() {
  if (demoMode) return <DashboardApp />;

  if (!authGateway) return <main className="auth-page">
    <Card className="auth-card">
      <BrandMark size={40} className="brand-mark" />
      <h1>Configuração necessária</h1>
      <p className="auth-copy">Defina a URL e a chave pública do Supabase para habilitar o acesso.</p>
    </Card>
  </main>;

  return <AuthGate gateway={authGateway}>
    {(_, signOut) => <DashboardApp onSignOut={signOut} ledgerRepository={ledgerRepository} connectionsRepository={connectionsRepository} />}
  </AuthGate>;
}
