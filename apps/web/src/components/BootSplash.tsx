/**
 * Tela de carregamento (D-044): ícone do app, nome e barra indeterminada. A mesma marcação está em
 * `index.html` — antes do JavaScript e durante a verificação da sessão a tela é idêntica, sem pulo.
 * O texto só aparece se a espera passar de ~1 s, para não piscar em conexões rápidas.
 */
export function BootSplash({ label = 'Verificando acesso…' }: { label?: string }) {
  return <main className="boot-splash" aria-busy="true">
    <img className="boot-splash__icon" src="/icons/icon.svg" alt="" width={72} height={72} />
    <span className="boot-splash__name">Personal Finance</span>
    <span className="boot-splash__bar" aria-hidden="true" />
    <p className="boot-splash__status" role="status">{label}</p>
  </main>;
}
