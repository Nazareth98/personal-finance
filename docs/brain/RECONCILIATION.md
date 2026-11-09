# Conciliação

Holerite só é salvo se proventos-descontos-adiantamento=líquido. Tela compara adiantamento+líquido aos créditos vinculados; diferença permanece visível. Pagamentos não são criados automaticamente.

Transferência, aporte, resgate e pagamento de fatura usam duas pernas atômicas, valores opostos e contas distintas. Pagamento credita obrigação do cartão e debita caixa. Competência é explícita, sem inferir vencimento pela data de compra.

Duplicidade potencial aparece na fila: aprovar como evento distinto, ignorar ou vincular origem a transação existente. Vínculo exige mesmo workspace/conta/valor e decisão humana. Sem prova, não reconciliar automaticamente. Anulações preservam registros e auditoria.

Total declarado de fatura, pagamentos e rubricas/bases agora persistem em tabelas próprias; diferenças são calculadas e exibidas. Não há interpretação automática de intermediadores nem homologação de layout bancário: conferência humana continua necessária; ver KNOWN_ISSUES.
