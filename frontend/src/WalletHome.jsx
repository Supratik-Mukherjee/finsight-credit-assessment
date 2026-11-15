import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Bike,
  Bus,
  CarFront,
  ChartColumnIncreasing,
  ChevronRight,
  CircleDollarSign,
  Coins,
  CreditCard,
  FileText,
  Fuel,
  Gift,
  HeartPulse,
  History,
  Landmark,
  PiggyBank,
  Plane,
  QrCode,
  ScanLine,
  Search,
  Send,
  Smartphone,
  TrainFront,
  WalletCards,
  Zap,
} from 'lucide-react';
import './WalletHome.css';

const quickActions = [
  { icon: ScanLine, label: 'Scan ID' },
  { icon: Send, label: 'Pay anyone' },
  { icon: Landmark, label: 'Bank transfer' },
  { icon: History, label: 'History' },
];

const billActions = [
  { icon: Smartphone, label: 'Mobile recharge' },
  { icon: CreditCard, label: 'Credit card bill' },
  { icon: Zap, label: 'Electricity bill' },
  { icon: Fuel, label: 'Fuel & FASTag' },
  { icon: FileText, label: 'Loan payment' },
];

const travelActions = [
  { icon: Plane, label: 'Flights' },
  { icon: Bus, label: 'Bus' },
  { icon: TrainFront, label: 'Train' },
  { icon: CarFront, label: 'Cabs' },
];

const savingsActions = [
  { icon: PiggyBank, label: 'Save in gold' },
  { icon: CircleDollarSign, label: 'Save monthly' },
  { icon: ChartColumnIncreasing, label: 'Mutual funds' },
  { icon: WalletCards, label: 'Credit health' },
];

function IconRow({ items, variant = 'service-grid' }) {
  return (
    <div className={variant}>
      {items.map(({ icon: Icon, label }) => (
        <div className="wallet-service" key={label}>
          <span className="wallet-service-icon" aria-hidden="true"><Icon size={21} strokeWidth={1.8} /></span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function WalletSection({ title, children, className = '' }) {
  return (
    <section className={`wallet-section ${className}`}>
      <div className="wallet-section-heading"><h2>{title}</h2></div>
      {children}
    </section>
  );
}

export default function WalletHome() {
  const navigate = useNavigate();

  return (
    <main className="wallet-home">
      <header className="wallet-header">
        <div className="wallet-avatar">SM</div>
        <div className="wallet-wordmark"><span>Fin</span><strong>Sight</strong><small>money, made clearer</small></div>
        <div className="wallet-header-bell" aria-label="Notifications"><Bell size={23} strokeWidth={1.9} /></div>
      </header>

      <div className="wallet-search" aria-label="Search services">
        <Search size={21} strokeWidth={1.9} />
        <span>Search services and payments</span>
      </div>

      <div className="wallet-quick-actions">
        {quickActions.map(({ icon: Icon, label }) => (
          <div className="wallet-quick-item" key={label}>
            <span className="wallet-quick-icon"><Icon size={23} strokeWidth={1.8} /></span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <WalletSection title="Recharge & bills" className="wallet-bills">
        <IconRow items={billActions} variant="wallet-horizontal-services" />
        <div className="wallet-scroll-mark"><span /></div>
      </WalletSection>

      <div className="wallet-due-strip">
        <span className="wallet-bank-mark"><CreditCard size={22} /></span>
        <div className="wallet-due-copy"><strong>Card ending 8842</strong><span>₹3,595.22 due in 4 days</span></div>
        <span className="wallet-static-link">View bill</span>
      </div>

      <div className="wallet-offer-banner">
        <span className="wallet-gift"><Gift size={27} /></span>
        <div><strong>A little extra for your next goal</strong><span>Explore this week’s money offers</span></div>
        <ChevronRight size={22} />
      </div>

      <div className="wallet-promo-grid">
        <div className="wallet-promo wallet-promo-tall">
          <span className="wallet-promo-icon"><WalletCards size={21} /></span>
          <div><strong>Pay later</strong><span>Check your available credit</span></div>
        </div>
        <div className="wallet-promo">
          <Plane size={20} />
          <div><strong>Trip plans?</strong><span>See travel offers</span></div>
        </div>
        <div className="wallet-promo">
          <Gift size={20} />
          <div><strong>Everyday rewards</strong><span>Offers picked for you</span></div>
        </div>
      </div>

      <div className="wallet-chip-row" aria-label="Featured services">
        <span><Gift size={16} /> Rewards</span>
        <span><CreditCard size={16} /> Cards</span>
        <span><ChartColumnIncreasing size={16} /> Spending</span>
      </div>

      <div className="wallet-campaign">
        <span className="wallet-campaign-kicker">FINSIGHT PICKS</span>
        <div className="wallet-campaign-copy"><strong>Make your next move count.</strong><span>Simple tools for a stronger money routine.</span></div>
        <div className="wallet-campaign-art" aria-hidden="true"><CircleDollarSign size={74} strokeWidth={1.2} /></div>
        <div className="wallet-campaign-dots"><i /><i /><i /><i /><i /></div>
      </div>

      <WalletSection title="Travel & tickets">
        <IconRow items={travelActions} />
        <div className="wallet-mini-promos"><span><Plane size={15} /> Flight deals</span><span><Bus size={15} /> Weekend rides</span></div>
      </WalletSection>

      <WalletSection title="Grow your money">
        <IconRow items={savingsActions} />
      </WalletSection>

      <WalletSection title="Loans & protection" className="wallet-loans">
        <div className="wallet-loan-grid">
          <button className="wallet-loan-button" type="button" onClick={() => navigate('/apply')}>
            <span className="wallet-loan-icon"><CircleDollarSign size={23} strokeWidth={1.8} /></span>
            <span>Loan</span>
          </button>
          <div className="wallet-static-service"><span className="wallet-service-icon"><WalletCards size={21} /></span><span>Pay later</span></div>
          <div className="wallet-static-service"><span className="wallet-service-icon"><CreditCard size={21} /></span><span>Cards</span></div>
          <div className="wallet-static-service"><span className="wallet-service-icon wallet-health-icon"><HeartPulse size={22} /></span><span>Health cover</span></div>
        </div>
        <div className="wallet-mini-promos"><span><CarFront size={15} /> Car cover</span><span><Bike size={15} /> Bike cover</span></div>
      </WalletSection>

      <WalletSection title="Free tools">
        <div className="wallet-tool-row">
          <div className="wallet-tool-card wallet-tool-mint"><span>CHECK YOUR SCORE</span><strong>Credit<br />snapshot</strong><div className="wallet-score-art"><ChartColumnIncreasing size={34} /></div></div>
          <div className="wallet-tool-card wallet-tool-yellow"><span>PLAN AHEAD</span><strong>Monthly<br />savings</strong><div className="wallet-score-art"><PiggyBank size={34} /></div></div>
          <div className="wallet-tool-card wallet-tool-pink"><span>KNOW YOUR FLOW</span><strong>Spend<br />tracker</strong><div className="wallet-score-art"><Coins size={34} /></div></div>
          <div className="wallet-tool-card wallet-tool-green"><span>READY TO APPLY?</span><strong>Loan<br />readiness</strong><div className="wallet-score-art"><ScanLine size={34} /></div></div>
        </div>
        <div className="wallet-scroll-mark"><span /></div>
      </WalletSection>

      <WalletSection title="More from FinSight">
        <IconRow items={[
          { icon: Gift, label: 'Offers' },
          { icon: FileText, label: 'Documents' },
          { icon: QrCode, label: 'Scan & pay' },
          { icon: Fuel, label: 'Bills' },
        ]} />
      </WalletSection>

      <footer className="wallet-footer"><span>FinSight</span><span>Money tools for everyday decisions</span></footer>
    </main>
  );
}