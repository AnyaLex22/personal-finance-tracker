import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Eye, Sparkles } from 'lucide-react';
import PersonalFinanceTracker from '../PersonalFinanceTracker';
import './PlanPreviewPage.css';

const PREVIEW_MODES = {
  free: {
    plan: 'free',
    trialDays: 0,
    title: 'Free Plan Preview',
    description: 'Shows the locked analytics and AI advisor experience that free users see.'
  },
  trial: {
    plan: 'trial',
    trialDays: 4,
    title: 'Trial Preview',
    description: 'Shows the premium UI while a user is inside the 7-day trial window.'
  },
  premium: {
    plan: 'premium',
    trialDays: 0,
    title: 'Premium Preview',
    description: 'Shows the full premium experience after conversion.'
  }
};

export default function PlanPreviewPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('free');
  const currentPreview = PREVIEW_MODES[mode];

  return (
    <div className="plan-preview-shell">
      <div className="plan-preview-toolbar">
        <button className="plan-preview-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="plan-preview-copy">
          <div className="plan-preview-label">
            <Eye size={14} />
            <span>Plan Preview</span>
          </div>
          <h1>{currentPreview.title}</h1>
          <p>{currentPreview.description}</p>
        </div>
        <div className="plan-preview-tabs">
          <button className={mode === 'free' ? 'active' : ''} onClick={() => setMode('free')}>
            <Sparkles size={14} /> Free
          </button>
          <button className={mode === 'trial' ? 'active' : ''} onClick={() => setMode('trial')}>
            <Crown size={14} /> Trial
          </button>
          <button className={mode === 'premium' ? 'active' : ''} onClick={() => setMode('premium')}>
            <Crown size={14} /> Premium
          </button>
        </div>
      </div>

      <PersonalFinanceTracker planPreview={currentPreview} />
    </div>
  );
}
