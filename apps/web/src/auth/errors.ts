export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('invalid login credentials')) return 'E-mail ou senha inválidos.';
  if (message.includes('email rate limit')) return 'Aguarde antes de solicitar outro e-mail.';
  if (message.includes('password')) return 'Use uma senha com pelo menos 12 caracteres.';
  if (message.includes('owner')) return 'Esta conta não está autorizada a acessar o sistema.';
  return 'Não foi possível concluir a solicitação. Tente novamente.';
}
