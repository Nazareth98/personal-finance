# Autenticação e isolamento

Cadastro, confirmação por e-mail, login, logout e recuperação usam Supabase Auth com PKCE. Senha nova: mínimo 12 caracteres. Confirmar e-mail e configurar URLs permitidas no dashboard; nunca permitir wildcard em produção. Rate limiting é do Auth, definido também em config.toml local. SMTP de produção e entrega real de mensagens precisam de validação no projeto de destino.

Workspace criado no trigger, sem aceitar metadados de posse fornecidos no cadastro. Novos cadastros começam vazios. RLS filtra SELECT e exige posse em INSERT/UPDATE; grants limitam operações sensíveis. FK composta impede filho de apontar para pai de outro workspace. owns_workspace consulta membership sem recursão.

Storage: bucket privado, prefixo UUID do workspace, nome em um único nível, sem '..'; leitura, upload e exclusão próprios. Atualização não autorizada. Processamento de arquivos é local por padrão, sem upload automático.

Logout desmonta estado financeiro. Nenhum cache financeiro persistente no navegador. Nenhum endpoint de webhook/realtime habilitado nesta fase.

Exclusão: usuário solicita; operador confirma identidade, oferece exportação e executa procedimento documentado. Não implementar exclusão silenciosa. MFA e exclusão autônoma permanecem pendentes.
