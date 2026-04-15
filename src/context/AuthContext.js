import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, username) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      username,
      displayName: username,
      age: '',
      phone: '',
      photoURL: '',
      plan: 'trial',
      trialEndsAt: trialEnd,
      createdAt: serverTimestamp(),
      pin: '',
    });
    return cred;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    return signOut(auth);
  }

  async function forgotPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function resetPassword(newPassword) {
    return updatePassword(auth.currentUser, newPassword);
  }

  async function reauthenticate(password) {
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    return reauthenticateWithCredential(auth.currentUser, credential);
  }

  async function fetchUserProfile(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      // Check if trial has expired
      if (data.plan === 'trial' && data.trialEndsAt) {
        const trialEnd = data.trialEndsAt.toDate ? data.trialEndsAt.toDate() : new Date(data.trialEndsAt);
        if (new Date() > trialEnd) {
          await updateDoc(doc(db, 'users', uid), { plan: 'free' });
          data.plan = 'free';
        }
      }
      setUserProfile({ ...data, uid });
      return { ...data, uid };
    }
    return null;
  }

  async function updateUserProfile(uid, updates) {
    await updateDoc(doc(db, 'users', uid), updates);
    setUserProfile(prev => ({ ...prev, ...updates }));
  }

  const isPremium = () => {
    if (!userProfile) return false;
    const plan = userProfile.plan;
    if (plan === 'premium') return true;
    if (plan === 'trial') {
      const trialEnd = userProfile.trialEndsAt?.toDate
        ? userProfile.trialEndsAt.toDate()
        : new Date(userProfile.trialEndsAt);
      return new Date() <= trialEnd;
    }
    return false;
  };

  const getTrialDaysLeft = () => {
    if (!userProfile || userProfile.plan !== 'trial') return 0;
    const trialEnd = userProfile.trialEndsAt?.toDate
      ? userProfile.trialEndsAt.toDate()
      : new Date(userProfile.trialEndsAt);
    const diff = trialEnd - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser, userProfile, loading,
    register, login, logout, forgotPassword, resetPassword,
    reauthenticate, fetchUserProfile, updateUserProfile,
    isPremium, getTrialDaysLeft,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
