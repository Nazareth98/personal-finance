import type { LucideIcon, LucideProps } from 'lucide-react';

const pixels = { sm: 16, md: 20, lg: 24 } as const;

export type IconProps = Omit<LucideProps, 'size' | 'strokeWidth' | 'aria-label'> & {
  icon: LucideIcon;
  size?: keyof typeof pixels;
  label?: string;
};

export function Icon({ icon: Glyph, size = 'md', label, className = '', ...props }: IconProps) {
  return <Glyph {...props} size={pixels[size]} strokeWidth={2} focusable="false"
    aria-hidden={label ? undefined : true} aria-label={label} role={label ? 'img' : undefined}
    className={['ui-icon', className].filter(Boolean).join(' ')} />;
}
