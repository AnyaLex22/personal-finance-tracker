import React, { useState } from 'react';
import { PlusCircle, TrendingUp, Target, Download, DollarSign, PieChart, BarChart3 } from 'lucide-react';
import './PersonalFinanceTracker.css';

// Mock data
const mockTransactions = [
  { id: 1, amount: 45.50, category: 'Food', description: 'Grocery shopping', date: '2024-09-25', type: 'expense' },
  { id: 2, amount: 12.99, category: 'Transport', description: 'Bus fare', date: '2024-09-24', type: 'expense' },
  { id: 3, amount: 2500.00, category: 'Income', description: 'Salary', date: '2024-09-20', type: 'income' },
  { id: 4, amount: 89.99, category: 'Entertainment', description: 'Movie tickets', date: '2024-09-22', type: 'expense' },
  { id: 5, amount: 156.78, category: 'Utilities', description: 'Electric bill', date: '2024-09-21', type: 'expense' },
  { id: 6, amount: 34.50, category: 'Food', description: 'Restaurant dinner', date: '2024-09-20', type: 'expense' },
  { id: 7, amount: 75.00, category: 'Health', description: 'Gym membership', date: '2024-09-19', type: 'expense' },
  { id: 8, amount: 200.00, category: 'Shopping', description: 'New clothes', date: '2024-09-18', type: 'expense' }
];

const mockBudgets = [
  { category: 'Food', budgeted: 500, spent: 80.00 },
  { category: 'Transport', budgeted: 150, spent: 12.99 },
  { category: 'Entertainment', budgeted: 200, spent: 89.99 },
  { category: 'Utilities', budgeted: 300, spent: 156.78 },
  { category: 'Health', budgeted: 100, spent: 75.00 },
  { category: 'Shopping', budgeted: 250, spent: 200.00 }
];

const mockGoals = [
  { id: 1, name: 'Emergency Fund', target: 5000, current: 1250, deadline: '2024-12-31' },
  { id: 2, name: 'Vacation Fund', target: 2000, current: 450, deadline: '2024-08-15' },
  { id: 3, name: 'New Laptop', target: 1500, current: 750, deadline: '2024-11-30' }
];

const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Health', 'Shopping', 'Other'];

function PersonalFinanceTracker() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState(mockTransactions);
  const [budgets, setBudgets] = useState(mockBudgets);
  const [goals, setGoals] = useState(mockGoals);
  
  // Modal states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showContributeGoal, setShowContributeGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Form states
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newIncome, setNewIncome] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newBudget, setNewBudget] = useState({
    category: 'Food',
    amount: ''
  });

  const [newGoal, setNewGoal] = useState({
    name: '',
    target: '',
    deadline: ''
  });

  const [goalContribution, setGoalContribution] = useState({
    amount: ''
  });

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const filteredTransactions = filterCategory === 'all' 
    ? transactions 
    : transactions.filter(t => t.category === filterCategory);

  // Calculate spent amounts for budgets based on transactions
  const calculateBudgetSpent = (category) => {
    return transactions
      .filter(t => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Update budgets with current spending
  const updatedBudgets = budgets.map(budget => ({
    ...budget,
    spent: calculateBudgetSpent(budget.category)
  }));

  const handleAddExpense = () => {
    if (newExpense.amount && newExpense.description) {
      const expense = {
        id: Date.now(),
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        description: newExpense.description,
        date: newExpense.date,
        type: 'expense'
      };
      
      setTransactions([expense, ...transactions]);
      setNewExpense({
        amount: '',
        category: 'Food',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddExpense(false);
    }
  };

  const handleAddIncome = () => {
    if (newIncome.amount && newIncome.description) {
      const income = {
        id: Date.now(),
        amount: parseFloat(newIncome.amount),
        category: 'Income',
        description: newIncome.description,
        date: newIncome.date,
        type: 'income'
      };
      
      setTransactions([income, ...transactions]);
      setNewIncome({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddIncome(false);
    }
  };

  const handleAddBudget = () => {
    if (newBudget.amount) {
      const amount = parseFloat(newBudget.amount);
      
      // Check if budget for this category already exists
      const existingBudgetIndex = budgets.findIndex(b => b.category === newBudget.category);
      
      if (existingBudgetIndex !== -1) {
        // Update existing budget
        const updatedBudgetsList = [...budgets];
        updatedBudgetsList[existingBudgetIndex] = {
          ...updatedBudgetsList[existingBudgetIndex],
          budgeted: amount
        };
        setBudgets(updatedBudgetsList);
      } else {
        // Add new budget
        const budget = {
          category: newBudget.category,
          budgeted: amount,
          spent: calculateBudgetSpent(newBudget.category)
        };
        setBudgets([...budgets, budget]);
      }
      
      setNewBudget({
        category: 'Food',
        amount: ''
      });
      setShowAddBudget(false);
    }
  };

  const handleAddGoal = () => {
    if (newGoal.name && newGoal.target && newGoal.deadline) {
      const goal = {
        id: Date.now(),
        name: newGoal.name,
        target: parseFloat(newGoal.target),
        current: 0,
        deadline: newGoal.deadline
      };
      
      setGoals([...goals, goal]);
      setNewGoal({
        name: '',
        target: '',
        deadline: ''
      });
      setShowAddGoal(false);
    }
  };

  const handleContributeToGoal = () => {
    if (goalContribution.amount && selectedGoal) {
      const amount = parseFloat(goalContribution.amount);
      
      // Update the goal's current amount
      const updatedGoals = goals.map(goal => {
        if (goal.id === selectedGoal.id) {
          return {
            ...goal,
            current: Math.min(goal.current + amount, goal.target) // Don't exceed target
          };
        }
        return goal;
      });
      
      setGoals(updatedGoals);
      setGoalContribution({ amount: '' });
      setShowContributeGoal(false);
      setSelectedGoal(null);
    }
  };

  const openContributeModal = (goal) => {
    setSelectedGoal(goal);
    setShowContributeGoal(true);
  };

  const expensesByCategory = categories.reduce((acc, category) => {
    const categoryExpenses = transactions
      .filter(t => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
    if (categoryExpenses > 0) {
      acc[category] = categoryExpenses;
    }
    return acc;
  }, {});

  const exportData = () => {
    const data = {
      transactions,
      budgets: updatedBudgets,
      goals,
      summary: {
        totalIncome,
        totalExpenses,
        balance,
        expensesByCategory
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">Finance Tracker</h1>
          <div className="header-buttons">
            <button onClick={() => setShowAddIncome(true)} className="btn-success">
              <PlusCircle size={16} />
              <span>Add Income</span>
            </button>
            <button onClick={() => setShowAddExpense(true)} className="btn-primary">
              <PlusCircle size={16} />
              <span>Add Expense</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="navigation">
        <div className="nav-content">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
          >
            <DollarSign size={16} />
            <span>Transactions</span>
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`nav-item ${activeTab === 'budgets' ? 'active' : ''}`}
          >
            <PieChart size={16} />
            <span>Budgets</span>
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`}
          >
            <Target size={16} />
            <span>Goals</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            {/* Summary Cards */}
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-card-content">
                  <div>
                    <p className="summary-label">Balance</p>
                    <p className={`summary-amount ${balance >= 0 ? 'positive' : 'negative'}`}>
                      ${balance.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp size={32} className="summary-icon green" />
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-card-content">
                  <div>
                    <p className="summary-label">Total Income</p>
                    <p className="summary-amount positive">${totalIncome.toFixed(2)}</p>
                  </div>
                  <DollarSign size={32} className="summary-icon green" />
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-card-content">
                  <div>
                    <p className="summary-label">Total Expenses</p>
                    <p className="summary-amount negative">${totalExpenses.toFixed(2)}</p>
                  </div>
                  <PieChart size={32} className="summary-icon red" />
                </div>
              </div>
            </div>

            {/* Expense Categories */}
            <div className="card">
              <h3 className="card-title">Spending by Category</h3>
              <div className="category-grid">
                {Object.entries(expensesByCategory).map(([category, amount]) => (
                  <div key={category} className="category-card">
                    <p className="category-name">{category}</p>
                    <p className="category-amount">${amount.toFixed(2)}</p>
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${(amount / totalExpenses) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <h3 className="card-title">Recent Transactions</h3>
              <div className="transaction-list">
                {transactions.slice(0, 5).map(transaction => (
                  <div key={transaction.id} className="transaction-item">
                    <div>
                      <p className="transaction-description">{transaction.description}</p>
                      <p className="transaction-meta">{transaction.category} • {transaction.date}</p>
                    </div>
                    <p className={`transaction-amount ${transaction.type === 'income' ? 'positive' : 'negative'}`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="transactions-page">
            <div className="page-header">
              <h2>Transactions</h2>
              <div className="header-actions">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  <option value="Income">Income</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button onClick={exportData} className="btn-success">
                  <Download size={16} />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>{transaction.date}</td>
                      <td>{transaction.description}</td>
                      <td>{transaction.category}</td>
                      <td className={transaction.type === 'income' ? 'positive' : 'negative'}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Budgets Tab */}
        {activeTab === 'budgets' && (
          <div className="budgets-page">
            <div className="page-header">
              <h2>Budget Overview</h2>
              <button onClick={() => setShowAddBudget(true)} className="btn-primary">
                <PlusCircle size={16} />
                <span>Set Budget</span>
              </button>
            </div>
            <div className="budget-grid">
              {updatedBudgets.map(budget => {
                const percentage = (budget.spent / budget.budgeted) * 100;
                const isOverBudget = percentage > 100;
                
                return (
                  <div key={budget.category} className="budget-card">
                    <div className="budget-header">
                      <h3>{budget.category}</h3>
                      <span className={isOverBudget ? 'negative' : 'positive'}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="budget-info">
                      <div className="budget-amounts">
                        <span>${budget.spent.toFixed(2)} spent</span>
                        <span>${budget.budgeted.toFixed(2)} budget</span>
                      </div>
                      <div className="progress-bar-container">
                        <div 
                          className={`progress-bar-fill ${isOverBudget ? 'over-budget' : ''}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
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

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="goals-page">
            <div className="page-header">
              <h2>Savings Goals</h2>
              <button onClick={() => setShowAddGoal(true)} className="btn-primary">
                <Target size={16} />
                <span>Add Goal</span>
              </button>
            </div>
            <div className="goals-grid">
              {goals.map(goal => {
                const percentage = (goal.current / goal.target) * 100;
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
                        <div 
                          className="progress-bar-fill goal-progress-bar"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="goal-stats">
                      <span className="positive">{percentage.toFixed(1)}% complete</span>
                      <span className="goal-remaining">
                        ${(goal.target - goal.current).toFixed(2)} to go
                      </span>
                    </div>

                    {!isCompleted && (
                      <button 
                        onClick={() => openContributeModal(goal)}
                        className="btn-contribute"
                      >
                        <PlusCircle size={14} />
                        <span>Add Money</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="modal-overlay" onClick={() => setShowAddExpense(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add New Expense</h3>
            
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                className="form-input"
                placeholder="0.00"
              />
            </div>
            
            <div className="form-group">
              <label>Category *</label>
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                className="form-input"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Description *</label>
              <input
                type="text"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                className="form-input"
                placeholder="What was this expense for?"
              />
            </div>
            
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                className="form-input"
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={handleAddExpense} className="btn-primary">
                Add Expense
              </button>
              <button onClick={() => setShowAddExpense(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Income Modal */}
      {showAddIncome && (
        <div className="modal-overlay" onClick={() => setShowAddIncome(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Income</h3>
            
            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                step="0.01"
                value={newIncome.amount}
                onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })}
                className="form-input"
                placeholder="0.00"
              />
            </div>
            
            <div className="form-group">
              <label>Description *</label>
              <input
                type="text"
                value={newIncome.description}
                onChange={(e) => setNewIncome({ ...newIncome, description: e.target.value })}
                className="form-input"
                placeholder="e.g., Salary, Freelance work, Gift"
              />
            </div>
            
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={newIncome.date}
                onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
                className="form-input"
              />
            </div>
            
            <div className="modal-actions">
              <button onClick={handleAddIncome} className="btn-success">
                Add Income
              </button>
              <button onClick={() => setShowAddIncome(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div className="modal-overlay" onClick={() => setShowAddBudget(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Set Budget</h3>
            
            <div className="form-group">
              <label>Category *</label>
              <select
                value={newBudget.category}
                onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                className="form-input"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Budget Amount *</label>
              <input
                type="number"
                step="0.01"
                value={newBudget.amount}
                onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                className="form-input"
                placeholder="0.00"
              />
              <p className="form-hint">Set your monthly budget limit for this category</p>
            </div>
            
            <div className="modal-actions">
              <button onClick={handleAddBudget} className="btn-primary">
                Set Budget
              </button>
              <button onClick={() => setShowAddBudget(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="modal-overlay" onClick={() => setShowAddGoal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Savings Goal</h3>
            
            <div className="form-group">
              <label>Goal Name *</label>
              <input
                type="text"
                value={newGoal.name}
                onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                className="form-input"
                placeholder="e.g., Emergency Fund, Vacation, New Car"
              />
            </div>
            
            <div className="form-group">
              <label>Target Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                value={newGoal.target}
                onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                className="form-input"
                placeholder="0.00"
              />
            </div>
            
            <div className="form-group">
              <label>Target Date *</label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                className="form-input"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="form-hint">When do you want to achieve this goal?</p>
            </div>
            
            <div className="modal-actions">
              <button onClick={handleAddGoal} className="btn-primary">
                Add Goal
              </button>
              <button onClick={() => setShowAddGoal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute to Goal Modal */}
      {showContributeGoal && selectedGoal && (
        <div className="modal-overlay" onClick={() => {
          setShowContributeGoal(false);
          setSelectedGoal(null);
          setGoalContribution({ amount: '' });
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Money to Goal</h3>
            
            <div className="goal-info-box">
              <p className="goal-info-name">{selectedGoal.name}</p>
              <p className="goal-info-progress">
                Current: ${selectedGoal.current.toFixed(2)} / ${selectedGoal.target.toFixed(2)}
              </p>
              <p className="goal-info-remaining">
                ${(selectedGoal.target - selectedGoal.current).toFixed(2)} remaining to reach goal
              </p>
            </div>
            
            <div className="form-group">
              <label>Amount to Add ($) *</label>
              <input
                type="number"
                step="0.01"
                value={goalContribution.amount}
                onChange={(e) => setGoalContribution({ amount: e.target.value })}
                className="form-input"
                placeholder="0.00"
                max={selectedGoal.target - selectedGoal.current}
              />
              <p className="form-hint">
                Maximum: ${(selectedGoal.target - selectedGoal.current).toFixed(2)}
              </p>
            </div>
            
            <div className="modal-actions">
              <button onClick={handleContributeToGoal} className="btn-success">
                Add Money
              </button>
              <button onClick={() => {
                setShowContributeGoal(false);
                setSelectedGoal(null);
                setGoalContribution({ amount: '' });
              }} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalFinanceTracker;