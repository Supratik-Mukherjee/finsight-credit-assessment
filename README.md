# FinSight

FinSight is a hackathon demo for reviewing uploaded bank statements, displaying a simulated bureau result, and comparing a borrower profile against configurable lender rules.

## Features

- Text and CSV statement upload with transaction and account-summary extraction
- PAN and official-name matching against a local demo bureau profile
- Backend-configured simulated CIBIL scores and lender assessment rules
- Risk summary, reconciliation warnings, and lender-specific score factors
- In-app lender handoff screen; no external lender site is opened

## Run locally

Start the backend in one terminal:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend in another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173.

## Demo routes

- `/` FinSight wallet-style homepage
- `/apply` PAN, official name, statement upload, and requested-loan form
- `/results` statement analysis and lender comparisons
- `/lender-redirect` in-app lender handoff screen

## Demo limitations

The statement parser currently supports plain-text and CSV files. Bureau scores, bureau alerts, and lender policies are local fictional demo configuration in `backend/lender_rules.json`; no external CIBIL, bureau, or lender service is contacted. The results are not credit advice or lending decisions.