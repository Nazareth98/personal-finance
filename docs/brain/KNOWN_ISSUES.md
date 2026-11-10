# Pendências verificadas

Data: 10/11/2026.

## Identidade e homologação

- Alta: nenhum projeto Supabase remoto está configurado/homologado neste workspace. Validar Auth, SMTP, recuperação de senha, migrations, RLS, Edge Function e isolamento exclusivamente no destino real, com usuário de teste sintético.
- Alta: a Edge Function Meu Pluggy ainda precisa ser implantada com secrets do proprietário e autorizada no Dashboard. Não declarar a conexão validada antes de testar o fluxo no ambiente real.
- Alta: validar sincronização, revogação, falhas parciais da exclusão remota, expiração e renovação manual de autorização. Meu Pluggy não renova consentimento via API.
- Alta: confirmar cobertura de Itaú, Nubank e Caixa na conta do titular e para cada produto desejado; não há cobertura universal garantida.
- Média: o recurso é exclusivo do proprietário. Não serve como integração bancária dos outros usuários do aplicativo.

## Produto financeiro e importação

- Alta: não existe importador de inicialização dos JSONs privados de categorias/regras. Exige prévia, validação de referências, preservação de literais/ordem, idempotência e confirmação exclusiva no workspace do titular.
- Média: ordem de categorias e metadados históricos de natureza/revisão não possuem mapeamento completo. Não descartar campos silenciosamente.
- Média: faltam contextos por banco/cartão/direção nas regras, histórico de versões e fluxo para salvar classificação como regra com prévia de impacto.
- Média: projeções, alertas configuráveis, base por média histórica e filtros/gráficos avançados não estão integralmente implementados.
- Média: parsers específicos de faturas Itaú/Nubank/Caixa, OCR e migração multiaba não estão homologados. PDF genérico pode reconhecer só parte das linhas; conferência manual é necessária.
- Média: XLS binário requer conversão para XLSX; snapshots completos precisarão paginação para históricos extensos.
- Média: não há sincronização agendada, webhook ou retry com backoff do Meu Pluggy; a sincronização disponível é iniciada pelo titular.
- Média: edição de contas/cartões e rubricas é limitada; fechamento oficial deve ser conferido no documento da instituição.
- Média: política final de retenção precisa ser definida antes de disponibilização pública.

A validação Supabase deve ocorrer exclusivamente no ambiente real, conforme [DEPLOY_VALIDATION.md](DEPLOY_VALIDATION.md). Nenhum dado bancário real deve entrar em fixtures, logs ou documentação.

## Verificação documental do design system — 10/11/2026

- A migração visual para [Grafite e Âmbar](DESIGN_SYSTEM.md) ainda não foi executada; o documento é a referência para próximas entregas, sem declaração de conformidade atual com WCAG.
