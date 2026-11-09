# Meu financeiro

Aplicação React + Vite + TypeScript, com PostgreSQL/Supabase Auth e workspace pessoal privado. Persistência real por tabelas protegidas por RLS e RPCs transacionais; não há modo de demonstração que substitua autenticação.

## Executar a interface

Requisitos: Node LTS 24 ou superior e npm. Instale com `npm ci`, copie `.env.example` para `.env.local` e configure a URL e a **chave pública anon/publishable** do projeto Supabase escolhido. Nunca use service_role/secret em VITE_*.

```sh
npm run dev
```

Abra o endereço mostrado pelo Vite (normalmente http://localhost:5173). Cada cadastro confirmado cria um workspace vazio. Sem variáveis públicas válidas, a aplicação mostra orientação de configuração.

**Não executar Supabase local**, conforme decisão do proprietário. As migrations e Auth/SMTP serão homologados no ambiente real seguindo [o roteiro de validação](docs/brain/DEPLOY_VALIDATION.md). O build de produção deve receber as variáveis públicas para incluir a aplicação autenticada.

## Implementado

- Cadastro, entrada/saída, confirmação de e-mail e recuperação via Supabase Auth; provisionamento transacional de perfil/workspace.
- RLS, referências compostas por workspace, Storage privado e auditoria; sem escrita direta no livro financeiro.
- Contas, cartões, categorias/subcategorias/regras, receitas, VR/VA, transferências, empréstimos, aportes e resgates em centavos exatos.
- Dashboard mensal/anual, metas fixas/percentuais, renda confirmada ou prevista e disponibilidade/excedente por categoria.
- Holerites, adiantamentos, rubricas/bases e vinculação dos créditos; caixinhas e objetivos.
- Faturas com total declarado, divergências e pagamentos; planejamento parcelado com confirmação individual ou vínculo à importação.
- CSV/OFX/QFX/XLSX e leitor conservador de PDF digital, prévia local, revisão e deduplicação idempotente. XLS antigo exige conversão para XLSX.
- Open Finance mock com consentimento, paginação, falha simulada, renovação, revogação e revisão compartilhada com arquivos. Integração real desabilitada.
- Exportação JSON e restauração aditiva no mesmo workspace, com prévia e confirmação; conexões recuperadas ficam revogadas.

## Verificar

```sh
npm run check
npm run test:security
npm run types:generate
npx playwright install chromium
npm run test:e2e
npm audit
```

O teste de segurança usa um PostgreSQL **descartável** em `TEST_PG_URL` (padrão `postgresql://postgres@127.0.0.1:55439/postgres`) e cria sua própria base aleatória. Não use produção. A CI inclui esse serviço PostgreSQL.

Evidência: 21 testes unitários, 195 verificações PostgreSQL e 8 testes de navegador em desktop/celular. Os testes de navegador usam respostas HTTP sintéticas; a homologação da stack Supabase completa e da entrega de e-mail será feita no ambiente real.

## Deploy e continuidade

Cloudflare Pages: build `npm run build`, diretório `dist`, Node 24 e variáveis públicas Supabase. Configure o domínio exato em Auth; não envie `.env` nem chaves privadas ao repositório. O núcleo não exige Open Finance pago. Não houve deploy remoto ou contratação nesta implementação.

Leia [o índice do brain](docs/brain/README.md), [operação](docs/brain/OPERATIONS.md), [testes](docs/brain/TEST_PLAN.md) e [pendências verificadas](docs/brain/KNOWN_ISSUES.md). A migração das 17 abas históricas, os layouts específicos dos três bancos e OCR ainda precisam de desenvolvimento/homologação. Nenhum dado histórico pessoal foi carregado ou incluído nos commits.
