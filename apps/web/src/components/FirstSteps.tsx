import { useState } from 'react';
import { Button, ChevronDownIcon, CloseIcon, Icon, StatusOkIcon } from '@personal-finance/ui';
import type { FirstStep } from '../lib/first-steps';

type Props = { steps: FirstStep[]; onDismiss: () => void; onEditHolder?: () => void };

/** D-067: “Primeiros passos” na Visão geral. Some sozinho quando tudo estiver feito; dispensável a qualquer momento. */
export function FirstSteps({ steps, onDismiss, onEditHolder }: Props) {
  const [listOpen, setListOpen] = useState(false);
  const doneCount = steps.filter(step => step.done).length;
  const next = steps.find(step => !step.done);
  if (!next) return null;
  const action = (step: FirstStep, size: 'sm' | 'md') => step.id === 'holder' && onEditHolder
    ? <Button size={size} onClick={onEditHolder}>{step.cta}</Button>
    : <a className={`ui-button ui-button--primary ui-button--${size}`} href={step.href}>{step.cta}</a>;
  return <section className="first-steps" aria-labelledby="first-steps-title">
    <div className="first-steps__head">
      <div>
        <p className="first-steps__eyebrow">Primeiros passos · {doneCount} de {steps.length}</p>
        <h2 id="first-steps-title">Vamos deixar tudo pronto</h2>
        <p className="muted">Siga na ordem: cada passo se marca sozinho quando os dados aparecem.</p>
      </div>
      <Button variant="ghost" size="sm" aria-label="Dispensar primeiros passos" title="Dispensar" onClick={onDismiss}><Icon icon={CloseIcon} size="sm" /></Button>
    </div>
    <div className="first-steps__bar" role="progressbar" aria-label="Primeiros passos" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
      <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
    </div>
    <div className="first-steps__next">
      <span className="first-steps__label">Próximo passo</span>
      <strong>{next.title}</strong>
      <p className="muted">{next.description}</p>
      <div>{action(next, 'md')}</div>
    </div>
    <button type="button" className="first-steps__toggle" aria-expanded={listOpen} aria-controls="first-steps-list" onClick={() => setListOpen(value => !value)}>
      Todos os passos<Icon icon={ChevronDownIcon} size="sm" />
    </button>
    <ol id="first-steps-list" className={`first-steps__list${listOpen ? ' is-open' : ''}`}>
      {steps.map((step, index) => <li key={step.id} className={step.done ? 'is-done' : step === next ? 'is-next' : undefined}>
        <span className="first-steps__dot" aria-hidden="true">{step.done ? <Icon icon={StatusOkIcon} size="sm" /> : index + 1}</span>
        <span className="first-steps__title">{step.title}<span className="ui-sr-only">{step.done ? ' (concluído)' : step === next ? ' (próximo)' : ''}</span></span>
      </li>)}
    </ol>
  </section>;
}
