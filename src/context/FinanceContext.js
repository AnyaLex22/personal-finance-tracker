import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection, doc, addDoc, updateDoc,
  writeBatch,
  onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const FinanceContext = createContext();
export const useFinance = () => useContext(FinanceContext);

export function FinanceProvider({ children }) {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [dataReady, setDataReady] = useState(false);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) { setTransactions([]); setBudgets([]); setGoals([]); setDataReady(false); return; }

    let unsubs = [];

    const init = async () => {
      const txUnsub = onSnapshot(
        query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc')),
        snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        error => console.error('Transactions listener error:', error)
      );
      const bUnsub = onSnapshot(
        collection(db, 'users', uid, 'budgets'),
        snap => setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        error => console.error('Budgets listener error:', error)
      );
      const gUnsub = onSnapshot(
        collection(db, 'users', uid, 'goals'),
        snap => setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        error => console.error('Goals listener error:', error)
      );
      unsubs = [txUnsub, bUnsub, gUnsub];
      setDataReady(true);
    };

    init();
    return () => unsubs.forEach(u => u && u());
  }, [uid]);

  const addTransaction = async (data) => {
    if (!uid) {
      throw new Error('User must be signed in to add a transaction.');
    }

    const optimisticTransaction = {
      id: `temp-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [optimisticTransaction, ...prev]);

    try {
      await addDoc(collection(db, 'users', uid, 'transactions'), { ...data, createdAt: serverTimestamp() });
    } catch (error) {
      setTransactions(prev => prev.filter(transaction => transaction.id !== optimisticTransaction.id));
      throw error;
    }
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

  const contributeToGoal = async (goalId, goalName, amount, currentAmount, targetAmount, date) => {
    if (!uid) {
      throw new Error('User must be signed in to contribute to a goal.');
    }

    const contributionAmount = Math.min(amount, Math.max(targetAmount - currentAmount, 0));
    if (contributionAmount <= 0) {
      return;
    }

    const newAmount = currentAmount + contributionAmount;
    const batch = writeBatch(db);
    const goalRef = doc(db, 'users', uid, 'goals', goalId);
    const transactionRef = doc(collection(db, 'users', uid, 'transactions'));

    batch.update(goalRef, { current: newAmount });
    batch.set(transactionRef, {
      amount: contributionAmount,
      category: 'Savings',
      description: `${goalName} Goal`,
      date,
      type: 'saving',
      goalId,
      createdAt: serverTimestamp()
    });

    await batch.commit();
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
