# Categorização

Normalização Unicode NFD, remoção de diacríticos, minúsculas pt-BR, trim. Correspondência contains literal, inclusive asterisco. Menor priority vence; empate: termo maior e ID para determinismo. Regra sugere categoria e, opcionalmente, uma subcategoria pertencente a ela; nunca define natureza financeira.

Seletores de categoria/subcategoria são dependentes e compartilhados nos formulários de regra. Trocar categoria limpa a subcategoria anterior. Seletor só lista subcategorias da categoria escolhida; regras, lançamentos e classificação enviam o par ao banco. FKs compostas por workspace e categoria rejeitam qualquer par incompatível mesmo por API/RPC. Um lançamento sem categoria também não pode carregar subcategoria.

Sugestão é calculada na abertura da revisão com regras atuais. Se uma linha já tiver categoria explícita, a regra só completa uma subcategoria se essa categoria corresponder à categoria da regra. Aprovações anteriores não são reaplicadas nem sobrescritas. Regras pertencem exclusivamente ao workspace; não há seed histórico. O importador autenticado dos arquivos privados ainda é pendente.
