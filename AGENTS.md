# Instruções para agentes de código

1. Leia `PROMPT_CODEX.md` e `docs/brain/README.md` antes de editar qualquer regra financeira.
2. Considere a planilha histórica como fonte de **dados**, não como padrão definitivo de cálculo; preserve divergências para conciliação.
3. Consulte e atualize o catálogo de entidades, regras, casos de teste e ADRs no mesmo commit de qualquer mudança de domínio.
4. Não exponha dados reais de banco, holerite, transações, IDs pessoais ou PDFs em commits, logs, screenshots, fixtures públicas ou serviços de IA.
5. Todas as somas monetárias devem ser exatas em centavos; teste competências e datas separadamente.
6. Priorize importação idempotente, controle de duplicidade, restauração e confirmação antes de operações destrutivas.
7. Não confunda transferência própria, aporte e pagamento de fatura com consumo ou receita.
8. Execute checagem de tipos, lint, testes e build antes de declarar concluída cada fase.
9. Mantenha arquivo `docs/brain/KNOWN_ISSUES.md` atualizado com pendências verificadas.
10. Use português brasileiro em UX e documentação técnica clara para continuidade.
11. Siga o [Design system — Grafite e Âmbar](docs/brain/DESIGN_SYSTEM.md) como princípio obrigatório em toda refatoração visual e nova funcionalidade: use seus tokens, componentes, padrões de interação e critérios de acessibilidade. Reserve verde exclusivamente para valores financeiros positivos. Atualize o documento no mesmo commit quando alterar um contrato visual compartilhado.

## Continuidade da implementação

- O kit histórico local PROMPT_CODEX.md e os mapas históricos com dados pessoais são ignorados pelo Git. Em clones sem o kit, use o contrato público em docs/brain e obtenha a fonte privada somente quando a migração depender dela.
- Execute npm run check, npm run test:security e npm run test:e2e; consulte TEST_PLAN para distinguir testes PostgreSQL de mocks HTTP de navegador.
- Nunca execute reset/aplique migrations em projeto de produção para testar. O harness cria banco descartável com nome aleatório.
- Atualize tipos com npm run types:generate após migrations. Não edite tipos gerados à mão.
- Supabase CLI fixada em 3.1.0; auth.email.enabled controla provedor e auth.enable_signup controla cadastro.
- Open Finance real permanece bloqueado. Não ler private-data para gerar exemplos, seeds ou testes. Não versionar .env nem arquivos temporários da CLI.
- Por instrução expressa do usuário, não iniciar nem testar Supabase local. Homologar Auth/API/Storage quando o ambiente real for disponibilizado. Testes unitários, HTTP sintético no navegador e SQL em PostgreSQL descartável continuam disponíveis.

## Como buscar o contexto do projeto

- No início de cada tarefa, leia `docs/brain/README.md`. Use-o como índice,
  sem carregar todo o Brain automaticamente.
- Antes de alterar uma área, consulte os documentos indicados no índice:
  - regras e cálculos: `BUSINESS_RULES.md` e `CALCULATION_POLICIES.md`;
  - categorias: `CATEGORIZATION.md` e `ENTITY_CATALOG.md`;
  - banco e isolamento: `SCHEMA.md`, `TENANCY_AUTH.md` e as migrations relacionadas;
  - importação e conciliação: `IMPORTERS.md` e `RECONCILIATION.md`;
  - Open Finance: `OPEN_FINANCE.md` e `OPEN_FINANCE_PROVIDER_COMPARISON.md`;
  - deploy e pendências: `OPERATIONS.md`, `DEPLOY_VALIDATION.md` e `KNOWN_ISSUES.md`.
- Consulte `TEST_PLAN.md` ao mudar código ou comportamento. Atualize a
  documentação do Brain quando a mudança alterar uma regra ou decisão.
- Leia `PROMPT_CODEX.md` e arquivos de `private-data/` somente quando a tarefa
  depender deles. Nunca copie dados privados para código, exemplos ou testes.
- Se a documentação e o código divergirem, confira as migrations e a
  implementação atual; registre a divergência antes de decidir.