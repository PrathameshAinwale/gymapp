import React, { useState, useEffect } from 'react';
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
  UserCheck,
  UserPlus,
  Trash2,
  Users,
  Phone,
  Calendar,
  Shield
} from 'lucide-react';
import { api } from '../../services/api';
import { isValidEmail, hasSqlInjection, sanitizeText } from '../../utils/validation';
import { AddAdminModal } from './AddAdminModal';

export const SuperadminCredentialsManager = ({ superUser, onSuperUserUpdated, showToast }) => {
  // ── Superadmin Directory State ─────────────────────────
  const [admins, setAdmins] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [deletingAdminId, setDeletingAdminId] = useState(null);
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

  // ── Fetch Superadmin Directory ─────────────────────────
  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await api.superadmin.getAdmins();
      if (res?.success && Array.isArray(res.admins)) {
        setAdmins(res.admins);
      }
    } catch (err) {
      console.error('Failed to load superadmins:', err);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleDeleteAdmin = async (admin) => {
    if (admin.id === superUser?.id) {
      alert('You cannot delete your own active superadmin account.');
      return;
    }
    if (admins.length <= 1) {
      alert('Cannot delete the last remaining Superadmin account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete superadmin "${admin.name}" (${admin.email})?`)) {
      return;
    }

    setDeletingAdminId(admin.id);
    try {
      const res = await api.superadmin.deleteAdmin(admin.id);
      if (res?.success) {
        showToast?.(res.message || 'Superadmin deleted.');
        fetchAdmins();
      } else {
        alert(res?.message || 'Failed to delete superadmin.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting superadmin.');
    } finally {
      setDeletingAdminId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn w-full">

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 1: SUPERADMIN DIRECTORY & ADD ADMIN                */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Superadmin Administrators</span>
                <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  {admins.length} {admins.length === 1 ? 'Admin' : 'Admins'}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                All administrators authorized to access and configure <code className="font-mono text-slate-700 font-semibold">/superadmin</code>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddAdminModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer self-start sm:self-auto"
            title="Create a new Superadmin administrator account"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Superadmin</span>
          </button>
        </div>

        {loadingAdmins ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Loading administrators...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No superadmin records found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {admins.map((adm) => {
              const isCurrentUser = adm.id === superUser?.id || adm.email === superUser?.email;
              const initial = (adm.name || 'A').charAt(0).toUpperCase();

              return (
                <div
                  key={adm.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isCurrentUser
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCurrentUser
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {adm.name}
                          </h4>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded uppercase">
                            Superadmin
                          </span>
                        </div>
                      </div>

                      {isCurrentUser ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Current Session
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteAdmin(adm)}
                          disabled={deletingAdminId === adm.id || admins.length <= 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Delete this superadmin"
                        >
                          {deletingAdminId === adm.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600 font-mono mt-2 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{adm.email}</span>
                      </div>
                      {adm.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{adm.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>ID: #{adm.id}</span>
                    <span>{adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Active'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Column Grid for Password and Email Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* ══════════════════════════════════════════════════════════ */}
        {/* CARD 1: CHANGE SUPERADMIN PASSWORD                         */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600" />
          
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-950 tracking-tight">
                Change Superadmin Password
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">
              Verify your current password, then specify and confirm your new password for <code className="text-slate-900 font-mono font-medium">/superadmin</code> login.
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
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-emerald-600" />
          
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-950 tracking-tight">
                Change Superadmin Login Email
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3.5 leading-relaxed">
              Verify your current password, then specify and confirm your new email for <code className="text-emerald-700 font-mono font-medium">/superadmin</code> login.
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
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Add Superadmin Modal */}
      <AddAdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        onAdminCreated={(newAdmin) => {
          showToast?.(`Superadmin "${newAdmin.name}" created!`);
          fetchAdmins();
        }}
        showToast={showToast}
      />
    </div>
  );
};
