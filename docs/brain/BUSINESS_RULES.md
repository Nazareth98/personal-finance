# Regras financeiras

Consumo corresponde a compra/parcela; pagamento de fatura é movimento patrimonial. Transferência própria tem pernas iguais e opostas. Aporte e resgate não geram receita elegível ou consumo. Empréstimo aumenta caixa/passivo, não renda. VR/VA usa conta de benefício e não integra renda-base em dinheiro. Estorno precisa de referência e reduz consumo.

Em movimentos importados, a conta do lote é a **conta observada no extrato**, não necessariamente a origem econômica. Aporte exige saída de caixa e entrada em investimento; resgate exige saída de investimento e entrada em caixa. Qualquer uma das pernas pode ser a observada, e a outra é criada como contrapartida atômica. Assim, um resgate positivo importado da conta corrente permanece nessa conta e gera a saída oposta na conta de investimento. A proveniência bancária fica somente na perna observada.

Holerite descreve remuneração: proventos menos descontos (incluindo adiantamento) = líquido. Os pagamentos bancários de adiantamento e saldo são as receitas reais; não somar novamente o holerite. Compra integral parcelada não é consumo adicional às ocorrências faturadas.

Competência é primeiro dia do mês, diferente da data do evento e da data bancária. Revisão humana ou regra de automação explicitamente autorizada precede importação no livro. Categoria não determina natureza. Subcategoria sempre pertence à categoria selecionada; trocar a categoria limpa a subcategoria anterior. Uma regra pode sugerir categoria; somente uma configuração de automação separada e explícita pode definir tipo, direção, contrapartida e aprovação automática. Correspondência textual de intermediador não prova transferência própria.

Empréstimo agora registra caixa e passivo com soma zero. Pares patrimoniais são validados no commit, inclusive em restauração. Anulação de qualquer perna anula o par. Alteração de classificação preserva decisão anterior; anulação preserva todos os registros.

Fatura: valor declarado não é despesa adicional. Tela compara consumo da conta/competência ao declarado e pagamentos associados; permite pagamento parcial. Planejamento de compra parcelada não entra no ledger até confirmação individual ou vínculo a compra já importada. Rubricas e bases não são receitas; divergências com o cabeçalho do holerite permanecem visíveis.
