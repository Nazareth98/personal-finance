import { BrandMark } from '@personal-finance/ui';

/**
 * Tela de carregamento (D-044, marca da D-045): ícone do app com as metades do Balanço alternando como
 * pratos de balança, e o nome. A mesma marcação está em `index.html` — antes do JavaScript e durante a
 * verificação da sessão a tela é idêntica, sem pulo. O texto só aparece se a espera passar de ~1 s.
 */
export function BootSplash({ label = 'Verificando acesso…' }: { label?: string }) {
  return <main className="boot-splash" aria-busy="true">
    <span className="boot-splash__icon"><BrandMark size={48} animated /></span>
    <span className="boot-splash__name">Balanço</span>
    <p className="boot-splash__status" role="status">{label}</p>
  </main>;
}
