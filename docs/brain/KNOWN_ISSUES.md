# Pendências verificadas

Data: 09/11/2026.

## Revisão do prompt inicial — categorias e regras

- Alta: não existe importador de inicialização para os JSONs privados de categorias/regras. A tela de importação recebe movimentos financeiros; restauração recebe backups exportados pelo aplicativo. Nenhuma delas aceita diretamente o kit `{metadata, items}`.
- Alta: formulário de criação de regra não oferece subcategoria; edição de regra define `subcategory_id=null`, inclusive ao alterar somente palavra-chave/prioridade. Não usar esse fluxo para reproduzir integralmente regras históricas com subcategorias.
- Média: ordem das categorias e metadados históricos de natureza/revisão não possuem mapeamento completo no schema atual. Não descartar esses campos silenciosamente numa futura carga.
- Média: faltam contextos por banco/cartão/direção nas regras, histórico de versões das regras e fluxo de salvar classificação como regra com prévia de impacto. Sugestões atuais são recalculadas ao abrir a revisão, sem comando de reaplicação em lote.
- Média: requisitos de projeções, alertas configuráveis de orçamento, base por média histórica e filtros/gráficos avançados ainda não estão integralmente implementados.

Inicialização fiel depende de importador autenticado com prévia, validação de referências, preservação de literais/ordem, idempotência e confirmação exclusiva no workspace do titular. Nunca converter configurações pessoais em seed global. A revisão inspecionou estrutura e consistência dos JSONs localmente; conteúdos pessoais não devem ser publicados na documentação.

| Severidade | Pendência / reprodução | Condição de encerramento |
|---|---|---|
| Alta | Sem projeto Supabase configurado; abrir sem env mostra orientação | Validar Auth completo, SMTP, recuperação e RLS via API no destino |
| Alta | Nenhuma migração histórica executada | Preflight local e confirmação do titular no próprio workspace |
| Média | MFA e exclusão autônoma ausentes | Fluxo autenticado testado, retenção e limpeza de arquivos/tokens |
| Média | Homologação integrada adiada por decisão do proprietário | Validar Supabase exclusivamente no ambiente real |

Não habilitar Open Finance real sem contrato e autorização. Cobertura bancária precisa de comprovação por produto no provedor contratado.

- Alta: parsers específicos de faturas Itaú/Nubank/Caixa, OCR e migração multiaba ainda não homologados. PDF genérico pode reconhecer somente parte das linhas; conferência manual obrigatória.
- Média: XLS binário requer conversão para XLSX; dashboard consulta snapshot completo, portanto precisa paginação para históricos grandes.
- Média: sem agendamento automático de sync, retries com backoff ou webhook real; mock usa páginas e retry manual.
- Média: edição de contas/cartões e rubricas ainda é limitada; categorias, regras, metas, objetivos e classificação já podem ser alterados. Fechamento oficial deve ser conferido no documento do banco; o app preserva total declarado e diferença.
- Baixa: projetos já existentes antes do trigger de provisionamento exigem migração operacional dos usuários Auth; projeto novo é o fluxo suportado.
- Baixa: restauração JSON depende do mesmo workspace/Auth; recuperação integral de projeto apagado exige dump operacional. Backup baixado não é cifrado automaticamente.
- Média: política final de retenção precisa de definição antes de disponibilização pública.

Configuração revisada contra o template da Supabase CLI 3.1.0: `auth.email.enabled=true`. Isso não comprova os serviços integrados. Por instrução do proprietário, não executar Supabase local; validar no ambiente real conforme [DEPLOY_VALIDATION.md](DEPLOY_VALIDATION.md). Não executar db reset em projeto com histórico; o harness SQL cria e elimina exclusivamente bancos PostgreSQL descartáveis.
