# Arquitetura alvo

## Stack

- React + TypeScript + Vite para a PWA.
- Supabase: PostgreSQL, Auth, Row Level Security e Edge Functions TypeScript.
- Cloudflare Pages para o frontend.
- MeuPluggy como única integração bancária.

## Camadas

- `domain`: entidades, valores e regras financeiras puras.
- `application`: casos de uso e portas de repositório.
- `infrastructure`: Supabase, MeuPluggy e adapters.
- `presentation`: páginas React, componentes e controllers HTTP.

OOP é usada quando encapsula invariantes ou comportamento. React usa componentes e hooks; não impor MVC ou classes à apresentação.

## Modelo inicial

Entidades previstas: perfil, conta, conexão Pluggy, execução de sincronização, evento webhook, lançamento, vínculo entre lançamentos, categoria, regra e feedback de classificação, cartão, fatura, parcela, meta de categoria, caixinha e movimento de caixinha.

`transaction_links` representa transferência, estorno, pagamento de fatura, ajuste e movimento de caixinha sem duplicar semântica no livro.

O contrato detalhado e incremental está em [`../architecture/DATABASE.md`](../architecture/DATABASE.md).
O fluxo de login, recuperação e provisionamento do único proprietário está em [`../architecture/AUTH.md`](../architecture/AUTH.md).
Os sinais monetários, totais, vínculos e procedimentos atômicos do livro estão em [`../architecture/LEDGER.md`](../architecture/LEDGER.md).

## MeuPluggy

- API Key somente em secret do backend; Connect Token é o único token permitido no cliente.
- Persistir `itemId`; contas pessoais MeuPluggy podem não permitir listar todos os Items.
- Item proxy acompanha a atualização do MeuPluggy e não deve depender de `PATCH` manual.
- Webhook registra `eventId`, responde rapidamente e agenda processamento idempotente.
- O botão “Sincronizar agora” busca o dado mais recente disponível; não promete nova coleta bancária.

## Segurança

- Cadastro público desativado e usuário criado administrativamente.
- RLS em toda tabela financeira.
- Nenhum secret ou Service Role no bundle web.
- Logs sem descrição, valor ou identificador bancário real.
- Cache PWA apenas para assets e shell; dados financeiros exigem sessão e rede.
- Fixtures da integração são sintéticas e não reversíveis para dados reais.

## Hospedagem e limite aceito

Cloudflare Pages e Supabase Free atendem ao uso individual. O Supabase pode pausar por inatividade; retomada manual é aceita. Não gerar tráfego artificial para evitar pausa.

## Estratégia de testes

- unitários: dinheiro, competência, metas, previsão e classificador;
- integração: migrations, constraints, RLS e idempotência;
- contrato: respostas MeuPluggy anonimizadas;
- navegador: login, recuperação, importação, revisão, cartão, metas e PWA via Playwright;
- visual: componentes e telas contra o Figma.
