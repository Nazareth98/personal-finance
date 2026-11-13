# Brain — índice de contexto

Este diretório evita repetir todo o histórico em cada prompt. O contexto é dividido entre um núcleo sempre lido e referências abertas sob demanda.

## Leia sempre

- [`CONTEXT.md`](CONTEXT.md): objetivo, escopo e decisões vigentes.
- [`STATUS.md`](STATUS.md): fase atual, pendências e próximo marco.

## Leia conforme a tarefa

| Tema | Documento |
| --- | --- |
| ordem de implementação e critérios de aceite | [`PLAN.md`](PLAN.md) |
| cálculos, competência e classificação | [`DOMAIN.md`](DOMAIN.md) |
| camadas, dados, segurança, MeuPluggy e hospedagem | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| decisões e mudanças de direção | [`DECISIONS.md`](DECISIONS.md) |
| interface e componentes | [`../design-system/`](../design-system/) |

## Política de manutenção

1. `CONTEXT.md` deve continuar curto; contém somente verdade vigente.
2. `STATUS.md` é operacional e pode mudar a cada entrega.
3. Detalhes pertencem ao arquivo temático e são referenciados por link.
4. Decisão substituída não é apagada: marque-a como substituída em `DECISIONS.md`.
5. Não copie conversas, logs ou dados financeiros para o brain.
