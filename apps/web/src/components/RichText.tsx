import { richParts } from '../lib/help-content';

/** Texto de ajuda com `**negrito**`, sem HTML cru. */
export function RichText({ text }: { text: string }) {
  return <>{richParts(text).map((part, index) => part.strong ? <strong key={index}>{part.text}</strong> : <span key={index}>{part.text}</span>)}</>;
}
