# Pendências verificadas

Data: 09/11/2026.

| Severidade | Pendência / reprodução | Condição de encerramento |
|---|---|---|
| Alta | Sem projeto Supabase configurado; abrir sem env mostra orientação | Validar Auth completo, SMTP, recuperação e RLS via API no destino |
| Alta | Nenhuma migração histórica executada | Preflight local e confirmação do titular no próprio workspace |
| Média | MFA e exclusão autônoma ausentes | Fluxo autenticado testado, retenção e limpeza de arquivos/tokens |
| Média | Docker instalado, daemon indisponível nesta sessão | Teste integrado Supabase local/CI com Docker |

Não habilitar Open Finance real sem contrato e autorização. Cobertura bancária precisa de comprovação por produto no provedor contratado.

- Alta: parsers específicos de faturas Itaú/Nubank/Caixa, OCR e migração multiaba ainda não homologados. PDF genérico pode reconhecer somente parte das linhas; conferência manual obrigatória.
- Média: XLS binário requer conversão para XLSX; dashboard consulta snapshot completo, portanto precisa paginação para históricos grandes.
- Média: editor de cadastro ainda não cobre todas as alterações; faturas por competência não têm fechamento oficial/total conciliado persistido nesta etapa.
