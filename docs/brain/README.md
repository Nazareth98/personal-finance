# Brain — contexto do projeto

A documentação contém somente arquitetura e exemplos sintéticos. Dados financeiros pessoais ficam fora do repositório e não devem ser enviados a serviços externos.

Ordem: identidade/RLS → livro financeiro e revisão → importadores → Meu Pluggy pessoal do proprietário → exportação e qualidade. O produto não oferece conexão bancária para os workspaces dos demais usuários.

- [Entidades](ENTITY_CATALOG.md), [schema](SCHEMA.md), [identidade](TENANCY_AUTH.md).
- [Regras](BUSINESS_RULES.md), [cálculos](CALCULATION_POLICIES.md), [testes](TEST_PLAN.md).
- [Operação](OPERATIONS.md), [pendências](KNOWN_ISSUES.md), [decisões](adr/ADR-0001-stack.md), [Meu Pluggy pessoal](adr/ADR-0006-meupluggy-owner-only.md).
- [Restauração e detalhes financeiros](adr/ADR-0004-restore-details.md).
- [Importadores](IMPORTERS.md), [categorização](CATEGORIZATION.md), [conciliação](RECONCILIATION.md), [fluxos](UX_FLOWS.md).
- [Meu Pluggy](MEUPLUGGY.md), [migração histórica](MIGRATION_REPORT.md).
- [ADR-0007 — importação privada de categorias e regras](adr/ADR-0007-private-categories-rules-import.md).
- [Homologação no ambiente real](DEPLOY_VALIDATION.md). Por decisão do proprietário, Supabase local não deve ser executado.
- [Design system — Grafite e Âmbar](DESIGN_SYSTEM.md): referência normativa de identidade visual, componentes, interação e acessibilidade.

O estado verificável dos fluxos fica no TEST_PLAN e em KNOWN_ISSUES. Requisitos pendentes não são funcionalidades entregues.
