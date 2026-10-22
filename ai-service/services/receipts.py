import re
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel

from services.ai_client import generate_json

Confidence = Literal["high", "medium", "low"]


class ReceiptItem(BaseModel):
    name: str
    price: Optional[float] = None


class ReceiptExtraction(BaseModel):
    is_receipt: bool
    raw_text: str
    merchant: Optional[str] = None
    merchant_confidence: Confidence = "low"
    date: Optional[str] = None
    date_confidence: Confidence = "low"
    total_amount: Optional[float] = None
    total_confidence: Confidence = "low"
    currency: Optional[str] = None
    suggested_category: Optional[str] = None
    category_reason: Optional[str] = None
    items: list[ReceiptItem] = []
    notes: Optional[str] = None


SYSTEM_INSTRUCTION = """You read photos of shopping receipts for a personal finance app.
Rules:
- First, copy the printed text of the receipt into raw_text (OCR), line by line.
- Only report values that are printed on the receipt. Never invent or guess missing values: use null.
- total_amount is the FINAL amount paid (after discounts and taxes), not a subtotal, a tax line,
  a discount, the cash given or the change returned.
- date must be the purchase date in YYYY-MM-DD format, or null if it is not readable.
  Receipts are often in DD/MM/YYYY format.
- currency is a 3-letter ISO code (MAD for dirham, DH, DHS) or null if it is not shown.
- suggested_category MUST be exactly one of the allowed categories, or null if none fits.
- Set each confidence to "low" when the text is blurry, cut or uncertain.
- If the image is not a receipt, set is_receipt to false.
- notes: short explanation of any problem (blurry, cut, several totals...), otherwise null."""


def _clean_date(value):
    if not value or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return None
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None
    # A purchase date can't be in the future
    return value if parsed <= date.today() else None


def _clean_amount(value):
    if value is None or value <= 0 or value > 10_000_000:
        return None
    return round(value, 2)


def analyze_receipt(image_bytes: bytes, categories: list[str]) -> dict:
    prompt = (
        "Extract the transaction information from this receipt.\n"
        f"Allowed expense categories: {', '.join(categories) if categories else 'none'}"
    )
    result: ReceiptExtraction = generate_json(
        prompt=prompt,
        image=image_bytes,
        schema=ReceiptExtraction,
        system_instruction=SYSTEM_INSTRUCTION,
    )

    # Validate what the AI returned instead of trusting it
    total = _clean_amount(result.total_amount)
    receipt_date = _clean_date(result.date)
    currency = result.currency.upper() if result.currency and re.fullmatch(r"[A-Za-z]{3}", result.currency) else None
    category = result.suggested_category if result.suggested_category in categories else None
    merchant = result.merchant.strip()[:150] if result.merchant and result.merchant.strip() else None

    return {
        "is_receipt": result.is_receipt,
        "raw_text": result.raw_text[:20000],
        "merchant": merchant,
        "date": receipt_date,
        "total_amount": total,
        "currency": currency,
        "suggested_category": category,
        "category_reason": result.category_reason,
        "items": [item.model_dump() for item in result.items[:100]],
        "notes": result.notes,
        # Fields the user should check before saving
        "confidence": {
            "merchant": result.merchant_confidence if merchant else "low",
            "date": result.date_confidence if receipt_date else "low",
            "total_amount": result.total_confidence if total else "low",
        },
        "missing_fields": [
            name
            for name, value in (("merchant", merchant), ("date", receipt_date), ("total_amount", total), ("category", category))
            if value is None
        ],
    }
