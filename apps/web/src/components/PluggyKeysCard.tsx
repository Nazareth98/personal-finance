import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, ConnectionsIcon, FormMessage, HideIcon, Icon, Input, LockIcon, OpenIcon, ShowIcon, StatusOkIcon } from '@personal-finance/ui';
import type { PluggyCredentialsError, PluggyCredentialsStatus } from '../integrations/contracts';
import { formatDateTime } from '../lib/demo-transactions';

const errorCopy: Record<PluggyCredentialsError, string> = {
  format: 'Confira os dois campos: as chaves não têm espaços e costumam ter mais de 30 caracteres.',
  rejected: 'O Pluggy recusou essas chaves. Confira se copiou o Client Secret inteiro, sem espaços no começo ou no fim.',
  unavailable: 'Não foi possível falar com o Pluggy agora. Tente de novo em alguns minutos.'
};

const steps: { title: string; text: string; link?: string }[] = [
  { title: 'Crie sua conta no MeuPluggy', text: 'Conecte ali cada banco que quer acompanhar. Cada banco pede a própria autorização.', link: 'https://meu.pluggy.ai' },
  { title: 'Entre no painel do Pluggy', text: 'Use o mesmo e-mail e senha do MeuPluggy. O Pluggy exige que seja a mesma conta.', link: 'https://dashboard.pluggy.ai' },
  { title: 'Crie uma aplicação', text: 'No menu Aplicações, toque em “Nova aplicação”. Qualquer nome serve, por exemplo “Minhas finanças”.' },
  { title: 'Copie as duas chaves', text: 'Client ID e Client Secret. O Secret aparece uma vez só: cole aqui antes de fechar a página.' }
];

function Guide() {
  return <ol className="pluggy-guide">
    {steps.map((step, index) => <li key={step.title}>
      <span className="pluggy-guide__number" aria-hidden="true">{index + 1}</span>
      <div><strong>{step.title}</strong><p className="muted">{step.text}</p>
        {step.link && <a href={step.link} target="_blank" rel="noreferrer" className="pluggy-guide__link">{step.link.replace('https://', '')}<Icon icon={OpenIcon} size="sm" /><span className="ui-sr-only"> (abre em nova aba)</span></a>}
      </div>
    </li>)}
  </ol>;
}

type Props = {
  credentials?: PluggyCredentialsStatus;
  /** Já há bancos conectados: as chaves estão no servidor (instância configurada antes do D-064). */
  hasConnections: boolean;
  onSave: (clientId: string, clientSecret: string) => Promise<void>;
};

/** D-064: “Conectar ao Pluggy”. As chaves vão direto para o backend, que testa e guarda no cofre. */
export function PluggyKeysCard({ credentials, hasConnections, onSave }: Props) {
  const configured = Boolean(credentials?.configured);
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<PluggyCredentialsError | null>(null);
  const formOpen = editing || (!configured && !hasConnections);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const id = clientId.trim(), secret = clientSecret.trim();
    if (id.length < 8 || secret.length < 8 || /\s/.test(id + secret)) { setError('format'); return; }
    setSaving(true); setError(null);
    try {
      await onSave(id, secret);
      setClientId(''); setClientSecret(''); setShowSecret(false); setEditing(false);
    } catch (failure) {
      const reason = failure instanceof Error ? failure.message : '';
      setError(reason === 'rejected' || reason === 'format' ? reason : 'unavailable');
    } finally { setSaving(false); }
  }

  if (!formOpen) {
    return <Card className="pluggy-keys pluggy-keys--compact">
      <span className={`pluggy-keys__icon ${configured ? 'pluggy-keys__icon--ok' : ''}`} aria-hidden="true"><Icon icon={configured ? StatusOkIcon : ConnectionsIcon} size="sm" /></span>
      <div className="pluggy-keys__summary">
        <h2>{configured ? 'Chaves do Pluggy conectadas' : 'Chaves do Pluggy no servidor'}</h2>
        <p className="muted">{configured
          ? [credentials?.clientIdSuffix && `Client ID terminando em ${credentials.clientIdSuffix}`, credentials?.testedAt && `testado em ${formatDateTime(credentials.testedAt)}`].filter(Boolean).join(' · ')
          : 'Definidas na configuração do servidor. Você pode informar outras aqui quando precisar.'}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={() => { setEditing(true); setError(null); }}>{configured ? 'Trocar chaves' : 'Informar chaves'}</Button>
    </Card>;
  }

  return <Card className="pluggy-keys">
    <div className="pluggy-keys__head">
      <span className="pluggy-keys__icon" aria-hidden="true"><Icon icon={ConnectionsIcon} size="sm" /></span>
      <div className="pluggy-keys__summary"><h2>Conectar ao Pluggy</h2><p className="muted">Passo necessário antes de conectar seus bancos.</p></div>
      {!configured && <Badge>Não configurado</Badge>}
    </div>
    <div className="pluggy-keys__body">
      <form className="pluggy-keys__form" onSubmit={event => void submit(event)} noValidate>
        <Input label="Client ID" required autoComplete="off" spellCheck={false} placeholder="Ex.: 1a2b3c4d-5e6f-…" value={clientId} onChange={event => setClientId(event.target.value)} />
        <Input label="Client Secret" required autoComplete="off" spellCheck={false} type={showSecret ? 'text' : 'password'} value={clientSecret}
          onChange={event => setClientSecret(event.target.value)} hint="Cole exatamente como aparece no painel do Pluggy."
          trailing={<Button variant="ghost" size="sm" className="auth-reveal" aria-label={showSecret ? 'Ocultar Client Secret' : 'Mostrar Client Secret'} aria-pressed={showSecret}
            onClick={() => setShowSecret(value => !value)}><Icon icon={showSecret ? HideIcon : ShowIcon} size="sm" /></Button>} />
        <p className="pluggy-keys__security muted"><Icon icon={LockIcon} size="sm" /><span>As chaves ficam guardadas criptografadas no servidor e nunca voltam para o navegador. Só você pode trocá-las.</span></p>
        {error && <FormMessage tone="error">{errorCopy[error]}</FormMessage>}
        <div className="pluggy-keys__actions">
          {(configured || hasConnections) && <Button variant="secondary" disabled={saving} onClick={() => { setEditing(false); setError(null); setClientSecret(''); }}>Cancelar</Button>}
          <Button type="submit" loading={saving}>{error === 'rejected' ? 'Testar de novo' : 'Testar e salvar'}</Button>
        </div>
      </form>
      <details className="pluggy-keys__guide" open>
        <summary>Onde encontro essas chaves?</summary>
        <Guide />
        <p className="muted pluggy-keys__note">Uso pessoal: até 5 bancos conectados. Leva uns 10 minutos.</p>
      </details>
    </div>
  </Card>;
}
