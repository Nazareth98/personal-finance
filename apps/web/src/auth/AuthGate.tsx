import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Card, FormMessage, Input } from '@personal-finance/ui';
import type { AuthGateway, AuthUser } from './contracts';
import { authErrorMessage } from './errors';

type Phase = 'checking' | 'login' | 'reset' | 'update-password' | 'authorized';

type AuthGateProps = {
  gateway: AuthGateway;
  children: (user: AuthUser, signOut: () => Promise<void>) => ReactNode;
};

export function AuthGate({ gateway, children }: AuthGateProps) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const authorize = useCallback(async (candidate: AuthUser) => {
    setPhase('checking');
    try {
      if (!await gateway.isOwner(candidate.id)) throw new Error('owner access required');
      setUser(candidate);
      setPhase('authorized');
    } catch (cause) {
      await gateway.signOut().catch(() => undefined);
      setUser(null);
      setError(authErrorMessage(cause));
      setPhase('login');
    }
  }, [gateway]);

  useEffect(() => {
    let active = true;
    const unsubscribe = gateway.subscribe((event, candidate) => {
      if (!active) return;
      if (event === 'password_recovery') {
        setError('');
        setPhase('update-password');
      } else if (event === 'signed_out') {
        setUser(null);
        setPhase('login');
      }
    });

    gateway.currentUser()
      .then(candidate => candidate ? authorize(candidate) : setPhase('login'))
      .catch(cause => {
        setError(authErrorMessage(cause));
        setPhase('login');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authorize, gateway]);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authorize(await gateway.signIn(email.trim(), password));
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await gateway.requestPasswordReset(email.trim(), window.location.origin);
      setMessage('Se o e-mail estiver autorizado, você receberá as instruções de recuperação.');
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 12 || password !== confirmation) {
      setError(password.length < 12 ? 'Use uma senha com pelo menos 12 caracteres.' : 'As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await gateway.updatePassword(password);
      const candidate = await gateway.currentUser();
      if (!candidate) throw new Error('authenticated user missing');
      await authorize(candidate);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await gateway.signOut();
    setUser(null);
    setPhase('login');
  }

  if (phase === 'checking') return <AuthLayout><p role="status">Verificando acesso…</p></AuthLayout>;
  if (phase === 'authorized' && user) return children(user, signOut);

  if (phase === 'update-password') return <AuthLayout>
    <h1>Defina uma nova senha</h1>
    <p className="auth-copy">Use pelo menos 12 caracteres e não reutilize sua senha bancária.</p>
    <form className="auth-form" onSubmit={submitPassword}>
      <Input label="Nova senha" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} />
      <Input label="Confirme a nova senha" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" loading={loading}>Salvar nova senha</Button>
    </form>
  </AuthLayout>;

  const resetting = phase === 'reset';
  return <AuthLayout>
    <h1>{resetting ? 'Recupere seu acesso' : 'Acesse suas finanças'}</h1>
    <p className="auth-copy">{resetting ? 'Enviaremos um link para o único e-mail autorizado.' : 'Entre com o e-mail e a senha do proprietário.'}</p>
    <form className="auth-form" onSubmit={resetting ? submitReset : submitLogin}>
      <Input label="E-mail" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
      {!resetting && <Input label="Senha" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {message && <FormMessage tone="success">{message}</FormMessage>}
      <Button type="submit" loading={loading}>{resetting ? 'Enviar instruções' : 'Entrar'}</Button>
      <Button variant="ghost" onClick={() => {
        setError('');
        setMessage('');
        setPhase(resetting ? 'login' : 'reset');
      }}>{resetting ? 'Voltar para o login' : 'Esqueci minha senha'}</Button>
    </form>
  </AuthLayout>;
}

function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="auth-page">
    <Card className="auth-card">
      <span className="auth-brand" aria-hidden="true">◈</span>
      {children}
    </Card>
  </main>;
}
