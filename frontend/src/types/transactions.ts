export type TransactionType = "income" | "expense";

// As returned by the backend (amounts are strings to keep exact decimals)
export type Transaction = {
  id: number;
  category_id: number;
  category_name: string;
  receipt_id: number | null;
  type: TransactionType;
  amount: string;
  date: string;
  description: string | null;
  merchant: string | null;
};

export type TransactionSummary = {
  month: string | null;
  total_income: string;
  total_expenses: string;
  balance: string;
};

export type TransactionInput = {
  type: TransactionType;
  category_id: number;
  amount: string;
  date: string;
  merchant: string | null;
  description: string | null;
};

export type Budget = {
  id: number;
  category_id: number | null;
  category_name: string | null;
  month: string;
  amount_limit: string;
  spent: string;
  remaining: string;
  percentage_used: string;
  is_exceeded: boolean;
};
