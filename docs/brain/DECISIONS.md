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
| D-031 | Até 1000 px a navegação principal é uma barra inferior com Visão geral, Transações, Revisão e Cartões; as demais telas e a saída ficam na folha “Mais”; o tema fica só no cabeçalho (ajuste de 18/11/2026). O contador de pendências da revisão aparece na navegação, com o nome acessível derivado do texto visível. | Vigente |
| D-032 | Abaixo de 680 px, tabelas reais viram lista compacta: cada coluna declara papel `mobile` (primary, detail, value, field, footer, hidden) e o `DataTable` renderiza só uma forma por vez. Tabelas demonstrativas ficam sem papel para preservar baselines. | Vigente |
| D-033 | A Visão geral troca os cards “Livro financeiro” e “Resultado” pelo painel “Precisa de atenção” (revisão, próxima fatura e metas), compara indicadores com o mês anterior por sinal e texto, usa colunas verticais e recolhe valores em “Ver valores”. A demonstração mantém os gráficos antigos para preservar baselines. | Vigente |
| D-034 | Cartões e faturas troca as três tabelas por um painel por cartão: ciclo, limite comprometido (faturas em aberto + parcelas futuras), faturas em abas por competência (materializada ou prevista) com composição compras − estornos − pagamentos = pendente, e “Vincular pagamento” só com pendente. Sai o indicador “Cartões configurados”; entra “Próxima fatura”. A demonstração mantém a tabela antiga para preservar baselines. | Vigente |
| D-035 | A Revisão troca os indicadores e o selo de pendências por abas com contagem (Pendências · N / Histórico · N) e agrupa a fila pelo motivo: “Vincular” antes de “Categorizar”, porque sem o outro lado o valor conta duas vezes. Botões Todas/Vínculos/Categorias filtram a fila (`reason` na URL); a busca fica visível e os demais filtros recolhem em “Filtros”. Sugestões mostram confiança e evidência na linha e podem ser aceitas com “Confirmar”, que usa a mesma confirmação do diálogo. O Histórico segue em tabela ordenável. | Vigente |
| D-036 | Transações (modo autenticado) mantém busca e Período visíveis e recolhe Conta, Categoria e Natureza em “Filtros”. Os três cartões viram uma faixa única de totais; cada valor fica numa linha só e a fonte acompanha a largura da coluna (12–20 px), rolando em vez de quebrar ou truncar dígitos. A conta sobe para a linha da descrição, “Importado · imutável” sai e só lançamentos manuais ganham o selo “Manual”; saem a coluna Conta e o selo “Dados pessoais”. A demonstração não muda. | Vigente |
| D-037 | Orçamentos (modo autenticado) segue a opção B do canvas: metas agrupadas em “Acima do teto”, “Próximo do teto” e “Dentro do teto” (estouro primeiro), cards com ícone da categoria, disponível/excedente, barra por situação e ritmo diário só no mês corrente; faixa única com receita, % comprometido, gasto nas metas e gastos sem meta; navegação ‹ › com Mensal/Anual no lugar do select. Cada card tem “Editar”, cujo diálogo também exclui a meta (com confirmação) pela RPC `delete_category_budget`; “Definir meta” lista só categorias sem meta. Gastos sem meta consideram apenas despesas confirmadas ou automáticas. A demonstração não muda. | Vigente |
| D-038 | “Nova movimentação” sai do cabeçalho de cada tela e vira a ação principal do app: no desktop, botão no topo da sidebar (só o ícone quando recolhida); até 1000 px, botão flutuante de 56 px acima da barra inferior, com nome acessível e sombra `shadow-md` por ser camada flutuante. O cabeçalho das telas mantém só ações da própria tela (e “Instalar app”). Os baselines de todas as telas mudam de propósito. | Vigente |
| D-039 | Caixinhas (modo autenticado) segue a opção A do canvas com os mesmos blocos de Orçamentos (`summary-strip`, `status-group`, `goal-card`): grupos Abaixo do ritmo → No ritmo → Sem data-alvo → Meta alcançada; plano “guarde R$ X por mês até <mês>” com a regra da previsão (meses até a data-alvo, inclusive o corrente) comparado à média de aportes líquidos dos últimos 3 meses. Cada card tem Aportar, Resgatar, Movimentos (gaveta: painel lateral no desktop, folha inferior no mobile, com link para o lançamento) e Editar. Excluir remove a caixinha sem histórico e arquiva a que tem movimentos ou vínculos; o nome é único só entre ativas. A ação principal de cada tela é o `PageAction` (primário com “+”, no cabeçalho). A demonstração não muda. | Vigente |
| D-040 | Contas, Categorias, Conexões e Relatórios (modo autenticado) seguem o canvas aprovado com o mesmo padrão de D-037/D-039. Contas: cards por tipo (correntes, reservas, cartões) com saldo pelo livro, entradas/saídas do mês, fatura e limite nos cartões e ‘Ver lançamentos’ filtrado; editar nome e saldo inicial e **arquivar** (nunca exclusão física: a conta sai das telas e dos saldos, os lançamentos ficam no livro e aparecem como “Conta arquivada”). Categorias: tabela dividida em Personalizadas, Estruturais (6 visíveis, depois ‘Ver as N’) e Arquivadas, filtro por aplicação, gasto do mês com link e meta. Conexões: card por instituição agrupado por atenção/atualizando/atualizadas, com erro e orientação no próprio card (reconectar item existente fica para quando a Edge Function aceitar `updateItem`). Relatórios: faixa, `DivergingColumnChart` (novo, em `packages/ui`), composição do mês navegável e tabela da previsão; critérios recolhidos. A coluna de `.template-page` passa a `minmax(0,1fr)` para nenhum filho alargar a página. A demonstração não muda. | Vigente |
| D-041 | Protótipo [cabeçalho mobile, logout, filtros, login e animações](https://claude.ai/artifact/LMP2by5qQc5YwZqq48MUXB) aprovado. Até 1000 px o título da aba substitui a marca no cabeçalho do app e a ação principal aparece ali compacta (“+ Meta”, `PageAction` com `shortLabel` via portal); o bloco do título vira só leitura de tela. “Sair” vai para o topo da folha “Mais” e, no mobile e no desktop, sempre abre confirmação com foco em Cancelar. “Filtros” vira botão de ícone (funil) com a altura do campo, contador de ativos no nome acessível e etiquetas removíveis. Login dividido (painel ilustrativo sem valores + formulário), campos com ícone e mostrar senha (`Input` ganha `leadingIcon`/`trailing`), entrada animada em ~1,2 s. Movimento vira tokens (`motion.duration` 80/150/220/320 ms e `motion.easing` standard/enter/exit), validados e espelhados no DESIGN.md: só transform/opacity, entrada sem saída animada, skeleton mínimo de 300 ms no `DataState`, movimento reduzido vira fade de 80 ms. | Vigente |
| D-042 | Protótipo [fatura recolhida, modal e campos, posição do sair](https://claude.ai/artifact/HBZm9B25KhKr91mAuXsN2r) aprovado, para implementar em 4 etapas (ver STATUS). Fatura: lançamentos recolhidos por padrão em “Lançamentos · N”, “Vincular pagamento” centralizado na linha do pendente. Modal: página ao fundo travada, cabeçalho e rodapé fixos com corpo rolável, folha inferior no mobile, ações no rodapé (secundária à esquerda, primária à direita) e botão principal só com o verbo (“Salvar”). Campos: altura única de 44 px, rótulo acima com “(obrigatório)” por extenso, erro com ícone no lugar da ajuda, R$ como prefixo fixo e % como sufixo, alinhados à direita. Sair: opção A, menu da conta no cabeçalho (tema + sair, com confirmação); no desktop, no rodapé da sidebar; sai da folha “Mais”. | Vigente |

> D-042 concluída em 18/11/2026: “Sair” e o tema passaram para o menu da conta (`AccountMenu`, botão “Conta” com `menu`/`menuitemcheckbox`), no cabeçalho até 1000 px e no rodapé da sidebar no desktop. Substitui a posição no topo da folha “Mais” definida na D-041; a confirmação continua. Sem sessão (demonstração) segue o botão de tema avulso.

## D-043 — Asterisco, paginação numerada e mês corrente como padrão (18/11/2026)

- Campos obrigatórios voltam a ser marcados só com asterisco (pedido do usuário), fora do `<label>` e com `aria-hidden`; `required` anuncia.
- `Pagination`: resumo “1–20 de 134” à esquerda; anterior/próxima com ícone e páginas numeradas (primeira, última, vizinhas e reticências) à direita; até 680 px vira “2 / 7” com botões de 44 px.
- Visão geral e Orçamentos abrem no mês corrente, não no último mês com lançamento (parcelas futuras empurravam para frente). Testes autenticados fixam o relógio em 18/11/2026.
- CI: rodadas com `[update visual baselines]` ficam num grupo de concorrência próprio e não são canceladas pelo push seguinte. Novo snapshot visual do modal “Nova movimentação” (folha inferior no mobile).
- Complemento (18/11/2026): seletor “Por página” na paginação (Transações 10/20/50/100, Revisão idem, demo 5/10/20), salvo em `localStorage` (`pf-page-size:<tabela>`, valor fora da lista volta ao padrão). A lista em cards da tabela passa a encolher (`minmax(0,1fr)`, quebra de texto) e os totais de Transações viram linhas compactas por container query em `em` — com a fonte ampliada do Android o conteúdo vazava para a direita.

## D-044 — Login e carregamento refeitos (18/11/2026)

- Marca única: o ícone do app (`/icons/icon.svg`, o mesmo da tela inicial do celular) com o nome “Personal Finance”, no carregamento e no login.
- Carregamento (`BootSplash`): ícone, nome e barra indeterminada; texto de status só aparece após ~1 s. A mesma marcação está no `index.html`, então não há tela branca antes do JavaScript nem pulo até a verificação da sessão.
- Login desktop: painel na cor da ação primária (azul profundo no escuro) com ilustração sem valores — contas, cartões e caixinhas ligadas a um livro reconciliado. Texto do painel em `--color-text-on-action` pleno, por contraste.
- Login celular: marca com nome no topo, formulário logo em seguida, rodapé no fim da tela; sem gráfico decorativo.
- Formulário: título “Entrar”; “Esqueci minha senha” vira link abaixo da senha; botão principal em `lg` (44 px); entrada em ~700 ms, e a troca login ↔ recuperação reanima só cabeçalho e formulário.
- Substitui a composição de login da D-041 (linha decorativa e chips).

## D-045 — Marca “Balanço arredondado” (19/11/2026)

- Escolhida pelo usuário entre quatro conceitos (canvas “Personal Finance — propostas de logo”): duas metades de um círculo, o que entrou e o que saiu, desencontradas; quando as contas fecham, se alinham.
- Geometria (grade 64): círculo r 23, vão de 4 no eixo, metade esquerda sobe 3 e a direita desce 3 em tinta de 45% (55% sobre o azul), cantos do corte com raio 6.
- `BrandMark` em `packages/ui` (SVG em `currentColor`, decorativo). `animated`: as metades alternam como pratos de balança — é a animação do carregamento; com movimento reduzido só a tinta pulsa.
- Ícones do PWA regerados do mesmo desenho: `icon.svg`/192/512 (quadrado arredondado), `icon-maskable` (fundo inteiro, marca em 50%, dentro da zona segura) e `apple-touch-icon.png` 180 px. Cache do service worker em `v2` para os aparelhos buscarem os ícones novos.
- Substitui o ícone de carteira e o `BrandIcon` (Gem) na barra lateral, no carregamento e na tela de configuração.

## D-046 — Metas por valor mensal, não por percentual (19/11/2026)

- Regra de negócio nova, pedida pelo proprietário: cada meta é um teto mensal em reais (`category_budgets.monthly_limit_cents`, bigint > 0). Na visão anual o teto vale 12 ×. O teto não depende mais da receita do período.
- As metas em percentual foram apagadas na migração `budget_amounts` (escolha do proprietário: apagar e recadastrar); a coluna `percentage_basis_points` e `set_category_budget(text, integer)` saíram. Nova `set_category_budget(text, bigint)`, security definer, só `authenticated`.
- Orçamentos: resumo mostra “Total em tetos” em R$ e quanto isso representa da receita confirmada, com a folga em R$; cada card diz “Teto de R$ X por mês”. Categorias mostram “Meta R$ X”.
- Previsão de 6 meses: o envelope de metas passa a ser a soma dos tetos mensais.
- Aplicada no Supabase em 19/11/2026 (versão remota 20261119095640).

## D-047 — Select com aparência própria e linhas de “Gastos sem meta” (19/11/2026)

- `Select` deixa a aparência nativa: mesmo recuo do input à esquerda e seta própria (máscara SVG com `--color-text-secondary`) com respiro à direita. No Android o nativo somava recuo e colava a seta na borda. Campo de data alinhado à esquerda.
- “Gastos sem meta”: grade ícone | nome e valor | ação numa linha só; até 680 px o valor desce para baixo do nome, em tom secundário.

## D-048 — Painel do login centralizado em telas grandes (19/11/2026)

- Coluna de 560 px centralizada no painel da marca; recuo lateral cresce com a tela (48–240 px).

## D-049 — Ocultar valores (19/11/2026)

- Botão de olho “Ocultar valores” (`aria-pressed`) ao lado do menu da conta: no cabeçalho até 1000 px e no rodapé da sidebar no desktop; também no modo demonstração.
- Estado global em `lib/privacy.ts`, salvo no aparelho (`localStorage` `pf-hide-values`). `formatCentsBRL` mostra “R$ •••••”; campos de edição usam `formatCentsPlain` e continuam com o número real.
- Percentuais, sinais (+/−), cores de receita/despesa e o formato dos gráficos continuam visíveis — o objetivo é esconder os montantes de quem olha a tela.

## D-050 — Linha informativa da fatura e casamento automático de pagamento (19/11/2026)

- Problema: na Caixa, “TOTAL DA FATURA ANTERIOR” (cartão) e “PAGAMENTO DE BOLETO” (conta) entravam como despesa, somando-se às compras — cada fatura contava três vezes.
- “TOTAL DA FATURA ANTERIOR” (e variações de saldo anterior) no cartão é `adjustment` neutro e não entra na fatura. Na sincronização pela regra `isStatementCarryover`; nos já gravados por override automático.
- Pagamento: débito na conta com “boleto/fatura/cartão”, do MESMO banco (mesma conexão MeuPluggy) do cartão, vira `card_payment` da fatura quando há uma única evidência — valor igual a uma linha “TOTAL DA FATURA ANTERIOR” próxima ou ao valor em aberto de fatura com vencimento entre −12 e +20 dias. Ambíguo fica para a Revisão.
- Lançamentos importados são imutáveis: as correções usam `transaction_semantic_overrides` com `reason` `auto_statement_carryover` / `auto_card_payment_match` (reversíveis; nunca sobre decisão do proprietário nem lançamento confirmado).
- Roda no banco (`internal_match_card_payments`, só `service_role`) por gatilho após inserir lançamentos e itens de fatura — independe da versão publicada das Edge Functions.
- Aplicado em 19/11/2026: 8 linhas informativas neutralizadas e 4 pagamentos vinculados.

## D-051 — Seletor de fatura com vencimento, período e valores (19/11/2026)

- A fatura leva o mês do vencimento: pagamento em 15/10 de compras de 09/09 a 08/10 quita a que vence em 15/10.
- `VisualSelect` (packages/ui) ganhou `description`, `aside`, `badge`, `group` e `placeholder`; com descrição ou aside vira layout rico (56 px), e em contêiner estreito o valor desce para baixo da descrição.
- “Fatura paga” na Revisão usa `statementChoices` (lib): rótulo “Cartão · vence dd/mm”, descrição “Fatura de mês · compras de dd/mm a dd/mm”, em aberto e total à direita, selos Mesmo valor/Parcial/Paga, grupos Sugerida/Em aberto/Já pagas. A sugerida única vem marcada; a dica mostra o pendente após o vínculo ou avisa se o valor difere.

## D-052 — Logo do banco nas contas (19/11/2026)

- `get_account_institutions()` (só o dono, só leitura) devolve conta → id do conector e nome da instituição, sem identificadores do provedor; o app tolera falha e segue com monograma.
- Logo do Pluggy por id de conector (`cdn.pluggy.ai/assets/connector-icons/<id>.svg`, o mesmo do Pluggy Connect), carregada com `referrerPolicy=no-referrer`; se falhar, monograma do nome (`LogoAvatar` em packages/ui).
- Aparece nos cards de Contas (conta manual mantém o ícone do tipo), no cabeçalho de cada cartão, na linha da conta nas Transações e nas opções do seletor de fatura.
- Pendente: guardar `imageUrl`/`primaryColor` do conector na sincronização e cópia local da logo — exige publicar as Edge Functions.


## D-053 — Pagamento visto pelo cartão é espelho neutro (19/11/2026)

- Problema: o crédito do pagamento no extrato do cartão (Caixa “PGTO BOLETO …”, outro cartão “PAGAMENTO COM SALDO/DEBITO AUTOMATICO/PIX”) entrava como estorno — abatia o gasto do mês e o total da fatura (faturas da Caixa a 2–103% do banco, algumas negativas); o “Pagamento recebido” reconhecido entrava como pagamento e contava junto com o débito da conta.
- Crédito no cartão que começa com “pagamento/pagto/pgto”, ou reconhecido como pagamento de fatura, é `adjustment` neutro e fora da fatura. Só o débito na conta quita a fatura (D-050). “PAG*LOJA” continua estorno.
- Já gravados: override automático `auto_card_payment_mirror` em `internal_match_card_payments` (aplicado em 19/11: 28 espelhos neutralizados, 19 pagamentos da conta vinculados); a linha espelho também serve de evidência de valor para o casamento da conta.
- Limite: fatura paga por conta não conectada aparece em aberto, pois não há débito para vincular.

## D-054 — Fatura pelo billId e pagamento na próxima fatura a vencer (19/11/2026)

- Problema: parcelas chegam do MeuPluggy com a data da compra original e caíam numa fatura antiga (Itaú com faturas a 11% e 214% pagas); pagamento feito após o vencimento ia para a fatura já vencida (janela de +20 dias).
- Compras com `billId` (fatura informada pelo banco) ficam todas na competência da compra mais recente do billId (`billCompetences`); sem billId vale a data. Limite: só enxerga o lote importado.
- Pagamento da conta quita a primeira fatura com evidência que vence a partir do pagamento (tolerância de 3 dias de atraso, até 40 dias à frente).
- `competence` de lançamento importado é derivada: o gatilho de imutabilidade passa a aceitar mudança dela só pelo backend (`auth.uid()` nulo); o app continua sem alterar importados.
- Migration `card_bill_statements` reaplica o calendário atual dos cartões (Itaú: fechamento 7, vencimento 15), move entradas, competências e parcelas, e refaz os vínculos automáticos; os do proprietário ficam.

## D-055 — Camadas flutuantes na top layer (19/11/2026)

- Problema: a lista do `VisualSelect` ficava presa ao corpo rolável do modal e o menu da conta era cortado pela sidebar recolhida (`overflow`); z-index não resolve, porque o `<dialog>` está na top layer.
- `useFloatingLayer` (packages/ui) abre a camada com `popover="manual"` e a posiciona fixa pela âncora: abaixo, ou acima se faltar espaço; presa às bordas; acompanha rolagem e redimensionamento. Classe `.ui-floating`.
- Usado no `VisualSelect` e no `AccountMenu`. `Select` é nativo e não precisa. Toast continua com `--z-toast` e fica atrás de um diálogo aberto (não tratado).

## D-056 — Banco de cada conta vinda do MeuPluggy (19/11/2026)

- Problema: as conexões são do agregador MeuPluggy (conector 200), então todas as contas mostravam a logo e o nome do MeuPluggy; o reconhecimento de salário do Itaú (pelo nome da instituição) também não disparava.
- A Pluggy não informa o banco por conta. Na sincronização, para conexões MeuPluggy, o backend casa com a lista `KNOWN_BANKS` (ids conferidos pelos ícones do CDN da Pluggy; o catálogo `GET /connectors` com a chave do MeuPluggy só devolve o próprio MeuPluggy, visto no log em 19/11) e casa a primeira palavra própria do nome do banco com o nome da conta (`institutionFromAccountName`); mais de um banco possível → nenhum.
- O conector e o nome do banco ficam em `private.pluggy_accounts` (gravados só pelo `service_role`); `get_account_institutions` os prefere ao da conexão. Falha no catálogo não interrompe a importação.
- Limite: salário já importado não é reconhecido de novo; banco fora de `KNOWN_BANKS` continua com a logo do MeuPluggy até entrar na lista.

## D-057 — Diálogo: rodapé de verdade e pergunta no corpo (19/11/2026)

- Problema: as ações ficavam dentro do corpo com `position: sticky` (`data-dialog-actions`), então o rodapé rolava junto; na confirmação de saída a pergunta era o título.
- Todos os diálogos usam a prop `footer` do `Dialog`; o botão de envio aponta para o formulário com `form`. `data-dialog-actions` e `.transaction-form__actions` saíram.
- Confirmações (sair, arquivar conta, excluir meta, excluir caixinha): título curto com a ação, pergunta em `.ui-dialog__question` e consequência no corpo. Substitui a regra do README do design system de pôr a pergunta no título.
- Protótipos no canvas “Personal Finance — melhorias de UI” (etapa 1 de 5).

## D-058 — Gráficos com período em foco e tabela de valores (19/11/2026)

- Gráficos de série ganham hover, toque e teclado com destaque do período, tooltip (valores e variação contra o anterior) e anúncio para leitor de tela; a peça é `useChartFocus`/`ChartTooltip` em packages/ui.
- “Ver valores” deixa de ser `<details>` com cartões soltos: vira botão com rótulo que alterna e uma tabela única, ligada ao gráfico nos dois sentidos. A tabela oculta separada para leitor de tela saiu (a mesma tabela cumpre o papel).
- Fora: gráfico de rosca de categorias e o resumo ao lado do botão (`summary` existe, sem uso ainda). Etapa 2 de 5 do canvas “Personal Finance — melhorias de UI”.

## D-059 — Categorias com 10 cores, 40 ícones e busca (19/11/2026)

- Cores `chart-category-6…10` (rosa, ciano, laranja, índigo, oliva) nos dois temas, todas com 4.5:1 ou mais sobre a superfície; verde e vermelho puros continuam reservados a receita e despesa.
- 20 ícones Lucide novos (pet, vestuário, celular, internet, energia, água etc.). As listas aceitas vivem em `private.is_category_icon_key`/`is_category_color_key`, usadas pelas restrições de `categories` e pelas RPCs `create_category`/`update_category` (migration `20261119160000_category_visual_options`). O domínio repete a lista em `categoryIconKeys`.
- `VisualSelect` ganhou `searchable`: busca no topo, sinônimos em `keywords` (“luz” acha Energia), Enter escolhe o primeiro, seta para baixo vai à opção escolhida.
- O mock dos testes autenticados respondia `get_account_institutions` (D-052) com texto e derrubava o carregamento do livro; corrigido, e quatro expectativas desatualizadas ajustadas (meta em reais da D-046, camada flutuante da D-055, campo Conta duplicado com o formulário fechado).

## D-060 — Confirmar a categoria nos lançamentos iguais (19/11/2026)

- Antes: confirmar a categoria de um lançamento já passava a mesma categoria, como sugestão automática, aos iguais (mesma descrição normalizada, qualquer conta) ainda não confirmados; os já confirmados pelo dono não mudavam e a tela não avisava.
- Agora a revisão (pendências e histórico) mostra “Aplicar a”: “Só este lançamento” mantém o comportamento acima e diz isso; “Este e os iguais (N)” confirma todos na categoria escolhida, com a lista do que muda e o botão com a contagem. Os confirmados em outra categoria só entram marcando a caixa.
- RPC `confirm_transaction_classifications(uuid[], text)`: até 200 itens, delega à confirmação individual para cada um (mesmas validações, alias e histórico de versões) numa única transação. Critério de “igual” no front em `similarTransactions`, o mesmo do alias no banco.
- Vínculos (transferência, fatura, caixinha) continuam um a um, porque dependem do par.

## D-061 — Sincronizar ao abrir, com limite (19/11/2026)

- Ao abrir o app e ao voltar à aba, sincroniza em segundo plano as conexões prontas ou com erro cuja última tentativa passou de 6 h (`connectionsDue`); uma por vez, sem timer. Conta a tentativa, não o sucesso, para que uma falha não repita a cada abertura. Login pendente e atualização em curso ficam de fora.
- Enquanto roda, aviso “Atualizando contas…” no topo; se falhar, aviso com link para Conexões. O livro é atualizado sem voltar ao carregamento (`ledger.refresh`). O botão “Sincronizar agora” em Conexões continua.
- Por que não a cada X minutos: o MeuPluggy atualiza poucas vezes por dia, cada sincronização custa chamadas da Pluggy e execuções da Edge Function, e o webhook já cobre mudanças. Se o webhook falhar com frequência, a evolução é um agendamento no servidor.
- Fora do protótipo: o selo “Atualizado há X” permanente no topo (a data continua em Conexões).

## D-062 — Pix para o próprio titular (19/11/2026)

- Problema: 23 Pix enviados ao próprio titular contavam como despesa e 29 recebidos dele como receita extraordinária (≈ R$ 49,5 mil e R$ 16,6 mil). A regra de não presumir conta própria só por ser Pix continua; o nome do titular é a evidência que faltava.
- O nome do titular fica em `profiles.holder_name`, editado em Conta → “Nome do titular” (RPC `set_holder_name`, só o dono). Exige nome e sobrenome, para não casar Pix de parentes.
- `internal_match_self_transfers` (service_role, gatilho por instrução após importar e ao salvar o nome): Pix com nome e sobrenome do titular e par em conta conectada (não cartão, mesmo valor oposto, até 3 dias) → transferência própria vinculada; sem par (conta fora do app, ex.: Nubank, a pedido do dono) → `adjustment` neutro. Motivo `auto_self_transfer`. Nunca sobrescreve override, vínculo, caixinha ou fatura.
- O dono ainda pode corrigir pela Revisão (override do dono substitui o automático).

## D-063 — Pix pago com cartão de crédito (19/11/2026)

- O Itaú lança na conta corrente o “Pix enviado com cartão” (saída) e o “Crédito liberado para Pix <cartão>” (entrada) no mesmo dia; quem paga é o cartão, que registra a cobrança com tarifa. Antes, o gasto contava duas vezes e o crédito virava receita extraordinária (2 casos em 19/11: R$ 62,49 a mais de cada lado).
- `internal_match_card_funded_pix` (service_role, gatilho por instrução após importar e uma vez na migration): na mesma conta não cartão, saída “pix enviado com cartao…” e entrada “credito liberado para pix…” de mesmo valor, até 1 dia → os dois `adjustment` neutros, motivo `auto_card_funded_pix`. A cobrança no cartão continua sendo a despesa. Nunca sobrescreve decisão existente.

## D-064 — Chaves do Pluggy informadas no app (21/11/2026)

- Cada instância (uma por pessoa; a segunda será um clone do projeto) precisa das próprias chaves do Pluggy. Pedir que uma pessoa leiga configure secrets no Supabase não é viável; o card “Conectar ao Pluggy” em Conexões recebe Client ID e Client Secret.
- A Edge Function `pluggy-credentials` testa as chaves (`POST /auth`) e só então grava: Client ID em `private.pluggy_credentials`, Client Secret no Supabase Vault. `internal_get/set_pluggy_credentials` são só `service_role`; o app vê apenas `get_pluggy_credentials_status()` (configurado, 4 últimos caracteres do Client ID, data do teste). O segredo nunca volta ao navegador.
- As funções do Pluggy leem primeiro o Vault e, sem chaves lá, as variáveis `PLUGGY_CLIENT_ID/SECRET` — instâncias antigas seguem funcionando. Com bancos conectados e sem chaves no app, o card mostra “Chaves do Pluggy no servidor”.

## D-065 — Uma instância por pessoa, backend publicado pelo GitHub Actions (21/11/2026)

- A segunda usuária terá Supabase, Vercel e MeuPluggy próprios; o código é o mesmo. O workflow `supabase-deploy.yml` aplica migrations e publica todas as Edge Functions em cada GitHub Environment listado em `SUPABASE_ENVIRONMENTS` (ref, Access Token e senha do banco por environment). Sem a variável, não faz nada.
- Os nomes dos arquivos de migration foram alinhados às versões registradas no projeto principal (12 renomeados), para `db push` não tentar reaplicar o que já existe. Novas migrations aplicadas pelo MCP precisam ter o arquivo renomeado para a versão gravada, ou ser aplicadas pelo workflow.
- Roteiro em [`NEW_INSTANCE.md`](../architecture/NEW_INSTANCE.md).

## D-066 — Fork da segunda instância com sincronização diária (21/11/2026)

- A segunda usuária monta a própria instância a partir de um fork, com Supabase e Vercel nas contas dela; os dados ficam só lá.
- `fork-sync.yml` roda apenas em forks e traz a `main` original todo dia (API `merge-upstream`, com `SYNC_TOKEN` clássico de escopos `repo` e `workflow`); o push publica backend e app da cópia. Validações pesadas pulam forks.
- Descartado: tudo nas contas do dono (sem defasagem, mas o dono teria acesso administrativo aos dados dela).
