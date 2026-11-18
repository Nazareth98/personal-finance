# Registro de decisões

Use identificadores estáveis. Para substituir uma decisão, acrescente outra e marque a anterior como “Substituída por D-xxx”.

| ID | Decisão | Estado |
| --- | --- | --- |
| D-001 | Produto exclusivo para um usuário; cadastro público desativado. | Vigente |
| D-002 | React/TypeScript/Vite, Supabase e Cloudflare Pages. | Substituída por D-018 |
| D-003 | Arquitetura em camadas; OOP seletiva, sem MVC forçado no React. | Vigente |
| D-004 | MeuPluggy é a única fonte bancária. | Vigente |
| D-005 | Compra no crédito usa o mês de vencimento da fatura como competência. | Vigente |
| D-006 | Metas são tetos percentuais sobre toda receita confirmada e não acumulam. | Vigente |
| D-007 | Previsão usa seis meses de receitas recorrentes; extraordinárias ficam fora da média. | Vigente |
| D-008 | Ajuste manual não edita lançamento importado. | Vigente |
| D-009 | Classificação usa faixas 90/70 e deve ser explicável. | Vigente |
| D-010 | Caixinha sem identificação exige associação manual. | Vigente |
| D-011 | Corporate UI atual e Figma são referência visual; implementação antiga não será restaurada. | Vigente |
| D-012 | Exportação pela interface fica fora do escopo inicial. | Vigente |
| D-013 | Transações de cartão vindas do MeuPluggy ficam no staging até a Etapa 7 calcular a competência pela fatura; não criar lançamento temporário incorreto. | Vigente |
| D-014 | Categoria de lançamento importado é um overlay versionado; confirmação cria feedback e alias sem editar o registro MeuPluggy. | Vigente |
| D-015 | Faturas são identificadas pela competência do vencimento; parcelas futuras ficam separadas do livro realizado e pagamentos são vínculos neutros. | Vigente |
| D-016 | A previsão não persiste lançamentos futuros: usa média recorrente de seis competências, o maior entre histórico e tetos, parcelas projetadas e aporte necessário para metas. | Vigente |
| D-017 | O PWA armazena somente shell e assets estáticos; navegação offline não abre o app autenticado nem persiste dados financeiros ou sessão. | Vigente |
| D-018 | React/TypeScript/Vite, Supabase e Vercel; o frontend usa o monorepo pela raiz e publica `apps/web/dist`. | Vigente |
| D-019 | Categoria de transferência/PIX do provedor não neutraliza o lançamento; transferência própria exige evidência positiva de titularidade ou conciliação entre contas próprias. | Vigente |
| D-020 | Correções de natureza usam overlay auditável sem editar o lançamento MeuPluggy; confirmar aporte, resgate ou pagamento exige vínculo com caixinha ou fatura. | Vigente |
| D-021 | A limpeza de desenvolvimento será seletiva e executada só após a correção semântica: preserva Auth, perfil, categorias e aliases; recria integração, staging, livro e derivados. | Vigente |
| D-022 | A chave idempotente bancária permanece `pluggy:<transactionId>`; `providerId` é metadado opcional de conexões reguladas e não substitui o identificador do MeuPluggy. | Vigente |
| D-023 | A Etapa 10.4 encerra com sincronização manual; a configuração operacional do webhook MeuPluggy fica como implementação futura e não bloqueia a Etapa 11. | Vigente |
| D-024 | Categorias estruturais permanecem globais e protegidas; categorias personalizadas pertencem ao proprietário, declaram aplicabilidade e, quando referenciadas, são arquivadas em vez de excluídas. | Vigente |
| D-025 | A identidade visual de categoria persiste somente chaves permitidas de ícone Lucide e de cor semântica; valores hexadecimais e nomes arbitrários não entram no banco. | Vigente |
| D-026 | Revisões substituídas de natureza e de categoria confirmada são copiadas por trigger para `transaction_review_history`; aliases aprendidos nunca são removidos por uma revisão. | Vigente |
| D-027 | Transferência própria cujo outro lado não é importado registra um lançamento manual neutro em conta própria sem conexão e não cartão; ele é removido ao revisar novamente e oculto se o lado importado for excluído pelo provedor. | Vigente |
| D-028 | Período, busca e filtros ficam nos parâmetros do hash da URL; a busca considera apenas a descrição, e a ordenação permanece local à sessão da tela. | Vigente |
| D-029 | Gráficos de acompanhamento ficam na visão geral e seguem o período selecionado: fluxo e resultado acumulado em seis meses até o período, metas do mês e compromissos de cartão de três meses antes a seis depois. Relatórios mantém a previsão. | Vigente |
| D-030 | Elevação e camadas são tokens (`elevation` com Light/Dark, `zIndex` ordenado); `DESIGN.md` é o contexto do Claude Design e `pnpm design:check` o mantém igual ao JSON. Capturas de inventário ficam fora do Git. | Vigente |
| D-031 | Até 1000 px a navegação principal é uma barra inferior com Visão geral, Transações, Revisão e Cartões; as demais telas, o tema e a saída ficam na folha “Mais”. O contador de pendências da revisão aparece na navegação, com o nome acessível derivado do texto visível. | Vigente |
| D-032 | Abaixo de 680 px, tabelas reais viram lista compacta: cada coluna declara papel `mobile` (primary, detail, value, field, footer, hidden) e o `DataTable` renderiza só uma forma por vez. Tabelas demonstrativas ficam sem papel para preservar baselines. | Vigente |
| D-033 | A Visão geral troca os cards “Livro financeiro” e “Resultado” pelo painel “Precisa de atenção” (revisão, próxima fatura e metas), compara indicadores com o mês anterior por sinal e texto, usa colunas verticais e recolhe valores em “Ver valores”. A demonstração mantém os gráficos antigos para preservar baselines. | Vigente |
| D-034 | Cartões e faturas troca as três tabelas por um painel por cartão: ciclo, limite comprometido (faturas em aberto + parcelas futuras), faturas em abas por competência (materializada ou prevista) com composição compras − estornos − pagamentos = pendente, e “Vincular pagamento” só com pendente. Sai o indicador “Cartões configurados”; entra “Próxima fatura”. A demonstração mantém a tabela antiga para preservar baselines. | Vigente |
