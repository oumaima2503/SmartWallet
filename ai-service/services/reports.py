import json
from typing import Optional

from pydantic import BaseModel

from services.ai_client import generate_json


class Insight(BaseModel):
    title: str
    detail: str
    evidence: str


class BudgetConcern(BaseModel):
    category: str
    detail: str
    evidence: str


class Recommendation(BaseModel):
    action: str
    reason: str
    evidence: str


class MonthlyAnalysis(BaseModel):
    overview: str
    spending_patterns: list[Insight]
    budget_concerns: list[BudgetConcern]
    positive_observations: list[Insight]
    recommendations: list[Recommendation]
    history_note: Optional[str] = None


SYSTEM_INSTRUCTION = """You write the monthly report of a personal finance app.
You receive statistics that were already calculated by the backend from the user's records.
Rules:
- Use ONLY the numbers given in the statistics. Never calculate new totals, never invent numbers,
  categories, budgets or trends. Quote figures exactly as given, with the currency.
- Every observation, concern and recommendation must have an "evidence" field that quotes the
  supporting figures from the statistics (for example "Groceries: 1015 MAD, 26% of expenses").
- totals.net is income minus expenses. It is NOT money saved: call it "left after expenses" or
  "balance". Only totals.saved_to_goals is money the user put aside in savings goals.
- overview: 2-3 sentences about income, expenses, net result and budget performance.
- spending_patterns: the main spending categories, and month-to-month changes ONLY when
  history.has_previous_month is true. Describe a change as an increase or a decrease; do not call
  it good or bad unless a budget or a goal gives context.
- budget_concerns: only budgets whose status is "warning" or "exceeded". Use the exact budget
  category name ("Overall" for the overall budget). Empty list if there are none.
- positive_observations: budgets with status "ok", decreases in spending, savings contributions.
  Empty list if nothing supports it.
- recommendations: 2 to 4 practical budgeting actions for next month, each based on the evidence.
  General budgeting suggestions only: no investment advice, no financial products, no loans.
- history_note: when history is missing or partial (see data_notes), say clearly that trends cannot
  be confirmed yet. Otherwise null.
- Write in simple, friendly English, addressed to the user as "you". Be concise."""


LANGUAGES = {"en": "English", "fr": "French", "ar": "Arabic (Modern Standard Arabic)"}


def analyze_month(statistics: dict, language: str = "en") -> dict:
    prompt = "Write the monthly report from these statistics:\n" + json.dumps(statistics, ensure_ascii=False)
    instruction = SYSTEM_INSTRUCTION
    if language in LANGUAGES and language != "en":
        # Only the text changes language: category names must stay exactly as given (the backend checks them)
        instruction += (
            f"\n- Write every text field in {LANGUAGES[language]}. Keep the \"category\" values exactly as they"
            " appear in the statistics (do not translate them)."
        )
    result: MonthlyAnalysis = generate_json(
        prompt=prompt,
        schema=MonthlyAnalysis,
        system_instruction=instruction,
    )
    return result.model_dump()
