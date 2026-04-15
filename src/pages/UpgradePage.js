import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Crown, CheckCircle, X, CreditCard, Lock, ArrowLeft } from 'lucide-react';
import './UpgradePage.css';

const PREMIUM_FEATURES = [
  'AI Financial Advisor (all tools)',
  'Advanced spending insights and trend analytics',
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
  const [billingMode, setBillingMode] = useState(null);
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvv: '' });
  const [processing, setProcessing] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');
  const [error, setError] = useState('');

  const set = (key) => (event) => setCard((current) => ({ ...current, [key]: event.target.value }));
  const premium = isPremium();
  const trialDays = getTrialDaysLeft();

  const openBillingForm = (mode) => {
    setError('');
    setBillingMode(mode);
  };

  const closeBillingForm = () => {
    setBillingMode(null);
    setError('');
  };

  const handleActivatePlan = async (event) => {
    event.preventDefault();
    setError('');

    if (!card.name || !card.number || !card.expiry || !card.cvv) {
      setError('Please fill in all card details.');
      return;
    }

    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (billingMode === 'trial') {
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await updateUserProfile(currentUser.uid, {
        plan: 'trial',
        trialEndsAt: trialEnd,
        billingPreview: `•••• ${card.number.slice(-4)}`
      });
      setActivationMessage('Premium trial activated. You now have 7 days of full access.');
    } else {
      await updateUserProfile(currentUser.uid, {
        plan: 'premium',
        trialEndsAt: null,
        billingPreview: `•••• ${card.number.slice(-4)}`
      });
      setActivationMessage('Premium subscription activated at RM 25/month.');
    }

    setProcessing(false);
    setBillingMode(null);
  };

  const handleCancelPlan = async () => {
    setProcessing(true);
    await updateUserProfile(currentUser.uid, { plan: 'free', trialEndsAt: null });
    setProcessing(false);
    setActivationMessage('Your plan was moved back to Free. Premium features are now locked.');
  };

  if (activationMessage) {
    return (
      <div className="upgrade-container">
        <div className="upgrade-success">
          <Crown size={56} className="upgrade-crown" />
          <h2>Plan Updated</h2>
          <p>{activationMessage}</p>
          <button className="btn-upgrade" onClick={() => navigate('/')}>Start Exploring</button>
        </div>
      </div>
    );
  }

  return (
    <div className="upgrade-container">
      <button className="upgrade-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="upgrade-hero">
        <Crown size={40} className="upgrade-crown" />
        <h2>Upgrade to WealthFlow Premium</h2>
        <p>Unlock AI-powered tools, advanced analytics, smart insights, and sync across all your devices.</p>
      </div>

      {premium && (
        <div className="upgrade-active-banner">
          {userProfile?.plan === 'trial'
            ? `Premium trial active with ${trialDays} day${trialDays !== 1 ? 's' : ''} remaining`
            : 'You are on the Premium plan'}
        </div>
      )}

      <div className="upgrade-plans">
        <div className="plan-card free-card">
          <div className="plan-header">
            <h3>Free</h3>
            <div className="plan-price">RM 0<span>/month</span></div>
          </div>
          <ul className="plan-features">
            {FREE_FEATURES.map((feature) => (
              <li key={feature}><CheckCircle size={15} className="feat-check" />{feature}</li>
            ))}
            {PREMIUM_FEATURES.slice(0, 3).map((feature) => (
              <li key={feature} className="feat-locked"><X size={15} className="feat-x" />{feature}</li>
            ))}
            <li className="feat-locked"><X size={15} className="feat-x" />and more</li>
          </ul>
          {!premium && <div className="plan-current-badge">Current Plan</div>}
        </div>

        <div className="plan-card premium-card">
          <div className="plan-badge"><Crown size={12} /> Most Popular</div>
          <div className="plan-header">
            <h3>Premium</h3>
            <div className="plan-price">RM 25<span>/month</span></div>
          </div>
          <ul className="plan-features">
            {FREE_FEATURES.map((feature) => (
              <li key={feature}><CheckCircle size={15} className="feat-check" />{feature}</li>
            ))}
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature}><CheckCircle size={15} className="feat-check gold" />{feature}</li>
            ))}
          </ul>
          {premium ? (
            <div className="plan-current-badge gold-badge">Active Plan</div>
          ) : (
            <>
              <button className="btn-upgrade" onClick={() => openBillingForm('premium')}>
                Subscribe Now
              </button>
              <button className="btn-outline-premium" onClick={() => openBillingForm('premium')}>
                Pay RM 25/month
              </button>
              <button className="btn-outline-premium trial" onClick={() => openBillingForm('trial')}>
                Start 7-Day Free Trial
              </button>
            </>
          )}
          <p className="plan-trial-note">Bank details are collected now. Stripe billing is ready to connect next.</p>
        </div>
      </div>

      {premium && (
        <div className="upgrade-manage-card">
          <div>
            <h3>Manage Your Plan</h3>
            <p>
              {userProfile?.plan === 'trial'
                ? `Trialing on ${userProfile?.billingPreview || 'saved card'}. Cancel before the trial ends to avoid charges.`
                : `Premium is active on ${userProfile?.billingPreview || 'saved card'}. Cancel anytime and your account returns to Free.`}
            </p>
          </div>
          <button className="btn-outline-dark danger" onClick={handleCancelPlan} disabled={processing}>
            {processing ? 'Updating...' : userProfile?.plan === 'trial' ? 'Cancel Trial' : 'Cancel Subscription'}
          </button>
        </div>
      )}

      {billingMode && !premium && (
        <div className="modal-overlay" onClick={closeBillingForm}>
          <div className="upgrade-form-card" onClick={(event) => event.stopPropagation()}>
            <div className="upgrade-form-header">
              <Lock size={18} className="form-lock" />
              <div>
                <h3>{billingMode === 'trial' ? 'Start your free 7-day trial' : 'Subscribe to Premium'}</h3>
                <p>
                  {billingMode === 'trial'
                    ? 'Your card will not be charged until the trial ends. Cancel anytime.'
                    : 'Activate Premium immediately with your banking details. Cancel anytime.'}
                </p>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleActivatePlan} className="billing-form">
              <div className="auth-field">
                <label>Cardholder Name</label>
                <input value={card.name} onChange={set('name')} placeholder="John Doe" />
              </div>
              <div className="auth-field">
                <label><CreditCard size={14} /> Card Number</label>
                <input value={card.number} onChange={set('number')} placeholder="1234 5678 9012 3456" maxLength={19} />
              </div>
              <div className="billing-row">
                <div className="auth-field">
                  <label>Expiry</label>
                  <input value={card.expiry} onChange={set('expiry')} placeholder="MM/YY" maxLength={5} />
                </div>
                <div className="auth-field">
                  <label>CVV</label>
                  <input value={card.cvv} onChange={set('cvv')} placeholder="123" maxLength={4} type="password" />
                </div>
              </div>
              <p className="billing-note">
                <Lock size={12} />
                {billingMode === 'trial'
                  ? 'Secured by Stripe. You will be billed RM 25/month after the trial unless you cancel first.'
                  : 'Secured by Stripe. You will be billed RM 25/month until you cancel.'}
              </p>
              <div className="modal-actions">
                <button type="submit" className="btn-upgrade" disabled={processing}>
                  {processing ? 'Activating...' : billingMode === 'trial' ? 'Activate Free Trial' : 'Activate Premium'}
                </button>
                <button type="button" className="btn-outline-dark" onClick={closeBillingForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
