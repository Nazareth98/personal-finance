import { Button, Dialog, FirstStepsIcon, GlossaryIcon, Icon } from '@personal-finance/ui';
import { screenHelp, termSlug, type HelpPageId } from '../lib/help-content';
import { RichText } from './RichText';

type Props = { page: HelpPageId; open: boolean; onClose: () => void; onShowFirstSteps?: () => void };

/** D-067: ajuda da tela atual. No desktop é janela; até 1000 px vira folha inferior, como todo Dialog. */
export function HelpPanel({ page, open, onClose, onShowFirstSteps }: Props) {
  const help = screenHelp[page];
  return <Dialog open={open} onClose={onClose} title={`Sobre ${help.title}`} description={help.subtitle} className="help-panel"
    footer={<>
      <a className="ui-button ui-button--secondary ui-button--md" href="#glossary" onClick={onClose}><Icon icon={GlossaryIcon} size="sm" />Glossário</a>
      {onShowFirstSteps && <Button variant="secondary" onClick={() => { onClose(); onShowFirstSteps(); }}><Icon icon={FirstStepsIcon} size="sm" />Primeiros passos</Button>}
    </>}>
    <div className="help-panel__body">
      <section><h3>O que esta tela mostra</h3><p>{help.shows}</p></section>
      <section><h3>Como calculamos</h3><ul>{help.calc.map(item => <li key={item}><RichText text={item} /></li>)}</ul></section>
      <section><h3>O que dá para fazer aqui</h3><ul>{help.actions.map(item => <li key={item}><RichText text={item} /></li>)}</ul></section>
      <section><h3>Termos desta tela</h3>
        <div className="help-panel__terms">{help.terms.map(term => <a key={term} href={`#glossary?termo=${termSlug(term)}`} onClick={onClose}>{term}</a>)}</div>
      </section>
    </div>
  </Dialog>;
}
