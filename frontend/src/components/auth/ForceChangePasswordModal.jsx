import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const ForceChangePasswordModal = () => {
  const { currentUser, updateUserPassword } = useAuth();
  const { addToast } = useGymData();

  const [currentPass, setCurrentPass] = useState(currentUser?.password || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user doesn't need to change password, do not render modal
  if (!currentUser || !currentUser.mustChangePassword) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and Confirm password do not match.');
      return;
    }

    if (newPassword === currentUser.password) {
      setErrorMessage('Your new password must be different from the temporary one assigned by the owner.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      updateUserPassword(newPassword);
      setIsSubmitting(false);
      addToast('Password successfully updated! Use your new password for future logins.', 'success');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#0e1626] border-2 border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-5 animate-scaleUp">
        
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10 mb-1">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold font-heading text-white tracking-wide">
            First-Time Login Security Setup
          </h2>
          <p className="text-xs text-slate-300">
            Welcome, <strong>{currentUser.name}</strong>! You are logging in with a temporary password assigned by the Gym Owner. Please set your personal secret password to continue.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* User Email (Readonly) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Your Login Username (Email)
            </label>
            <input
              type="text"
              readOnly
              value={currentUser.email}
              className="w-full px-3.5 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed font-medium"
            />
          </div>

          {/* Current Temporary Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Temporary Password (Given by Owner)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                readOnly
                value={currentUser.password}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-amber-400 font-mono font-bold cursor-not-allowed"
              />
            </div>
          </div>

          {/* New Secret Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Set New Secret Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                placeholder="Minimum 6 characters..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Confirm New Secret Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showNewPass ? 'text' : 'password'}
                required
                placeholder="Re-enter your new password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black tracking-wider uppercase shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all mt-2 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <span className="animate-spin w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full" />
            ) : (
              <>
                <span>Save New Password & Enter App</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>Your new password will be encrypted and saved for all future logins.</span>
        </p>

      </div>
    </div>
  );
};
