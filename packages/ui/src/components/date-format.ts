/** Datas do DateField (D-082): ISO AAAA-MM-DD ↔ dd/mm/aaaa, sem fuso. */
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const pad = (n: number) => String(n).padStart(2, '0');
export const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const fromIso = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y!, m! - 1, d!); };
export const isIso = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && toIso(fromIso(value)) === value;
/** ISO → dd/mm/aaaa. */
export const formatDateBR = (iso: string) => isIso(iso) ? iso.split('-').reverse().join('/') : '';
/** dd/mm/aaaa → ISO, ou '' se a data não existe. */
export function parseDateBR(text: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return '';
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return isIso(iso) ? iso : '';
}
/** Só dígitos, barras inseridas sozinhas: “25112026” → “25/11/2026”. */
export function maskDateBR(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}
export const weekdayLabel = (iso: string) => {
  const date = fromIso(iso);
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
};

