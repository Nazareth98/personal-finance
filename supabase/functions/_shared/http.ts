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
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'unexpected_error';
  const sanitized = message.replace(/[\r\n]/g, ' ');
  if (/error sending request|https?:\/\//i.test(sanitized)) return 'upstream_request_failed';
  return sanitized.slice(0, 240);
}
