// Gerado do PostgreSQL após aplicar migrations. npm run types:generate
export interface DatabaseRows {
  audit_events: {
    id: string;
    workspace_id: string;
    entity: string;
    entity_id: string;
    action: string;
    actor_user_id: string | null;
    created_at: string;
  };
  billing_payments: {
    id: string;
    workspace_id: string;
    statement_id: string;
    transaction_id: string;
  };
  billing_statements: {
    id: string;
    workspace_id: string;
    account_id: string;
    competence: string;
    due_date: string;
    declared_cents: string;
  };
  budget_allocations: {
    id: string;
    workspace_id: string;
    category_id: string;
    period: string;
    cadence: string;
    fixed_cents: string | null;
    percentage_bps: number | null;
    forecast_income_cents: string | null;
  };
  categories: {
    id: string;
    workspace_id: string;
    name: string;
    archived: boolean;
    budget_nature: string | null;
    sort_order: number;
  };
  categorization_rules: {
    id: string;
    workspace_id: string;
    keyword: string;
    priority: number;
    category_id: string;
    subcategory_id: string | null;
    active: boolean;
    match_mode: string;
    requires_financial_nature_review: boolean;
    source_key: string | null;
    account_id: string | null;
    amount_direction: string;
    transaction_nature: string | null;
    counterpart_account_id: string | null;
    auto_approve: boolean;
  };
  credit_cards: {
    id: string;
    workspace_id: string;
    account_id: string;
    closing_day: number;
    due_day: number;
    limit_cents: string;
    last_four: string | null;
  };
  financial_accounts: {
    id: string;
    workspace_id: string;
    name: string;
    institution: string;
    kind: string;
    opening_cents: string;
    currency: string;
    archived: boolean;
    created_at: string;
  };
  import_batches: {
    id: string;
    workspace_id: string;
    account_id: string;
    file_hash: string;
    parser_version: string;
    created_at: string;
    created_by: string;
  };
  import_raw_rows: {
    id: string;
    workspace_id: string;
    batch_id: string;
    row_index: number;
    proposal: unknown;
    status: string;
    transaction_id: string | null;
    review_reason: string | null;
    automation_rule_id: string | null;
  };
  installment_occurrences: {
    id: string;
    workspace_id: string;
    purchase_id: string;
    occurrence: number;
    competence: string;
    amount_cents: string;
    transaction_id: string | null;
  };
  installment_purchases: {
    id: string;
    workspace_id: string;
    account_id: string;
    category_id: string | null;
    description: string;
    event_date: string;
    first_competence: string;
    total_cents: string;
    installments: number;
  };
  open_finance_connections: {
    id: string;
    workspace_id: string;
    account_id: string;
    provider_code: string;
    institution: string;
    status: string;
    scopes: string[];
    expires_at: string | null;
    last_sync_at: string | null;
    cursor: number;
    created_at: string;
    pluggy_item_id: string | null;
    pluggy_account_id: string | null;
  };
  open_finance_consents: {
    id: string;
    workspace_id: string;
    connection_id: string;
    action: string;
    scopes: string[];
    expires_at: string;
    actor_user_id: string;
    created_at: string;
  };
  open_finance_sync_runs: {
    id: string;
    workspace_id: string;
    connection_id: string;
    status: string;
    batch_id: string | null;
    rows_received: number;
    error_code: string | null;
    created_at: string;
  };
  payslip_bases: {
    id: string;
    workspace_id: string;
    payslip_id: string;
    name: string;
    amount_cents: string;
  };
  payslip_items: {
    id: string;
    workspace_id: string;
    payslip_id: string;
    code: string;
    description: string;
    kind: string;
    amount_cents: string;
  };
  payslips: {
    id: string;
    workspace_id: string;
    competence: string;
    employer: string;
    earnings_cents: string;
    deductions_cents: string;
    advance_cents: string;
    net_cents: string;
  };
  profiles: {
    id: string;
    display_name: string;
    locale: string;
    timezone: string;
    deletion_requested_at: string | null;
    created_at: string;
  };
  review_decisions: {
    id: string;
    workspace_id: string;
    row_id: string;
    decision: string;
    transaction_id: string | null;
    actor_user_id: string;
    created_at: string;
    automation_rule_id: string | null;
    decision_reason: string | null;
  };
  savings_goals: {
    id: string;
    workspace_id: string;
    account_id: string;
    name: string;
    target_cents: string;
    deadline: string | null;
  };
  source_links: {
    id: string;
    workspace_id: string;
    account_id: string;
    transaction_id: string;
    source_key: string;
  };
  subcategories: {
    id: string;
    workspace_id: string;
    category_id: string;
    name: string;
    sort_order: number;
    budget_nature: string | null;
  };
  transaction_classifications: {
    id: string;
    workspace_id: string;
    transaction_id: string;
    previous_category_id: string | null;
    new_category_id: string | null;
    previous_subcategory_id: string | null;
    new_subcategory_id: string | null;
    actor_user_id: string;
    created_at: string;
  };
  transactions: {
    id: string;
    workspace_id: string;
    account_id: string;
    category_id: string | null;
    subcategory_id: string | null;
    related_id: string | null;
    payslip_id: string | null;
    description: string;
    amount_cents: string;
    nature: string;
    event_date: string;
    bank_date: string;
    competence: string;
    status: string;
    source: string;
    source_key: string;
    installment_index: number | null;
    installment_count: number | null;
    created_by: string;
    created_at: string;
  };
  workspace_members: {
    workspace_id: string;
    user_id: string;
    role: string;
  };
  workspaces: {
    id: string;
    owner_id: string;
    name: string;
    kind: string;
    created_at: string;
  };
}
