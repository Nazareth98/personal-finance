# Pendências verificadas

Data: 10/11/2026.

## Identidade e homologação

- Alta: nenhum projeto Supabase remoto está configurado/homologado neste workspace. Validar Auth, SMTP, recuperação de senha, migrations, RLS, Edge Function e isolamento exclusivamente no destino real, com usuário de teste sintético.
- Alta: a Edge Function Meu Pluggy ainda precisa ser implantada com secrets do proprietário e autorizada no Dashboard. Não declarar a conexão validada antes de testar o fluxo no ambiente real.
- Alta: validar sincronização, revogação, falhas parciais da exclusão remota, expiração e renovação manual de autorização. Meu Pluggy não renova consentimento via API.
- Alta: confirmar cobertura de Itaú, Nubank e Caixa na conta do titular e para cada produto desejado; não há cobertura universal garantida.
- Média: o recurso é exclusivo do proprietário. Não serve como integração bancária dos outros usuários do aplicativo.

## Produto financeiro e importação

- Alta: a aprovação em lote continua sequencial e pode registrar parte das decisões se uma RPC falhar ou perder a resposta. A tela tenta atualizar a lista e informa as respostas confirmadas e a incerteza da última tentativa; se a atualização falhar, é necessário recarregar. O filtro não garante categoria ou natureza correta e não compara os pendentes entre si; ver [PLANO_AJUDA_CONTEXTO.md](PLANO_AJUDA_CONTEXTO.md).
- Média: o componente de ajuda e os pontos H01–H30 estão implementados em todas as abas inventariadas. Restam estados orientados, atalhos entre seções com proteção contra perda de formulários, conferência com leitor de tela e validação completa de contraste no [plano vivo](PLANO_AJUDA_CONTEXTO.md).
- Alta: migrations 012 e 013 e importador dos JSONs privados ainda precisam ser aplicados e homologados no Supabase remoto; conferir importação e isolamento no ambiente real.
- Média: faltam contextos por banco/cartão/direção nas regras, histórico de versões e fluxo para salvar classificação como regra com prévia de impacto.
- Média: projeções, alertas configuráveis, base por média histórica e filtros/gráficos avançados não estão integralmente implementados.
- Média: parsers específicos de faturas Itaú/Nubank/Caixa, OCR e migração multiaba não estão homologados. PDF genérico pode reconhecer só parte das linhas; conferência manual é necessária.
- Média: XLS binário requer conversão para XLSX; snapshots completos precisarão paginação para históricos extensos.
- Média: não há sincronização agendada, webhook ou retry com backoff do Meu Pluggy; a sincronização disponível é iniciada pelo titular.
- Média: edição de contas/cartões e rubricas é limitada; fechamento oficial deve ser conferido no documento da instituição.
- Média: política final de retenção precisa ser definida antes de disponibilização pública.

A validação Supabase deve ocorrer exclusivamente no ambiente real, conforme [DEPLOY_VALIDATION.md](DEPLOY_VALIDATION.md). Nenhum dado bancário real deve entrar em fixtures, logs ou documentação.

## Verificação documental do design system — 10/11/2026

- Corrigidos o contraste do logout no tema escuro e o overflow horizontal da Visão geral em 320 px. Menu compacto de 80 px, restauração de 240 px, preferência persistida e controle de tema por ícone conferidos no Chrome com dados sintéticos. Os 10 cenários de navegador passaram, incluindo teclado, Escape, saída e transição desktop/celular; a revisão completa de contraste do sistema permanece pendente.
- Cabeçalhos de Visão geral, Lançamentos e Contas e cartões conferidos com Playwright e dados sintéticos em 1440 px no tema claro. Contas e cartões também conferidos em 320 px no tema escuro, com títulos longos. Ícones alinhados à primeira linha e descrições à coluna do título. Tipos, lint, 21 testes unitários e build aprovados. A conferência é de apresentação, sem homologar o backend real.
- Sidebar e todas as telas do workspace migradas para tokens, ícones e layout responsivo. A revisão visual automatizada das telas autenticadas e a verificação de contraste em navegador seguem pendentes; não declarar conformidade WCAG sem essas evidências. O saldo por sinal e o Livro financeiro receberam ajuste visual, mas ainda precisam de conferência no navegador autenticado.
