# Corporate UI — Semântica financeira, gráficos e loading (v0.5.1 Beta)

## Valores financeiros: natureza vs resultado

Não confundir **natureza** de movimentação com **sinal** de um resultado.

| Papel | Token Light / Dark | Uso |
| --- | --- | --- |
| Resultado positivo | `finance-positive`: #15803D / #4ADE80 | lucro, saldo líquido positivo, crescimento |
| Resultado negativo | `finance-negative`: #B91C1C / #F87171 | déficit, resultado negativo, perda |
| Resultado neutro | `finance-neutral`: #64748B / #94A3B8 | resultado zero, diferença sem sinal |
| Receita | `finance-income`: #15803D / #4ADE80 | entrada classificada como receita |
| Despesa | `finance-expense`: #B91C1C / #F87171 | consumo classificado como despesa |
| Transferência | `finance-transfer`: #2563EB / #60A5FA | movimento entre contas próprias |

- Valores positivos e negativos devem exibir sinais `+` / `−` e texto, não só cor.
- Uma despesa tem natureza `expense` mesmo que seja armazenada como magnitude positiva `amountCents`.
- Transferências próprias **não** são despesas nem receitas; pagamentos de fatura quitam obrigação, não geram novo consumo.
- Todos os cálculos monetários usam `bigint` em centavos.
- Para selecionar a cor por sinal use `FinancialValue`; para natureza use `Badge` e nomes semânticos de operação.

## Tokens de gráficos

`chart-income`, `chart-expense`, `chart-neutral`, `chart-grid`, `chart-category-1` até `chart-category-5`.

As cores categóricas indicam apenas categorias distintas e não têm significado de receita ou despesa. Sempre emparelhe as cores com rótulos, legenda e valores.

## Templates de gráficos

| Componente | Props | Aplicação |
| --- | --- | --- |
| `CashFlowChart` | `data: { label, incomeCents, expenseCents }[]`, `formatValue` | comparação de receitas e despesas por período |
| `TrendLineChart` | `data: { label, valueCents }[]`, `formatValue` | tendência temporal de saldos/resultado |
| `CategoryDonutChart` | `data: { label, valueCents }[]`, `formatValue` | composição de despesas por categoria |

O layout é responsivo, usa CSS/SVG sem biblioteca externa e fornece valores textuais. Os gráficos recebem `bigint`; a função de escala converte **apenas razões limitadas para coordenadas ou porcentagens**, nunca o montante integral em ponto flutuante.

**Limite:** séries da demonstração são inventadas e não representam movimentação bancária verdadeira. O gráfico de fluxo não soma transferências internas. Gráficos seguem Beta até testes de acessibilidade e regressão visual da v0.6.

## Loading aprimorado

- `TableSkeleton` mantém posição de cabeçalhos, linhas e rodapé da tabela; aceita `rows`, `columns` e `label`.
- `ChartSkeleton` reserva altura de conteúdo e possui variantes `bars`, `line` e `donut`.
- Ambos usam `role=status`, `aria-busy=true` e um rótulo acessível.
- Conteúdo visual repetitivo é `aria-hidden`; respeitar `prefers-reduced-motion`.
- Loading verdadeiro deve depender do ciclo de uma requisição (idle → loading → success/error), não apenas de botão demonstrativo. A demo utiliza toggle apenas para inspecionar o estado.

## Critérios da próxima etapa

Playwright/Vitest para interações, análise axe, verificação dos pares de contraste em componentes reais e comparação visual Light/Dark. Não declarar componentes Stable somente por existirem histórias Storybook.
