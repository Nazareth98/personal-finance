import { BrandIcon, Card, Icon } from '@personal-finance/ui';
import { AuthGate } from './auth/AuthGate';
import { createSupabaseClient, SupabaseAuthGateway } from './auth/supabase-auth';
import { DashboardApp } from './DashboardApp';
import { SupabaseLedgerRepository } from './ledger/supabase-ledger';

const demoMode = import.meta.env.MODE === 'test';
const supabase = demoMode ? null : createSupabaseClient();
const authGateway = supabase ? new SupabaseAuthGateway(supabase) : null;
const ledgerRepository = supabase ? new SupabaseLedgerRepository(supabase) : undefined;

export default function App() {
  if (demoMode) return <DashboardApp />;

  if (!authGateway) return <main className="auth-page">
    <Card className="auth-card">
      <Icon icon={BrandIcon} size="lg" className="auth-brand" />
      <h1>Configuração necessária</h1>
      <p className="auth-copy">Defina a URL e a chave pública do Supabase para habilitar o acesso.</p>
    </Card>
  </main>;

  return <AuthGate gateway={authGateway}>
    {(user, signOut) => <DashboardApp userEmail={user.email} onSignOut={signOut} ledgerRepository={ledgerRepository} />}
  </AuthGate>;
}
