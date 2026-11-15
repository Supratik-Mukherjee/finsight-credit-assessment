import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import WalletHome from './WalletHome.jsx';
import './App.css';

const initialProfile = {
  pan_number: '',
  official_name: '',
  loan_amount: 350000,
};

const formatMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WalletHome />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/lender-redirect" element={<LenderRedirectPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function ApplyPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(initialProfile);
  const [statementFile, setStatementFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({
      ...prev,
      [name]: ['cibil_score', 'loan_amount', 'monthly_income', 'monthly_expenses'].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('pan_number', profile.pan_number.trim());
      formData.append('official_name', profile.official_name.trim());
      formData.append('loan_amount', String(profile.loan_amount));
      if (statementFile) formData.append('statement_file', statementFile);

      const response = await fetch('http://localhost:8000/api/submit-profile', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'The profile could not be analyzed.');
      }

      const result = await response.json();
      sessionStorage.setItem('fintrust_result', JSON.stringify(result));
      navigate('/results', { state: { result } });
    } catch (err) {
      setError(err.message || 'Unable to generate the assessment right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page} className="app-page">
      <div style={styles.shell} className="app-shell">
        <header style={styles.topbar} className="app-topbar">
          <div style={styles.brandWrap}>
            <div style={styles.logo}>F</div>
            <div>
              <div style={styles.brand}>FinSight</div>
              <div style={styles.subtle}>Credit Health Dashboard</div>
            </div>
          </div>
          <div style={styles.topActions}>
            <div style={styles.search} className="app-search">LOCAL DEMO <span>·</span> No bureau connection</div>
          </div>
        </header>

        <div style={styles.heroRow} className="app-hero-row">
          <div style={styles.heroCard} className="app-hero-card">
            <div style={styles.heroLabel}>Credit check, simplified</div>
            <div style={styles.heroTitle}>A clearer view of your borrowing profile.</div>
            <div style={styles.heroSub}>Review statement activity, bureau signals, and lender fit in one place.</div>
          </div>
          <div style={styles.scorePill} className="app-step-panel">
            <div style={styles.scorePillLabel}>Your next step</div>
            <div style={styles.scorePillValue}>01</div>
            <div style={styles.scorePillBand}>Statement review</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.formPanel} className="app-form-panel">
          <div style={styles.formHeader}>Profile inputs</div>

          <div style={styles.inputGrid} className="app-input-grid">
            <label style={styles.field}>
              <span>PAN Number</span>
              <input name="pan_number" value={profile.pan_number} onChange={handleFieldChange} style={styles.input} placeholder="e.g. CQWPC9281F" pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" title="Enter a valid 10-character PAN" required />
            </label>

            <label style={styles.field}>
              <span>Full Official Name</span>
              <input name="official_name" value={profile.official_name} onChange={handleFieldChange} style={styles.input} placeholder="As shown on PAN" autoComplete="name" required />
            </label>

            <label style={styles.field}>
              <span>Statement File</span>
              <input type="file" accept=".csv,.txt,text/plain,text/csv" onChange={(event) => setStatementFile(event.target.files?.[0] || null)} style={styles.fileInput} required />
            </label>

            <label style={styles.field}>
              <span>Loan Amount Required (₹)</span>
              <input type="number" name="loan_amount" min="1" value={profile.loan_amount} onChange={handleFieldChange} style={styles.input} required />
            </label>
          </div>

          {error ? <div style={styles.errorBox}>{error}</div> : null}

          <button type="submit" style={styles.primaryButton} className="app-primary-button" disabled={loading}>
            {loading ? 'Uploading and analyzing...' : 'Review my profile  →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result || JSON.parse(sessionStorage.getItem('fintrust_result') || 'null');

  if (!result) {
    return (
      <div style={styles.page} className="app-page">
        <div style={styles.shell} className="app-shell">
          <div style={styles.emptyState}>No assessment result found. Please upload a statement again.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page} className="app-page">
      <div style={styles.shell} className="app-shell">
        <header style={styles.topbar} className="app-topbar">
          <div style={styles.brandWrap}>
            <div style={styles.logo}>F</div>
            <div>
              <div style={styles.brand}>FinSight</div>
              <div style={styles.subtle}>Risk Assessment Result</div>
            </div>
          </div>
          <button style={styles.secondaryButton} className="app-secondary-button" onClick={() => window.location.href = '/apply'}>
            ← Back to profile
          </button>
        </header>

        <div style={styles.heroRow} className="app-hero-row">
          <div style={styles.heroCard} className="app-hero-card">
            <div style={styles.heroLabel}>Assessment complete</div>
            <div style={styles.heroTitle}>{result.risk_band} assessment</div>
            <div style={styles.heroSub}>{result.summary}</div>
            <div style={styles.heroSub}>Statement: {result.statement_file_name || 'uploaded_statement.pdf'}</div>
          </div>
          <div style={styles.scorePill} className="app-risk-panel">
            <div style={styles.scorePillLabel}>Risk</div>
            <div style={styles.scorePillValue}>{result.risk_score}</div>
            <div style={styles.scorePillBand}>{result.risk_band}</div>
          </div>
        </div>

        <div style={styles.statsGrid} className="app-stats-grid">
          <div style={styles.statCard}><div style={styles.statLabel}>CIBIL score</div><div style={styles.statValue}>{result.cibil_score}</div></div>
          <div style={styles.statCard}><div style={styles.statLabel}>Avg monthly credits</div><div style={styles.statValue}>{formatMoney(result.transaction_summary.monthly_income)}</div></div>
          <div style={styles.statCard}><div style={styles.statLabel}>Avg monthly outflow</div><div style={styles.statValue}>{formatMoney(result.transaction_summary.monthly_expenses)}</div></div>
          <div style={styles.statCard}><div style={styles.statLabel}>Loan requested</div><div style={styles.statValue}>{formatMoney(result.loan_request.amount)}</div></div>
        </div>

        <div style={styles.mainGrid} className="app-main-grid">
          <div style={styles.leftColumn} className="app-left-column">
            <div style={styles.panel} className="app-panel">
              <div style={styles.panelHeader}><h3 style={styles.panelTitle}>Borrower profile</h3></div>
              <div style={styles.detailGrid} className="app-detail-grid">
                <div><span style={styles.detailLabel}>Name</span><strong>{result.borrower_profile.name || 'Not found'}</strong></div>
                <div><span style={styles.detailLabel}>PAN</span><strong>{result.borrower_profile.pan_number || 'Not found'}</strong></div>
                <div><span style={styles.detailLabel}>Work profile</span><strong>{result.borrower_profile.occupation || 'Not found'}</strong></div>
                <div><span style={styles.detailLabel}>Statement period</span><strong>{result.borrower_profile.statement_period || 'Not found'}</strong></div>
                <div style={styles.detailWide}><span style={styles.detailLabel}>Income sources / clients</span><strong>{result.borrower_profile.income_sources.join(', ') || 'Not stated'}</strong></div>
                <div><span style={styles.detailLabel}>Loan history</span><strong>{result.loan_history.status}</strong></div>
                <div><span style={styles.detailLabel}>Last loan from</span><strong>{result.loan_history.last_loan_from}</strong></div>
                <div><span style={styles.detailLabel}>Existing monthly EMI</span><strong>{formatMoney(result.loan_history.existing_monthly_emi)}</strong></div>
                <div><span style={styles.detailLabel}>Loan purpose and term</span><strong>{result.loan_request.purpose || 'Not stated'}{result.loan_request.term_months ? ` · ${result.loan_request.term_months} months` : ''}</strong></div>
              </div>
            </div>

            <div style={styles.panel} className="app-panel">
              <div style={styles.panelHeader}><h3 style={styles.panelTitle}>Statement transactions</h3></div>
              <div style={styles.transactionTable} className="app-transaction-table">
                <div style={styles.transactionHeader} className="app-transaction-header"><span>Date</span><span>Description</span><span>Type</span><span>Amount</span></div>
                {result.transaction_history.map((transaction, index) => (
                  <div key={`${transaction.date}-${index}`} style={styles.transactionRow} className="app-transaction-row">
                    <span>{transaction.date}</span>
                    <span>{transaction.merchant}</span>
                    <span>{transaction.category}</span>
                    <strong style={{ color: transaction.type === 'credit' ? '#0f9d73' : '#40516b' }}>
                      {transaction.type === 'credit' ? '+' : '-'}{formatMoney(transaction.amount)}
                    </strong>
                  </div>
                ))}
              </div>
              {result.reconciliation_flags.length > 0 && (
                <div style={styles.warningBox}>
                  <strong>Statement totals need review</strong>
                  {result.reconciliation_flags.map((flag, index) => <div key={index}>{flag}</div>)}
                </div>
              )}
            </div>

            <div style={styles.panel} className="app-panel">
              <div style={styles.panelHeader}><h3 style={styles.panelTitle}>Account summary</h3></div>
              <div style={styles.detailGrid} className="app-detail-grid">
                <div><span style={styles.detailLabel}>Opening balance</span><strong>{formatMoney(result.account_summary.opening_balance)}</strong></div>
                <div><span style={styles.detailLabel}>Reported credits</span><strong>{formatMoney(result.account_summary.total_credits)}</strong></div>
                <div><span style={styles.detailLabel}>Reported debits</span><strong>{formatMoney(result.account_summary.total_debits)}</strong></div>
                <div><span style={styles.detailLabel}>Closing balance</span><strong>{formatMoney(result.account_summary.closing_balance)}</strong></div>
                <div><span style={styles.detailLabel}>Cheque / NACH returns</span><strong>{result.account_summary.cheque_bounces_nach_returns}</strong></div>
                <div><span style={styles.detailLabel}>Parsed ledger rows</span><strong>{result.transaction_history.length}</strong></div>
              </div>
            </div>

            <div style={styles.panel} className="app-panel">
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>Credit &amp; fraud screening</h3>
              </div>
              <div style={{ ...styles.summaryBox, ...(result.bureau_status === 'Alert' ? styles.bureauWarning : {}) }}>
                <strong>{result.bureau_status}</strong><br />{result.bureau_summary}
              </div>
              <div style={styles.bureauNotice}>{result.cibil_source} {result.bureau_source}</div>
              {result.defaulted_loan && (
                <div style={styles.defaultAlert}>
                  <strong>Defaulted loan reported: {result.defaulted_loan.status}</strong>
                  <span>{result.defaulted_loan.loan_type} · {result.defaulted_loan.lender}</span>
                  <span>{result.defaulted_loan.amount ? formatMoney(result.defaulted_loan.amount) : 'Amount not provided'} · Reported {result.defaulted_loan.reported_date}</span>
                  <span>{result.bureau_conflict_note}</span>
                </div>
              )}
              <div style={styles.flagList}>
                {result.fraud_flags.map((flag, idx) => (
                  <div key={idx} style={styles.flagItem}>{flag}</div>
                ))}
              </div>
            </div>

            <div style={styles.panel} className="app-panel">
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>Suggested actions</h3>
              </div>
              <ul style={styles.actionList}>
                {result.recommended_actions.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={styles.rightColumn} className="app-right-column">
            <div style={styles.panel} className="app-panel">
              <div style={styles.panelHeader}>
                <h3 style={styles.panelTitle}>Lender eligibility</h3>
              </div>
              <div style={styles.lenderGrid} className="app-lender-grid">
                {result.lender_matches.map((lender) => (
                  <div key={lender.lender} style={styles.lenderCard} className="app-lender-card">
                    <div style={styles.lenderTopRow}>
                      <span style={styles.lenderName}>{lender.lender}</span>
                      <span style={{ ...styles.badge, background: lender.eligibility === 'Eligible' ? '#0f9d73' : lender.eligibility === 'Conditional' ? '#f59f00' : '#ff6b57' }}>
                        {lender.eligibility}
                      </span>
                    </div>
                    <div style={styles.matchScore}>{lender.match_score}%</div>
                    <div style={styles.metaText}>{lender.max_loan}</div>
                    <div style={styles.metaText}>{lender.interest_range}</div>
                    <div style={styles.reasonText}>{lender.reason}</div>
                    <ul style={styles.factorList}>
                      {lender.assessment_factors.map((factor, index) => <li key={index}>{factor}</li>)}
                    </ul>
                    <button
                      type="button"
                      className="app-lender-apply"
                      onClick={() => {
                        const handoff = { lender, loan_amount: result.loan_request.amount };
                        sessionStorage.setItem('finsight_lender_handoff', JSON.stringify(handoff));
                        navigate('/lender-redirect', { state: handoff });
                      }}
                    >
                      Apply with {lender.lender} <span aria-hidden="true">→</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LenderRedirectPage() {
  const location = useLocation();
  const handoff = location.state || JSON.parse(sessionStorage.getItem('finsight_lender_handoff') || 'null');

  if (!handoff) {
    return (
      <main className="lender-handoff-page">
        <section className="lender-handoff-card">
          <div className="lender-handoff-brand">FinSight</div>
          <h1>No lender selected</h1>
          <p>Choose a lender from your assessment to start the application handoff.</p>
          <button type="button" className="app-lender-apply" onClick={() => window.location.assign('/apply')}>
            Return to application <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="lender-handoff-page" aria-live="polite">
      <section className="lender-handoff-card">
        <div className="lender-handoff-brand">FinSight</div>
        <div className="lender-handoff-spinner" aria-hidden="true"><span /></div>
        <div className="lender-handoff-eyebrow">SECURE PARTNER HANDOFF</div>
        <h1>Redirecting to {handoff.lender.lender}</h1>
        <p className="lender-handoff-copy">Preparing the lender application for your requested amount.</p>
        <div className="lender-handoff-amount">
          <span>Requested loan</span>
          <strong>{formatMoney(handoff.loan_amount)}</strong>
        </div>
        <div className="lender-handoff-progress"><span /></div>
        <p className="lender-handoff-note">Demo handoff screen. No external website has been opened.</p>
      </section>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #eaf4ff 0%, #f7fbff 32%, #ffffff 100%)',
    color: '#0d1b2a',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    padding: '26px 28px 48px',
  },
  shell: {
    maxWidth: 1180,
    margin: '0 auto',
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandWrap: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: {
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(145deg, #075bc8, #00a7d8)',
    color: '#fff',
    borderRadius: 11,
    fontWeight: 800,
  },
  brand: { fontSize: 23, fontWeight: 800, letterSpacing: 0, color: '#073b7a' },
  subtle: { fontSize: 12, color: '#5a6b85' },
  topActions: { display: 'flex', alignItems: 'center', gap: 12 },
  search: {
    background: '#eaf4ff',
    border: '1px solid #d3e7ff',
    padding: '9px 14px',
    borderRadius: 999,
    color: '#2862a2',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.04em',
  },
  notification: {
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    background: '#fff',
    border: '1px solid #dfeaff',
  },
  heroRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 16, marginBottom: 20 },
  heroCard: {
    background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 16px), linear-gradient(112deg, #064eb5 0%, #0879e5 53%, #00a9d8 100%)',
    borderRadius: 18,
    padding: '32px 30px',
    boxShadow: '0 14px 32px rgba(4, 82, 177, 0.18)',
    color: '#fff',
  },
  heroLabel: { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 12, fontWeight: 700 },
  heroTitle: { fontSize: 31, fontWeight: 800, lineHeight: 1.22, marginBottom: 10, maxWidth: 650 },
  heroSub: { fontSize: 14, opacity: 0.9, lineHeight: 1.65, maxWidth: 600 },
  scorePill: {
    background: '#ffffff',
    border: '1px solid #d7e8fb',
    borderRadius: 18,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 10px 26px rgba(13, 69, 130, 0.07)',
  },
  scorePillLabel: { color: '#5a6b85', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' },
  scorePillValue: { fontSize: 42, fontWeight: 800, margin: '8px 0', color: '#075bc8' },
  scorePillBand: { fontWeight: 700, color: '#0f70ff' },
  formPanel: {
    background: '#fff',
    border: '1px solid #dce9f7',
    borderRadius: 16,
    padding: 24,
    marginBottom: 22,
    boxShadow: '0 8px 24px rgba(18, 59, 105, 0.055)',
  },
  formHeader: { fontSize: 19, fontWeight: 800, marginBottom: 18, color: '#153758' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 },
  field: { display: 'grid', gap: 8, color: '#40516b', fontSize: 14, fontWeight: 600 },
  input: {
    border: '1px solid #cddceb',
    borderRadius: 9,
    background: '#fbfdff',
    padding: '12px 13px',
    fontSize: 15,
    color: '#0d1b2a',
    outline: 'none',
  },
  fileInput: { border: '1px solid #cddceb', borderRadius: 9, background: '#fbfdff', padding: '10px 12px', fontSize: 14 },
  primaryButton: {
    marginTop: 18,
    background: 'linear-gradient(105deg, #075bc8, #0879e5 66%, #00a1d4)',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    padding: '13px 20px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(7, 91, 200, 0.2)',
  },
  secondaryButton: {
    background: '#fff',
    border: '1px solid #dfeaff',
    color: '#0f70ff',
    fontWeight: 700,
    borderRadius: 12,
    padding: '10px 16px',
    cursor: 'pointer',
  },
  errorBox: {
    marginTop: 16,
    borderRadius: 12,
    padding: '12px 14px',
    background: '#fff0f0',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    fontWeight: 600,
  },
  defaultAlert: { display: 'grid', gap: 7, marginTop: 14, padding: 14, background: '#fff0f0', border: '1px solid #f2b8b5', borderRadius: 10, color: '#8f2525', lineHeight: 1.5 },
  emptyState: {
    background: '#fff',
    borderRadius: 20,
    border: '1px solid #dfeaff',
    padding: 28,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 700,
    color: '#425979',
  },
  mainGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.9fr)', gap: 18 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 18 },
  statCard: { background: '#fff', border: '1px solid #dce9f7', borderRadius: 12, padding: 16, boxShadow: '0 5px 16px rgba(18, 59, 105, 0.04)' },
  statLabel: { color: '#5a6b85', fontSize: 12, textTransform: 'uppercase' },
  statValue: { color: '#0d1b2a', fontSize: 22, fontWeight: 800, marginTop: 8 },
  leftColumn: { display: 'grid', gap: 22 },
  rightColumn: { display: 'grid', gap: 22 },
  panel: {
    background: '#fff',
    border: '1px solid #dce9f7',
    borderRadius: 14,
    padding: 20,
    boxShadow: '0 5px 18px rgba(18, 59, 105, 0.04)',
  },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  panelTitle: { margin: 0, fontSize: 20, fontWeight: 800 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 },
  detailWide: { gridColumn: '1 / -1' },
  detailLabel: { display: 'block', color: '#5a6b85', fontSize: 12, marginBottom: 5 },
  transactionTable: { overflowX: 'auto' },
  transactionHeader: { display: 'grid', gridTemplateColumns: '105px minmax(200px, 1fr) 120px 130px', gap: 10, padding: '9px 10px', color: '#5a6b85', fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #ebf2ff' },
  transactionRow: { display: 'grid', gridTemplateColumns: '105px minmax(200px, 1fr) 120px 130px', gap: 10, alignItems: 'center', padding: '12px 10px', borderBottom: '1px solid #f0f4fb', fontSize: 13 },
  warningBox: { display: 'grid', gap: 6, marginTop: 14, padding: 14, background: '#fff8e6', border: '1px solid #f5d58a', borderRadius: 10, color: '#795600', lineHeight: 1.5 },
  bureauNotice: { marginTop: 10, color: '#6b7280', fontSize: 12, lineHeight: 1.5 },
  summaryBox: {
    background: '#edfff7',
    border: '1px solid #bcefd6',
    color: '#0b5c46',
    borderRadius: 12,
    padding: 14,
    lineHeight: 1.6,
  },
  bureauWarning: { background: '#fff0f0', borderColor: '#f2b8b5', color: '#8f2525' },
  flagList: { marginTop: 14, display: 'grid', gap: 10 },
  flagItem: {
    background: '#f7faff',
    border: '1px solid #e2ecff',
    borderRadius: 10,
    padding: '10px 12px',
    color: '#425979',
  },
  actionList: { margin: 0, paddingLeft: 18, color: '#425979', display: 'grid', gap: 10, lineHeight: 1.6 },
  lenderGrid: { display: 'grid', gap: 12 },
  lenderCard: { background: '#f7faff', border: '1px solid #e2ecff', borderRadius: 14, padding: 14 },
  lenderTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  lenderName: { fontSize: 18, fontWeight: 800 },
  badge: { borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#fff' },
  matchScore: { fontSize: 32, fontWeight: 800, marginBottom: 8, color: '#0d1b2a' },
  metaText: { color: '#597293', marginBottom: 4 },
  reasonText: { marginTop: 10, color: '#48607d', lineHeight: 1.5, fontSize: 13 },
  factorList: { margin: '10px 0 0', paddingLeft: 18, color: '#48607d', fontSize: 12, lineHeight: 1.5, display: 'grid', gap: 4 },
};

export default App;