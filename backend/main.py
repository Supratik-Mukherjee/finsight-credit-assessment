
import csv
import io
import json
import re
from datetime import datetime
from pathlib import Path
from typing import List
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RULES_FILE = Path(__file__).with_name("lender_rules.json")


def load_assessment_rules() -> dict:
    try:
        return json.loads(RULES_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="Backend lender rules could not be loaded.") from exc


def normalize_official_name(official_name: str) -> str:
    name_parts = re.findall(r"[A-Z0-9]+", official_name.upper())
    if name_parts and name_parts[0] in {"MR", "MRS", "MS", "MISS", "DR"}:
        name_parts = name_parts[1:]
    return " ".join(name_parts)


def find_demo_bureau_profile(pan_number: str, official_name: str) -> dict | None:
    normalized_pan = "".join(character for character in pan_number.upper() if character.isalnum())
    normalized_name = normalize_official_name(official_name)
    profiles = load_assessment_rules().get("bureau_persona_overrides", [])
    return next((
        profile for profile in profiles
        if profile["match_pan"] == normalized_pan
        and normalize_official_name(profile["match_name"]) == normalized_name
    ), None)


class Transaction(BaseModel):
    date: str
    merchant: str
    category: str
    amount: float
    type: str


class RiskRequest(BaseModel):
    pan_number: str = "ABCDE1234F"
    statement_file_name: str = "bank_statement.pdf"
    monthly_income: int = 120000
    monthly_expenses: int = 42000
    cibil_score: int = 710
    loan_amount: int = 600000
    bureau_flags: List[str] = []
    transaction_history: List[Transaction] = []


class LenderMatch(BaseModel):
    lender: str
    match_score: int
    eligibility: str
    max_loan: str
    interest_range: str
    reason: str


class RiskProfile(BaseModel):
    summary: str
    risk_score: int
    risk_band: str
    bureau_summary: str
    fraud_flags: List[str]
    lender_matches: List[LenderMatch]
    recommended_actions: List[str]
    transaction_summary: dict


def compute_risk_score(req: RiskRequest) -> dict:
    rules = load_assessment_rules()
    risk_rules = rules["risk_assessment"]
    total_spend = sum(float(t.amount) for t in req.transaction_history if t.type.lower() == "debit")
    monthly_surplus = max(req.monthly_income - req.monthly_expenses, 0)
    expense_ratio = req.monthly_expenses / max(req.monthly_income, 1)

    cibil_component = max(0, 100 - abs(req.cibil_score - 750) * 0.4)
    dti_component = max(0, 100 - (expense_ratio * 100) * 1.5)
    bureau_component = max(0, 100 - len(req.bureau_flags) * risk_rules["bureau_flag_penalty"])
    cashflow_component = max(0, 100 - max(0, 50 - monthly_surplus / 2000) * 1.5)
    spending_component = max(0, 100 - expense_ratio * 100)

    weights = risk_rules["weights"]
    risk_score = int(
        cibil_component * weights["cibil"]
        + dti_component * weights["debt_to_income"]
        + bureau_component * weights["bureau"]
        + cashflow_component * weights["cashflow"]
        + spending_component * weights["spending"]
    )
    risk_score = max(0, min(100, risk_score))

    risk_band = next(
        band["label"] for band in risk_rules["risk_bands"] if risk_score >= band["minimum_score"]
    )

    fraud_flags = list(dict.fromkeys(req.bureau_flags))
    if not fraud_flags:
        fraud_flags = ["Clear: no default or fraud alerts in the simulated screening."]

    lender_matches = []
    bureau_text = " ".join(req.bureau_flags).lower()
    has_default = "default" in bureau_text
    for lender in rules["lenders"]:
        scoring = lender["scoring"]
        score = scoring["base"]
        factors = []
        if req.cibil_score >= lender["minimum_cibil"]:
            score += scoring["cibil_pass"]
            factors.append(f"CIBIL meets lender minimum ({lender['minimum_cibil']}+).")
        else:
            score += scoring["cibil_fail"]
            factors.append(f"CIBIL is below lender minimum ({lender['minimum_cibil']}).")
        if expense_ratio <= lender["maximum_expense_ratio"]:
            score += scoring["expense_pass"]
            factors.append(f"Expense ratio meets limit ({lender['maximum_expense_ratio']:.0%}).")
        else:
            score += scoring["expense_fail"]
            factors.append(f"Expense ratio exceeds limit ({lender['maximum_expense_ratio']:.0%}).")
        if monthly_surplus > 0:
            score += scoring["positive_surplus"]
            factors.append("Positive monthly cash flow.")
        if req.loan_amount <= lender["maximum_loan_amount"]:
            score += scoring["loan_fit_bonus"]
            factors.append("Requested amount is within the lender's indicative limit.")
        else:
            score += scoring["loan_over_limit_penalty"]
            factors.append("Requested amount exceeds the lender's indicative limit.")
        if has_default:
            score -= scoring["default_penalty"]
            factors.append("Demo default alert applied using this lender's configured penalty.")
        elif req.bureau_flags:
            score -= len(req.bureau_flags) * scoring["bureau_flag_penalty"]
            factors.append("Bureau alert penalty applied.")
        else:
            score += scoring["no_default_bonus"]
            factors.append("No demo default alert on file.")

        score = max(0, min(100, score))
        thresholds = lender["eligibility_thresholds"]
        if score >= thresholds["eligible"]:
            eligibility = "Eligible"
        elif score >= thresholds["conditional"]:
            eligibility = "Conditional"
        else:
            eligibility = "Review"

        lender_matches.append({
            "lender": lender["name"],
            "match_score": score,
            "eligibility": eligibility,
            "max_loan": lender["maximum_loan_display"],
            "interest_range": lender["interest_range"],
            "reason": lender["reason"],
            "assessment_factors": factors,
        })

    recommended_actions = [
        "Keep your monthly expense ratio below 45% to improve approval odds.",
        "Avoid adding new repayment stress before applying for the loan.",
        "Maintain a clean bureau history and document recurring income sources.",
    ]
    if req.cibil_score < 680:
        recommended_actions.insert(0, "Build your CIBIL score by clearing small dues and avoiding late payments.")
    if has_default:
        recommended_actions.insert(0, "Resolve the demo-reported default and verify the conflicting identity/history records before applying.")
    elif len(req.bureau_flags) > 0:
        recommended_actions.append("Review the bureau alerts and resolve open repayment issues before submission.")

    summary = (
        f"The uploaded statement indicates {risk_band.lower()} conditions. "
        f"Use this demo assessment as an initial review, not a lending decision."
    )

    bureau_summary = (
        f"CIBIL score: {req.cibil_score}. Statement reference: {req.statement_file_name}. "
        f"Bureau flags: {', '.join(fraud_flags) if fraud_flags else 'None'}."
    )

    return {
        "summary": summary,
        "risk_score": risk_score,
        "risk_band": risk_band,
        "bureau_status": "Alert" if req.bureau_flags else "Clear",
        "bureau_summary": bureau_summary,
        "fraud_flags": fraud_flags,
        "lender_matches": lender_matches,
        "recommended_actions": recommended_actions,
        "transaction_summary": {
            "total_debits": round(total_spend, 2),
            "monthly_surplus": monthly_surplus,
            "expense_ratio": round(expense_ratio * 100, 1),
            "transactions_count": len(req.transaction_history),
        },
    }


def _amount(value: str) -> float | None:
    match = re.search(r"\d[\d,]*(?:\.\d{1,2})?", value)
    return float(match.group().replace(",", "")) if match else None


def _field(text: str, pattern: str, default: str = "") -> str:
    match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    return match.group(1).strip() if match else default


def _category(narration: str, transaction_type: str) -> str:
    value = narration.lower()
    if transaction_type == "credit":
        return "Income"
    if "rent" in value:
        return "Housing"
    if "emi" in value or "loan" in value:
        return "Loan"
    return "Other expense"


def _parse_transactions(text: str, is_csv: bool) -> list[dict]:
    transactions = []

    if is_csv:
        rows = csv.DictReader(io.StringIO(text))
        for row in rows:
            normalized = {str(key or "").strip().lower(): str(value or "").strip() for key, value in row.items()}
            date_value = next((value for key, value in normalized.items() if "date" in key), "")
            narration = next((value for key, value in normalized.items() if any(token in key for token in ("narration", "description", "merchant"))), "")
            debit_value = next((_amount(value) for key, value in normalized.items() if "debit" in key), None)
            credit_value = next((_amount(value) for key, value in normalized.items() if "credit" in key), None)
            transaction_type = "credit" if credit_value else "debit" if debit_value else ""
            amount = credit_value or debit_value
            if date_value and narration and amount:
                transactions.append({
                    "date": date_value,
                    "merchant": narration,
                    "category": _category(narration, transaction_type),
                    "amount": amount,
                    "type": transaction_type,
                })
        return transactions

    lines = text.splitlines()
    header = next((line for line in lines if all(token in line.upper() for token in ("NARRATION", "DEBIT", "CREDIT", "BALANCE"))), None)
    if not header:
        raise HTTPException(status_code=422, detail="Could not find a supported transaction ledger in this text statement.")

    debit_start = header.upper().find("DEBIT")
    credit_start = header.upper().find("CREDIT")
    balance_start = header.upper().find("BALANCE")
    for line in lines:
        date_match = re.match(r"\s*(\d{2}-[A-Z]{3}-\d{4})\s+", line, re.IGNORECASE)
        if not date_match:
            continue

        narration = line[date_match.end():debit_start].strip()
        if not narration or "opening balance" in narration.lower():
            continue

        debit = _amount(line[debit_start:credit_start])
        credit = _amount(line[credit_start:balance_start])
        amount = credit or debit
        if not amount:
            continue

        transaction_type = "credit" if credit else "debit"
        date_value = datetime.strptime(date_match.group(1).title(), "%d-%b-%Y").date().isoformat()
        transactions.append({
            "date": date_value,
            "merchant": narration,
            "category": _category(narration, transaction_type),
            "amount": amount,
            "type": transaction_type,
        })

    if not transactions:
        raise HTTPException(status_code=422, detail="No transactions were found in this statement.")
    return transactions


def parse_statement(text: str, filename: str) -> dict:
    is_csv = Path(filename).suffix.lower() == ".csv"
    transactions = _parse_transactions(text, is_csv)
    period = _field(text, r"Statement Period\s*:\s*(.+)")
    period_match = re.search(r"(\d{2}-[A-Z]{3}-\d{4})\s+to\s+(\d{2}-[A-Z]{3}-\d{4})", period, re.IGNORECASE)
    month_count = 1
    if period_match:
        start = datetime.strptime(period_match.group(1).title(), "%d-%b-%Y")
        end = datetime.strptime(period_match.group(2).title(), "%d-%b-%Y")
        month_count = max((end.year - start.year) * 12 + end.month - start.month + 1, 1)

    total_credits = _amount(_field(text, r"Total Credits[^:]*:\s*₹?\s*([\d,]+(?:\.\d{2})?)"))
    total_debits = _amount(_field(text, r"Total Debits[^:]*:\s*₹?\s*([\d,]+(?:\.\d{2})?)"))
    average_income = _amount(_field(text, r"Total Credits[^\n]*?Avg:\s*₹?\s*([\d,]+(?:\.\d{2})?)"))
    ledger_credits = sum(item["amount"] for item in transactions if item["type"] == "credit")
    ledger_debits = sum(item["amount"] for item in transactions if item["type"] == "debit")
    monthly_income = round(average_income if average_income is not None else (total_credits or ledger_credits) / month_count)
    monthly_expenses = round((total_debits if total_debits is not None else ledger_debits) / month_count)

    loan_line = _field(text, r"Loan Request Context\s*:\s*(.+)")
    loan_amount = _amount(loan_line) or 0
    loan_years_match = re.search(r"for\s+(\d+)\s+Years?", loan_line, re.IGNORECASE)
    loan_term_months = int(loan_years_match.group(1)) * 12 if loan_years_match else None
    existing_emi = _amount(_field(text, r"Existing EMI Obligations\s*:\s*₹?\s*([\d,]+)")) or 0
    prior_loan_note = _field(text, r"Existing EMI Obligations\s*:\s*[^\n]*\(([^)]+)\)")
    last_loan_from = _field(text, r"(?:Last|Previous) Loan(?: Provider| Lender| From)?\s*:\s*(.+)")
    if not last_loan_from:
        last_loan_from = _field(text, r"(?:last|previous) loan (?:was )?(?:from|with) ([^\n.,]+)")
    clients = _field(text, r"Recurring B2B Clients\s*:\s*(.+)")
    income_sources = [item.strip() for item in clients.split(",") if item.strip()]
    for transaction in transactions:
        if transaction["type"] != "credit":
            continue
        parts = re.split(r"[-/]", transaction["merchant"], maxsplit=2)
        source = parts[1].strip() if len(parts) > 1 else transaction["merchant"]
        if source and source.casefold() not in {item.casefold() for item in income_sources}:
            income_sources.append(source)

    loan_purpose = re.sub(r"^\s*₹?\s*[\d,]+(?:\.\d{2})?\s*", "", loan_line)
    loan_purpose = re.sub(r"\s+for\s+\d+\s+Years?.*$", "", loan_purpose, flags=re.IGNORECASE).strip()

    reconciliation_flags = []
    if total_debits is not None and abs(total_debits - ledger_debits) > 0.01:
        reconciliation_flags.append(
            f"Listed debit transactions total ₹{ledger_debits:,.0f}, while the account summary reports ₹{total_debits:,.0f}."
        )
    if total_credits is not None and abs(total_credits - ledger_credits) > 0.01:
        reconciliation_flags.append(
            f"Listed credit transactions total ₹{ledger_credits:,.0f}, while the account summary reports ₹{total_credits:,.0f}."
        )

    return {
        "transactions": transactions,
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "loan_amount": round(loan_amount),
        "loan_term_months": loan_term_months,
        "borrower_profile": {
            "name": _field(text, r"Account Holder Name\s*:\s*(.+)"),
            "occupation": _field(text, r"Occupation / Profile\s*:\s*(.+)"),
            "pan_number": _field(text, r"PAN Number\s*:\s*([A-Z]{5}\d{4}[A-Z])"),
            "statement_period": period,
            "income_sources": income_sources,
        },
        "loan_history": {
            "status": "No previous loans reported" if "never took" in prior_loan_note.lower() else (prior_loan_note or "Not stated in the statement"),
            "last_loan_from": last_loan_from or ("None reported" if "never took" in prior_loan_note.lower() else "Not stated"),
            "existing_monthly_emi": existing_emi,
        },
        "loan_request": {
            "amount": round(loan_amount),
            "purpose": loan_purpose,
            "term_months": loan_term_months,
        },
        "account_summary": {
            "opening_balance": _amount(_field(text, r"Opening Balance[^:]*:\s*₹?\s*([\d,]+(?:\.\d{2})?)")),
            "total_credits": total_credits if total_credits is not None else ledger_credits,
            "total_debits": total_debits if total_debits is not None else ledger_debits,
            "closing_balance": _amount(_field(text, r"Closing Balance[^:]*:\s*₹?\s*([\d,]+(?:\.\d{2})?)")),
            "ledger_credits": round(ledger_credits, 2),
            "ledger_debits": round(ledger_debits, 2),
            "cheque_bounces_nach_returns": int(_amount(_field(text, r"Cheque Bounces / NACH Returns\s*:\s*(\d+)")) or 0),
        },
        "reconciliation_flags": reconciliation_flags,
    }


@app.post("/api/risk-profile")
async def risk_profile(req: RiskRequest):
    return compute_risk_score(req)


@app.post("/api/submit-profile")
async def submit_profile(
    statement_file: UploadFile = File(...),
    pan_number: str = Form(...),
    official_name: str = Form(...),
    loan_amount: int | None = Form(None),
):
    statement_name = statement_file.filename or "statement.txt"
    extension = Path(statement_name).suffix.lower()
    if extension not in {".txt", ".csv"}:
        raise HTTPException(status_code=415, detail="For this demo, upload a plain-text (.txt) or CSV (.csv) statement.")

    contents = await statement_file.read(2_000_001)
    if len(contents) > 2_000_000:
        raise HTTPException(status_code=413, detail="Statement files must be 2 MB or smaller.")
    try:
        statement_text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail="The statement must use UTF-8 text encoding.") from exc

    statement = parse_statement(statement_text, statement_name)
    effective_pan = pan_number.strip().upper()
    effective_name = " ".join(official_name.split())
    if not re.fullmatch(r"[A-Z]{5}\d{4}[A-Z]", effective_pan):
        raise HTTPException(status_code=422, detail="Enter a valid PAN number.")
    if not effective_name:
        raise HTTPException(status_code=422, detail="Enter the applicant's full official name.")

    bureau_profile = find_demo_bureau_profile(effective_pan, effective_name)
    bureau_flags = bureau_profile["alerts"] if bureau_profile else []
    assessment_rules = load_assessment_rules()["risk_assessment"]
    cibil_score = bureau_profile.get("cibil_score", assessment_rules["default_cibil_score"]) if bureau_profile else assessment_rules["default_cibil_score"]
    statement["borrower_profile"]["name"] = effective_name
    statement["borrower_profile"]["pan_number"] = f"{effective_pan[:5]}****{effective_pan[-1]}"

    payload = RiskRequest(
        pan_number=effective_pan or "UNKNOWN",
        statement_file_name=statement_name,
        monthly_income=statement["monthly_income"],
        monthly_expenses=statement["monthly_expenses"],
        cibil_score=cibil_score,
        loan_amount=loan_amount if loan_amount is not None else statement["loan_amount"],
        bureau_flags=bureau_flags,
        transaction_history=[Transaction(**transaction) for transaction in statement["transactions"]],
    )

    result = compute_risk_score(payload)
    result["statement_file_name"] = statement_name
    result["transaction_history"] = statement["transactions"]
    result["borrower_profile"] = statement["borrower_profile"]
    result["loan_history"] = statement["loan_history"]
    result["loan_request"] = {**statement["loan_request"], "amount": payload.loan_amount}
    result["account_summary"] = statement["account_summary"]
    result["reconciliation_flags"] = statement["reconciliation_flags"]
    result["defaulted_loan"] = bureau_profile["defaulted_loan"] if bureau_profile else None
    result["bureau_conflict_note"] = bureau_profile["conflict_note"] if bureau_profile else ""
    result["bureau_source"] = bureau_profile["source_label"] if bureau_profile else "Simulated lookup by PAN and official name; no live CIBIL service was contacted."
    result["cibil_score"] = cibil_score
    result["cibil_source"] = "Backend-configured demo score; not a live CIBIL result."
    result["bureau_summary"] = (
        f"Simulated screening: {'alert' if bureau_profile else 'clear'}. CIBIL score: {cibil_score}. "
        f"The statement reports "
        f"{statement['account_summary']['cheque_bounces_nach_returns']} cheque / NACH returns. "
        "No external bureau was contacted."
    )
    result["bureau_status"] = "Alert" if bureau_profile else "Clear"
    result["fraud_flags"] = bureau_flags or ["Clear: no default or fraud alerts in the simulated screening."]
    result["transaction_summary"].update({
        "monthly_income": statement["monthly_income"],
        "monthly_expenses": statement["monthly_expenses"],
        "total_debits": statement["account_summary"]["total_debits"],
        "ledger_debits": statement["account_summary"]["ledger_debits"],
    })
    return result


@app.get("/health")
async def health():
    return {"status": "ok"}
