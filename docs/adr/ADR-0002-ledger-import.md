# ADR 0002 — Livro único, revisão e importação

Aceita em 09/11/2026. `transactions` é a única fonte de movimentos contábeis. Benefícios e caixinhas são tipos de conta; faturas e parcelas são inicialmente consultadas no livro por conta/competência, com índice da parcela. Holerite é informativo e tem pagamentos vinculados ao livro. Isso evita copiar despesas para tabelas especializadas e somá-las duas vezes.

RPCs autenticadas derivam workspace da sessão. Transferências/aportes/resgates/pagamentos gravam as duas pernas atomicamente. Anulação preserva linhas e afeta pares. Escrita direta no ledger/importação/auditoria não concedida. Eventos de auditoria registram entidade, operação e ator, sem payload financeiro em logs.

Importações usam SHA-256 do arquivo + conta + workspace para repetir lote sem duplicar; FITID/ID explícito é chave forte dentro da conta. Sem ID, índice original distingue compras iguais. Fingerprint é apenas candidato de revisão. Outra origem pode ser vinculada a lançamento existente com confirmação; não altera sua categoria. Linhas brutas persistem como proposta original, decisões separadas.

CSV/OFX têm parser textual; XLSX e PDF carregam bibliotecas sob demanda. XLS legado exige conversão para XLSX. Layout PDF genérico é conservador e não equivale a homologação de cada banco. Não há OCR externo. A revisão continua obrigatória inclusive para créditos, intermediadores e cartões.
