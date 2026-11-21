import { useEffect, useMemo, useState } from 'react';
import { Card, EmptyState, Input } from '@personal-finance/ui';
import { glossary, termSlug } from '../lib/help-content';
import { useHashParams } from '../hooks/useHashParams';
import type { PageProps } from './PageProps';

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** D-067: glossário “Como funciona”. `#glossary?termo=…` destaca e rola até o termo. */
export function GlossaryPage({ headerAction }: PageProps) {
  const [params] = useHashParams();
  const target = params.get('termo') ?? '';
  const [query, setQuery] = useState('');
  const terms = useMemo(() => {
    const needle = normalize(query.trim());
    return needle ? glossary.filter(entry => normalize(`${entry.term} ${entry.definition}`).includes(needle)) : glossary;
  }, [query]);
  useEffect(() => {
    if (target) document.getElementById(`termo-${target}`)?.scrollIntoView({ block: 'center' });
  }, [target]);
  return <div className="template-page">
    <div className="template-heading"><div><p className="eyebrow">AJUDA</p><h1>Como funciona</h1>
      <p className="muted">Os termos do app, em português simples.</p></div><div className="template-heading__actions">{headerAction}</div></div>
    <div className="glossary-search"><Input label="Buscar termo" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Ex.: fatura, teto" /></div>
    <Card className="glossary">
      {terms.length === 0
        ? <EmptyState title="Nenhum termo encontrado" description="Tente outra palavra, como “cartão” ou “meta”." />
        : <dl>{terms.map(entry => {
          const slug = termSlug(entry.term);
          return <div key={slug} id={`termo-${slug}`} className={slug === target ? 'is-target' : undefined}><dt>{entry.term}</dt><dd>{entry.definition}</dd></div>;
        })}</dl>}
    </Card>
  </div>;
}
