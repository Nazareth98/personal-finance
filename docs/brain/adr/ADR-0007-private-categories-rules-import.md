# ADR-0007: Importação privada de categorias e regras

- Status: aceita.
- Contexto: categorias e regras previamente mapeadas ficam em arquivos pessoais fora do repositório. Importá-las em seeds ou fixtures compartilhadas exporia conteúdo privado e poderia aplicá-lo a workspaces incorretos.
- Decisão: o titular seleciona os dois JSONs no app autenticado; o cliente valida e apresenta somente contagens. RPC PostgreSQL valida estrutura e referências novamente, deriva o workspace pela identidade autenticada e grava categorias/subcategorias/regras na mesma transação. SHA-256 identifica pacote repetido; source_key estável permite atualizar linhas de regras sem duplicar. Nenhum conteúdo bruto/metadado textual é persistido.
- Regras: match mode suportado é `contains_literal`; ordem e natureza orçamentária são preservadas no nível da subcategoria, que é onde o pacote associa a natureza. A natureza agregada da categoria fica nula quando suas subcategorias divergem. Sinalizador de revisão financeira exige aprovação individual e não determina a natureza do lançamento.
- Segurança/operação: RLS e validação do workspace continuam obrigatórias; migration deve ser aplicada no Supabase remoto. Não executar Supabase local para homologação integrada.
- Consequências: sem sessão autenticada e migration aplicada não há gravação. Alterações manuais no nome das regras importadas devem ser revistas antes de reimportar o pacote.
