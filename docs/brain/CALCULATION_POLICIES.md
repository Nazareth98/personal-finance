# Políticas de cálculo

Dinheiro inteiro em centavos. Porcentagens em pontos-base: 1500 = 15%. Arredondamento de limite percentual: meio centavo para cima. Disponível=max(limite-consumo,0); excedente=max(consumo-limite,0). Renda sem confirmação é desconhecida, não limite zero; previsão explicitamente selecionada.

Competência define consumo; data bancária define caixa. Anual soma meses explícitos, sem assumir doze salários. Exemplos sintéticos: renda 500000 centavos e 1500 pontos-base → limite 75000; consumo 53000 → disponível 22000.

Parcelamento: `parcela_i = total / N` inteiro, mais um centavo para as primeiras `total % N` parcelas. Exemplo sintético 10001 centavos em três parcelas → 3334, 3334, 3333. Competência avança meses a partir do primeiro dia, sem usar data da compra como vencimento.

Caixinhas: saldo inicial + movimentos aprovados da conta de investimento. Progresso usa esse saldo; aporte reconhecido corresponde à perna de saída. Valores visuais de progress bars podem converter para Number; cálculos financeiros e textos permanecem bigint exatos.
