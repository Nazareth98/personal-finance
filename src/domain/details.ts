import type { DatabaseRows } from "../lib/database.types";
export type DetailSnapshot = {
  profile?: DatabaseRows["profiles"];
  billing_statements?: DatabaseRows["billing_statements"][];
  billing_payments?: DatabaseRows["billing_payments"][];
  installment_purchases?: DatabaseRows["installment_purchases"][];
  installment_occurrences?: DatabaseRows["installment_occurrences"][];
  payslip_items?: DatabaseRows["payslip_items"][];
  payslip_bases?: DatabaseRows["payslip_bases"][];
  transaction_classifications?: DatabaseRows["transaction_classifications"][];
};
