import React, { useState, useRef } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import {
  User, Mail, Phone, Calendar, Lock, Eye, EyeOff, Camera,
  Save, LogOut, RefreshCw, Shield, CheckCircle, X
} from 'lucide-react';
import './ProfilePage.css';

export default function ProfilePage() {
  const { currentUser, userProfile, updateUserProfile, logout, forgotPassword, isPremium, getTrialDaysLeft } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [form, setForm] = useState({
    displayName: userProfile?.displayName || '',
    username:    userProfile?.username    || '',
    age:         userProfile?.age         || '',
    phone:       userProfile?.phone       || '',
  });

  const [saving, setSaving]         = useState(false);
  const [savedOk, setSavedOk]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [photoURL, setPhotoURL]     = useState(userProfile?.photoURL || '');

  // PIN / password reveal
  const [showPinModal, setShowPinModal]   = useState(false);
  const [pinInput, setPinInput]           = useState('');
  const [pinError, setPinError]           = useState('');
  const [revealedPw, setRevealedPw]       = useState('');
  const [showRevealedPw, setShowRevealedPw] = useState(false);

  // Set / change PIN
  const [showSetPin, setShowSetPin]   = useState(false);
  const [newPin, setNewPin]           = useState('');
  const [pinSaved, setPinSaved]       = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    await updateUserProfile(currentUser.uid, { ...form, photoURL });
    setSaving(false);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2500);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
      await updateUserProfile(currentUser.uid, { photoURL: url });
    } catch {
      alert('Failed to upload photo. Please try again.');
    }
    setUploading(false);
  };

  const handleVerifyPin = () => {
    const savedPin = userProfile?.pin;
    if (!savedPin) { setPinError('No PIN set. Set a PIN first.'); return; }
    if (pinInput !== savedPin) { setPinError('Incorrect PIN.'); return; }
    setRevealedPw('Your password is hidden for security. Use Reset Password to change it.');
    setShowRevealedPw(true);
    setShowPinModal(false);
    setPinInput('');
    setPinError('');
  };

  const handleSavePin = async () => {
    if (!/^\d{6}$/.test(newPin)) { alert('PIN must be exactly 6 digits.'); return; }
    await updateUserProfile(currentUser.uid, { pin: newPin });
    setPinSaved(true);
    setNewPin('');
    setTimeout(() => { setPinSaved(false); setShowSetPin(false); }, 1500);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleResetPassword = async () => {
    await forgotPassword(currentUser.email);
    alert(`A password reset link has been sent to ${currentUser.email}`);
  };

  const trialDays = getTrialDaysLeft();
  const premium   = isPremium();

  return (
    <div className="profile-page">
      {/* Plan Banner */}
      <div className={`plan-banner ${premium ? 'premium' : 'free'}`}>
        <Shield size={16} />
        {userProfile?.plan === 'trial'
          ? `🎉 Premium Trial — ${trialDays} day${trialDays !== 1 ? 's' : ''} left`
          : premium ? '✨ Premium Plan Active' : '🔒 Free Plan'}
        {!premium && (
          <button className="plan-upgrade-btn" onClick={() => navigate('/upgrade')}>Upgrade to Premium</button>
        )}
      </div>

      <div className="profile-container">
        <h2 className="profile-heading">My Profile</h2>

        {/* Avatar */}
        <div className="profile-avatar-section">
          <div className="avatar-ring">
            {photoURL
              ? <img src={photoURL} alt="avatar" className="avatar-img" />
              : <User size={48} className="avatar-placeholder" />}
            <button className="avatar-edit-btn" onClick={() => fileRef.current.click()} disabled={uploading}>
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden-file" onChange={handlePhoto} />
          </div>
          <div className="avatar-info">
            <p className="avatar-name">{form.displayName || form.username || 'User'}</p>
            <p className="avatar-email">{currentUser?.email}</p>
          </div>
        </div>

        {/* Form */}
        <div className="profile-form">
          <div className="profile-grid">
            <div className="profile-field">
              <label><User size={14} /> Display Name</label>
              <input value={form.displayName} onChange={set('displayName')} placeholder="Your full name" />
            </div>
            <div className="profile-field">
              <label><User size={14} /> Username</label>
              <input value={form.username} onChange={set('username')} placeholder="@username" />
            </div>
            <div className="profile-field">
              <label><Mail size={14} /> Email</label>
              <input value={currentUser?.email} disabled className="disabled-input" />
            </div>
            <div className="profile-field">
              <label><Calendar size={14} /> Age</label>
              <input type="number" value={form.age} onChange={set('age')} placeholder="Your age" min="1" max="120" />
            </div>
            <div className="profile-field">
              <label><Phone size={14} /> Phone Number</label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+60 12-345 6789" />
            </div>
          </div>

          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {savedOk ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> {saving ? 'Saving…' : 'Save Changes'}</>}
          </button>
        </div>

        {/* Security Section */}
        <div className="profile-section">
          <h3 className="section-title"><Lock size={16} /> Security</h3>

          <div className="security-row">
            <div>
              <p className="security-label">Password</p>
              <p className="security-hint">••••••••••••</p>
              {showRevealedPw && (
                <div className="revealed-pw">
                  <span>{revealedPw}</span>
                  <button onClick={() => setShowRevealedPw(false)}><X size={12} /></button>
                </div>
              )}
            </div>
            <div className="security-btns">
              <button className="btn-outline" onClick={() => setShowPinModal(true)}>
                <Eye size={14} /> View (PIN)
              </button>
              <button className="btn-outline" onClick={handleResetPassword}>
                <RefreshCw size={14} /> Reset Password
              </button>
            </div>
          </div>

          <div className="security-row">
            <div>
              <p className="security-label">6-Digit Security PIN</p>
              <p className="security-hint">{userProfile?.pin ? 'PIN is set' : 'No PIN configured'}</p>
            </div>
            <button className="btn-outline" onClick={() => setShowSetPin(true)}>
              <Shield size={14} /> {userProfile?.pin ? 'Change PIN' : 'Set PIN'}
            </button>
          </div>
        </div>

        {/* Logout */}
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {/* PIN verify modal */}
      {showPinModal && (
        <div className="modal-overlay" onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Enter your 6-digit PIN</h3>
            <p className="modal-sub">Verify your identity to view password info</p>
            <input
              type="password" maxLength={6} value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="pin-input" placeholder="••••••" inputMode="numeric"
            />
            {pinError && <p className="pin-error">{pinError}</p>}
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleVerifyPin}>Verify</button>
              <button className="btn-secondary" onClick={() => { setShowPinModal(false); setPinInput(''); setPinError(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Set PIN modal */}
      {showSetPin && (
        <div className="modal-overlay" onClick={() => setShowSetPin(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>{userProfile?.pin ? 'Change' : 'Set'} Security PIN</h3>
            <p className="modal-sub">This 6-digit PIN protects your password view</p>
            <input
              type="password" maxLength={6} value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="pin-input" placeholder="••••••" inputMode="numeric"
            />
            {pinSaved && <p className="pin-ok">PIN saved!</p>}
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSavePin}>Save PIN</button>
              <button className="btn-secondary" onClick={() => setShowSetPin(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
