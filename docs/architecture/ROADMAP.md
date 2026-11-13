# Roadmap — Personal Finance

## Entrega inicial (esta branch)

- [x] Scaffold React + Vite + TypeScript e workspace pnpm.
- [x] Tokens semânticos Light/Dark em JSON; CSS gerado.
- [x] Componentes iniciais Button, Card e Badge.
- [x] Dashboard de demonstração com dados **fictícios**, acessível e responsivo.
- [x] Foundations e vínculo Figma documentados.
- [x] `AGENTS.md` para Codex.

## Próximas fases

1. Adicionar Storybook, testes Vitest/Testing Library e contraste automatizado; ajustar componentes ao WCAG AA.
2. Expandir componentes: Input, Select, Dialog, Tabs, Table, Skeleton, Tooltip, Toast, DatePicker e padrões de formulário.
3. Implementar templates financeiros: dashboard, contas, transações, orçamento, cartão/fatura, conciliação e importação.
4. Validar modelo de domínio antes de conectar backend. Dinheiro em centavos, distinção de competência/data bancária, idempotência, transferências próprias, faturas e aportes.
5. Escolher e integrar persistência/autenticação com revisão de isolamento, segurança e migrações. **Não reativar automaticamente Supabase antigo**.
6. CI com typecheck, lint, testes e build; publicação de documentação.
7. Revisar componentes do Figma, desenvolver Code Connect e automatizar governança dos tokens.

## Decisões arquiteturais

- Pacotes no mesmo repositório até que existam consumidores independentes.
- JSON é fonte de verdade técnica; Figma é referência visual.
- Tema muda sem duplicar os componentes.
- Primeiro escopo: **apresentação e interações de demonstração**, não processamento financeiro real.
- Nenhum dado pessoal, transação real ou segredo em documentação, exemplos e testes.
