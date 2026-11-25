# Receitas e previsão

## Classificação de receita

As categorias do overlay imutável definem a recorrência:

- `salary` e `other_recurring_income`: entram na média futura;
- `extraordinary_income`: permanece no realizado e na base das metas do período, mas fica fora da média;
- renda ainda não confirmada não é projetada.

Durante a sincronização, descrições fortes de salário em uma instituição Itaú recebem automaticamente o overlay `salary` com versão `income-v1`. A regra exige instituição e descrição, guarda a evidência e nunca sobrescreve uma classificação existente.

## Horizonte de seis meses

A previsão começa no mês seguinte ao atual (D-078) e usa as seis competências anteriores. A etapa 12 (D-084, [`FIXED_ITEMS.md`](FIXED_ITEMS.md)) substitui a recorrência por categoria pelos fixos definidos na Revisão. Valores continuam em `bigint`:

- receita recorrente: soma confirmada dividida por seis;
- despesa recorrente: grupos de categoria ou descrição presentes em pelo menos duas competências, divididos por seis;
- gastos planejados: maior valor entre a média recorrente e a soma dos tetos sobre a renda recorrente;
- parcelas: somente registros `projected` da competência futura;
- aportes: valor mensal necessário para cada caixinha atingir a meta até a data definida.

Parcelas já realizadas são excluídas da média de despesas para não duplicar compromissos. O resultado previsto é receita recorrente menos gastos planejados, parcelas e aportes.

## Validação

```bash
pnpm forecast:check
pnpm --filter @personal-finance/domain test
pnpm test:auth
```

O cálculo é determinístico e não persiste projeções como lançamentos realizados.
