# ADR-0008: Conta observada e automação segura de importação

- Status: aceita.
- Contexto: extratos de conta corrente registram aportes como saída e resgates como entrada. Exigir que a conta importada seja sempre a origem econômica impede classificar um resgate recebido na conta corrente. Filas extensas também tornam inviável revisar manualmente movimentos já cobertos por regras determinísticas.
- Decisão: a conta do lote é a perna observada. Eventos patrimoniais validam papéis por tipo da conta e sinal, aceitando qualquer perna como observada e criando a contrapartida atômica. Regras podem ter escopo de conta e direção, tipo financeiro, contrapartida e autorização explícita de aprovação automática.
- Segurança: regras antigas não automatizam por padrão. Consumo/receita/benefício exigem categoria e subcategoria; eventos patrimoniais exigem contrapartida; estorno exige revisão. Identidade bancária forte pode ser vinculada automaticamente. Coincidência por conta/data/valor apenas bloqueia automação, inclusive entre linhas do mesmo lote.
- Operação: `process_imports` é uma RPC transacional e idempotente. Linhas mantidas na fila recebem motivo e regra. Decisões automáticas são auditáveis e movimentos já aprovados não são reclassificados quando a regra muda.
- Experiência: a fila prioriza as informações necessárias à decisão, permite filtrar por motivo e mostra no máximo 50 itens antes de carregar mais. A conta observada é fixa no formulário; direção e contrapartida ficam explícitas.
- Consequências: a migration 014 precisa ser aplicada antes do novo frontend. Contas de investimento agregadas conciliam fluxo de caixa, mas não representam posição de ativos, custo médio ou valorização de mercado.
