import { brl } from "../domain/finance";

export function MoneyValue({
  value,
  tone,
  className = "",
}: {
  value: bigint | string;
  tone?: "positive" | "negative" | "neutral";
  className?: string;
}) {
  const amount = BigInt(value);
  const sign =
    tone ?? (amount > 0n ? "positive" : amount < 0n ? "negative" : "neutral");
  return <span className={`financial-amount ${sign} ${className}`.trim()}>{brl(value)}</span>;
}
