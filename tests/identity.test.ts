import { expect, test } from "vitest";
import { isPublicSupabaseKey } from "../src/lib/public-key";
test("configuração rejeita chave privilegiada, JWT autenticado e credencial inválida", () => {
  const jwt = (role: string) =>
    `header.${btoa(JSON.stringify({ role }))}.signature`;
  expect(isPublicSupabaseKey(jwt("anon"))).toBe(true);
  expect(isPublicSupabaseKey("sb_publishable_synthetic")).toBe(true);
  expect(isPublicSupabaseKey(jwt("service_role"))).toBe(false);
  expect(isPublicSupabaseKey(jwt("authenticated"))).toBe(false);
  expect(isPublicSupabaseKey("sb_secret_synthetic")).toBe(false);
  expect(isPublicSupabaseKey("invalid")).toBe(false);
});
