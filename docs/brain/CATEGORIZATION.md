# Categorização

Normalização Unicode NFD, remoção de diacríticos, minúsculas pt-BR, trim. Correspondência contains literal, inclusive asterisco. Menor priority vence; empate: termo maior e ID para determinismo. Regra sugere categoria e, opcionalmente, uma subcategoria pertencente a ela; nunca define natureza financeira.

Seletores de categoria/subcategoria são dependentes e compartilhados nos formulários de regra. Trocar categoria limpa a subcategoria anterior. Seletor só lista subcategorias da categoria escolhida; regras, lançamentos e classificação enviam o par ao banco. FKs compostas por workspace e categoria rejeitam qualquer par incompatível mesmo por API/RPC. Um lançamento sem categoria também não pode carregar subcategoria.

Sugestão é calculada na abertura da revisão com regras atuais. Se uma linha já tiver categoria explícita, a regra só completa uma subcategoria se essa categoria corresponder à categoria da regra. Aprovações anteriores não são reaplicadas nem sobrescritas. Regras pertencem exclusivamente ao workspace; não há seed histórico. A importação autenticada dos arquivos privados está documentada abaixo (migrations 012 e 013).
# Importação privada (migrations 012 e 013)

O proprietário pode importar os JSONs privados pelo upload autenticado em “Categorias e regras”. A prévia mostra somente contagens. O navegador valida estrutura e referências e a RPC valida novamente, deriva o workspace da sessão e grava tudo em transação. Hash SHA-256 do pacote impede reenvio duplicado; chaves estáveis preservam regras em atualizações. Ordem é preservada; natureza orçamentária é armazenada por subcategoria porque uma categoria pode agrupar subcategorias de naturezas distintas. A natureza agregada da categoria fica nula nesse caso. Regras sinalizadas para revisão ficam fora da aprovação em lote e exigem conferência individual; regra nunca define natureza financeira.
