// Bangladesh-oriented Chart of Accounts for a software studio.
import type { Account } from "../types.js";

export const CHART_OF_ACCOUNTS: Account[] = [
  // Assets (debit normal)
  { code: "1000", name: "Cash", type: "Asset", normal: "debit", system: true },
  { code: "1010", name: "Bank — Operating", type: "Asset", normal: "debit", system: true },
  { code: "1020", name: "Bank — USD", type: "Asset", normal: "debit", system: true },
  { code: "1100", name: "Accounts Receivable", type: "Asset", normal: "debit", system: true },
  { code: "1200", name: "VAT Receivable (Input)", type: "Asset", normal: "debit", system: true },
  { code: "1500", name: "Fixed Assets — Equipment", type: "Asset", normal: "debit", system: true },
  { code: "1510", name: "Accumulated Depreciation", type: "Asset", normal: "credit", system: true },

  // Liabilities (credit normal)
  { code: "2000", name: "Accounts Payable", type: "Liability", normal: "credit", system: true },
  { code: "2100", name: "VAT Payable (Output)", type: "Liability", normal: "credit", system: true },
  { code: "2200", name: "Salaries Payable", type: "Liability", normal: "credit", system: true },
  { code: "2300", name: "Tax Payable (TDS / Income)", type: "Liability", normal: "credit", system: true },

  // Equity (credit normal)
  { code: "3000", name: "Share Capital", type: "Equity", normal: "credit", system: true },
  { code: "3100", name: "Retained Earnings", type: "Equity", normal: "credit", system: true },

  // Income (credit normal)
  { code: "4000", name: "Service Revenue", type: "Income", normal: "credit", system: true },
  { code: "4100", name: "Other Income", type: "Income", normal: "credit", system: true },

  // Expenses (debit normal)
  { code: "5000", name: "Salaries & Wages", type: "Expense", normal: "debit", system: true },
  { code: "5100", name: "Software & Subscriptions", type: "Expense", normal: "debit", system: true },
  { code: "5200", name: "Hardware & Equipment", type: "Expense", normal: "debit", system: true },
  { code: "5300", name: "Office Rent", type: "Expense", normal: "debit", system: true },
  { code: "5400", name: "Travel", type: "Expense", normal: "debit", system: true },
  { code: "5500", name: "Marketing", type: "Expense", normal: "debit", system: true },
  { code: "5600", name: "Vendor / Subcontractors", type: "Expense", normal: "debit", system: true },
  { code: "5700", name: "Bank Charges", type: "Expense", normal: "debit", system: true },
  { code: "5800", name: "Depreciation", type: "Expense", normal: "debit", system: true },
  { code: "5900", name: "Other Expenses", type: "Expense", normal: "debit", system: true },
];

// Expense category → ledger expense account code.
export const CATEGORY_ACCOUNT: Record<string, string> = {
  Salaries: "5000",
  Software: "5100",
  Hardware: "5200",
  Office: "5300",
  Travel: "5400",
  Marketing: "5500",
  Vendor: "5600",
  Other: "5900",
};

// Core posting accounts.
export const ACC = {
  bankBDT: "1010",
  bankUSD: "1020",
  ar: "1100",
  vatReceivable: "1200",
  fixedAssets: "1500",
  accumDep: "1510",
  ap: "2000",
  vatPayable: "2100",
  revenue: "4000",
  deprExpense: "5800",
} as const;
