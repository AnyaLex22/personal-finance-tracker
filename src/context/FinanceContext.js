import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './context/AuthContext';

const FinanceContext = createContext();
export const useFinance = () => useContext(FinanceContext);

const MOCK_TRANSACTIONS = [
  { id: 'm1', amount: 45.50,   category: 'Food',          description: 'Grocery shopping',  date: '2024-09-25', type: 'expense' },
  { id: 'm2', amount: 12.99,   category: 'Transport',     description: 'Bus fare',           date: '2024-09-24', type: 'expense' },
  { id: 'm3', amount: 2500.00, category: 'Income',        description: 'Salary',             date: '2024-09-20', type: 'income'  },
  { id: 'm4', amount: 89.99,   category: 'Entertainment', description: 'Movie tickets',      date: '2024-09-22', type: 'expense' },
  { id: 'm5', amount: 156.78,  category: 'Utilities',     description: 'Electric bill',      date: '2024-09-21', type: 'expense' },
  { id: 'm6', amount: 34.50,   category: 'Food',          description: 'Restaurant dinner',  date: '2024-09-20', type: 'expense' },
  { id: 'm7', amount: 75.00,   category: 'Health',        description: 'Gym membership',     date: '2024-09-19', type: 'expense' },
  { id: 'm8', amount: 200.00,  category: 'Shopping',      description: 'New clothes',        date: '2024-09-18', type: 'expense' },
];

const MOCK_BUDGETS = [
  { id: 'b1', category: 'Food',          budgeted: 500  },
  { id: 'b2', category: 'Transport',     budgeted: 150  },
  { id: 'b3', category: 'Entertainment', budgeted: 200  },
  { id: 'b4', category: 'Utilities',     budgeted: 300  },
  { id: 'b5', category: 'Health',        budgeted: 100  },
  { id: 'b6', category: 'Shopping',      budgeted: 250  },
];

const MOCK_GOALS = [
  { id: 'g1', name: 'Emergency Fund', target: 5000, current: 1250, deadline: '2024-12-31' },
  { id: 'g2', name: 'Vacation Fund',  target: 2000, current: 450,  deadline: '2024-08-15' },
  { id: 'g3', name: 'New Laptop',     target: 1500, current: 750,  deadline: '2024-11-30' },
];

export function FinanceProvider({ children }) {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [dataReady, setDataReady] = useState(false);

  const uid = currentUser?.uid;

  const seedIfEmpty = useCallback(async (uid) => {
    // Seed transactions
    const txCol = collection(db, 'users', uid, 'transactions');
    for (const t of MOCK_TRANSACTIONS) {
      await setDoc(doc(txCol, t.id), { ...t, createdAt: serverTimestamp() });
    }
    // Seed budgets
    const bCol = collection(db, 'users', uid, 'budgets');
    for (const b of MOCK_BUDGETS) {
      await setDoc(doc(bCol, b.id), { ...b, createdAt: serverTimestamp() });
    }
    // Seed goals
    const gCol = collection(db, 'users', uid, 'goals');
    for (const g of MOCK_GOALS) {
      await setDoc(doc(gCol, g.id), { ...g, createdAt: serverTimestamp() });
    }
    // Mark seeded
    await updateDoc(doc(db, 'users', uid), { seeded: true });
  }, []);

  useEffect(() => {
    if (!uid) { setTransactions([]); setBudgets([]); setGoals([]); setDataReady(false); return; }

    let unsubs = [];

    const init = async () => {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists() && !userDoc.data().seeded) {
        await seedIfEmpty(uid);
      }

      const txUnsub = onSnapshot(
        query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc')),
        snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      const bUnsub = onSnapshot(
        collection(db, 'users', uid, 'budgets'),
        snap => setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      const gUnsub = onSnapshot(
        collection(db, 'users', uid, 'goals'),
        snap => setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      );
      unsubs = [txUnsub, bUnsub, gUnsub];
      setDataReady(true);
    };

    init();
    return () => unsubs.forEach(u => u && u());
  }, [uid, seedIfEmpty]);

  const addTransaction = async (data) => {
    await addDoc(collection(db, 'users', uid, 'transactions'), { ...data, createdAt: serverTimestamp() });
  };

  const addBudget = async (data) => {
    const existing = budgets.find(b => b.category === data.category);
    if (existing) {
      await updateDoc(doc(db, 'users', uid, 'budgets', existing.id), { budgeted: data.budgeted });
    } else {
      await addDoc(collection(db, 'users', uid, 'budgets'), { ...data, createdAt: serverTimestamp() });
    }
  };

  const addGoal = async (data) => {
    await addDoc(collection(db, 'users', uid, 'goals'), { ...data, current: 0, createdAt: serverTimestamp() });
  };

  const contributeToGoal = async (goalId, amount, currentAmount, targetAmount) => {
    const newAmount = Math.min(currentAmount + amount, targetAmount);
    await updateDoc(doc(db, 'users', uid, 'goals', goalId), { current: newAmount });
  };

  return (
    <FinanceContext.Provider value={{
      transactions, budgets, goals, dataReady,
      addTransaction, addBudget, addGoal, contributeToGoal,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}
