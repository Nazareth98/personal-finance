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
- deploy no Cloudflare Pages e Supabase Free.

Aceite: fluxos críticos funcionam em mobile e desktop, `pnpm check` passa e limitações gratuitas estão documentadas.

## Fora do escopo inicial

Cadastro público, família/multiusuário, aplicativo nativo, exportação pela interface, IA externa, bancos fora do MeuPluggy, identificação de caixinha sem evidência e Code Connect antes de componentes estáveis.
