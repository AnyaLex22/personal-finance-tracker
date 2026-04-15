import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import UpgradePage from './pages/UpgradePage';
import PlanPreviewPage from './pages/PlanPreviewPage';
import PersonalFinanceTracker from './PersonalFinanceTracker';
import './App.css';

function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="spinner" /></div>;
  return currentUser ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="spinner" /></div>;
  return !currentUser ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/" element={
        <PrivateRoute>
          <FinanceProvider>
            <PersonalFinanceTracker />
          </FinanceProvider>
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <ProfilePage />
        </PrivateRoute>
      } />
      <Route path="/upgrade" element={
        <PrivateRoute>
          <UpgradePage />
        </PrivateRoute>
      } />
      <Route path="/plan-preview" element={
        <PrivateRoute>
          <FinanceProvider>
            <PlanPreviewPage />
          </FinanceProvider>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
