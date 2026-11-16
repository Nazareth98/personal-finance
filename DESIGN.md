---
version: alpha
name: Corporate UI
description: Sistema visual dos dashboards de finanças pessoais, alinhado aos tokens e componentes React do repositório.
colors:
  primary: "#2563EB"
  bg-canvas: "#F8FAFC"
  bg-surface: "#FFFFFF"
  bg-subtle: "#F1F5F9"
  text-primary: "#0F172A"
  text-secondary: "#5B6B82"
  text-accent: "#1D4ED8"
  border-default: "#E2E8F0"
  border-focus: "#2563EB"
  action-primary: "#2563EB"
  action-hover: "#1D4ED8"
  text-on-action: "#FFFFFF"
  text-on-danger: "#FFFFFF"
  status-success: "#15803D"
  status-warning: "#B45309"
  status-danger: "#B91C1C"
  finance-income: "#15803D"
  finance-expense: "#B91C1C"
  finance-transfer: "#2563EB"
  finance-positive: "#15803D"
  finance-negative: "#B91C1C"
  finance-neutral: "#64748B"
  chart-income: "#15803D"
  chart-expense: "#B91C1C"
  chart-neutral: "#2563EB"
  chart-grid: "#E2E8F0"
  chart-category-1: "#2563EB"
  chart-category-2: "#0F766E"
  chart-category-3: "#7C3AED"
  chart-category-4: "#B45309"
  chart-category-5: "#64748B"
typography:
  sans:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
  xs:
    fontSize: 12px
  sm:
    fontSize: 14px
  base:
    fontSize: 16px
  lg:
    fontSize: 18px
  xl:
    fontSize: 24px
  2xl:
    fontSize: 32px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  6: 24px
  8: 32px
  12: 48px
---

## Overview

Corporate UI atende dashboards de finanças pessoais com hierarquia sóbria, leitura densa sem ruído e destaque claro para ações e resultados financeiros. O Figma orienta a aparência; `packages/tokens/src/themes.json` e os componentes versionados são os contratos técnicos.

## Colors

Use apenas papéis semânticos dos tokens, nunca cores literais novas. Receita/positivo, despesa/negativo e transferência/neutro são naturezas distintas; cor deve ser reforço, não a única forma de distingui-las. Os tokens no frontmatter representam o tema Light padrão.

## Themes

O tema segue a preferência do sistema e pode ser sobrescrito pelo usuário. Preserve o papel semântico ao alternar entre Light e Dark.

| Token | Light | Dark |
| --- | --- | --- |
| `bg-canvas` | `#F8FAFC` | `#0B1220` |
| `bg-surface` | `#FFFFFF` | `#172235` |
| `bg-subtle` | `#F1F5F9` | `#1E293B` |
| `text-primary` | `#0F172A` | `#F8FAFC` |
| `text-secondary` | `#5B6B82` | `#94A3B8` |
| `text-accent` | `#1D4ED8` | `#93C5FD` |
| `border-default` | `#E2E8F0` | `#334155` |
| `border-focus` | `#2563EB` | `#93C5FD` |
| `action-primary` | `#2563EB` | `#2563EB` |
| `action-hover` | `#1D4ED8` | `#1D4ED8` |
| `text-on-action` | `#FFFFFF` | `#FFFFFF` |
| `text-on-danger` | `#FFFFFF` | `#0B1220` |
| `status-success` | `#15803D` | `#4ADE80` |
| `status-warning` | `#B45309` | `#FBBF24` |
| `status-danger` | `#B91C1C` | `#F87171` |
| `finance-income`, `finance-positive`, `chart-income` | `#15803D` | `#4ADE80` |
| `finance-expense`, `finance-negative`, `chart-expense` | `#B91C1C` | `#F87171` |
| `finance-transfer`, `chart-neutral` | `#2563EB` | `#60A5FA` |
| `finance-neutral` | `#64748B` | `#94A3B8` |
| `chart-grid` | `#E2E8F0` | `#334155` |
| `chart-category-1` | `#2563EB` | `#60A5FA` |
| `chart-category-2` | `#0F766E` | `#2DD4BF` |
| `chart-category-3` | `#7C3AED` | `#C4B5FD` |
| `chart-category-4` | `#B45309` | `#FBBF24` |
| `chart-category-5` | `#64748B` | `#94A3B8` |

## Typography

Use Inter Variable para interface, dados e valores. A escala de 12 a 32 px cobre metadados, corpo, títulos de seção e títulos de página; não introduza outra família sem aprovação.

## Layout

Use a escala de 4 px do frontmatter. Páginas seguem os templates documentados para shell, cabeçalho, conteúdo e estados responsivos; controles usam alturas existentes de 32, 36 ou 40 px.

## Elevation & Depth

Crie hierarquia principalmente com superfícies, bordas e espaçamento. Não introduza sombras decorativas ou novos níveis de elevação sem aprovação.

## Shapes

Use os raios de 4, 8, 12 e 16 px conforme o componente existente. Não derive uma segunda escala de cantos.

## Components

Reutilize os componentes React exportados por `@personal-finance/ui`. Controles, feedback, tabelas, KPIs e gráficos devem partir de `Button`, `Card`, `Badge`, `Icon`, campos de formulário, `Dialog`, `ToastProvider`, `DataTable`, `Pagination`, `MetricCard`, estados assíncronos, skeletons, `FinancialValue` e gráficos existentes. Componentes genéricos pertencem a `packages/ui`; composições e regras financeiras pertencem a `apps/web`.

Todo elemento interativo precisa de teclado, foco visível, labels, estados e contraste. Valores monetários usam BRL e `bigint` em centavos; gráficos e tabelas devem preservar alternativas textuais e a semântica financeira.

## Do's and Don'ts

- Use os tokens de `packages/tokens/src/themes.json` como fonte de verdade e mantenha Light/Dark equivalentes.
- Use componentes existentes antes de propor variantes ou primitivas novas.
- Mantenha a interface em português do Brasil e os valores em BRL.
- Não substitua componentes implementados nem altere a identidade visual sem aprovação.
- Não use cores hex inline em componentes nem cor como único indicador de significado.
- Não use dados bancários, credenciais ou informações financeiras reais em exemplos, fixtures ou imagens.
