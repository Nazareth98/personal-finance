# Contexto essencial

## Produto

Balanço: gerenciador pessoal de finanças com um único usuário por instância; qualquer pessoa pode fazer fork e montar a sua seguindo [`COMECE_AQUI.md`](../COMECE_AQUI.md) (D-068). Deve reduzir alimentação manual, consolidar contas correntes e cartões de qualquer banco disponível no MeuPluggy (contas e cartões nascem da sincronização), permitir ajustes manuais e oferecer visão mensal e anual confiável.

## Resultado esperado

- acompanhar receitas, gastos, cartões e parcelamentos;
- definir tetos mensais de gasto em reais por categoria;
- acompanhar caixinhas reais com aportes e resgates;
- importar todo o histórico disponível e categorizar lançamentos;
- projetar orçamento usando os seis meses anteriores;
- funcionar como PWA responsiva com autenticação por e-mail e senha;
- permanecer viável em hospedagem gratuita para uso pontual.

## Decisões vigentes

- Stack: React + TypeScript + Vite, Supabase e Vercel.
- Organização: domínio, aplicação, infraestrutura e apresentação; OOP somente quando melhorar o domínio.
- Usuário único, cadastro público desativado e recuperação de senha por e-mail.
- MeuPluggy é a única origem bancária; credenciais ficam no backend.
- Importação completa, incremental e idempotente; mostrar atualização da fonte, última importação e último erro.
- “Revisar a partir de” salva um início fixo no perfil, compartilhado pelos acessos do proprietário; limita fila e contadores de revisão, preservando importação completa e histórico anterior (D-079).
- Categoria “transferência” do provedor não prova transferência própria: PIX para terceiro é receita/despesa pelo sinal; somente evidência positiva de titularidade ou conciliação entre contas próprias produz efeito neutro.
- Compra no cartão pertence ao mês de vencimento da fatura. Pagamento de fatura não é nova despesa.
- Transferências próprias têm os dois lados vinculados e não alteram receita ou consumo.
- Ajustes manuais são lançamentos separados; o dado importado permanece imutável.
- Metas são tetos mensais em reais por categoria (12× na visão anual), independentes da receita, e não acumulam (D-046).
- Linhas do cartão que não são compra — informativa (“TOTAL DA FATURA ANTERIOR”) e espelho do pagamento — são ajuste neutro fora da fatura; só o débito na conta quita a fatura e é vinculado automaticamente à primeira fatura do mesmo banco, com evidência, que vence a partir do pagamento (D-050, D-053, D-054). Compra com `billId` fica na fatura informada pelo banco (D-054).
- Correções automáticas usam overrides reversíveis e nunca sobrepõem decisão do proprietário nem lançamento confirmado.
- “Ocultar valores” é preferência do aparelho: mascara a exibição, não altera dados (D-049).
- Previsão usa seis meses de receitas recorrentes; extraordinárias não entram na média.
- Categorização: 90–100% automática, 70–89% revisão, abaixo de 70% sem categoria.
- Categorias estruturais são protegidas; categorias personalizadas pertencem ao proprietário, têm aplicabilidade financeira explícita, ícone Lucide e cor semântica versionados, e são arquivadas quando possuem histórico.
- Caixinha indistinguível no extrato exige associação manual; o sistema não inventa vínculo.
- Figma “Corporate UI — Design System Foundations” é referência visual; JSON e código são fonte técnica.
- Exportação de dados, múltiplos usuários e aplicativo nativo estão fora do escopo inicial.

## Restrições

Dinheiro em `bigint` centavos, datas de competência sem conversão acidental de fuso, dados reais fora do Git e nenhuma credencial no cliente.
