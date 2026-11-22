import { formatLocalDate } from '../lib/demo-transactions';
import { formatEventTime } from '../lib/transaction-time';

/** Data do lançamento e, quando o banco informa, a hora (D-074). */
export function DateTime({ row }: { row: { eventDate: string; occurredAt?: string } }) {
  const time = formatEventTime(row.occurredAt);
  return <>{formatLocalDate(row.eventDate)}{time && <span className="event-time"> · {time}</span>}</>;
}
