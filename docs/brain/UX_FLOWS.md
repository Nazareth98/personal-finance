# Fluxos operacionais

1. Cadastro → confirmar e-mail → entrada → workspace vazio → primeira conta/categoria.
2. Movimento → natureza explícita → datas independentes → conta(s) → gravar atomicamente.
3. Arquivo local → parser → prévia/totais/avisos → autorização → lote privado → revisão → aprovar, ignorar ou vincular individualmente; a interface também oferece aprovação em lote mediante confirmação, com os limites em [IMPORTERS.md](IMPORTERS.md).
4. Meta → categoria/período/cadência → valor fixo OU percentual → renda confirmada ou previsão explicitamente informada → disponibilidade/excedente.
5. Caixinha → conta investimento → objetivo → aporte entre contas → progresso derivado do saldo.
6. Holerite → conferir componentes → vincular créditos reais → visualizar diferença.
7. Anular → confirmação → preservar histórico → retirar do realizado e anular par quando patrimonial.

A conexão bancária automatizada está disponível somente para o proprietário via Meu Pluggy pessoal; os demais usuários seguem com contas manuais e importação de arquivos. Conta não autenticada nunca vê dados financeiros.

8. Cartões → fatura com competência/vencimento/total declarado → conferir itens/diferença → registrar pagamento total ou parcial sem novo consumo.
9. Parcelamento → valor integral e N → agenda exata em centavos → confirmar ocorrência faturada OU vincular lançamento importado compatível.
10. Perfil/backup → exportar JSON → selecionar arquivo do próprio workspace → prévia validada → confirmar restauração aditiva; conexões restauradas ficam revogadas.
11. Classificar movimento aprovado → escolher categoria/subcategoria → registrar histórico anterior. Editar metas do mesmo período atualiza planejamento, preservando realizados.

12. Lançamentos → escolher mês/ano → exportar CSV do período, preservando data do evento, data bancária e competência separadas. Descrições com prefixos de fórmula são neutralizadas para abrir em planilha. Para restauração, usar JSON.
