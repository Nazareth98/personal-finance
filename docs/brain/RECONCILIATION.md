# Conciliação

Holerite só é salvo se proventos-descontos-adiantamento=líquido. Tela compara adiantamento+líquido aos créditos vinculados; diferença permanece visível. Pagamentos não são criados automaticamente.

Transferência, aporte, resgate e pagamento de fatura usam duas pernas atômicas, valores opostos e contas distintas. Pagamento credita obrigação do cartão e debita caixa. Competência é explícita, sem inferir vencimento pela data de compra.

Duplicidade potencial aparece na fila: aprovar como evento distinto, ignorar ou vincular origem a transação existente. Vínculo exige mesmo workspace/conta/valor e decisão humana. Sem prova, não reconciliar automaticamente. Anulações preservam registros e auditoria.

Total oficial de fatura, saldo informado pelo banco, rubricas detalhadas e correspondência de intermediadores ainda exigem conferência humana; ver KNOWN_ISSUES.
