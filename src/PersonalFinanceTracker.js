import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle, TrendingUp, Target, Download, DollarSign, PieChart,
  BarChart3, Calendar, X, AlertTriangle, CheckCircle, Zap,
  RefreshCw, Bot, Calculator, CreditCard, Lightbulb, ChevronRight,
  User, Crown, Lock
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useFinance } from './context/FinanceContext';
import './PersonalFinanceTracker.css';

const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Shopping', 'Other'];

// Current budget period helper
const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const formatPeriodLabel = (period) => {
  const [y, m] = period.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

// ── MiniChart ──────────────────────────────────────────────────────────────
function MiniChart({ data, color }) {
  if (!data || data.length < 2) return null;
  const w = 120, h = 48, pad = 4;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const lastX = pad + (w - pad * 2);
  const lastY = h - pad - ((data[data.length - 1] - min) / range) * (h - pad * 2);
  return (
    <svg width={w} height={h} className="mini-chart">
      <polyline fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" points={points} />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
function PersonalFinanceTracker() {
  const navigate = useNavigate();
  const { userProfile, isPremium, getTrialDaysLeft } = useAuth();
  const { transactions, budgets, goals, addTransaction, addBudget, addGoal, contributeToGoal } = useFinance();

  const premium = isPremium();
  const trialDays = getTrialDaysLeft();

  const [activeTab, setActiveTab]   = useState('dashboard');
  const [budgetPeriod, setBudgetPeriod] = useState(getCurrentPeriod());

  // Modal states
  const [showAddExpense, setShowAddExpense]         = useState(false);
  const [showAddIncome, setShowAddIncome]           = useState(false);
  const [showAddBudget, setShowAddBudget]           = useState(false);
  const [showAddGoal, setShowAddGoal]               = useState(false);
  const [showContributeGoal, setShowContributeGoal] = useState(false);
  const [selectedGoal, setSelectedGoal]             = useState(null);
  const [showExportPreview, setShowExportPreview]   = useState(false);
  const [showResetConfirm, setShowResetConfirm]     = useState(false);

  // Filter states
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate]         = useState('');

  // AI advisor state
  const [aiTool, setAiTool] = useState('tips');
  const [aiSavings, setAiSavings]   = useState({ target: '', monthly: '' });
  const [aiBudget, setAiBudget]     = useState({ income: '' });
  const [aiDebt, setAiDebt]         = useState({ amount: '', rate: '', payment: '' });
  const [aiResult, setAiResult]     = useState(null);

  // Form states
  const [newExpense, setNewExpense] = useState({
    amount: '', category: 'Food', description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newIncome, setNewIncome] = useState({
    amount: '', description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [newBudget, setNewBudget] = useState({
    category: 'Food', customCategory: '', amount: ''
  });
  const [newGoal, setNewGoal] = useState({ name: '', target: '', deadline: '' });
  const [goalContribution, setGoalContribution] = useState({ amount: '' });

  // ── Derived data ───────────────────────────────────────────────────────
  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance       = totalIncome - totalExpenses;

  const filteredTransactions = transactions.filter(t => {
    const catMatch  = filterCategory === 'all' || t.category === filterCategory;
    const dateMatch = !filterDate || t.date === filterDate;
    return catMatch && dateMatch;
  });

  // Monthly sparkline data (last 6 months)
  const getMonthlyData = (type) => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return transactions
        .filter(t => t.date.startsWith(month) && (type === 'balance' ? true : t.type === type))
        .reduce((s, t) => {
          if (type === 'balance') return s + (t.type === 'income' ? t.amount : -t.amount);
          return s + t.amount;
        }, 0);
    });
  };
  const incomeMonthly  = getMonthlyData('income');
  const expenseMonthly = getMonthlyData('expense');
  const balanceMonthly = getMonthlyData('balance');

  // Budget spending scoped to current budget period (monthly reset)
  const calculateBudgetSpent = (category) =>
    transactions
      .filter(t => t.type === 'expense' && t.category === category && t.date.startsWith(budgetPeriod))
      .reduce((s, t) => s + t.amount, 0);

  const updatedBudgets = budgets.map(b => ({ ...b, spent: calculateBudgetSpent(b.category) }));

  // Spending risk calculation
  const now = new Date();
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth   = now.getDate();
  const monthProgress = dayOfMonth / daysInMonth; // 0–1

  const getRisk = (spent, budgeted) => {
    const pct = spent / budgeted;
    if (pct >= 1.0)                   return 'red';
    if (pct >= monthProgress * 1.15)  return 'red';
    if (pct >= monthProgress * 0.85)  return 'orange';
    return 'green';
  };

  const insightBudgets = useMemo(() => {
    const risky = updatedBudgets
      .map(b => ({ ...b, risk: getRisk(b.spent, b.budgeted) }))
      .filter(b => b.risk !== 'green')
      .sort((a, b) => (b.spent / b.budgeted) - (a.spent / a.budgeted));
    return risky;
    // eslint-disable-next-line
  }, [updatedBudgets, monthProgress]);

  const expensesByCategory = categories.reduce((acc, cat) => {
    const amt = transactions.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
    if (amt > 0) acc[cat] = amt;
    return acc;
  }, {});

  // ── Export ─────────────────────────────────────────────────────────────
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    summary: { totalIncome, totalExpenses, balance, expensesByCategory },
    transactions,
    budgets: updatedBudgets,
    goals,
  };

  const doExport = () => {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `wealthflow-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setShowExportPreview(false);
  };

  // ── Budget reset ───────────────────────────────────────────────────────
  const handleResetBudget = () => {
    setBudgetPeriod(getCurrentPeriod());
    setShowResetConfirm(false);
  };

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleAddExpense = () => {
    if (!newExpense.amount || !newExpense.description) return;
    setTransactions([{
      id: Date.now(), amount: parseFloat(newExpense.amount),
      category: newExpense.category, description: newExpense.description,
      date: newExpense.date, type: 'expense'
    }, ...transactions]);
    setNewExpense({ amount: '', category: 'Food', description: '', date: new Date().toISOString().split('T')[0] });
    setShowAddExpense(false);
  };

  const handleAddIncome = () => {
    if (!newIncome.amount || !newIncome.description) return;
    setTransactions([{
      id: Date.now(), amount: parseFloat(newIncome.amount),
      category: 'Income', description: newIncome.description,
      date: newIncome.date, type: 'income'
    }, ...transactions]);
    setNewIncome({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowAddIncome(false);
  };

  const handleAddBudget = () => {
    if (!newBudget.amount) return;
    const resolvedCategory = newBudget.category === 'Other'
      ? (newBudget.customCategory.trim() || 'Other') : newBudget.category;
    const amount = parseFloat(newBudget.amount);
    const idx = budgets.findIndex(b => b.category === resolvedCategory);
    if (idx !== -1) {
      const list = [...budgets];
      list[idx] = { ...list[idx], budgeted: amount };
      setBudgets(list);
    } else {
      setBudgets([...budgets, { category: resolvedCategory, budgeted: amount, spent: 0 }]);
    }
    setNewBudget({ category: 'Food', customCategory: '', amount: '' });
    setShowAddBudget(false);
  };

  const handleAddGoal = () => {
    if (!newGoal.name || !newGoal.target || !newGoal.deadline) return;
    setGoals([...goals, { id: Date.now(), name: newGoal.name, target: parseFloat(newGoal.target), current: 0, deadline: newGoal.deadline }]);
    setNewGoal({ name: '', target: '', deadline: '' });
    setShowAddGoal(false);
  };

  const handleContributeToGoal = () => {
    if (!goalContribution.amount || !selectedGoal) return;
    const amount = parseFloat(goalContribution.amount);
    setGoals(goals.map(g => g.id === selectedGoal.id
      ? { ...g, current: Math.min(g.current + amount, g.target) } : g));
    setGoalContribution({ amount: '' });
    setShowContributeGoal(false);
    setSelectedGoal(null);
  };

  // ── AI advisor logic ───────────────────────────────────────────────────
  const runAiSavings = () => {
    const t = parseFloat(aiSavings.target), m = parseFloat(aiSavings.monthly);
    if (!t || !m || m <= 0) return;
    const months = Math.ceil(t / m);
    const years  = Math.floor(months / 12);
    const rem    = months % 12;
    setAiResult({
      type: 'savings',
      months,
      label: years > 0 ? `${years}y ${rem}m` : `${months} months`,
      tip: months > 24
        ? 'Consider increasing your monthly savings or finding additional income streams.'
        : 'Great pace! Stay consistent and you\'ll hit your goal.',
    });
  };

  const runAiBudget = () => {
    const income = parseFloat(aiBudget.income);
    if (!income || income <= 0) return;
    const needs   = income * 0.50;
    const wants   = income * 0.30;
    const savings = income * 0.20;
    const avgExpenses = totalExpenses / Math.max(transactions.filter(t => t.type === 'expense').length, 1);
    setAiResult({
      type: 'budget',
      needs, wants, savings,
      tip: totalExpenses > needs
        ? `⚠️ Your current expenses ($${totalExpenses.toFixed(0)}) exceed the recommended needs budget. Try trimming discretionary spending.`
        : `✅ You're within healthy spending limits. Keep saving ${((savings / income) * 100).toFixed(0)}% of income.`,
    });
  };

  const runAiDebt = () => {
    const P = parseFloat(aiDebt.amount);
    const r = parseFloat(aiDebt.rate) / 100 / 12;
    const pmt = parseFloat(aiDebt.payment);
    if (!P || !pmt || pmt <= 0) return;
    if (r === 0) {
      const months = Math.ceil(P / pmt);
      setAiResult({ type: 'debt', months, totalInterest: 0, label: `${months} months`, tip: 'No interest — every payment goes straight to principal.' });
      return;
    }
    if (pmt <= P * r) {
      setAiResult({ type: 'debt', months: null, label: 'Never', totalInterest: null, tip: '⚠️ Your monthly payment doesn\'t cover the interest. Increase your payment.' });
      return;
    }
    const months = Math.ceil(-Math.log(1 - (P * r) / pmt) / Math.log(1 + r));
    const totalPaid = pmt * months;
    const totalInterest = totalPaid - P;
    const years = Math.floor(months / 12), rem = months % 12;
    setAiResult({
      type: 'debt', months, totalInterest,
      label: years > 0 ? `${years}y ${rem}m` : `${months} months`,
      tip: totalInterest > P * 0.5
        ? '💡 You\'re paying a lot in interest. Even small extra payments can cut months off your timeline.'
        : '👍 Good progress. Stick to your payment plan.',
    });
  };

  const personalizedTips = useMemo(() => {
    const tips = [];
    updatedBudgets.forEach(b => {
      const pct = (b.spent / b.budgeted) * 100;
      if (pct > 100) tips.push({ icon: '🔴', text: `${b.category} is over budget by $${(b.spent - b.budgeted).toFixed(2)}.` });
      else if (pct > 80) tips.push({ icon: '🟠', text: `${b.category} is at ${pct.toFixed(0)}% of budget — watch your spending.` });
    });
    if (balance < 0) tips.push({ icon: '⚠️', text: 'Your expenses exceed income this period. Review your biggest spending categories.' });
    if (goals.some(g => new Date(g.deadline) < new Date() && g.current < g.target))
      tips.push({ icon: '📅', text: 'Some goals have passed their deadline. Consider updating target dates or contributions.' });
    if (totalIncome > 0 && (totalExpenses / totalIncome) > 0.9)
      tips.push({ icon: '💰', text: 'You\'re spending over 90% of your income. Aim to save at least 10–20%.' });
    if (tips.length === 0)
      tips.push({ icon: '✅', text: 'Everything looks healthy! Keep up the great financial habits.' });
    return tips;
  }, [updatedBudgets, balance, goals, totalIncome, totalExpenses]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-title"><span className="brand-wealth">Wealth</span><span className="brand-flow">Flow</span></h1>
          <div className="header-buttons">
            <button onClick={() => setShowAddIncome(true)} className="btn-success">
              <PlusCircle size={16} /><span>Add Income</span>
            </button>
            <button onClick={() => setShowAddExpense(true)} className="btn-primary">
              <PlusCircle size={16} /><span>Add Expense</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="navigation">
        <div className="nav-content">
          {[
            { id: 'dashboard',    icon: <BarChart3 size={16} />,  label: 'Dashboard'     },
            { id: 'transactions', icon: <DollarSign size={16} />, label: 'Transactions'  },
            { id: 'budgets',      icon: <PieChart size={16} />,   label: 'Budgets'       },
            { id: 'goals',        icon: <Target size={16} />,     label: 'Goals'         },
            { id: 'ai',           icon: <Bot size={16} />,        label: 'AI Advisor'    },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`nav-item ${activeTab === t.id ? 'active' : ''}`}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="main-content">

        {/* ── Dashboard ──────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            {/* Spending Insights Banner */}
            {insightBudgets.length > 0 && (
              <div className="insights-banner">
                <div className="insights-header">
                  <AlertTriangle size={18} className="insights-icon" />
                  <span className="insights-title">Spending Insights</span>
                  <span className="insights-sub">{Math.round(monthProgress * 100)}% through {formatPeriodLabel(budgetPeriod)}</span>
                </div>
                <div className="insights-list">
                  {insightBudgets.map(b => (
                    <div key={b.category} className={`insight-item insight-${b.risk}`}>
                      <span className="insight-dot" />
                      <span className="insight-cat">{b.category}</span>
                      <span className="insight-pct">{((b.spent / b.budgeted) * 100).toFixed(0)}% used</span>
                      <span className="insight-label">
                        {b.risk === 'red' ? 'Extreme risk' : 'Moderate risk'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="summary-grid">
              {[
                { label: 'Balance',       amount: balance,       cls: balance >= 0 ? 'positive' : 'negative', icon: <TrendingUp size={32} className="summary-icon green" />, data: balanceMonthly, color: balance >= 0 ? '#059669' : '#dc2626' },
                { label: 'Total Income',  amount: totalIncome,   cls: 'positive', icon: <DollarSign size={32} className="summary-icon green" />,  data: incomeMonthly,  color: '#059669' },
                { label: 'Total Expenses',amount: totalExpenses, cls: 'negative', icon: <PieChart size={32} className="summary-icon red" />,       data: expenseMonthly, color: '#dc2626' },
              ].map(card => (
                <div key={card.label} className="summary-card">
                  <div className="summary-card-content">
                    <div>
                      <p className="summary-label">{card.label}</p>
                      <p className={`summary-amount ${card.cls}`}>${card.amount.toFixed(2)}</p>
                    </div>
                    {card.icon}
                  </div>
                  <div className="summary-card-chart">
                    <MiniChart data={card.data} color={card.color} />
                    <span className="chart-label">Last 6 months</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Expense Categories */}
            <div className="card">
              <h3 className="card-title">Spending by Category</h3>
              <div className="category-grid">
                {Object.entries(expensesByCategory).map(([cat, amt]) => (
                  <div key={cat} className="category-card">
                    <p className="category-name">{cat}</p>
                    <p className="category-amount">${amt.toFixed(2)}</p>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${(amt / totalExpenses) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <h3 className="card-title">Recent Transactions</h3>
              <div className="transaction-list">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="transaction-item">
                    <div>
                      <p className="transaction-description">{t.description}</p>
                      <p className="transaction-meta">{t.category} • {t.date}</p>
                    </div>
                    <p className={`transaction-amount ${t.type === 'income' ? 'positive' : 'negative'}`}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Transactions ───────────────────────────────────────────── */}
        {activeTab === 'transactions' && (
          <div className="transactions-page">
            <div className="page-header">
              <h2>Transactions</h2>
              <div className="header-actions">
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="filter-select">
                  <option value="all">All Categories</option>
                  <option value="Income">Income</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="date-filter-wrapper">
                  <span className="date-filter-icon"><Calendar size={15} /></span>
                  <input type="date" className={`date-filter-input ${filterDate ? 'active' : ''}`}
                    value={filterDate} onChange={e => setFilterDate(e.target.value)} title="Filter by date" />
                  {filterDate && (
                    <button className="btn-date-clear" onClick={() => setFilterDate('')} title="Clear">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button onClick={() => setShowExportPreview(true)} className="btn-success">
                  <Download size={16} /><span>Export</span>
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="transaction-table">
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(t => (
                    <tr key={t.id}>
                      <td>{t.date}</td>
                      <td>{t.description}</td>
                      <td>{t.category}</td>
                      <td className={t.type === 'income' ? 'positive' : 'negative'}>
                        {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No transactions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Budgets ────────────────────────────────────────────────── */}
        {activeTab === 'budgets' && (
          <div className="budgets-page">
            <div className="page-header">
              <div>
                <h2>Budget Overview</h2>
                <p className="budget-period-label">Period: {formatPeriodLabel(budgetPeriod)}</p>
              </div>
              <div className="header-actions">
                <button onClick={() => setShowResetConfirm(true)} className="btn-secondary">
                  <RefreshCw size={15} /><span>Reset Period</span>
                </button>
                <button onClick={() => setShowAddBudget(true)} className="btn-primary">
                  <PlusCircle size={16} /><span>Set Budget</span>
                </button>
              </div>
            </div>

            {/* Spending Insights Summary */}
            <div className="insights-inline">
              <div className="insights-legend">
                <span className="legend-item"><span className="dot-green" /> On track</span>
                <span className="legend-item"><span className="dot-orange" /> Moderate risk</span>
                <span className="legend-item"><span className="dot-red" /> Extreme risk</span>
              </div>
              <span className="insights-progress-label">{Math.round(monthProgress * 100)}% through month</span>
            </div>

            <div className="budget-grid">
              {updatedBudgets.map(budget => {
                const percentage  = (budget.spent / budget.budgeted) * 100;
                const isOverBudget = percentage > 100;
                const risk = getRisk(budget.spent, budget.budgeted);

                return (
                  <div key={budget.category} className={`budget-card budget-risk-${risk}`}>
                    <div className="budget-card-top">
                      <div className="budget-period-badge">{formatPeriodLabel(budgetPeriod)}</div>
                      <span className={`risk-badge risk-${risk}`}>
                        {risk === 'green' ? <><CheckCircle size={12} /> On track</> :
                         risk === 'orange' ? <><AlertTriangle size={12} /> Moderate</> :
                         <><Zap size={12} /> High risk</>}
                      </span>
                    </div>
                    <div className="budget-header">
                      <h3>{budget.category}</h3>
                      <span className={isOverBudget ? 'negative' : 'positive'}>{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="budget-info">
                      <div className="budget-amounts">
                        <span>${budget.spent.toFixed(2)} spent</span>
                        <span>${budget.budgeted.toFixed(2)} budget</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className={`progress-bar-fill ${isOverBudget ? 'over-budget' : `bar-${risk}`}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                    </div>
                    <p className={isOverBudget ? 'negative' : 'positive'}>
                      ${Math.abs(budget.budgeted - budget.spent).toFixed(2)} {isOverBudget ? 'over budget' : 'remaining'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Goals ─────────────────────────────────────────────────── */}
        {activeTab === 'goals' && (
          <div className="goals-page">
            <div className="page-header">
              <h2>Savings Goals</h2>
              <button onClick={() => setShowAddGoal(true)} className="btn-primary">
                <Target size={16} /><span>Add Goal</span>
              </button>
            </div>
            <div className="goals-grid">
              {goals.map(goal => {
                const pct = (goal.current / goal.target) * 100;
                const isCompleted = goal.current >= goal.target;
                return (
                  <div key={goal.id} className="goal-card">
                    <div className="goal-card-header">
                      <h3>{goal.name}</h3>
                      {isCompleted && <span className="goal-badge">✓ Completed</span>}
                    </div>
                    <p className="goal-deadline">Target: {goal.deadline}</p>
                    <div className="goal-progress">
                      <div className="goal-amounts">
                        <span>${goal.current.toFixed(2)}</span>
                        <span>${goal.target.toFixed(2)}</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill goal-progress-bar" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="goal-stats">
                      <span className="positive">{pct.toFixed(1)}% complete</span>
                      <span className="goal-remaining">${(goal.target - goal.current).toFixed(2)} to go</span>
                    </div>
                    {!isCompleted && (
                      <button onClick={() => { setSelectedGoal(goal); setShowContributeGoal(true); }} className="btn-contribute">
                        <PlusCircle size={14} /><span>Add Money</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AI Advisor ────────────────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div className="ai-page">
            <div className="ai-header">
              <Bot size={28} className="ai-header-icon" />
              <div>
                <h2>AI Financial Advisor</h2>
                <p className="ai-subtitle">Personalised insights powered by your financial data</p>
              </div>
            </div>

            <div className="ai-layout">
              {/* Sidebar tools */}
              <div className="ai-sidebar">
                {[
                  { id: 'tips',    icon: <Lightbulb size={18} />,  label: 'Personalised Tips'    },
                  { id: 'savings', icon: <Target size={18} />,     label: 'Savings Calculator'   },
                  { id: 'budget',  icon: <Calculator size={18} />, label: 'Budget Planner'       },
                  { id: 'debt',    icon: <CreditCard size={18} />, label: 'Debt Payoff'          },
                ].map(t => (
                  <button key={t.id} onClick={() => { setAiTool(t.id); setAiResult(null); }}
                    className={`ai-tool-btn ${aiTool === t.id ? 'active' : ''}`}>
                    {t.icon}<span>{t.label}</span><ChevronRight size={14} className="ai-chevron" />
                  </button>
                ))}
              </div>

              {/* Main panel */}
              <div className="ai-panel">

                {/* Personalised Tips */}
                {aiTool === 'tips' && (
                  <div>
                    <h3 className="ai-panel-title">Personalised Insights</h3>
                    <p className="ai-panel-sub">Based on your current transactions and budgets</p>
                    <div className="ai-tips-list">
                      {personalizedTips.map((tip, i) => (
                        <div key={i} className="ai-tip-card">
                          <span className="ai-tip-icon">{tip.icon}</span>
                          <span className="ai-tip-text">{tip.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financial snapshot */}
                    <div className="ai-snapshot">
                      <h4>Your Financial Snapshot</h4>
                      <div className="snapshot-grid">
                        <div className="snapshot-item">
                          <span className="snapshot-label">Savings Rate</span>
                          <span className="snapshot-val positive">
                            {totalIncome > 0 ? `${(((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div className="snapshot-item">
                          <span className="snapshot-label">Avg Transaction</span>
                          <span className="snapshot-val">
                            ${transactions.length > 0 ? (transactions.reduce((s, t) => s + t.amount, 0) / transactions.length).toFixed(2) : '0.00'}
                          </span>
                        </div>
                        <div className="snapshot-item">
                          <span className="snapshot-label">Budgets Active</span>
                          <span className="snapshot-val">{budgets.length}</span>
                        </div>
                        <div className="snapshot-item">
                          <span className="snapshot-label">Goals Active</span>
                          <span className="snapshot-val">{goals.filter(g => g.current < g.target).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Savings Calculator */}
                {aiTool === 'savings' && (
                  <div>
                    <h3 className="ai-panel-title">Savings Goal Calculator</h3>
                    <p className="ai-panel-sub">Find out how long it will take to reach any savings target</p>
                    <div className="ai-form">
                      <div className="form-group">
                        <label>Target Amount ($)</label>
                        <input type="number" className="form-input" placeholder="e.g. 10000"
                          value={aiSavings.target} onChange={e => setAiSavings({ ...aiSavings, target: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Monthly Savings ($)</label>
                        <input type="number" className="form-input" placeholder="e.g. 500"
                          value={aiSavings.monthly} onChange={e => setAiSavings({ ...aiSavings, monthly: e.target.value })} />
                        <p className="form-hint">Your current monthly surplus: ${Math.max(0, balance).toFixed(2)}</p>
                      </div>
                      <button className="btn-ai-run" onClick={runAiSavings}>Calculate</button>
                    </div>
                    {aiResult?.type === 'savings' && (
                      <div className="ai-result">
                        <div className="ai-result-main">⏱ <strong>{aiResult.label}</strong> to reach your goal</div>
                        <div className="ai-result-detail">That's {aiResult.months} monthly payments</div>
                        <div className="ai-result-tip">{aiResult.tip}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Budget Planner */}
                {aiTool === 'budget' && (
                  <div>
                    <h3 className="ai-panel-title">50/30/20 Budget Planner</h3>
                    <p className="ai-panel-sub">Get a recommended budget based on your monthly income</p>
                    <div className="ai-form">
                      <div className="form-group">
                        <label>Monthly Income ($)</label>
                        <input type="number" className="form-input" placeholder="e.g. 4000"
                          value={aiBudget.income} onChange={e => setAiBudget({ income: e.target.value })} />
                        <p className="form-hint">Your recorded income: ${totalIncome.toFixed(2)}</p>
                      </div>
                      <button className="btn-ai-run" onClick={runAiBudget}>Generate Plan</button>
                    </div>
                    {aiResult?.type === 'budget' && (
                      <div className="ai-result">
                        <div className="budget-plan-grid">
                          <div className="budget-plan-item needs">
                            <span className="plan-pct">50%</span>
                            <span className="plan-label">Needs</span>
                            <span className="plan-amount">${aiResult.needs.toFixed(2)}/mo</span>
                            <span className="plan-desc">Rent, food, utilities, transport</span>
                          </div>
                          <div className="budget-plan-item wants">
                            <span className="plan-pct">30%</span>
                            <span className="plan-label">Wants</span>
                            <span className="plan-amount">${aiResult.wants.toFixed(2)}/mo</span>
                            <span className="plan-desc">Entertainment, dining, shopping</span>
                          </div>
                          <div className="budget-plan-item savings">
                            <span className="plan-pct">20%</span>
                            <span className="plan-label">Savings</span>
                            <span className="plan-amount">${aiResult.savings.toFixed(2)}/mo</span>
                            <span className="plan-desc">Emergency fund, investments, goals</span>
                          </div>
                        </div>
                        <div className="ai-result-tip">{aiResult.tip}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Debt Payoff */}
                {aiTool === 'debt' && (
                  <div>
                    <h3 className="ai-panel-title">Debt Payoff Calculator</h3>
                    <p className="ai-panel-sub">See exactly when you'll be debt-free</p>
                    <div className="ai-form">
                      <div className="form-group">
                        <label>Total Debt Amount ($)</label>
                        <input type="number" className="form-input" placeholder="e.g. 5000"
                          value={aiDebt.amount} onChange={e => setAiDebt({ ...aiDebt, amount: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Annual Interest Rate (%)</label>
                        <input type="number" className="form-input" placeholder="e.g. 18.5"
                          value={aiDebt.rate} onChange={e => setAiDebt({ ...aiDebt, rate: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Monthly Payment ($)</label>
                        <input type="number" className="form-input" placeholder="e.g. 200"
                          value={aiDebt.payment} onChange={e => setAiDebt({ ...aiDebt, payment: e.target.value })} />
                      </div>
                      <button className="btn-ai-run" onClick={runAiDebt}>Calculate</button>
                    </div>
                    {aiResult?.type === 'debt' && (
                      <div className="ai-result">
                        <div className="ai-result-main">🗓 Debt-free in <strong>{aiResult.label}</strong></div>
                        {aiResult.totalInterest !== null && (
                          <div className="ai-result-detail">Total interest paid: ${aiResult.totalInterest.toFixed(2)}</div>
                        )}
                        <div className="ai-result-tip">{aiResult.tip}</div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Export Preview Modal ─────────────────────────────────────── */}
      {showExportPreview && (
        <div className="modal-overlay" onClick={() => setShowExportPreview(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Export Preview</h3>
            <p className="modal-subtitle">This is what your downloaded file will contain</p>
            <div className="export-preview-box">
              <div className="export-preview-section">
                <span className="ep-label">Summary</span>
                <div className="ep-row"><span>Total Income</span><span className="positive">${totalIncome.toFixed(2)}</span></div>
                <div className="ep-row"><span>Total Expenses</span><span className="negative">${totalExpenses.toFixed(2)}</span></div>
                <div className="ep-row"><span>Balance</span><span className={balance >= 0 ? 'positive' : 'negative'}>${balance.toFixed(2)}</span></div>
              </div>
              <div className="export-preview-section">
                <span className="ep-label">Transactions ({transactions.length} records)</span>
                {transactions.slice(0, 4).map(t => (
                  <div key={t.id} className="ep-row">
                    <span>{t.date} — {t.description}</span>
                    <span className={t.type === 'income' ? 'positive' : 'negative'}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                {transactions.length > 4 && <p className="ep-more">…and {transactions.length - 4} more</p>}
              </div>
              <div className="export-preview-section">
                <span className="ep-label">Budgets ({budgets.length} categories)</span>
                {updatedBudgets.slice(0, 3).map(b => (
                  <div key={b.category} className="ep-row">
                    <span>{b.category}</span>
                    <span>${b.spent.toFixed(2)} / ${b.budgeted.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="export-preview-section">
                <span className="ep-label">Goals ({goals.length} goals)</span>
                {goals.map(g => (
                  <div key={g.id} className="ep-row">
                    <span>{g.name}</span>
                    <span>${g.current.toFixed(2)} / ${g.target.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="ep-format-note">📄 File format: JSON · Filename: wealthflow-{new Date().toISOString().split('T')[0]}.json</div>
            </div>
            <div className="modal-actions">
              <button onClick={doExport} className="btn-success"><Download size={15} /> Export</button>
              <button onClick={() => setShowExportPreview(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Budget Confirm Modal ───────────────────────────────── */}
      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Reset Budget Period?</h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem', lineHeight: 1.6 }}>
              This will set the budget period to <strong>{formatPeriodLabel(getCurrentPeriod())}</strong>.
              Spending will only count transactions from this month onwards.
              <br /><br />
              All your <strong>transaction history</strong> is preserved and still viewable in the Transactions tab.
            </p>
            <div className="modal-actions">
              <button onClick={handleResetBudget} className="btn-primary">Confirm Reset</button>
              <button onClick={() => setShowResetConfirm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Expense Modal ────────────────────────────────────────── */}
      {showAddExpense && (
        <div className="modal-overlay" onClick={() => setShowAddExpense(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add New Expense</h3>
            <div className="form-group"><label>Amount *</label>
              <input type="number" step="0.01" value={newExpense.amount}
                onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="form-input" placeholder="0.00" /></div>
            <div className="form-group"><label>Category *</label>
              <select value={newExpense.category}
                onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} className="form-input">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="form-group"><label>Description *</label>
              <input type="text" value={newExpense.description}
                onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                className="form-input" placeholder="What was this expense for?" /></div>
            <div className="form-group"><label>Date *</label>
              <input type="date" value={newExpense.date}
                onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className="form-input" /></div>
            <div className="modal-actions">
              <button onClick={handleAddExpense} className="btn-primary">Add Expense</button>
              <button onClick={() => setShowAddExpense(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Income Modal ─────────────────────────────────────────── */}
      {showAddIncome && (
        <div className="modal-overlay" onClick={() => setShowAddIncome(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Income</h3>
            <div className="form-group"><label>Amount *</label>
              <input type="number" step="0.01" value={newIncome.amount}
                onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })}
                className="form-input" placeholder="0.00" /></div>
            <div className="form-group"><label>Description *</label>
              <input type="text" value={newIncome.description}
                onChange={e => setNewIncome({ ...newIncome, description: e.target.value })}
                className="form-input" placeholder="e.g., Salary, Freelance work, Gift" /></div>
            <div className="form-group"><label>Date *</label>
              <input type="date" value={newIncome.date}
                onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} className="form-input" /></div>
            <div className="modal-actions">
              <button onClick={handleAddIncome} className="btn-success">Add Income</button>
              <button onClick={() => setShowAddIncome(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Budget Modal ─────────────────────────────────────────── */}
      {showAddBudget && (
        <div className="modal-overlay" onClick={() => setShowAddBudget(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Set Budget</h3>
            <div className="form-group"><label>Category *</label>
              <select value={newBudget.category}
                onChange={e => setNewBudget({ ...newBudget, category: e.target.value, customCategory: '' })} className="form-input">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            {newBudget.category === 'Other' && (
              <div className="form-group"><label>Custom Category Name *</label>
                <input type="text" value={newBudget.customCategory}
                  onChange={e => setNewBudget({ ...newBudget, customCategory: e.target.value })}
                  className="form-input" placeholder="e.g., Pets, Education, Subscriptions" /></div>
            )}
            <div className="form-group"><label>Budget Amount *</label>
              <input type="number" step="0.01" value={newBudget.amount}
                onChange={e => setNewBudget({ ...newBudget, amount: e.target.value })}
                className="form-input" placeholder="0.00" />
              <p className="form-hint">Set your monthly budget limit for this category</p></div>
            <div className="modal-actions">
              <button onClick={handleAddBudget} className="btn-primary">Set Budget</button>
              <button onClick={() => setShowAddBudget(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Goal Modal ───────────────────────────────────────────── */}
      {showAddGoal && (
        <div className="modal-overlay" onClick={() => setShowAddGoal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Savings Goal</h3>
            <div className="form-group"><label>Goal Name *</label>
              <input type="text" value={newGoal.name}
                onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                className="form-input" placeholder="e.g., Emergency Fund, Vacation, New Car" /></div>
            <div className="form-group"><label>Target Amount ($) *</label>
              <input type="number" step="0.01" value={newGoal.target}
                onChange={e => setNewGoal({ ...newGoal, target: e.target.value })}
                className="form-input" placeholder="0.00" /></div>
            <div className="form-group"><label>Target Date *</label>
              <input type="date" value={newGoal.deadline}
                onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                className="form-input" min={new Date().toISOString().split('T')[0]} />
              <p className="form-hint">When do you want to achieve this goal?</p></div>
            <div className="modal-actions">
              <button onClick={handleAddGoal} className="btn-primary">Add Goal</button>
              <button onClick={() => setShowAddGoal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Contribute to Goal Modal ─────────────────────────────────── */}
      {showContributeGoal && selectedGoal && (
        <div className="modal-overlay" onClick={() => { setShowContributeGoal(false); setSelectedGoal(null); setGoalContribution({ amount: '' }); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Add Money to Goal</h3>
            <div className="goal-info-box">
              <p className="goal-info-name">{selectedGoal.name}</p>
              <p className="goal-info-progress">Current: ${selectedGoal.current.toFixed(2)} / ${selectedGoal.target.toFixed(2)}</p>
              <p className="goal-info-remaining">${(selectedGoal.target - selectedGoal.current).toFixed(2)} remaining</p>
            </div>
            <div className="form-group"><label>Amount to Add ($) *</label>
              <input type="number" step="0.01" value={goalContribution.amount}
                onChange={e => setGoalContribution({ amount: e.target.value })}
                className="form-input" placeholder="0.00"
                max={selectedGoal.target - selectedGoal.current} />
              <p className="form-hint">Maximum: ${(selectedGoal.target - selectedGoal.current).toFixed(2)}</p></div>
            <div className="modal-actions">
              <button onClick={handleContributeToGoal} className="btn-success">Add Money</button>
              <button onClick={() => { setShowContributeGoal(false); setSelectedGoal(null); setGoalContribution({ amount: '' }); }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalFinanceTracker;
