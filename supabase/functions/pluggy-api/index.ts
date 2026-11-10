// Supabase Edge Function para integração Pluggy
// Executa em runtime Deno.
// Recebe requisições autenticadas pelo JWT do usuário do Supabase.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PLUGGY_CLIENT_ID = Deno.env.get("PLUGGY_CLIENT_ID") ?? "";
const PLUGGY_CLIENT_SECRET = Deno.env.get("PLUGGY_CLIENT_SECRET") ?? "";
const PLUGGY_BASE_URL = "https://api.pluggy.ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

let cachedApiKey: string | null = null;
let apiKeyExpiresAt = 0;

async function getPluggyApiKey(): Promise<string> {
  const now = Date.now();
  if (cachedApiKey && apiKeyExpiresAt > now + 60_000) {
    return cachedApiKey;
  }

  const res = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: PLUGGY_CLIENT_ID,
      clientSecret: PLUGGY_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Auth failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  cachedApiKey = data.apiKey;
  apiKeyExpiresAt = now + 7100 * 1000;
  return cachedApiKey!;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "connect-token") {
      const apiKey = await getPluggyApiKey();
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      const res = await fetch(`${PLUGGY_BASE_URL}/connect_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(body.clientUserId ? { clientUserId: body.clientUserId } : {}),
      });

      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "accounts") {
      const itemId = url.searchParams.get("itemId");
      if (!itemId) {
        return new Response(JSON.stringify({ error: "itemId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const apiKey = await getPluggyApiKey();
      const res = await fetch(`${PLUGGY_BASE_URL}/accounts?itemId=${itemId}`, {
        headers: { "X-API-KEY": apiKey },
      });
      const data = await res.json();
      return new Response(JSON.stringify({ accounts: data.results || data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "transactions") {
      const accountId = url.searchParams.get("accountId");
      if (!accountId) {
        return new Response(JSON.stringify({ error: "accountId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const apiKey = await getPluggyApiKey();
      const targetUrl = new URL(`${PLUGGY_BASE_URL}/transactions`);
      targetUrl.searchParams.set("accountId", accountId);
      if (from) targetUrl.searchParams.set("from", from);
      if (to) targetUrl.searchParams.set("to", to);

      const res = await fetch(targetUrl.toString(), {
        headers: { "X-API-KEY": apiKey },
      });
      const data = await res.json();
      return new Response(JSON.stringify({ transactions: data.results || data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-item") {
      const itemId = url.searchParams.get("itemId");
      if (!itemId) {
        return new Response(JSON.stringify({ error: "itemId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const apiKey = await getPluggyApiKey();
      await fetch(`${PLUGGY_BASE_URL}/items/${itemId}`, {
        method: "DELETE",
        headers: { "X-API-KEY": apiKey },
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

