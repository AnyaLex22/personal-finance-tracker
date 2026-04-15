import React, { useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Crown, CheckCircle, X, CreditCard, Lock, ArrowLeft } from 'lucide-react';
import './UpgradePage.css';

const PREMIUM_FEATURES = [
  'AI Financial Advisor (all tools)',
  'Advanced spending insights & trend analytics',
  'Smart budget risk alerts',
  'Personalised financial tips',
  '50/30/20 Budget Planner',
  'Debt Payoff Calculator',
  'Savings Goal Calculator',
  'Multi-device sync via cloud',
  'Priority support',
];

const FREE_FEATURES = [
  'Dashboard overview',
  'Transaction history',
  'Basic budget tracking',
  'Savings goals',
  'Data export (JSON)',
];

export default function UpgradePage() {
  const { userProfile, updateUserProfile, currentUser, isPremium, getTrialDaysLeft } = useAuth();
  const navigate = useNavigate();
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [processing, setProcessing] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setCard(c => ({ ...c, [k]: e.target.value }));

  const handleStartTrial = async (e) => {
    e.preventDefault();
    setError('');
    if (!card.name || !card.number || !card.expiry || !card.cvv) {
      setError('Please fill in all card details.'); return;
    }
    setProcessing(true);
    // Simulate — real Stripe integration connects here
    await new Promise(r => setTimeout(r, 1500));
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await updateUserProfile(currentUser.uid, { plan: 'trial', trialEndsAt: trialEnd });
    setProcessing(false);
    setTrialStarted(true);
  };

  const trialDays = getTrialDaysLeft();
  const premium   = isPremium();

  if (trialStarted) return (
    <div className="upgrade-container">
      <div className="upgrade-success">
        <Crown size={56} className="upgrade-crown" />
        <h2>Premium Trial Activated!</h2>
        <p>You have 7 days of full Premium access. Enjoy!</p>
        <button className="btn-upgrade" onClick={() => navigate('/')}>Start Exploring</button>
      </div>
    </div>
  );

  return (
    <div className="upgrade-container">
      <button className="upgrade-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="upgrade-hero">
        <Crown size={40} className="upgrade-crown" />
        <h2>Upgrade to WealthFlow Premium</h2>
        <p>Unlock AI-powered tools and advanced analytics to take full control of your finances</p>
      </div>

      {premium && (
        <div className="upgrade-active-banner">
          {userProfile?.plan === 'trial'
            ? `🎉 Trial active — ${trialDays} day${trialDays !== 1 ? 's' : ''} remaining`
            : '✨ You are on the Premium plan'}
        </div>
      )}

      <div className="upgrade-plans">
        {/* Free Plan */}
        <div className="plan-card free-card">
          <div className="plan-header">
            <h3>Free</h3>
            <div className="plan-price">RM 0<span>/month</span></div>
          </div>
          <ul className="plan-features">
            {FREE_FEATURES.map(f => (
              <li key={f}><CheckCircle size={15} className="feat-check" />{f}</li>
            ))}
            {PREMIUM_FEATURES.slice(0, 3).map(f => (
              <li key={f} className="feat-locked"><X size={15} className="feat-x" />{f}</li>
            ))}
            <li className="feat-locked"><X size={15} className="feat-x" />…and more</li>
          </ul>
          {!premium && <div className="plan-current-badge">Current Plan</div>}
        </div>

        {/* Premium Plan */}
        <div className="plan-card premium-card">
          <div className="plan-badge"><Crown size={12} /> Most Popular</div>
          <div className="plan-header">
            <h3>Premium</h3>
            <div className="plan-price">RM 25<span>/month</span></div>
          </div>
          <ul className="plan-features">
            {FREE_FEATURES.map(f => (
              <li key={f}><CheckCircle size={15} className="feat-check" />{f}</li>
            ))}
            {PREMIUM_FEATURES.map(f => (
              <li key={f}><CheckCircle size={15} className="feat-check gold" />{f}</li>
            ))}
          </ul>
          {premium
            ? <div className="plan-current-badge gold-badge">Active Plan</div>
            : (
              <button className="btn-upgrade" onClick={() => setShowTrialForm(true)}>
                Start 7-Day Free Trial
              </button>
            )}
          <p className="plan-trial-note">No charge during trial. Cancel anytime.</p>
        </div>
      </div>

      {/* Trial/billing form */}
      {showTrialForm && !premium && (
        <div className="modal-overlay" onClick={() => setShowTrialForm(false)}>
          <div className="upgrade-form-card" onClick={e => e.stopPropagation()}>
            <div className="upgrade-form-header">
              <Lock size={18} className="form-lock" />
              <div>
                <h3>Start your free 7-day trial</h3>
                <p>Your card won't be charged until the trial ends. Cancel anytime.</p>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleStartTrial} className="billing-form">
              <div className="auth-field">
                <label>Cardholder Name</label>
                <input value={card.name} onChange={set('name')} placeholder="John Doe" />
              </div>
              <div className="auth-field">
                <label><CreditCard size={14} /> Card Number</label>
                <input value={card.number} onChange={set('number')} placeholder="•••• •••• •••• ••••" maxLength={19} />
              </div>
              <div className="billing-row">
                <div className="auth-field">
                  <label>Expiry</label>
                  <input value={card.expiry} onChange={set('expiry')} placeholder="MM/YY" maxLength={5} />
                </div>
                <div className="auth-field">
                  <label>CVV</label>
                  <input value={card.cvv} onChange={set('cvv')} placeholder="•••" maxLength={4} type="password" />
                </div>
              </div>
              <p className="billing-note"><Lock size={12} /> Secured by Stripe. You'll be billed RM 25/month after the trial. Cancel before the trial ends to avoid charges.</p>
              <div className="modal-actions">
                <button type="submit" className="btn-upgrade" disabled={processing}>
                  {processing ? 'Activating…' : 'Activate Free Trial'}
                </button>
                <button type="button" className="btn-outline-dark" onClick={() => setShowTrialForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
