# Design system — Grafite e Âmbar

Versão 1.0 · 10/11/2026 · Referência normativa para refatorações visuais e novas funcionalidades.

Este documento define a experiência desejada. A interface atual ainda precisa ser migrada; a existência desta especificação não comprova conformidade das telas. O tema inicial é claro. Um tema escuro futuro exige tokens próprios e nova validação de contraste.

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
| A partir de 1200 px | Sidebar de 240 px; conteúdo fluido até 1440 px; até quatro indicadores |

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
