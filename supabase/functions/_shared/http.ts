export const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS'
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json; charset=utf-8' }
  });
}

export function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'unexpected_error';
  return message.replace(/[\r\n]/g, ' ').slice(0, 240);
}
