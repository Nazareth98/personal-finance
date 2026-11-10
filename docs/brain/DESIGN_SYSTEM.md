# Design system — Grafite e Âmbar

Versão 1.3 · 10/11/2026 · Referência normativa para refatorações visuais e novas funcionalidades.

Este documento define a experiência desejada e os tokens implementados para os temas claro e escuro. A interface permite escolher tema claro/escuro e lembra a preferência neste navegador; na primeira visita, segue a preferência do sistema.

## 1. Princípios e escopo

- Clareza financeira: cada número informa o que representa, período, moeda e situação (previsto, confirmado ou conciliado).
- Consistência: a mesma ação tem o mesmo nome, posição e comportamento em todas as telas.
- Legibilidade: conteúdo e números têm prioridade sobre decoração; evite gradientes, excesso de sombras e painéis densos.
- Controle: apresentar consequências antes de gravar, importar, restaurar ou anular; preservar o que foi digitado após falhas.
- Acesso: projetar para teclado, leitor de tela, toque, baixa visão e redução de movimento desde o início.
- Divulgação progressiva: mostrar campos essenciais primeiro; detalhes avançados ficam em expansões nomeadas, com erros sinalizados mesmo quando recolhidos.
- Verde é exclusivo de valores financeiros positivos. Nunca usar verde como cor da marca, navegação, seleção, botão, conexão ativa ou confirmação genérica.

A documentação de domínio em [regras](BUSINESS_RULES.md), [cálculos](CALCULATION_POLICIES.md) e [fluxos](UX_FLOWS.md) continua sendo a autoridade sobre cálculos e persistência. Uma decisão visual não pode alterar semântica financeira, autorização ou comportamento transacional.

## 2. Cores e tokens semânticos

Usar nomes semânticos nos componentes. Os valores abaixo são a fonte dos futuros tokens CSS; não espalhar hexadecimais por telas. A tabela define o tema claro.

| Token CSS | Valor | Aplicação |
| --- | --- | --- |
| `--color-bg` | `#FAFAF9` | Fundo da aplicação |
| `--color-surface` | `#FFFFFF` | Cards, formulários e diálogos |
| `--color-surface-muted` | `#F5F5F4` | Cabeçalhos de tabela e áreas secundárias |
| `--color-text` | `#1C1917` | Títulos, corpo e valores neutros |
| `--color-text-secondary` | `#57534E` | Descrições e metadados |
| `--color-text-muted` | `#78716C` | Informação auxiliar em branco; não usar sobre fundos escuros |
| `--color-border` | `#E7E5E4` | Separadores decorativos; insuficiente para identificar controles sozinho |
| `--color-border-control` | `#78716C` | Contorno de inputs, checkbox e controles |
| `--color-primary` | `#92400E` | Botão principal e links |
| `--color-primary-hover` | `#78350F` | Hover da ação principal |
| `--color-primary-pressed` | `#451A03` | Ação principal pressionada |
| `--color-on-primary` | `#FFFFFF` | Texto e ícones sobre ação principal |
| `--color-selected-bg` | `#FEF3C7` | Seleção e item atual |
| `--color-selected-text` | `#78350F` | Texto sobre seleção |
| `--color-accent` | `#F59E0B` | Detalhe decorativo e séries gráficas; nunca texto sobre branco |
| `--color-focus` | `#92400E` | Indicador de foco em superfícies claras |
| `--color-nav-bg` | `#1C1917` | Navegação lateral |
| `--color-nav-text` | `#FAFAF9` | Texto da navegação escura |
| `--color-nav-muted` | `#D6D3D1` | Metadados na navegação escura |
| `--color-positive` | `#15803D` | Valor financeiro positivo |
| `--color-positive-bg` | `#F0FDF4` | Destaque suave de valor positivo |
| `--color-negative` | `#B91C1C` | Valor negativo e erro, sempre com contexto textual |
| `--color-negative-bg` | `#FEF2F2` | Fundo de erro ou valor negativo |
| `--color-warning` | `#92400E` | Avisos e pendências |
| `--color-warning-bg` | `#FFFBEB` | Fundo de aviso |
| `--color-info` | `#44403C` | Informação e confirmação genérica |
| `--color-info-bg` | `#F5F5F4` | Fundo informativo |
| `--color-disabled-bg` | `#E7E5E4` | Controle indisponível |
| `--color-disabled-text` | `#57534E` | Texto indisponível |
| `--color-overlay` | `rgb(28 25 23 / 48%)` | Fundo atrás de diálogo modal |

### Combinações e contraste

Meta: WCAG 2.2 nível AA. Texto normal exige contraste ≥ 4,5:1; texto grande (24 px regular ou aproximadamente 18,7 px negrito) ≥ 3:1. Contornos necessários à identificação de controles, ícones informativos e indicadores de estado exigem ≥ 3:1 em relação às cores adjacentes. Revalidar combinações no componente real, incluindo hover, foco e fundos alternados.

Combinações de referência (razões aproximadas):

| Primeiro plano / fundo | Contraste | Uso |
| --- | --- | --- |
| `#1C1917` / `#FFFFFF` | 17,5:1 | Corpo e títulos |
| `#57534E` / `#FFFFFF` | 7,6:1 | Texto secundário |
| `#78716C` / `#FFFFFF` | 4,8:1 | Texto auxiliar e contorno |
| `#FFFFFF` / `#92400E` | 7,1:1 | Botão principal |
| `#78350F` / `#FEF3C7` | 8,1:1 | Seleção |
| `#15803D` / `#F0FDF4` | 4,8:1 | Valor positivo |
| `#B91C1C` / `#FEF2F2` | 5,9:1 | Erro ou valor negativo |

Não reduzir opacidade de textos para criar variações. Não usar branco sobre âmbar vivo `#F59E0B`. Bordas decorativas claras não substituem contorno de campo. Links no conteúdo são sublinhados; seleção combina fundo, marcador e nome acessível, sem depender apenas de cor.

### Semântica financeira

- Verde: saldo, entrada ou resultado positivo, acompanhado de sinal ou rótulo. Um valor positivo não implica melhora em todo contexto: aumento de dívida é neutro ou negativo conforme o significado, nunca verde automaticamente.
- Vermelho: saldo negativo, saída em uma visão de fluxo assinado ou erro. Despesas em listagens por categoria podem permanecer grafite com o rótulo “Despesa”; não transformar todo gasto em alerta.
- Zero, transferências próprias, aportes, pagamento de fatura e valores sem avaliação de sinal: grafite. Não tratar movimentação patrimonial como receita/consumo pela cor.
- Previsão não é confirmação: escrever “Previsto” e, em gráficos, usar traço/padrão distinto. Valores desconhecidos mostram “Não informado”, nunca `R$ 0,00`.
- Confirmação “Conta salva”, “Importação concluída” e conexão “Ativa”: ícone de confirmação e texto grafite em superfície neutra. Um alerta genérico de sucesso não usa verde.
- Avisos precisam de título ou rótulo (“Vence amanhã”, “Revisão pendente”); o âmbar de marca sozinho não significa alerta.

## 3. Tipografia, números e linguagem

Fonte: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Utilizar Inter apenas se disponível localmente ou hospedada pelo próprio projeto; a interface deve funcionar com a alternativa de sistema sem downloads externos. Pesos 400, 500, 600 e 700.

| Papel | Tamanho / entrelinha | Peso |
| --- | --- | --- |
| Título da página | 32 / 40 px; 28 / 36 px no celular | 700 |
| Título de seção | 24 / 32 px | 600 |
| Título de card | 18 / 26 px | 600 |
| Corpo, campos e botões | 16 / 24 px | 400; botões 600 |
| Tabela, rótulo e ajuda | 14 / 20 px | 400; rótulo 600 |
| Metadado excepcional | 12 / 18 px | 400 |
| Indicador financeiro principal | 28 / 36 px; 24 / 32 px no celular | 600 |

Implementar tamanhos em `rem` (base do navegador de 16 px), sem impedir ajuste de fonte. Não usar 12 px para dados financeiros, mensagens de erro ou controles. Evitar caixa alta em frases e espaçamento negativo que comprometa leitura. Texto corrido com largura aproximada de 65–75 caracteres.

Valores monetários: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`, algarismos tabulares (`font-variant-numeric: tabular-nums`) e alinhamento à direita em tabelas. Preservar centavos exatos no domínio; apresentação não introduz arredondamento intermediário. Não abreviar totais por padrão. Quando necessário, apresentar valor completo por mecanismo acessível por toque e teclado, além da abreviação.

Mostrar `R$ 1.234,56`, `−R$ 123,45`, `R$ 0,00`; sinal positivo é opcional quando “Entrada” já esclarece a direção. Datas `dd/mm/aaaa`, competência `mm/aaaa`, sempre com rótulos distintos (“Data do evento”, “Data bancária”, “Competência”). Tratar datas de calendário sem deslocamento acidental por fuso. Percentuais seguem pt-BR e precisão explícita.

UX em português brasileiro, frases diretas e verbos específicos: “Salvar conta”, “Revisar importação”, “Anular lançamento”. Evitar “OK”, “Enviar” ou “Confirmar” sem contexto. Ajuda explica o que preencher; erro explica o problema e como corrigir. Exemplo: “Informe um valor maior que zero.” Não expor SQL, stack traces, IDs internos ou credenciais.

## 4. Espaçamento, forma e elevação

Escala em múltiplos de 4 px: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`, `--space-4: 16px`, `--space-6: 24px`, `--space-8: 32px`, `--space-10: 40px`, `--space-12: 48px`, `--space-16: 64px`.

- Ícone/texto: 8 px. Rótulo/campo: 8 px. Campo/ajuda: 4 px. Campos: 16–24 px. Seções: 32 px.
- Padding de card: 24 px no desktop, 16 px no celular. Conteúdo de página: 32 px no desktop, 24 px no tablet, 16 px no celular.
- Raios: campo/botão 8 px; card 12 px; diálogo 16 px; badge 999 px. Não usar pílulas para todos os controles.
- Bordas: 1 px; marcador selecionado 3 px. Sombra de popover `0 4px 16px rgb(28 25 23 / 12%)`; diálogo `0 16px 48px rgb(28 25 23 / 20%)`. Cards comuns usam borda, sem sombra obrigatória.
- Camadas: conteúdo 0, cabeçalho fixo 10, popover 20, overlay 30, diálogo 40, toast 50. Elementos dentro de modal respeitam seu contexto de empilhamento; um toast não cobre o foco.

## 5. Estrutura e navegação responsiva

Cabeçalho de página: título único `h1`, descrição curta quando útil, período/contexto atual e ação principal. Em seguida filtros, resumo e conteúdo detalhado. Uma ação principal por região de tarefa; ações secundárias ficam agrupadas de forma consistente.

| Largura disponível | Estrutura |
| --- | --- |
| Menor que 768 px | Uma coluna; navegação recolhível; formulários empilhados; cards de resumo em uma coluna quando valores não couberem |
| 768–1199 px | Navegação recolhível; até duas colunas de cards/campos relacionados |
| A partir de 1200 px | Sidebar de 240 px ou faixa compacta de 80 px; conteúdo fluido até 1440 px; até quatro indicadores |

Breakpoints orientam a composição, mas o conteúdo determina quando quebrar. Usar `minmax(0, 1fr)`, quebra de texto e largura mínima de campo compatível. Não truncar valores financeiros para caber. A página deve funcionar a 320 CSS px e com zoom de 400%, sem rolagem horizontal global; tabelas genuinamente bidimensionais podem ter rolagem própria identificada.

Navegação usa links para destinos, botões para ações e `aria-current="page"` no destino atual. Sidebar grafite; item atual com fundo âmbar suave, texto âmbar escuro e marcador. Não usar verde. Menu móvel tem nome “Abrir navegação”, `aria-expanded`, fecha por Escape, devolve foco e não oculta logout. Se modal, segue o contrato de diálogo.

Incluir link “Pular para o conteúdo”, landmarks `header`, `nav`, `main` e hierarquia de títulos sem saltos arbitrários. Preservar filtros e posição quando o usuário retorna de um detalhe. Cabeçalhos ou barras fixas não podem encobrir conteúdo ou foco; considerar área segura do dispositivo.

## 6. Contrato dos componentes

### Botões, links e ícones

- Principal: fundo `primary`, texto `on-primary`, estados hover/pressed definidos na tabela de cores.
- Secundário: superfície branca, texto grafite e borda de controle; hover em superfície neutra.
- Terciário: fundo transparente e texto `primary`; manter área clicável e indicação de hover.
- Destrutivo: `negative` com texto branco; verbo explícito (“Anular lançamento”), confirmação proporcional ao impacto.
- Altura padrão mínima de 44 px e padding horizontal de 16 px. Adotar alvo de toque de pelo menos 44 × 44 px inclusive em botões só com ícone, maior que o mínimo AA de 24 × 24 px. Evitar alvos adjacentes sem espaço.
- Ícones de 20 px, traço consistente, acompanhados de texto em ações importantes. Ícones decorativos usam `aria-hidden`; botões de ícone têm nome acessível específico, por exemplo “Editar conta Carteira”. Tooltip é ajuda complementar e aparece por foco e hover, fecha por Escape; não substitui nome.
- Loading mantém largura, mostra texto “Salvando…” e `aria-busy`; impedir envios duplicados. Indisponibilidade tem explicação próxima. Não usar `cursor: wait` para todo estado disabled nem opacidade global que apague o conteúdo.

### Campos e formulários

Rótulos visíveis e associados por `for`/`id`; placeholder só exemplifica. Altura mínima 44 px, fundo branco, contorno `border-control`, padding 12 px. Indicar campos obrigatórios em texto (ou asterisco com legenda). Usar autocomplete e tipos nativos adequados; permitir colar senha e usar gerenciadores.

Agrupar com `fieldset`/`legend` quando houver uma pergunta comum. Ajuda e erro ficam abaixo e vinculados por `aria-describedby`; erro também usa `aria-invalid`. Validar após interação ou envio, sem interromper cada tecla. No envio inválido, mostrar resumo com links aos campos, mover foco para o resumo e preservar entradas. Não comunicar erro só por borda vermelha.

Moeda aceita entrada brasileira e teclado decimal (`inputmode="decimal"`), informa unidade, permite correção e não move o cursor a cada dígito. Evitar `type="number"` para dinheiro com vírgula. Datas mostram formato e distinção de competência. Máscaras não bloqueiam teclado, colagem ou tecnologias assistivas.

Preferir select, checkbox e radio nativos. Switch apenas para preferência binária de efeito imediato e reversível; radio para escolhas exclusivas; checkbox para seleção múltipla. Todos usam âmbar, nunca verde. Formulários extensos dividem-se por assunto; mostrar progresso textual quando houver etapas. Avisar antes de descartar edição, oferecendo “Continuar editando”.

### Cards e indicadores

Card apresenta título, valor, período, qualificador e ação quando aplicável. Exemplos: “Saldo disponível · novembro de 2026”; “Receita prevista · ainda não confirmada”. Variação deve explicar base de comparação e direção (“R$ 120,00 a mais que outubro”), sem presumir que subir é bom.

Não tornar todo card clicável se houver controles internos. Não destacar o primeiro card automaticamente em verde. Valor positivo pode ter texto verde; o restante do card permanece neutro. Estado desconhecido ou carregando nunca aparece como zero.

### Tabelas, listas, filtros e paginação

Usar tabela semântica com `caption` (visível ou acessível), `th` e `scope`; texto à esquerda, dinheiro à direita. Densidade padrão: fonte 14 px, padding vertical 12 px, horizontal 16 px; linhas acomodam controles de 44 px. Cabeçalhos de ordenação são botões e expõem `aria-sort` na coluna. Ações por linha têm nomes que identificam o item.

Filtros têm rótulos, resumo de filtros ativos e “Limpar filtros”; manter período sempre visível. Debounce em busca não remove foco; anunciar quantidade final sem narrar cada tecla. Paginação informa intervalo e total, com nomes “Página anterior” e “Próxima página”. Seleção em lote distingue itens da página de todos os resultados e informa quantidade/impacto antes da ação.

No celular, escolher lista de registros com rótulos de campo ou tabela em região rolável nomeada e acessível por teclado. Manter valor, natureza, data e ação essenciais; detalhes podem expandir. Não esconder silenciosamente colunas necessárias à decisão. Ordenação e filtros continuam disponíveis.

### Badges, avisos e mensagens

Badges têm texto (“Previsto”, “Conciliado”, “Pendente”, “Anulado”) e não simulam botão. Pendência usa âmbar; informação e confirmação genérica usam grafite; erro usa vermelho com ícone/rótulo. Verde aparece apenas em valor financeiro positivo, inclusive em badges.

Feedback de gravação simples usa `role="status"`/região `aria-live="polite"`. Falha que impede seguir pode usar `role="alert"` sem anúncios duplicados. Erros relevantes ficam persistentes junto da tarefa; toast é complementar, nunca o único local de erro ou ação. Mensagens transitórias não recebem foco e permitem tempo suficiente de leitura; mensagens com ação permanecem até dispensa. Informar o resultado e próximo passo, sem expor detalhes técnicos.

### Diálogos e confirmações

Usar diálogo modal acessível (`dialog` nativo ou implementação equivalente), nomeado por título, descrição quando necessária, foco inicial apropriado, foco contido e retorno ao acionador. Fundo inerte; Escape fecha quando isso não interromper uma operação irreversível em andamento. Fechar não confirma. Não depender apenas de clique fora; fornecer “Cancelar” ou “Fechar”. Evitar modais aninhados.

Largura usual até 560 px, ou 800 px para prévias complexas; altura máxima respeita viewport com rolagem interna e rodapé alcançável. Em exclusão/anulação, foco inicial vai para a alternativa segura. Informar objeto, valor, período, efeito e possibilidade de reversão. Restauração/importação usa prévia e confirmação explícita; nunca disparar gravação ao escolher arquivo.

### Gráficos e progresso

Preferir barras/linhas a pizzas com muitas categorias. Título, período, unidade, legenda e resumo textual são obrigatórios; oferecer tabela equivalente. Tooltips precisam funcionar por teclado e toque. Não depender só de cores: usar rótulos, marcadores e padrões.

Séries de categorias usam grafite `#44403C`, âmbar escuro `#92400E`, âmbar médio `#B45309` e âmbar vivo `#F59E0B`, com borda/traços contrastantes e nomes. Essas cores não garantem contraste entre séries adjacentes; separar ou usar padrões e validar no gráfico final. Verde é reservado a série que represente valor positivo, nunca categoria arbitrária. Negativo usa vermelho com sinal/contexto. Previsão tem linha tracejada. Mostrar baseline zero em barras e explicar escalas; não usar eixo truncado que distorça comparação.

Progresso de meta usa âmbar/grafite, nome acessível, valor atual, objetivo e percentual. Meta cumprida não torna a barra verde automaticamente. Progresso indeterminado informa “Processando”; evitar percentuais fictícios.

## 7. Estados de toda tela

| Estado | Comportamento exigido |
| --- | --- |
| Carregando | Skeleton neutro ou mensagem; região `aria-busy`; não exibir zeros temporários |
| Primeiro uso | Explicar o recurso e oferecer primeiro passo: “Você ainda não tem contas. Criar conta” |
| Busca sem resultado | Mostrar filtros/contexto e ação “Limpar filtros”; preservar cadastro existente |
| Erro recuperável | Explicar, preservar dados e oferecer “Tentar novamente” |
| Sem conexão | Informar que não foi possível sincronizar; não afirmar que gravou; preservar edição |
| Sem permissão/sessão expirada | Não revelar dados; explicar como entrar novamente e tratar rascunhos conforme política de privacidade |
| Conteúdo parcial | Identificar o que está indisponível; não mostrar total parcial como completo |
| Concluído | Mensagem específica e próximo passo, sem verde genérico |
| Ação indisponível | Explicar pré-requisito próximo ao controle; tooltip sozinho não basta |

Animações de estado duram 120–200 ms e não carregam informação essencial. Respeitar `prefers-reduced-motion: reduce`, removendo deslocamentos e animações contínuas. Não usar flashes, contadores animados ou skeleton pulsante obrigatório. Atualizações automáticas não roubam foco nem reordenam linhas durante edição.

## 8. Aplicação aos fluxos financeiros

| Área | Hierarquia e proteção |
| --- | --- |
| Autenticação | Uma tarefa por vez, rótulos visíveis, mostrar/ocultar senha com nome e estado, erro compreensível e recuperação acessível |
| Dashboard | Período → saldos/realizados/previstos separados → metas → movimentos recentes; detalhamento por ação explícita |
| Lançamentos | Período/filtros → lista → detalhes; natureza, conta, datas e competência explícitas; criação não perde filtros |
| Contas e cartões | Saldo e contexto; limites e dívidas com rótulos; pagamento de fatura não aparece como nova despesa |
| Faturas/parcelas | Competência, vencimento, total declarado, total calculado e diferença; distinguir agenda de ocorrência confirmada |
| Metas/caixinhas | Objetivo, período, base de renda, disponível e excedente; aporte separado de consumo |
| Holerites | Componentes → total calculado → crédito real → divergência; valores desconhecidos identificados |
| Importação | Arquivo → prévia → revisão → confirmação → resultado; totais, duplicidades, inválidos e itens ignorados visíveis |
| Classificação | Categoria/subcategoria atuais e proposta; informar alcance de regra e histórico preservado |
| Open Finance | Estado textual da conexão, consentimento, última sincronização e revogação; distinguir mock e integração real |
| Backup/restauração | Exportação JSON para restauração; prévia aditiva do próprio workspace, quantidades/avisos e confirmação; conexões restauradas revogadas |

Não solicitar arquivos financeiros para exemplos de interface. Usar dados sintéticos. Não exibir dados pessoais em capturas, logs ou fixtures. Controles de privacidade devem ocultar valores também dos nomes acessíveis quando a intenção for ocultação na apresentação; explicar que isso não substitui autenticação nem protege o DOM.

## 9. Acessibilidade verificável

Critério de entrega: WCAG 2.2 AA no fluxo completo, incluindo estados de erro. Bibliotecas ou testes automáticos isolados não comprovam conformidade.

- Teclado: tudo acessível por Tab/Shift+Tab, Enter/Espaço conforme elemento, Escape em overlays; sem armadilha fora de modal. Ordem segue a leitura; não usar `tabindex` positivo.
- Foco: `outline: 3px solid var(--color-focus); outline-offset: 3px` em superfícies claras. Em fundo grafite usar anel `#FEF3C7`; em botões preenchidos usar separação branca para contraste. Nunca remover foco sem substituição; foco não pode ficar encoberto.
- Leitor de tela: landmarks, títulos, rótulos, erros associados, anúncios de resultado e nomes específicos de ações. Preferir HTML nativo a ARIA redundante.
- Contraste: verificar texto, links, ícones, contornos e foco em todos os estados, sem confiar só na tabela de tokens.
- Reflow: testar 320 CSS px, zoom de 200% e 400%, texto ampliado e espaçamento de texto ajustado (entrelinha 1,5; parágrafos 2; letras 0,12em; palavras 0,16em) sem perda de conteúdo ou operação.
- Interação: nenhum recurso depende exclusivamente de hover, arrastar, cor, gesto complexo ou orientação do dispositivo. Oferecer botões para alternativas a drag and drop.
- Preferências: respeitar redução de movimento e cores forçadas; preservar bordas e indicadores do sistema em `forced-colors`. Não bloquear zoom.
- Tempo: avisar expiração quando possível, oferecer continuidade conforme autenticação e preservar entrada de modo seguro. Não impor limite arbitrário a tarefas financeiras.

## 10. Adoção, manutenção e critérios de aceite

Este documento é a referência obrigatória para telas novas e refatorações. Implementar tokens centralizados e componentes compartilhados antes de substituir estilos tela a tela. Não adicionar framework, biblioteca ou fonte externa apenas para cumprir a aparência sem avaliar necessidade.

Sequência de migração: tokens e base tipográfica → navegação e layout → botões/campos/feedback → tabelas/cards/diálogos → fluxos financeiros e gráficos. Migrar cada fluxo com estados completos, mantendo regras e testes de domínio. Não misturar a migração com mudanças financeiras implícitas.

Toda entrega visual deve atender ao checklist:

- [ ] Usa tokens e componentes compartilhados; não introduz uma paleta paralela.
- [ ] Verde só aparece em valores financeiros positivos; zero, seleção e sucesso genérico permanecem neutros/âmbar.
- [ ] Título, período, ação principal e próximos passos são claros.
- [ ] Previsto/confirmado, desconhecido/zero e transferência/consumo estão distintos.
- [ ] Loading, vazio, erro, sucesso e indisponibilidade têm comportamento definido.
- [ ] Teclado, foco, leitor de tela, contraste, zoom, toque e movimento reduzido foram verificados.
- [ ] Fluxo funciona no celular e desktop com valores longos e textos reais em pt-BR.
- [ ] Nenhuma informação depende apenas de cor, hover ou tooltip.
- [ ] Operações financeiras mantêm prévia/confirmação, proteção contra duplicidade e recuperação de erro.
- [ ] Testes existentes continuam passando; novas verificações cobrem mudanças relevantes de interação.
- [ ] Evidências visuais usam somente dados sintéticos; limitações verificadas são registradas em KNOWN_ISSUES.

Mudança de token ou contrato compartilhado deve atualizar este documento no mesmo commit e revisar os componentes afetados. Exceções devem ser justificadas e documentadas, mantendo os requisitos de acessibilidade e a reserva do verde. Não declarar a interface acessível ou a migração completa sem evidências.

## 11. Tema escuro e biblioteca de ícones

O tema escuro reutiliza os mesmos tokens semânticos do tema claro; componentes não escolhem cores por contexto com valores hexadecimais próprios. A aplicação troca `data-theme` no elemento raiz, respeita `prefers-color-scheme` na primeira visita e persiste a escolha localmente. Contraste-alvo: WCAG 2.2 AA para texto (4,5:1) e controles/indicadores (3:1).

| Token | Dark | Uso |
| --- | --- | --- |
| `--color-bg` | `#11100F` | Fundo geral |
| `--color-surface` | `#1C1917` | Cards, formulários e diálogos |
| `--color-surface-muted` | `#292524` | Áreas secundárias e controles neutros |
| `--color-text` | `#FAFAF9` | Texto principal |
| `--color-text-secondary` | `#D6D3D1` | Texto secundário e navegação |
| `--color-text-muted` | `#A8A29E` | Texto auxiliar |
| `--color-border` / `--color-border-control` | `#44403C` / `#78716C` | Divisores / contorno de controles |
| `--color-primary` / `--color-on-primary` | `#FBBF24` / `#1C1917` | Ação principal e texto nela |
| `--color-primary-hover` / `--color-primary-pressed` | `#FCD34D` / `#F59E0B` | Estados da ação principal |
| `--color-selected-bg` / `--color-selected-text` | `#422006` / `#FDE68A` | Seleção com contraste independente da cor |
| `--color-nav-bg` / `--color-nav-text` | `#0C0A09` / `#FAFAF9` | Navegação |
| `--color-positive` / `--color-positive-bg` | `#4ADE80` / `#052E16` | Valores financeiros positivos, com rótulo/sinal |
| `--color-negative` / `--color-negative-bg` | `#FCA5A5` / `#450A0A` | Valores negativos e erros contextualizados |
| `--color-warning` / `--color-warning-bg` | `#FCD34D` / `#422006` | Alertas e revisão pendente |
| `--color-info` / `--color-info-bg` | `#D6D3D1` / `#292524` | Informação neutra |
| `--color-disabled-bg` / `--color-disabled-text` | `#44403C` / `#A8A29E` | Controles indisponíveis |
| `--color-focus` | `#FCD34D` | Foco visível no tema escuro |

Combinações verificadas por cálculo: texto principal/fundo 18,2:1; texto secundário/superfície 11,7:1; auxiliar/superfície 6,9:1; texto da ação/âmbar 10,5:1; texto selecionado/fundo selecionado 11,7:1; contorno de controle/superfície 3,65:1. Revalidar em capturas reais após mudanças nos componentes. Verde continua reservado a valores financeiros positivos; sucesso genérico, aporte e transferência permanecem neutros.

### Ícones

A biblioteca é `lucide-react`. Importar ícones individualmente do pacote para permitir tree-shaking. Tamanho padrão 18–20 px, traço coerente e cor herdada do texto/tokens. Ícones ao lado de um rótulo visível usam `aria-hidden="true"`; controles apenas com ícone precisam de nome acessível (`aria-label` ou texto oculto) e foco visível. Não usar cor do ícone como único sinal de estado.

A navegação expandida usa ícone e nome textual. O controle de tema é um botão circular discreto de 44 px com sol/lua; seu nome acessível e `title` informam a ação disponível (“Usar tema claro/escuro”). A escolha persiste no navegador. A saída usa explicitamente `--color-nav-text`, inclusive no tema escuro, sem herdar a cor de texto do botão primário.
## 12. Aplicação na navegação e na Visão geral

A sidebar mantém marca, contexto privado, destinos e ações de tema/sair. O item atual combina nome, ícone, fundo e marcador lateral âmbar; cada alvo tem no mínimo 44 px de altura e expõe `aria-current="page"`. No desktop, o botão “Minimizar menu lateral” recolhe a sidebar para 80 px, mantendo os ícones, nomes acessíveis e indicação da página atual. “Expandir menu lateral” restaura 240 px. A preferência fica em `personal-finance-sidebar-collapsed` no navegador; armazenamento bloqueado não impede a interação.

Abaixo de 1200 px, a preferência compacta do desktop não oculta os rótulos: a navegação vira um painel acionado por “Abrir navegação”, expõe `aria-expanded`, fecha por Escape ou seleção e devolve foco ao acionador. Tema e saída ficam no rodapé da navegação, sempre disponíveis mesmo com o painel móvel fechado. Em janelas de pouca altura, a sidebar permite rolar até suas ações.

A Visão geral começa com a descrição do período e quatro indicadores no máximo: renda confirmada, consumo, resultado e aportes. Cada card mostra nome, ícone decorativo, valor em algarismos tabulares e qualificador. Renda só usa verde quando positiva; resultado recebe cor pelo sinal; consumo, aportes e saldos de conta permanecem neutros, pois transferências e saldos de passivos não são, por si, ganhos. Cards ficam em quatro colunas largas, duas em tablet e uma em telas estreitas. Disponibilidade por categoria, contas e próximos passos seguem abaixo, sem tornar o card inteiro clicável.
## 13. Aplicação nas telas restantes

- Lançamentos usa formulário destacado, busca por descrição e tabela com cabeçalhos semânticos, competência, natureza e valores alinhados. A exportação CSV e a ação de anulação mantêm os comandos existentes.
- Contas apresenta cartões responsivos com tipo, instituição, saldo calculado e estado arquivado; arquivar/reativar continua usando a mutação existente.
- Cartões destaca configuração, limite, fechamento, vencimento e consumo da competência. Faturas e parcelamentos recebem títulos com ícones para facilitar a leitura.
- A tabela permanece rolável em telas estreitas; campos, bordas, superfícies e estados usam tokens de tema claro/escuro.
- A atualização é visual: não altera cálculos, persistência, autorização, importação ou regras de conciliação.
Orçamentos, caixinhas, holerites, importação/revisão, Meu Pluggy, categorias/regras e perfil/backup seguem o mesmo cabeçalho de seção com ícone decorativo, descrição curta e ações identificadas. Listas usam cards e estados vazios; prévias, revisões e restauração preservam seus avisos e confirmações. Os componentes usam tokens semânticos nos dois temas e continuam responsivos.
## 14. Sinais financeiros e Livro financeiro

Saldos com sinal seguem o mesmo contrato em toda tela: valores acima de zero usam `--color-positive`, abaixo de zero usam `--color-negative` e zero permanece neutro. O Livro financeiro agrupa conta e natureza junto à descrição; categoria e subcategoria aparecem juntas, com ação contextual de categorizar, adicionar subcategoria ou editar classificação. Em telas estreitas, cada movimento vira um cartão legível sem remover informação ou ações.

## 15. Composição de cards, cabeçalhos e ícones

### Card padrão

- O card é uma superfície de conteúdo agrupado, não um contêiner genérico para cada parágrafo. Use-o para indicadores, contas, objetivos, itens de revisão ou grupos de informação com relação clara.
- Fundo `--color-surface`, borda de 1 px `--color-border`, raio de 12 px e sem sombra em repouso. A sombra é reservada a elementos que flutuam sobre o conteúdo, como popovers e diálogos.
- Padding interno: 24 px em desktop e 16 px abaixo de 768 px. Use 16 px entre blocos independentes; 8 px entre título e descrição ou rótulo e valor relacionado; 4 px entre valor e qualificador.
- Cards da mesma grade compartilham alinhamento, padding e estrutura. Use `minmax(0, 1fr)` e `align-items: stretch`; não alinhe cards pela quantidade de texto nem fixe alturas que cortem conteúdo.
- O conteúdo não pode encostar na borda. Textos longos quebram linha; valores monetários completos não são truncados. Ações ficam no rodapé ou no canto superior direito, sempre com área de toque adequada.
- Não use card dentro de card para representar uma simples subdivisão. Separe o conteúdo com subtítulo, divisor ou superfície secundária `--color-surface-muted`.

### Hierarquia e alinhamento

- Cabeçalho de card ou seção segue a ordem: ícone decorativo opcional, título, descrição curta opcional e ação contextual. O título fica à esquerda; ação secundária pode ficar à direita no desktop e abaixo do texto no celular.
- O ícone fica centralizado verticalmente na primeira linha do título, mesmo quando o título quebra ou há descrição. A descrição começa na mesma coluna do texto do título. `SectionTitle` compartilha essa estrutura; não compensar alinhamento com margens fixas no ícone.
- Títulos de seção usam `h2`; títulos de cards usam `h3`. Não escolha a tag pelo tamanho visual. Não pule níveis para obter aparência.
- Em cards de indicador, mantenha título no topo, valor em destaque no meio e período/qualificador abaixo. Alinhe valores de cards irmãos pela mesma linha de base; não deixe descrições de comprimentos diferentes deslocarem os valores.
- Em cards de conta ou objetivo, agrupe nome e tipo no cabeçalho, apresente saldo/meta em bloco próprio e deixe prazo, instituição e estado como metadados secundários.
- Texto e descrições ficam alinhados à esquerda. Valores financeiros em uma lista/tabulação ficam alinhados à direita e usam algarismos tabulares. Em mobile, preserve a relação visual entre rótulo e valor; não force alinhamento à direita se isso separar os dois.
- Marcadores de estado usam texto explícito e tokens semânticos. Cor não substitui rótulo; cor de marca não indica estado financeiro.
- Se o card inteiro navega, ele não contém botões, links, campos ou outros controles interativos. Havendo ação interna, torne clicável somente o controle correspondente.

### Ícones

- Biblioteca do produto: `lucide-react`. Importe cada ícone pelo nome, sem imagens emoji ou caracteres Unicode como ícones de interface.
- Tamanhos: 20 px para navegação e cabeçalhos de seção; 18 px para ações e metadados; 16 px somente em contextos densos. Use traço padrão da biblioteca, alinhamento central e tamanho uniforme entre elementos equivalentes.
- Escolha pelo significado do objeto ou da ação (conta, cartão, busca, edição, exportação). Não reutilize um ícone apenas por semelhança visual se ele sugerir outro significado financeiro.
- Ícones decorativos ao lado de texto usam `aria-hidden="true"` e herdam cor do texto/tokens. Não colorir ícones isoladamente para indicar status.
- Botão somente com ícone tem nome acessível que identifica a ação e o objeto, por exemplo “Editar conta Reserva”; alvo mínimo de 44 × 44 px e foco visível. Tooltip é complementar e acessível por foco e ponteiro.
- Ícones não substituem título, rótulo de campo, natureza financeira, estado ou texto de botão. Não use ícones diferentes para a mesma ação em telas distintas sem uma razão semântica.

### Ajuda contextual

- `ContextHelp` oferece botão “Ajuda” com ícone, área mínima de 44 px e nome acessível “Ajuda sobre [assunto]”. `SectionTitle` aceita conteúdo opcional de ajuda e alinha o acionador ao título.
- O conteúdo abre em `dialog` modal nativo, com título associado, fundo inerte, foco inicial no botão “Fechar ajuda” e fechamento por esse botão ou Escape. Ao fechar, o foco volta ao acionador. O conteúdo pode conter texto e controles nomeados; ações que trocam de aba precisam respeitar o trabalho em andamento.
- O diálogo usa superfície e texto do tema, borda, raio de 16 px, backdrop com `--color-overlay`, largura limitada e rolagem interna para telas pequenas. Em conteúdos longos, título e botão de fechar permanecem visíveis durante a rolagem. Informações indispensáveis a uma decisão continuam visíveis junto ao controle correspondente, inclusive quando a ajuda está fechada.
- Todas as áreas inventariadas em H01–H30 usam o componente, inclusive acesso, cabeçalho global e cards repetidos que exigem orientação própria. Estados orientados, atalhos seguros e validação completa com leitor de tela e contraste continuam no [plano de ajuda contextual](PLANO_AJUDA_CONTEXTO.md).

## 16. Campos e controles de formulário

### Estrutura visual

- Cada campo apresenta rótulo visível acima do controle. O rótulo permanece visível durante o preenchimento; placeholder serve apenas como exemplo e nunca substitui o rótulo.
- Alinhamento: rótulo, controle, texto de ajuda e erro compartilham a mesma largura e borda esquerda. Distância rótulo–controle: 8 px; controle–ajuda/erro: 4 px; distância entre campos: 16 px. Use 24 px para separar grupos diferentes.
- Altura mínima do controle: 44 px, padding horizontal de 12 px e raio de 8 px. O texto digitado tem pelo menos 16 px para evitar zoom automático em celular. Textareas podem crescer; não reduza a área de digitação para caber na grade.
- Campos relacionados usam colunas de largura equivalente e quebram para uma coluna quando qualquer controle fica estreito ou o zoom aumenta. Campos de texto podem ocupar a largura disponível; datas, valores e seletores não devem ter larguras tão curtas que escondam o valor atual.
- Agrupe escolhas relacionadas com `fieldset` e `legend`. Não use apenas espaçamento ou cor para sugerir que campos pertencem ao mesmo grupo.

### Cores e foco

- Repouso: fundo `--color-surface`, texto `--color-text`, borda `--color-border-control`. Ajuda usa `--color-text-secondary`. Placeholder usa `--color-text-muted`, com contraste legível.
- Hover pode alterar sutilmente a borda, sem mover, redimensionar ou depender exclusivamente do ponteiro. Campo focado recebe anel contínuo de 3 px, offset de 2 px, com `--color-focus`; não remova o contorno nativo sem substituto equivalente.
- O anel de foco deve contrastar com o controle e com a superfície ao redor nos temas claro e escuro. Não dependa apenas de uma mudança de cor da borda. Em `forced-colors`, preserve o indicador do sistema.
- Erro: manter o fundo legível, usar borda `--color-negative`, texto explicativo e ícone/rótulo quando útil. Associar mensagem ao controle com `aria-describedby` e marcar `aria-invalid="true"`. Não sinalizar erro apenas pela cor.
- Sucesso genérico não torna o campo verde. A confirmação de salvamento é uma mensagem separada e neutra. Valores monetários positivos/negativos seguem a semântica financeira definida neste documento.
- Desabilitado: usar `--color-disabled-bg` e `--color-disabled-text`, explicar indisponibilidade quando não for óbvia e manter o rótulo legível. Campo somente leitura preserva contraste e pode ser selecionável/copíavel; não deve parecer desabilitado.
- Checkbox, radio e switch mantêm foco visível, alvo de toque de 44 × 44 px e rótulo clicável. Select nativo conserva indicador de abertura e operação por teclado. Não desenhe um controle customizado sem reproduzir estados e semântica nativos.

### Tipos e entrada de dados

| Dado | Controle recomendado | Regras de interação |
| --- | --- | --- |
| Nome, instituição, descrição e palavra-chave | `text` | Limite e exemplo ficam na ajuda; preservar espaços e caracteres válidos do idioma. |
| E-mail | `email` | `autocomplete="email"`; explicar o formato sem bloquear colagem. |
| Senha | `password` | `autocomplete` apropriado para cadastro/login; permitir colar e usar gerenciador de senhas. |
| Busca | `search` | Rótulo persistente; botão de limpar nomeado se existir; não mover foco após filtrar. |
| Dinheiro em reais | `text` com `inputmode="decimal"` | Aceitar vírgula decimal e colagem em formato brasileiro; mostrar unidade “R$”; nunca usar `type="number"` nem converter para ponto flutuante. |
| Percentual | `text` com `inputmode="decimal"` ou `number` com passo explícito | Mostrar `%`, limites e precisão permitida; a validação do domínio continua autoritativa. |
| Data do evento, vencimento e prazo | `date` | Rótulo identifica qual data; não confundir com competência. |
| Competência mensal | `month` ou seletor equivalente | Mostrar mês/ano; persistir no padrão definido pelo domínio. |
| Quantidade, dia do mês e prioridade | `number` com `min`, `max` e `step` explícitos | Usar somente para valores realmente inteiros/numéricos; informar unidade e limites. |
| Opção única | `select` ou radio | Incluir opção inicial clara quando for necessário escolher; ordenar opções de forma previsível. |
| Sim/não independente | Checkbox; switch apenas para efeito imediato e reversível | O rótulo descreve o estado/efeito, e não apenas “Ativo”. |

Não aplique máscaras que impeçam setas, seleção, colagem, leitor de tela ou correção manual. A formatação pode ocorrer ao sair do campo ou após confirmação, sem reposicionar o cursor a cada tecla. Valide no envio e, quando necessário, após interação; preserve valores digitados após erro. Ao falhar, explique a correção específica e leve foco ao resumo de erros ou ao primeiro campo inválido sem interromper a digitação.
