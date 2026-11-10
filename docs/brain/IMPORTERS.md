# Importadores

Processamento local, sem envio de arquivos a IA/OCR externo. Limites: 10 MiB, 2000 linhas/lote, 100 páginas PDF. Dados persistem somente após prévia e autorização; a contabilização ocorre após decisão na revisão, individual ou em lote mediante confirmação. Arquivo original não é armazenado automaticamente.

A aprovação em lote atual filtra itens pendentes sem candidatos de duplicidade entre movimentos já aprovados no snapshot e sem regra marcada para revisão de natureza. Não exige categoria, não verifica se a natureza está correta e não compara entre si os pendentes selecionados. As RPCs são sequenciais: falha pode deixar aprovações anteriores registradas. A interface tenta atualizar os dados, informa a quantidade com resposta confirmada e orienta conferir a lista ou recarregar antes de nova tentativa; a última chamada pode ter sido concluída mesmo sem resposta. Consulte [PLANO_AJUDA_CONTEXTO.md](PLANO_AJUDA_CONTEXTO.md) e [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

| Formato | Suporte entregue | Limitação |
|---|---|---|
| CSV | delimitador detectado, UTF-8/Windows-1252, data/descrição/valor, competência/ID opcionais | exige cabeçalhos canônicos ou aliases documentados no parser |
| OFX/QFX | STMTTRN, DTPOSTED, TRNAMT, MEMO/NAME, FITID | datas completas; variantes sem blocos fechados não homologadas |
| XLSX | primeira aba tabular com mesmos cabeçalhos CSV | arquivo histórico multiaba não é carga automática |
| XLS | conversão prévia para XLSX | leitor binário antigo não implementado |
| PDF digital | extração local por linha, dd/mm/aaaa, valor, D/C e n DE N | layout conservador; sem homologação específica Itaú/Nubank/Caixa, sem OCR |

Linhas inválidas geram diagnósticos. Prévia lista totais e exige confirmação; nenhum parser aprova. Para cartões, usuário corrige competência e direção na revisão. A soma reconhecida não é prova de reconciliação com total da fatura.

Chave forte: conta/workspace/ID de banco. Repetição exata do arquivo usa SHA-256 e índice original. Igualdade data/valor/descrição apenas sugere candidato; confirmar vínculo mantém uma transação e múltiplas origens. Compras repetidas permanecem independentes por padrão.

Complemento (migration 008): validação de descrição, centavos textuais, calendário, competência, natureza, ID externo e índice/total de parcela também ocorre no PostgreSQL. Um lote com qualquer proposta inválida é revertido integralmente, inclusive suas linhas e auditoria. Aprovações/vínculos precisam referenciar uma transação; pendências/ignoradas não podem aparentar contabilização.

CSV/XLSX preservam campos originais da linha; OFX e PDF preservam o bloco/linha original junto da proposta. A revisão exibe o original em contexto privado. Não são enviados a IA ou OCR externo. Data e valor iguais agora bastam para sugerir duplicidade mesmo com descrições diferentes; descrição idêntica tem prioridade na apresentação, sem fusão automática.
# Pacote privado de categorias e regras

Em “Categorias e regras”, o proprietário seleciona os dois JSONs. O navegador valida estrutura/referências e exibe apenas contagens, sem listar valores privados. A confirmação chama RPC autenticada que deriva o workspace e repete as validações no PostgreSQL antes da gravação transacional. O hash do pacote torna reenvio idempotente. Migrations 012 e 013 deve estar aplicada no Supabase remoto; não executar Supabase local.
