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

## Continuidade da implementação

- O kit histórico local PROMPT_CODEX.md e os mapas históricos com dados pessoais são ignorados pelo Git. Em clones sem o kit, use o contrato público em docs/brain e obtenha a fonte privada somente quando a migração depender dela.
- Execute npm run check, npm run test:security e npm run test:e2e; consulte TEST_PLAN para distinguir testes PostgreSQL de mocks HTTP de navegador.
- Nunca execute reset/aplique migrations em projeto de produção para testar. O harness cria banco descartável com nome aleatório.
- Atualize tipos com npm run types:generate após migrations. Não edite tipos gerados à mão.
- Supabase CLI fixada em 3.1.0; auth.email.enabled controla provedor e auth.enable_signup controla cadastro.
- Open Finance real permanece bloqueado. Não ler private-data para gerar exemplos, seeds ou testes. Não versionar .env nem arquivos temporários da CLI.
- Por instrução expressa do usuário, não iniciar nem testar Supabase local. Homologar Auth/API/Storage quando o ambiente real for disponibilizado. Testes unitários, HTTP sintético no navegador e SQL em PostgreSQL descartável continuam disponíveis.
