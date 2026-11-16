# Categorização explicável

## Imutabilidade e overlay

Um lançamento MeuPluggy nunca é alterado para receber categoria. `transaction_classifications` mantém um overlay por lançamento com categoria, confiança em pontos-base, estado, versão e evidências. O adapter do livro combina o original com o overlay somente na leitura.

Estados:

- `automatic`: 9.000–10.000 pontos-base;
- `suggested`: 7.000–8.999 pontos-base;
- `uncategorized`: abaixo de 7.000, sem overlay persistido;
- `confirmed`: decisão explícita do proprietário, 10.000 pontos-base.

Empate na maior pontuação não produz sugestão. O classificador retorna `uncategorized`, mesmo que as categorias empatadas estejam acima de 70%.

## Normalização

`rules-v1` aplica, nesta ordem:

1. minúsculas e remoção de acentos;
2. remoção de códigos numéricos isolados com três ou mais dígitos;
3. pontuação convertida em espaço;
4. espaços repetidos colapsados;
5. tokens duplicados e palavras de ligação removidos.

O algoritmo puro está em `packages/domain/src/classification.ts`. A função SQL usada para aprender aliases espelha a normalização de descrição. Alterar esse contrato exige nova versão do classificador e casos de compatibilidade.

## Evidências e pontuação

Cada regra pertence a uma categoria e adiciona um peso inteiro:

- `merchant`: estabelecimento normalizado exato;
- `alias`: descrição normalizada exata, inclusive aliases aprendidos;
- `token`: token presente na descrição;
- `account`: conta externa associada;
- `nature`: natureza financeira do lançamento.

Pesos da mesma categoria são somados e limitados a 10.000. As evidências vencedoras são persistidas com identificador da regra, tipo, valor, peso e rótulo legível. Assim, o resultado pode ser reproduzido com as regras e a versão registradas.

## Feedback e aprendizado

`confirm_transaction_classification` aceita somente lançamento importado de receita ou despesa pertencente ao usuário autenticado. A operação é atômica:

1. registra `classification_feedback` com categoria anterior e confirmada;
2. cria ou atualiza uma regra `alias` de 90% para a descrição normalizada;
3. grava a decisão atual como `confirmed`;
4. aplica o alias como `automatic` a ocorrências equivalentes ainda sem overlay.

Nenhuma regra é aprendida ao apenas visualizar, abrir o diálogo ou receber uma sugestão. Alterar o alias aprendido exige uma nova confirmação explícita, preservada no histórico de feedback.

## Fila de revisão

A fila principal contém somente `suggested`, `uncategorized` e pendências de natureza. `automatic` e `confirmed` ficam em histórico filtrável e continuam corrigíveis. Classificação de categoria não pode converter receita/despesa em transferência, aporte, resgate ou pagamento de fatura; essas decisões pertencem ao overlay semântico.

Em uma limpeza de desenvolvimento, preservar `classification_rules` com `evidence_type = 'alias'` é suficiente para reaplicar o aprendizado na reimportação. Overlays e feedback ligados a transações antigas são descartados junto com o livro.

## Segurança

- tabelas têm RLS e somente leitura direta pelo proprietário;
- escrita do usuário ocorre apenas pelo procedimento de confirmação;
- sincronização escreve overlays com `service_role` no backend;
- descrições reais não entram em fixtures, logs, screenshots ou mensagens de erro;
- o modo demonstrativo exibe estado vazio, sem exemplos que imitem dados privados.
