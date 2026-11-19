import { useState } from 'react';

export type LogoAvatarProps = {
  /** Nome da marca; vira o monograma e o texto alternativo. */
  name: string;
  /** Logo opcional. Se falhar ao carregar, mostra o monograma. */
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Decorativo quando o nome já aparece ao lado (padrão). */
  decorative?: boolean;
  className?: string;
};

/** Iniciais de até duas palavras significativas (“Caixa Econômica” → “CE”, “Nubank” → “NU”). */
export function monogram(name: string): string {
  const words = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(word => word.length > 1 && !['DE', 'DA', 'DO', 'DOS', 'DAS', 'S', 'SA'].includes(word));
  if (!words.length) return '?';
  return words.length === 1 ? words[0]!.slice(0, 2) : `${words[0]![0]}${words[1]![0]}`;
}

/** Logo de marca (banco, instituição) num quadrado arredondado, com monograma de reserva (D-052). */
export function LogoAvatar({ name, src, size = 'md', decorative = true, className = '' }: LogoAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return <span className={['ui-logo-avatar', `ui-logo-avatar--${size}`, showImage ? '' : 'ui-logo-avatar--monogram', className].filter(Boolean).join(' ')}
    {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name })}>
    {showImage
      ? <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : monogram(name)}
  </span>;
}
