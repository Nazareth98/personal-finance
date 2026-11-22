// D-074: hora do lançamento em horário de Brasília, quando o banco informa.
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

/**
 * `14:32`, ou nada quando o banco não manda hora: data pura chega como meia-noite UTC ou meia-noite de Brasília
 * (03:00 UTC), e mostrar “00:00” ou “21:00” seria inventar uma hora.
 */
export function formatEventTime(occurredAt?: string): string | undefined {
  if (!occurredAt) return undefined;
  const instant = new Date(occurredAt);
  if (Number.isNaN(instant.getTime())) return undefined;
  const utc = instant.toISOString().slice(11, 19);
  if (utc === '00:00:00' || utc === '03:00:00') return undefined;
  return timeFormat.format(instant);
}

/** Ordena por data e, no mesmo dia, pela hora. */
export const eventSortKey = (row: { eventDate: string; occurredAt?: string }) => `${row.eventDate} ${formatEventTime(row.occurredAt) ?? ''}`;
