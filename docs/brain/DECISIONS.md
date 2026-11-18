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
