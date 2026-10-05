import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Save,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { isValidEmail, hasSqlInjection, sanitizeText } from '../../utils/validation';

export const SuperadminCredentialsManager = ({ superUser, onSuperUserUpdated, showToast }) => {
  // ── Password Change State ──────────────────────────────
  const [currentPasswordForPwd, setCurrentPasswordForPwd] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState(null);
  const [pwdSuccess, setPwdSuccess] = useState(null);

  // ── Email Change State ─────────────────────────────────
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [showPwdForEmail, setShowPwdForEmail] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(null);

  // ── Handle Password Update ─────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e?.preventDefault?.();
    setPwdError(null);
    setPwdSuccess(null);

    const cleanCurrent = currentPasswordForPwd ? currentPasswordForPwd.trim() : '';
    const cleanNew = newPassword ? newPassword.trim() : '';
    const cleanConfirm = confirmPassword ? confirmPassword.trim() : '';

    if (!cleanCurrent) {
      setPwdError('Please enter your current Superadmin password.');
      return;
    }
    if (!cleanNew || cleanNew.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setPwdError('New password and confirmation password do not match.');
      return;
    }
    if (hasSqlInjection(cleanCurrent) || hasSqlInjection(cleanNew)) {
      setPwdError('Security Warning: Disallowed characters detected in password.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await api.superadmin.updatePassword({
        current_password: cleanCurrent,
        new_password: cleanNew,
        new_password_confirmation: cleanConfirm,
        superadmin_id: superUser?.id,
        current_email: superUser?.email,
      });

      if (res?.success) {
        setPwdSuccess('Password updated successfully! Use your new password for /superadmin login.');
        setCurrentPasswordForPwd('');
        setNewPassword('');
        setConfirmPassword('');
        showToast?.('Superadmin login password updated successfully!');
      } else {
        setPwdError(res?.message || 'Failed to update password.');
      }
    } catch (err) {
      setPwdError(err.message || 'Error updating password. Please verify your current password.');
    } finally {
      setPwdLoading(false);
    }
  };

  // ── Handle Email Update ────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e?.preventDefault?.();
    setEmailError(null);
    setEmailSuccess(null);

    const cleanCurrentPwd = currentPasswordForEmail ? currentPasswordForEmail.trim() : '';
    const cleanNewEmail = sanitizeText(newEmail).toLowerCase();
    const cleanConfirmEmail = sanitizeText(confirmEmail).toLowerCase();

    if (!cleanCurrentPwd) {
      setEmailError('Please enter your current Superadmin password to authorize email change.');
      return;
    }
    if (!cleanNewEmail || !isValidEmail(cleanNewEmail)) {
      setEmailError('Please enter a valid new email address.');
      return;
    }
    if (cleanNewEmail !== cleanConfirmEmail) {
      setEmailError('New email and confirmation email do not match.');
      return;
    }
    if (cleanNewEmail === (superUser?.email || '').toLowerCase()) {
      setEmailError('New email is identical to your current email.');
      return;
    }
    if (hasSqlInjection(cleanCurrentPwd) || hasSqlInjection(cleanNewEmail)) {
      setEmailError('Security Warning: Disallowed characters detected.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await api.superadmin.updateEmail({
        current_password: cleanCurrentPwd,
        new_email: cleanNewEmail,
        new_email_confirmation: cleanConfirmEmail,
        superadmin_id: superUser?.id,
        current_email: superUser?.email,
      });

      if (res?.success) {
        setEmailSuccess('Email updated successfully! Use your new email for /superadmin login.');
        setCurrentPasswordForEmail('');
        setNewEmail('');
        setConfirmEmail('');
        if (res?.user && onSuperUserUpdated) {
          onSuperUserUpdated({ ...superUser, email: res.user.email });
        }
        showToast?.('Superadmin login email updated successfully!');
      } else {
        setEmailError(res?.message || 'Failed to update email.');
      }
    } catch (err) {
      setEmailError(err.message || 'Error updating email. Please check your current password.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn w-full">
      {/* Overview Banner - Light Shades */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-indigo-100/60 via-purple-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-3 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <ShieldCheck className="w-full h-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
                  Superadmin Credentials & Security
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  ROOT PRIVILEGE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Configure master login details required to authenticate at <code className="text-indigo-600 font-mono font-semibold">/superadmin</code>
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="text-slate-500 text-[10px] font-mono uppercase tracking-wider font-semibold">Active Login Identity</div>
              <div className="text-slate-900 font-bold font-mono truncate max-w-[200px] sm:max-w-none">
                {superUser?.email || 'admin@example.com'}
              </div>
            </div>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="mt-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-900 font-bold">Critical Access Notice:</strong> Any changes made here take effect immediately for the next login at <code className="font-mono text-amber-900 font-bold">/superadmin</code>. Ensure you securely store your updated credentials.
          </div>
        </div>
      </div>

      {/* Two Column Grid for Password and Email Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ══════════════════════════════════════════════════════════ */}
        {/* CARD 1: CHANGE SUPERADMIN PASSWORD                         */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Change Superadmin Password
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Verify your current password, then specify and confirm your new password for <code className="text-indigo-600 font-mono font-medium">/superadmin</code> login.
            </p>

            {pwdError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-700 text-xs animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{pwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Field 1: Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Enter Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    required
                    value={currentPasswordForPwd}
                    onChange={(e) => setCurrentPasswordForPwd(e.target.value)}
                    placeholder="Enter existing password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-mono shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 2: New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Enter New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-mono shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 3: Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-mono shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">Passwords do not match</p>
                )}
                {confirmPassword && newPassword && confirmPassword === newPassword && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {pwdLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Set New Superadmin Password</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* CARD 2: CHANGE SUPERADMIN EMAIL                            */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500" />
          
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Change Superadmin Login Email
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Verify your current password, then specify and confirm your new email for <code className="text-purple-600 font-mono font-medium">/superadmin</code> login.
            </p>

            {emailError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-semibold">{emailError}</span>
              </div>
            )}

            {emailSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-700 text-xs animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{emailSuccess}</span>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {/* Field 1: Current Password for Verification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Enter Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPwdForEmail ? 'text' : 'password'}
                    required
                    value={currentPasswordForEmail}
                    onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                    placeholder="Enter existing password to authorize"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 font-mono shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwdForEmail(!showPwdForEmail)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPwdForEmail ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Field 2: New Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Enter New Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. admin@yourdomain.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 font-mono shadow-sm"
                  />
                </div>
              </div>

              {/* Field 3: Confirm New Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Confirm New Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Re-enter new email address"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 font-mono shadow-sm"
                  />
                </div>
                {confirmEmail && newEmail && confirmEmail.toLowerCase() !== newEmail.toLowerCase() && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">Email addresses do not match</p>
                )}
                {confirmEmail && newEmail && confirmEmail.toLowerCase() === newEmail.toLowerCase() && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Email addresses match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:via-pink-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {emailLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Email...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Set New Superadmin Email</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};
