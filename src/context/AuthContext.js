import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();
const isFirestoreOfflineError = (error) =>
  error?.code === 'unavailable' ||
  error?.code === 'failed-precondition' ||
  error?.message?.toLowerCase().includes('offline');
const normalizeUsername = (username) => username.trim().toLowerCase();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureUserProfile = useCallback(async (uid, user) => {
    const userRef = doc(db, 'users', uid);
    let snap;

    try {
      snap = await getDoc(userRef);
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        return null;
      }
      throw error;
    }

    if (snap?.exists()) {
      return snap;
    }

    const fallbackName =
      user?.displayName ||
      user?.email?.split('@')[0] ||
      'User';

    try {
      await setDoc(userRef, {
        email: user?.email || '',
        username: fallbackName,
        usernameLower: normalizeUsername(fallbackName),
        displayName: fallbackName,
        age: '',
        phone: '',
        photoURL: user?.photoURL || '',
        plan: 'free',
        createdAt: serverTimestamp(),
        pin: '',
        seeded: false,
      });

      return getDoc(userRef);
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        return null;
      }
      throw error;
    }
  }, []);

  async function register(email, password, username) {
    const trimmedUsername = username.trim();
    const normalizedUsername = normalizeUsername(trimmedUsername);
    const usernameSnap = await getDocs(query(
      collection(db, 'users'),
      where('usernameLower', '==', normalizedUsername),
      limit(1)
    ));

    if (!username || !normalizedUsername) {
      const error = new Error('Username is required.');
      error.code = 'auth/missing-username';
      throw error;
    }

    if (!usernameSnap.empty) {
      const error = new Error('Username already taken.');
      error.code = 'auth/username-already-in-use';
      throw error;
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      username: trimmedUsername,
      usernameLower: normalizedUsername,
      displayName: trimmedUsername,
      age: '',
      phone: '',
      photoURL: '',
      plan: 'trial',
      trialEndsAt: trialEnd,
      createdAt: serverTimestamp(),
      pin: '',
      seeded: false,
    });
    return cred;
  }

  async function login(username, password) {
    const trimmedUsername = username.trim();
    const normalizedUsername = normalizeUsername(trimmedUsername);

    if (!normalizedUsername) {
      const error = new Error('Username is required.');
      error.code = 'auth/missing-username';
      throw error;
    }

    let userEmail = null;

    try {
      const byNormalizedUsername = await getDocs(query(
        collection(db, 'users'),
        where('usernameLower', '==', normalizedUsername),
        limit(1)
      ));

      if (!byNormalizedUsername.empty) {
        userEmail = byNormalizedUsername.docs[0].data().email;
      } else {
        const byExactUsername = await getDocs(query(
          collection(db, 'users'),
          where('username', '==', trimmedUsername),
          limit(1)
        ));

        if (!byExactUsername.empty) {
          userEmail = byExactUsername.docs[0].data().email;
        }
      }
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        const offlineError = new Error('Username lookup unavailable while offline.');
        offlineError.code = 'firestore/offline';
        throw offlineError;
      }
      throw error;
    }

    if (!userEmail) {
      const error = new Error('User not found.');
      error.code = 'auth/user-not-found';
      throw error;
    }

    return signInWithEmailAndPassword(auth, userEmail, password);
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

  const fetchUserProfile = useCallback(async (uid, user = auth.currentUser) => {
    const snap = await ensureUserProfile(uid, user);
    if (snap?.exists()) {
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

    if (user) {
      const fallbackProfile = {
        uid,
        email: user.email || '',
        username: user.displayName || user.email?.split('@')[0] || 'User',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        age: '',
        phone: '',
        photoURL: user.photoURL || '',
        plan: 'free',
        pin: '',
        seeded: false,
      };
      setUserProfile(fallbackProfile);
      return fallbackProfile;
    }

    return null;
  }, [ensureUserProfile]);

  async function updateUserProfile(uid, updates) {
    const nextUpdates = { ...updates };
    if (typeof updates.username === 'string' && updates.username.trim()) {
      nextUpdates.username = updates.username.trim();
      nextUpdates.usernameLower = normalizeUsername(updates.username);
    }

    await updateDoc(doc(db, 'users', uid), nextUpdates);
    setUserProfile(prev => ({ ...prev, ...nextUpdates }));
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
        try {
          await fetchUserProfile(user.uid, user);
        } catch (error) {
          console.error('Unable to fetch user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchUserProfile]);

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
