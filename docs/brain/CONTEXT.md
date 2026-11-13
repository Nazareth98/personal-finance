# Contexto essencial

## Produto

Gerenciador pessoal de finanças para um único usuário. Deve reduzir alimentação manual, consolidar conta corrente e cartão de Nubank, Caixa e Itaú via MeuPluggy, permitir ajustes manuais e oferecer visão mensal e anual confiável.

## Resultado esperado

- acompanhar receitas, gastos, cartões e parcelamentos;
- definir tetos percentuais de gasto por categoria;
- acompanhar caixinhas reais com aportes e resgates;
- importar todo o histórico disponível e categorizar lançamentos;
- projetar orçamento usando os seis meses anteriores;
- funcionar como PWA responsiva com autenticação por e-mail e senha;
- permanecer viável em hospedagem gratuita para uso pontual.

## Decisões vigentes

- Stack: React + TypeScript + Vite, Supabase e Cloudflare Pages.
- Organização: domínio, aplicação, infraestrutura e apresentação; OOP somente quando melhorar o domínio.
- Usuário único, cadastro público desativado e recuperação de senha por e-mail.
- MeuPluggy é a única origem bancária; credenciais ficam no backend.
- Importação completa, incremental e idempotente; mostrar atualização da fonte, última importação e último erro.
- Compra no cartão pertence ao mês de vencimento da fatura. Pagamento de fatura não é nova despesa.
- Transferências próprias têm os dois lados vinculados e não alteram receita ou consumo.
- Ajustes manuais são lançamentos separados; o dado importado permanece imutável.
- Metas são tetos por categoria calculados sobre toda receita confirmada do período e não acumulam.
- Previsão usa seis meses de receitas recorrentes; extraordinárias não entram na média.
- Categorização: 90–100% automática, 70–89% revisão, abaixo de 70% sem categoria.
- Caixinha indistinguível no extrato exige associação manual; o sistema não inventa vínculo.
- Figma “Corporate UI — Design System Foundations” é referência visual; JSON e código são fonte técnica.
- Exportação de dados, múltiplos usuários e aplicativo nativo estão fora do escopo inicial.

## Restrições

Dinheiro em `bigint` centavos, datas de competência sem conversão acidental de fuso, dados reais fora do Git e nenhuma credencial no cliente.
