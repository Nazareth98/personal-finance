import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { PluggyService } from "../open-finance/pluggy-service.ts";

export function pluggyDevApiPlugin(env: Record<string, string | undefined>): Plugin {
  return {
    name: "pluggy-dev-api",
    configureServer(server) {
      const clientId = env.PLUGGY_CLIENT_ID || process.env.PLUGGY_CLIENT_ID;
      const clientSecret = env.PLUGGY_CLIENT_SECRET || process.env.PLUGGY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        // Se as credenciais não estiverem configuradas, o middleware responderá avisando
        return;
      }

      const pluggy = new PluggyService(clientId, clientSecret);

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ? new URL(req.url, "http://localhost") : null;
        if (!url || !url.pathname.startsWith("/api/pluggy/")) {
          return next();
        }

        res.setHeader("Content-Type", "application/json");

        try {
          if (req.method === "POST" && url.pathname === "/api/pluggy/connect-token") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });
            req.on("end", async () => {
              try {
                const parsed = body ? JSON.parse(body) : {};
                const token = await pluggy.createConnectToken(parsed.clientUserId);
                res.writeHead(200);
                res.end(JSON.stringify({ accessToken: token }));
              } catch (err) {
                res.writeHead(500);
                res.end(
                  JSON.stringify({
                    error: err instanceof Error ? err.message : "Erro desconhecido",
                  }),
                );
              }
            });
            return;
          }

          if (req.method === "GET" && url.pathname === "/api/pluggy/accounts") {
            const itemId = url.searchParams.get("itemId");
            if (!itemId) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: "itemId é obrigatório" }));
              return;
            }
            const accounts = await pluggy.fetchAccounts(itemId);
            res.writeHead(200);
            res.end(JSON.stringify({ accounts }));
            return;
          }

          if (req.method === "GET" && url.pathname === "/api/pluggy/transactions") {
            const accountId = url.searchParams.get("accountId");
            if (!accountId) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: "accountId é obrigatório" }));
              return;
            }
            const from = url.searchParams.get("from") || undefined;
            const to = url.searchParams.get("to") || undefined;
            const transactions = await pluggy.fetchTransactions(accountId, { from, to });
            res.writeHead(200);
            res.end(JSON.stringify({ transactions }));
            return;
          }

          if (req.method === "DELETE" && url.pathname.startsWith("/api/pluggy/items/")) {
            const itemId = url.pathname.replace("/api/pluggy/items/", "");
            await pluggy.deleteItem(itemId);
            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          res.writeHead(404);
          res.end(JSON.stringify({ error: "Endpoint não encontrado" }));
        } catch (err) {
          res.writeHead(500);
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Falha interna no servidor dev",
            }),
          );
        }
      });
    },
  };
}
