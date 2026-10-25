export type Category = {
  id: number;
  name: string;
  type: "income" | "expense";
  is_custom: boolean;
};

export type Confidence = "high" | "medium" | "low";

export type ReceiptExtraction = {
  is_receipt: boolean;
  raw_text: string;
  merchant: string | null;
  date: string | null;
  total_amount: number | null;
  currency: string | null;
  suggested_category: string | null;
  suggested_category_id: number | null;
  category_reason: string | null;
  items: { name: string; price: number | null }[];
  notes: string | null;
  confidence: { merchant: Confidence; date: Confidence; total_amount: Confidence };
  missing_fields: string[];
};

export type ScanResponse = {
  receipt_id: number;
  status: "extracted" | "not_a_receipt" | "failed";
  error?: string;
  extraction: ReceiptExtraction | null;
};

export type SavedExpense = {
  id: number;
  amount: number;
  date: string;
  merchant: string | null;
  description: string | null;
};

export type ReceiptHistoryItem = {
  id: number;
  created_at: string;
  transaction_id: number | null;
  saved_amount: number | null;
  saved_date: string | null;
  category: string | null;
  merchant: string | null;
  read_amount: number | null;
  read_currency: string | null;
  was_read: boolean;
};
