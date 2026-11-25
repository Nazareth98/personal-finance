import type { ReactNode } from 'react';

/**
 * Painel de cards em colunas independentes (D-083): cada coluna empilha seus cards, então um card que cresce
 * (detalhes abertos, lista longa) só empurra os da mesma coluna — sem buracos entre linhas.
 * Até 1100 px vira uma coluna só: primeiro os cards da coluna esquerda, depois os da direita. Ordem visual e de
 * foco são a mesma ordem do código; ponha na esquerda o que importa primeiro no celular.
 */
export function DashboardColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="ui-dashboard-columns">
    <div className="ui-dashboard-columns__col">{left}</div>
    <div className="ui-dashboard-columns__col">{right}</div>
  </div>;
}
