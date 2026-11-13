import { Card } from '@personal-finance/ui';
import { AuthGate } from './auth/AuthGate';
import { createAuthGateway } from './auth/supabase-auth';
import { DashboardApp } from './DashboardApp';

const demoMode = import.meta.env.MODE === 'test';
const authGateway = demoMode ? null : createAuthGateway();

export default function App() {
  if (demoMode) return <DashboardApp />;

  if (!authGateway) return <main className="auth-page">
    <Card className="auth-card">
      <span className="auth-brand" aria-hidden="true">◈</span>
      <h1>Configuração necessária</h1>
      <p className="auth-copy">Defina a URL e a chave pública do Supabase para habilitar o acesso.</p>
    </Card>
  </main>;

  return <AuthGate gateway={authGateway}>
    {(user, signOut) => <DashboardApp userEmail={user.email} onSignOut={signOut} />}
  </AuthGate>;
}
