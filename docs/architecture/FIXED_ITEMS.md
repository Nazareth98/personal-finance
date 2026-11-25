# Fixos, plano do mês e despesas x receita

Status: **proposta (D-084)**. Protótipo: canvas “Fixos, metas e despesas x receita — proposta”. A implementação segue as etapas 12.1–12.5 do [`PLAN.md`](../brain/PLAN.md#etapa-12--fixos-plano-do-mês-e-despesas-x-receita).

## Objetivo

Saber quanto se pode definir de meta por categoria, a partir do que entra e do que já está comprometido nos próximos meses. Hoje a recorrência é adivinhada pela categoria (`salary`, despesas que aparecem em 2 de 6 meses). Com esta proposta, quem usa diz o que é fixo.

## Regras de negócio

- **Fixo é o lançamento que se repete, não o valor.** Exemplos: aluguel, conta de luz, salário. O valor pode variar de um mês para o outro.
- **Vale para receita e para despesa.** O salário fixo substitui a média das categorias `salary` e `other_recurring_income`.
- **O vínculo nasce na Revisão**, como o vínculo de fatura e de caixinha. O campo “Lançamento fixo” oferece:
  - “Não é fixo”;
  - os fixos da categoria, com o sugerido no topo;
  - “Criar fixo”, com o nome tirado da descrição.
- **Lançamentos iguais** (mesma descrição normalizada) chegam com o fixo sugerido. Entram vinculados pela mesma regra de “todos os iguais” da categoria.
- **Previsão:** cada fixo projeta, para os meses seguintes, o valor do **último lançamento vinculado**.
- **Fixo pago no cartão:** conta na competência da fatura, que já é a competência do lançamento de cartão.
- **Situação no mês:**
  - Pago/Recebido: há vínculo na competência.
  - Pendente: ainda não há vínculo.
  - Atrasado: passou do dia habitual mais 3 dias. O dia habitual é o dia do último vínculo.
- **Encerrar um fixo** tira ele das próximas previsões e mantém o histórico.
- **Metas incluem os fixos.** A meta de Moradia cobre o aluguel e o resto. O app mostra quanto da meta já está comprometido e avisa quando a meta fica abaixo dos fixos. Não há bloqueio.

## Plano do mês

Valores em `bigint` (centavos):

- **Receita prevista** = soma dos fixos de receita, pelo último valor de cada um. Sem nenhum fixo de receita, usa a média atual das categorias recorrentes e aparece marcada como “Estimativa”.
- **Pode distribuir** = receita prevista − aportes planejados nas caixinhas.
- **Comprometido por categoria** = fixos da categoria (último valor) + parcelas de cartão previstas para a competência.
- **Sobra** = pode distribuir − soma das metas.
- **Gasto previsto por categoria em mês futuro** = o maior entre a meta e o comprometido. Sem meta, vale só o comprometido.
- **Previsão de Relatórios:** usa o mesmo plano. O gasto previsto é a soma dos gastos previstos por categoria, mais os aportes. Isso substitui a regra “maior entre a média recorrente e a soma dos tetos”.

## Telas

- **Revisão:** novo campo “Lançamento fixo” (`VisualSelect`) para receita e despesa.
- **Orçamentos, aba “Plano e metas”:**
  - cards do plano: Receita prevista, − Aportes, = Pode distribuir, − Metas, = Sobra;
  - gráfico “Despesas por categoria x receita”;
  - metas com um traço marcando o comprometido em fixos.
- **Orçamentos, aba “Fixos”:**
  - totais de receitas e despesas fixas, e quantos chegaram no mês;
  - tabela com último valor, previsto e situação no mês;
  - ações de renomear e encerrar.
- **Diálogo de meta:**
  - média dos últimos 3 meses, com o botão “usar”;
  - lista do que já está comprometido na categoria;
  - aviso quando a meta fica abaixo dos fixos;
  - pode distribuir, outras metas e sobra com esta meta.
- **Transações:** selo “Fixo” nos lançamentos vinculados.
- **Visão geral:** card “Disponível no mês”, com a sobra e os fixos pendentes.

## Gráficos (novos no Design System)

- **Despesas por categoria x receita, visão do mês:** barra única em que 100% é a receita. Cada categoria é uma faixa com a cor da categoria, seguida da faixa de caixinhas e da sobra. Se passar de 100%, o excedente fica em `status-danger`.
- **Despesas por categoria x receita, 12 meses:** colunas empilhadas por categoria, com 6 meses realizados e 6 previstos (listrados), mais a marca da receita de cada mês.
- **Acessibilidade:** os dois têm tabela equivalente (categoria, previsto, fixos, % da receita, meta). A informação nunca depende só de cor.

## Dados

- **`fixed_items`:**
  - colunas: `id`, `name`, `nature` (`income`|`expense`), `category_id`, `match_key` (descrição normalizada), `account_id` (opcional), `ended_at`, `created_at`;
  - RLS de proprietário.
- **`fixed_item_links`:**
  - colunas: `transaction_id` (único), `fixed_item_id`, `linked_by` (`owner`|`auto_similar`) e data;
  - o lançamento importado continua imutável.
- **RPCs com `private.require_owner()`:** criar fixo a partir de um lançamento, vincular, desvincular, renomear e encerrar.
- **Sugestão para lançamentos iguais:** no mesmo trigger da classificação. A migration é genérica: a tabela começa vazia e nada é específico de uma pessoa ou banco.

## Compatibilidade com forks

- Sem fixos, nada muda para quem usa. A previsão continua pela estimativa atual, com a marca “Estimativa” e um atalho para a Revisão.
- As migrations só criam estruturas, sem dados.
