export function isPublicSupabaseKey(key: string): boolean {
  if (key.startsWith("sb_publishable_")) return key.length > 15;
  try {
    const parts = key.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { role?: string };
    return payload.role === "anon";
  } catch {
    return false;
  }
}
