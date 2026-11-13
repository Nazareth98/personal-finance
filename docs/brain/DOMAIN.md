# Regras de domínio financeiro

## Naturezas

- **Receita:** aumenta renda disponível.
- **Despesa:** representa consumo no período.
- **Transferência própria:** movimenta patrimônio, sem afetar renda ou consumo.
- **Pagamento de fatura:** liquida dívida, sem criar novo consumo.
- **Aporte/resgate:** movimenta patrimônio entre conta e caixinha.
- **Ajuste:** corrige juros, diferença ou erro sem alterar o registro importado.

## Competência

- Débito e conta corrente: data efetiva da movimentação.
- Crédito: mês do vencimento da fatura.
- Parcela: competência da fatura em que vence.
- Estorno: reverte a compra ou parcela relacionada.
- Datas de calendário não devem passar por conversão UTC que mude o dia.

## Transferências

Vincular os dois lados por valor, proximidade de data, contas e descrição normalizada. Um lado ausente ou diferença por tarifa gera revisão; tarifa é despesa financeira separada.

## Metas

`teto = receita confirmada do período × percentual da categoria`.

Toda receita recebida, inclusive extraordinária, entra na base do período. O saldo de meta não acumula. A visualização mostra gasto, teto em reais e percentual consumido nos recortes mensal e anual.

## Previsão

Usar os seis meses anteriores de receitas recorrentes, despesas recorrentes, parcelas futuras, metas e aportes planejados. Receita extraordinária permanece no realizado, mas é excluída da média futura.

## Categorização

Normalizar caixa, acentos, pontuação e códigos voláteis; tokenizar a descrição e comparar estabelecimento, aliases, tokens, conta e natureza.

- 90–100%: aplicar automaticamente.
- 70–89%: sugerir para revisão.
- abaixo de 70%: manter sem categoria.

Correção confirmada pode criar alias ou regra. Guardar evidências e versão do classificador para reproduzir o resultado.

## Categorias iniciais

Moradia; contas domésticas; supermercado; delivery/iFood; restaurantes; transporte por aplicativo; transporte público; combustível; saúde; cuidados pessoais; lazer; assinaturas; educação; viagens; tributos; tarifas e juros; presentes; salário; outras receitas recorrentes; receitas extraordinárias; transferências; aportes/resgates; outros gastos.

## Invariantes

- Dinheiro é `bigint` em centavos.
- Importado é imutável; ajuste é outro lançamento relacionado.
- Uma origem externa tem chave idempotente única.
- Pagamento de fatura, transferência e aporte não podem inflar consumo ou renda.
- Valor desconhecido não é zero.
