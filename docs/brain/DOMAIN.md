# Regras de domínio financeiro

## Naturezas

- **Receita:** aumenta renda disponível.
- **Despesa:** representa consumo no período.
- **Estorno:** crédito que reduz uma despesa anterior e exige vínculo com a compra correta.
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

“Transferência” ou “PIX” informado pelo provedor descreve o meio de pagamento, não a natureza contábil. PIX enviado a terceiro é despesa; PIX recebido de terceiro é receita. O movimento só é `own_transfer` quando houver evidência positiva de titularidade do destino/origem ou conciliação com o outro lado em uma conta própria. Na dúvida, manter receita/despesa pendente de revisão; nunca neutralizar somente pela categoria do provedor.

## Metas

`teto = receita confirmada do período × percentual da categoria`.

Toda receita recebida, inclusive extraordinária, entra na base do período. O saldo de meta não acumula. A visualização mostra gasto, teto em reais e percentual consumido nos recortes mensal e anual.

## Caixinhas

O saldo é sempre reconstruído pelo saldo inicial, aportes e resgates vinculados. Aporte e resgate são movimentos patrimoniais neutros e não compõem renda ou consumo. Um lançamento importado indistinguível só pode ser associado manualmente; o sistema não cria sugestão sem evidência histórica confirmada.

Um resgate identificado não é receita extraordinária: deve receber natureza `savings_withdrawal`, permanecer neutro e ser vinculado à caixinha escolhida. Um aporte segue a mesma regra com `savings_contribution`. Corrigir somente a categoria não altera a natureza financeira.

## Previsão

Usar os seis meses anteriores de receitas recorrentes, despesas recorrentes, parcelas futuras, metas e aportes planejados. Receita extraordinária permanece no realizado, mas é excluída da média futura.

Salário e outras receitas recorrentes exigem categoria automática ou confirmada. Despesa só forma base recorrente quando seu grupo aparece em pelo menos duas das seis competências. O gasto planejado usa o maior valor entre essa base e os tetos, evitando somar duas estimativas do mesmo consumo. Parcelas realizadas não voltam à média; somente parcelas projetadas entram como compromisso futuro. O aporte é derivado do saldo atual, meta e prazo da caixinha.

## Categorização

Normalizar caixa, acentos, pontuação e códigos voláteis; tokenizar a descrição e comparar estabelecimento, aliases, tokens, conta e natureza.

- 90–100%: aplicar automaticamente.
- 70–89%: sugerir para revisão.
- abaixo de 70%: manter sem categoria.

Correção confirmada pode criar alias ou regra. Guardar evidências e versão do classificador para reproduzir o resultado.
Categoria de lançamento importado é aplicada por overlay; o registro MeuPluggy permanece imutável. Empate de pontuação nunca produz sugestão.

A revisão de categoria e a revisão de natureza são etapas distintas. A primeira escolhe a categoria de uma receita/despesa; a segunda corrige o efeito financeiro por overlay (`income`, `expense`, `own_transfer`, `card_payment`, `savings_contribution` ou `savings_withdrawal`) e, quando necessário, exige o vínculo correspondente.

## Categorias iniciais

Moradia; contas domésticas; supermercado; delivery/iFood; restaurantes; transporte por aplicativo; transporte público; combustível; saúde; cuidados pessoais; lazer; assinaturas; educação; viagens; tributos; tarifas e juros; presentes; salário; outras receitas recorrentes; receitas extraordinárias; transferências; aportes/resgates; outros gastos.

## Invariantes

- Dinheiro é `bigint` em centavos.
- Importado é imutável; ajuste é outro lançamento relacionado.
- Uma origem externa tem chave idempotente única.
- Pagamento de fatura, transferência e aporte não podem inflar consumo ou renda.
- Valor desconhecido não é zero.
- Parcela projetada não compõe o realizado até que o lançamento correspondente seja importado.
