import type { PluggyConnection } from '../integrations/contracts.ts';

/** D-061: ao abrir o app ou voltar à aba, sincroniza o que não foi tentado nas últimas 6 h. Sem timer. */
export const AUTO_SYNC_AFTER_MS = 6 * 60 * 60 * 1000;

/**
 * Conexões vencidas: prontas ou com erro (tenta de novo uma vez por abertura) e sem tentativa recente.
 * Conta a última tentativa, não o último sucesso, para que uma falha não repita a cada abertura.
 * Login pendente pede ação do dono; “atualizando” já está em curso.
 */
export function connectionsDue(connections: readonly PluggyConnection[], now: number): PluggyConnection[] {
  return connections.filter(connection => (connection.status === 'ready' || connection.status === 'error')
    && now - Date.parse(connection.lastAttemptAt ?? connection.lastSuccessAt ?? '1970-01-01T00:00:00Z') > AUTO_SYNC_AFTER_MS);
}
