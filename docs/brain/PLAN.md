# Plano de ação do produto

## Princípio de entrega

Construir em incrementos verticais verificáveis. Cada etapa deve deixar o sistema coerente, testado e utilizável, sem implementar antecipadamente as etapas seguintes.

## Etapa 0 — fundação

- manter o Corporate UI atual como base visual;
- extrair e conferir Figma, tokens, componentes e breakpoints;
- documentar contratos de domínio e banco;
- configurar Supabase local, migrations e ambientes;
- definir fixtures Pluggy totalmente anonimizadas;
- manter CI com `pnpm check`.

Aceite: projeto compila, documentação não diverge do código e o ambiente local pode ser recriado sem segredo versionado.

## Etapa 1 — acesso

- login, logout e sessão protegida;
- recuperação de senha por e-mail;
- cadastro público desativado;
- um único usuário autorizado;
- Row Level Security desde a primeira tabela financeira.

Aceite: nenhuma rota ou linha financeira é acessível sem a sessão autorizada.

## Etapa 2 — livro financeiro

- contas, cartões, categorias genéricas e lançamentos;
- lançamentos manuais e ajustes relacionados ao original;
- filtros e visão mensal/anual;
- receitas, despesas, saldo e transferências conciliadas;
- histórico imutável da origem importada.

Aceite: todos os totais são derivados do livro, com dinheiro em centavos exatos e sem dupla contagem.

## Etapa 3 — metas por categoria

- percentual por categoria;
- teto em reais sobre receita confirmada;
- acompanhamento mensal e anual;
- alertas de aproximação e estouro;
- sem acumulação entre períodos.

Aceite: alteração em receita confirmada recalcula corretamente todos os tetos afetados.

## Etapa 4 — caixinhas

- nome, saldo inicial, meta, data-alvo opcional e movimentos;
- aporte e resgate sem efeito indevido em renda ou consumo;
- associação manual quando o extrato não identifica a caixinha;
- sugestão futura somente com evidência anterior.

Aceite: saldo e progresso podem ser reconstruídos pelos movimentos vinculados.

## Etapa 5 — MeuPluggy

- conectar Nubank, Caixa e Itaú por MeuPluggy;
- persistir `itemId` e estado das conexões;
- importar todo o histórico e depois incrementos;
- receber webhooks em endpoint HTTPS;
- registrar evento antes de processar e garantir idempotência;
- exibir atualização da fonte, última importação, tentativa e erro.

Aceite: repetir evento ou importação não duplica lançamento e falha parcial pode ser retomada.

## Etapa 6 — categorização

- normalizar descrição, remover ruído e tokenizar;
- usar estabelecimento, aliases, tokens, conta e natureza como evidência;
- exibir percentual e explicação do match;
- aplicar três faixas de confiança;
- aprender aliases e regras a partir de correções confirmadas.

Aceite: toda classificação automática é reproduzível e explica regra, confiança e evidências.

## Etapa 7 — cartões e parcelas

- fechamento, vencimento, limite e faturas;
- identificar parcelas e projetar competências futuras;
- vincular compra, estorno, fatura e pagamento;
- usar vencimento da fatura como competência da compra.

Aceite: pagamento não duplica despesa, estorno reverte a compra correta e parcelas futuras entram na previsão.

## Etapa 8 — receitas e previsão

- reconhecer salário pela descrição do Itaú;
- separar receita recorrente e extraordinária;
- média móvel dos seis meses recorrentes;
- combinar despesas recorrentes, parcelas, metas e aportes planejados.

Aceite: receita extraordinária altera o realizado e os tetos do período, mas não a média futura.

## Etapa 9 — PWA e estabilização

- manifesto, instalação e shell estático offline;
- não armazenar dados financeiros completos offline;
- responsividade a partir de 320 px;
- acessibilidade, estados de erro e carregamento;
- Playwright para fluxos críticos e validação visual contra Figma;
- deploy na Vercel e Supabase Free.

Aceite: fluxos críticos funcionam em mobile e desktop, `pnpm check` passa e limitações gratuitas estão documentadas.

## Etapa 10 — semântica, revisão e reimportação controlada

### 10.1 — corrigir a origem

Estado: concluída em 16/11/2026.

- tratar PIX/transferência para terceiro como receita ou despesa pelo sinal;
- neutralizar somente com evidência positiva de conta própria;
- reconhecer pagamento de fatura, aporte e resgate sem inflar renda ou consumo;
- cobrir os contratos com fixtures sintéticas.

Aceite: a categoria genérica do provedor, isoladamente, nunca cria `own_transfer`.

### 10.2 — revisão de natureza

Estado: concluída em 17/11/2026.

- adicionar overlay auditável sem editar o lançamento importado;
- separar natureza financeira de categoria;
- exigir conta contraparte, fatura ou caixinha quando a natureza precisar de vínculo;
- manter totais e previsões derivados da semântica efetiva.

Aceite: uma correção transforma o efeito contábil e o vínculo de forma atômica, preservando o original.

### 10.3 — fila de revisão

Estado: concluída em 17/11/2026.

- mostrar por padrão somente sugestões e itens sem categoria/natureza resolvida;
- retirar confirmados da fila principal;
- manter automáticos e confirmados em histórico filtrável com ação “Corrigir”.

Aceite: confirmar um item reduz imediatamente a contagem pendente sem perder rastreabilidade.

### 10.4 — limpar e reimportar o ambiente de desenvolvimento

Estado: concluída em 18/11/2026. Replay, materialização, conciliação, idempotência e ciclo dirigido de atualização/exclusão foram publicados e validados. A integração operacional do webhook foi retirada do aceite e registrada como implementação futura; até lá, a atualização é iniciada manualmente pela aplicação.

- preservar Auth, perfil proprietário, categorias, migrations, secrets e regras `alias` aprendidas;
- remover conexões, staging, execuções, livro, overlays por transação, faturas, caixinhas e demais derivados;
- reconectar o MeuPluggy e executar importação completa com as regras corrigidas;
- reler idempotentemente o histórico das contas de crédito já presente no MeuPluggy;
- materializar os lançamentos preservados no staging antes de conciliar as faturas;
- conferir amostras de PIX, cofrinhos e pagamentos de fatura antes de prosseguir.

Aceite: aliases preservados voltam a classificar a nova importação, os totais não contêm neutralizações indevidas e cada fatura auditada pode ser explicada por suas compras, parcelas, estornos e pagamentos. O roteiro técnico está em [`../architecture/SEMANTIC_REVIEW.md`](../architecture/SEMANTIC_REVIEW.md); a lacuna de cartões está em [`../architecture/CARDS.md`](../architecture/CARDS.md).

## Etapa 11 — correções operacionais e acompanhamento

Executar somente após fechar a importação de compras de cartão da Etapa 10.4. Cada subetapa deve terminar utilizável e validada antes da próxima.

### 11.1 — gestão de categorias

- criar uma tela autenticada para listar, buscar, criar, renomear e ordenar categorias;
- distinguir categorias estruturais do sistema de categorias personalizadas pelo proprietário;
- informar se a categoria se aplica a receita, despesa ou movimento neutro e restringir seleções incompatíveis;
- impedir a exclusão de categorias estruturais e o rompimento de lançamentos, metas, regras, aliases ou classificações existentes;
- arquivar categorias em uso, mantendo o histórico, e permitir exclusão definitiva somente de categoria personalizada nunca utilizada;
- oferecer reatribuição para outra categoria antes do arquivamento quando houver dependências;
- remover categorias arquivadas de novos formulários, preservando sua exibição nos registros históricos.

Aceite: o proprietário gerencia categorias sem criar referências órfãs; categorias arquivadas deixam de aparecer em novas seleções, mas lançamentos e relatórios históricos continuam explicáveis.

### 11.2 — correção e movimentação

- permitir “Revisar novamente” no histórico, criando nova versão do overlay sem alterar o lançamento importado;
- permitir corrigir categoria e natureza, exigindo contraparte, fatura ou caixinha quando aplicável;
- não remover alias aprendido automaticamente; sua manutenção será uma ação explícita separada;
- permitir registrar e vincular os dois lados de uma transferência própria, com saída na origem e entrada no destino;
- manter transferência própria neutra em receita e despesa, embora altere os saldos das duas contas.

Aceite: uma correção preserva o histórico anterior e uma transferência própria movimenta as duas contas sem inflar o resultado do período.

### 11.3 — consistência visual

- eliminar o overflow horizontal da sidebar inclusive durante hover, foco e transições;
- colorir valores negativos da previsão com o token financeiro negativo, preservando também o sinal textual;
- padronizar datas bancárias como `dd/MM/yyyy`, competências como mês/ano e data/hora operacional sem conversão que altere o dia.

Aceite: não há rolagem lateral da sidebar nos viewports suportados, valores negativos permanecem distinguíveis sem depender apenas de cor e datas equivalentes têm a mesma apresentação em todo o sistema.

### 11.4 — exploração por período e ordenação

- tornar ordenáveis todas as colunas de dados aplicáveis; colunas de ações permanecem sem ordenação;
- ordenar datas cronologicamente, dinheiro por `bigint`, percentuais por pontos-base e texto com comparação pt-BR;
- adicionar seleção de mês/ano na visão geral, com anterior, próximo e período atual;
- refletir o período na URL e aplicá-lo conjuntamente a KPIs, faturas, metas, transações e gráficos.

Aceite: toda tabela indica a ordenação com `aria-sort`, e todos os elementos da visão geral representam exatamente o período selecionado.

### 11.5 — gráficos de acompanhamento

- receitas versus despesas por mês;
- evolução do resultado acumulado;
- orçado versus realizado por categoria;
- após validar cartões, evolução das faturas e compromissos parcelados futuros;
- manter tabela ou resumo textual equivalente para acessibilidade.

Aceite: os gráficos seguem o período selecionado, usam os mesmos totais do livro e não dependem somente de cor para comunicar valores.

## Implementações futuras

### Webhook operacional do MeuPluggy

- definir `PLUGGY_WEBHOOK_SECRET` nos dois lados;
- registrar pela API do MeuPluggy os eventos `transactions/created`, `transactions/updated` e `transactions/deleted`;
- validar autenticação, persistência na inbox, processamento dirigido e retentativas;
- manter a sincronização manual como fallback operacional.

Aceite: um evento autenticado é persistido e processado uma única vez, enquanto chamadas sem o segredo continuam rejeitadas.

## Fora do escopo inicial

Cadastro público, família/multiusuário, aplicativo nativo, exportação pela interface, IA externa, bancos fora do MeuPluggy, identificação de caixinha sem evidência e Code Connect antes de componentes estáveis.
