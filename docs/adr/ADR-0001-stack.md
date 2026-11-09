# ADR 0001 — React, Supabase e isolamento pessoal

Data: 09/11/2026. Decisão aceita.

Aplicação TypeScript estrita, React/Vite estático em Cloudflare Pages e PostgreSQL/Supabase Auth. Não há aplicação anterior neste repositório; o kit descreve requisitos de uma planilha. Nenhum dado histórico será seed.

O trigger de auth.users cria perfil, workspace e associação owner em uma transação. O cliente não tem grants para modificar posse ou membership. Toda FK financeira usa (workspace_id,id); RLS verifica membership. Helpers SECURITY DEFINER têm search_path vazio, SQL estático e retornam apenas autorização do chamador. Não há compartilhamento nem papel administrativo financeiro.

Rejeitado: isolamento somente em filtros do frontend; user_id sem consistência dos relacionamentos; service_role no browser; duplicar livro contábil em tabelas especializadas. Dinheiro: bigint em centavos; cálculos TypeScript com bigint e valores monetários textuais na fronteira JSON.

Dependências resolvidas pelo registro npm e fixadas em package-lock.json. Adaptadores de arquivos são carregados sob demanda. Nenhum serviço de IA recebe arquivos.
