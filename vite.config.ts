import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { isPublicSupabaseKey } from "./src/lib/public-key.ts";
import { pluggyDevApiPlugin } from "./src/server/pluggy-dev-api.ts";
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  if (
    env.VITE_SUPABASE_ANON_KEY &&
    !isPublicSupabaseKey(env.VITE_SUPABASE_ANON_KEY)
  )
    throw new Error(
      "VITE_SUPABASE_ANON_KEY deve ser uma chave pública anon/publishable. Chaves privilegiadas são proibidas.",
    );
  return {
    plugins: [react(), pluggyDevApiPlugin(env)],
    test: { include: ["tests/**/*.test.ts"], environment: "node" },
  };
});
