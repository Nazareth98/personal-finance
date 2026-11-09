# Importadores

Processamento local, sem envio de arquivos a IA/OCR externo. Limites: 10 MiB, 2000 linhas/lote, 100 páginas PDF. Dados persistem somente após prévia e autorização; contabilização exige revisão individual. Arquivo original não é armazenado automaticamente.

| Formato | Suporte entregue | Limitação |
|---|---|---|
| CSV | delimitador detectado, UTF-8/Windows-1252, data/descrição/valor, competência/ID opcionais | exige cabeçalhos canônicos ou aliases documentados no parser |
| OFX/QFX | STMTTRN, DTPOSTED, TRNAMT, MEMO/NAME, FITID | datas completas; variantes sem blocos fechados não homologadas |
| XLSX | primeira aba tabular com mesmos cabeçalhos CSV | arquivo histórico multiaba não é carga automática |
| XLS | conversão prévia para XLSX | leitor binário antigo não implementado |
| PDF digital | extração local por linha, dd/mm/aaaa, valor, D/C e n DE N | layout conservador; sem homologação específica Itaú/Nubank/Caixa, sem OCR |

Linhas inválidas geram diagnósticos. Prévia lista totais e exige confirmação; nenhum parser aprova. Para cartões, usuário corrige competência e direção na revisão. A soma reconhecida não é prova de reconciliação com total da fatura.

Chave forte: conta/workspace/ID de banco. Repetição exata do arquivo usa SHA-256 e índice original. Igualdade data/valor/descrição apenas sugere candidato; confirmar vínculo mantém uma transação e múltiplas origens. Compras repetidas permanecem independentes por padrão.
