# Revisão semântica e reimportação de desenvolvimento

## Problema

Categoria é o destino analítico de uma receita/despesa; natureza define seu efeito financeiro. Corrigir apenas a categoria não resolve PIX para terceiros neutralizados, resgates tratados como receita ou pagamentos de fatura tratados como despesa.

## Overlay semântico

`transaction_semantic_overrides` mantém no máximo uma decisão vigente por lançamento importado, com proprietário, natureza efetiva, motivo, data, versão e o vínculo exigido. O registro MeuPluggy permanece imutável. A leitura aplica primeiro a natureza efetiva e depois a classificação de categoria.

Confirmações com vínculo são atômicas:

- `own_transfer`: exige contraparte em conta própria;
- `card_payment`: exige a fatura específica;
- `savings_contribution` ou `savings_withdrawal`: exige a caixinha específica;
- `income` ou `expense`: segue para categoria e pode aprender alias.

O provedor informar “transferência” ou “PIX” nunca basta para `own_transfer`. Evidência válida inclui titularidade configurada de forma privada ou conciliação de valor/data entre contas próprias. Nenhum nome, CPF ou descrição real é versionado.

## Etapas de implementação

1. corrigir e testar a semântica inicial do importador — concluído;
2. criar migration, RLS e RPC atômica do overlay — concluído;
3. aplicar a semântica efetiva no adapter e nos cálculos — concluído;
4. separar fila pendente de histórico e oferecer ações de vínculo — concluído;
5. publicar migrations/funções e validar com dados sintéticos — concluído;
6. limpar o ambiente de desenvolvimento e reimportar — limpeza concluída; reconexão e auditoria da reimportação pendentes.

## Limpeza seletiva

Não executar `supabase db reset` no projeto hospedado. A limpeza será uma operação administrativa transacional e específica do único proprietário.

Preservar:

- `auth.users`, `public.profiles` e configuração de acesso;
- `public.categories` e histórico de migrations;
- `public.classification_rules` de tipo `alias`;
- secrets e Edge Functions.

Remover e reconstruir:

- conexões MeuPluggy, execuções, webhooks e staging privado;
- contas financeiras, lançamentos, vínculos e overlays por transação;
- faturas, parcelas, metas, caixinhas e movimentos derivados.

Antes da exclusão, registrar somente contagens. Os aliases permanecem na própria tabela; seu conteúdo não é exportado para evitar copiar descrições privadas. Executar tudo em transação, conferir que Auth/perfil/aliases permanecem, reconectar o MeuPluggy e forçar importação completa. A limpeza não acontece antes de os testes da nova semântica passarem, pois reimportar com o código atual apenas reproduziria os erros.

O roteiro administrativo versionado está em [`../../supabase/admin/reset_development_data.sql`](../../supabase/admin/reset_development_data.sql). Ele exige exatamente um proprietário, bloqueia a tabela de lançamentos, suspende somente o trigger de imutabilidade durante a transação e restaura o trigger antes do commit. Em 17/11/2026, a execução hospedada preservou 1 usuário Auth, 1 perfil, 23 categorias e 36 aliases; todos os dados derivados foram zerados. Não executar novamente após a reconexão sem uma nova decisão explícita de limpeza.
