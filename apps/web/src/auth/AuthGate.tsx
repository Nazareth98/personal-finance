import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { AccountsIcon, Button, CardsIcon, FormMessage, HideIcon, Icon, Input, LockIcon, MailIcon, SavingsIcon, ShowIcon, StatusOkIcon } from '@personal-finance/ui';
import { BootSplash } from '../components/BootSplash';
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
  const [showPassword, setShowPassword] = useState(false);
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

  if (phase === 'checking') return <BootSplash />;
  if (phase === 'authorized' && user) return children(user, signOut);

  if (phase === 'update-password') return <AuthLayout title="Defina uma nova senha" description="Use pelo menos 12 caracteres e não reutilize sua senha bancária.">
    <form className="auth-form" onSubmit={submitPassword}>
      <Input label="Nova senha" type="password" autoComplete="new-password" leadingIcon={LockIcon} value={password} onChange={event => setPassword(event.target.value)} />
      <Input label="Confirme a nova senha" type="password" autoComplete="new-password" leadingIcon={LockIcon} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <Button type="submit" size="lg" loading={loading}>Salvar nova senha</Button>
    </form>
  </AuthLayout>;

  const resetting = phase === 'reset';
  const switchPhase = () => { setError(''); setMessage(''); setPhase(resetting ? 'login' : 'reset'); };
  return <AuthLayout title={resetting ? 'Recupere seu acesso' : 'Entrar'}
    description={resetting ? 'Enviaremos um link para o único e-mail autorizado.' : 'Use o e-mail e a senha do proprietário.'}>
    <form key={phase} className="auth-form" onSubmit={resetting ? submitReset : submitLogin}>
      <Input label="E-mail" type="email" autoComplete="email" required leadingIcon={MailIcon} value={email} onChange={event => setEmail(event.target.value)} />
      {!resetting && <div className="auth-password">
        <Input label="Senha" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required leadingIcon={LockIcon}
          value={password} onChange={event => setPassword(event.target.value)}
          trailing={<Button variant="ghost" size="sm" className="auth-reveal" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword}
            onClick={() => setShowPassword(value => !value)}><Icon icon={showPassword ? HideIcon : ShowIcon} size="sm" /></Button>} />
        <button type="button" className="auth-link auth-link--end" onClick={switchPhase}>Esqueci minha senha</button>
      </div>}
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {message && <FormMessage tone="success">{message}</FormMessage>}
      <Button type="submit" size="lg" loading={loading}>{resetting ? 'Enviar instruções' : 'Entrar'}</Button>
      {resetting && <button type="button" className="auth-link" onClick={switchPhase}>Voltar para o login</button>}
    </form>
  </AuthLayout>;
}

function Brand() {
  return <span className="auth-brand"><img src="/icons/icon.svg" alt="" width={40} height={40} /><span>Personal Finance</span></span>;
}

/**
 * Ilustração do painel (D-044): contas, cartões e caixinhas fluem para um único livro reconciliado.
 * Só rótulos e barras — a tela de login não mostra dado financeiro algum.
 */
function ReconcileIllustration() {
  const sources = [{ icon: AccountsIcon, label: 'Contas' }, { icon: CardsIcon, label: 'Cartões' }, { icon: SavingsIcon, label: 'Caixinhas' }];
  return <div className="auth-flow">
    <ul className="auth-flow__sources">
      {sources.map(source => <li key={source.label} className="auth-flow__source">
        <span className="auth-flow__tile"><Icon icon={source.icon} size="sm" /></span>
        <span className="auth-flow__label">{source.label}</span><span className="auth-flow__bar" />
      </li>)}
    </ul>
    <svg className="auth-flow__links" viewBox="0 0 64 180" preserveAspectRatio="none" focusable="false">
      {[30, 90, 150].map(y => <path key={y} d={`M0 ${y} C 32 ${y}, 32 90, 64 90`} pathLength={1} />)}
    </svg>
    <div className="auth-flow__ledger">
      <div className="auth-flow__ledger-head"><strong>Livro</strong><span className="auth-flow__ok"><Icon icon={StatusOkIcon} size="sm" />Reconciliado</span></div>
      {[0, 1, 2, 3].map(row => <div key={row} className="auth-flow__row"><span /><span /><span /></div>)}
    </div>
  </div>;
}

/**
 * Login (D-044): painel da marca no desktop, formulário direto no celular. Entrada em sequência curta;
 * com movimento reduzido tudo aparece com um fade.
 */
function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="auth-page auth-enter">
    <aside className="auth-hero" aria-hidden="true">
      <Brand />
      <div className="auth-hero__body">
        <p className="auth-hero__title auth-step">Contas, cartões e caixinhas num livro só.</p>
        <p className="auth-hero__copy auth-step">Reconciliado a partir do MeuPluggy, sem dupla contagem entre fatura e pagamento.</p>
        <ReconcileIllustration />
      </div>
      <p className="auth-hero__foot"><Icon icon={LockIcon} size="sm" />Acesso de um único proprietário</p>
    </aside>
    <section className="auth-panel">
      <div className="auth-card">
        <span className="auth-card__brand"><Brand /></span>
        <header key={title} className="auth-card__header auth-step"><h1>{title}</h1><p className="auth-copy">{description}</p></header>
        {children}
        <p className="auth-footnote auth-step"><Icon icon={LockIcon} size="sm" />Cadastro público desativado.</p>
      </div>
    </section>
  </main>;
}
