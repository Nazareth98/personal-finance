# Brain — aplicação de finanças pessoais

Documentação pública contém somente arquitetura e exemplos sintéticos. Kit e mapas históricos locais estão ignorados no Git; não devem ser enviados a serviços externos.

Ordem: identidade/RLS → livro financeiro e revisão → importadores → Open Finance mock → exportação e qualidade. Integração real depende de contrato, credenciais seguras e autorização explícita. Migração histórica não é automática.

- [Entidades](ENTITY_CATALOG.md), [schema](SCHEMA.md), [identidade](TENANCY_AUTH.md).
- [Regras](BUSINESS_RULES.md), [cálculos](CALCULATION_POLICIES.md), [testes](TEST_PLAN.md).
- [Operação](OPERATIONS.md), [pendências](KNOWN_ISSUES.md), [decisões](../adr/ADR-0001-stack.md).

O estado verificável de cada fluxo fica no TEST_PLAN e KNOWN_ISSUES. Requisitos pendentes não são funcionalidades entregues.

- [Importadores](IMPORTERS.md), [categorização](CATEGORIZATION.md), [conciliação](RECONCILIATION.md), [fluxos](UX_FLOWS.md).
- [Open Finance](OPEN_FINANCE.md), [provedores e cobertura](OPEN_FINANCE_PROVIDER_COMPARISON.md), [migração histórica](MIGRATION_REPORT.md).
