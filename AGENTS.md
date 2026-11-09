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
