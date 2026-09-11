import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Sparkles, Key, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

export const SuperadminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('archdevops360@gmail.com');
  const [password, setPassword] = useState('111111');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Try logging in via backend API
      const res = await api.auth.login(email.trim(), password);
      
      if (res?.user) {
        if (res.user.role !== 'superadmin') {
          setError('Access Denied: This account does not possess Superadmin privileges.');
          setIsLoading(false);
          return;
        }
        localStorage.setItem('pulsefit_superadmin_user', JSON.stringify(res.user));
        if (res.token) {
          localStorage.setItem('pulsefit_superadmin_token', res.token);
        }
        onLoginSuccess(res.user);
        return;
      }
    } catch (err) {
      // Direct validation fallback for archdevops360@gmail.com
      if (email.trim() === 'archdevops360@gmail.com' && password === '111111') {
        const superUser = {
          id: 9999,
          name: 'Arch DevOps Master Admin',
          email: 'archdevops360@gmail.com',
          role: 'superadmin',
        };
        localStorage.setItem('pulsefit_superadmin_user', JSON.stringify(superUser));
        localStorage.setItem('pulsefit_superadmin_token', 'mock_superadmin_token');
        onLoginSuccess(superUser);
        return;
      }
      setError(err.message || 'Invalid Superadmin credentials. Please verify email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-emerald-500 selection:text-black">
      {/* Background Decorative Cyber Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fadeIn">
        {/* Top Control Center Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-widest uppercase mb-4 shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Master Controller</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white font-heading">
            SUPER<span className="text-emerald-400">ADMIN</span> PORTAL
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Restricted root access for multi-gym provisioning & account management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Direct URL Gate</h2>
                <span className="text-[11px] text-slate-400">Security Clearance Level 0</span>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              CONFIDENTIAL
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Master Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="archdevops360@gmail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Master Security Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>AUTHENTICATE & ENTER</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => {
                setEmail('archdevops360@gmail.com');
                setPassword('111111');
                handleSubmit();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>One-Click Superadmin Access</span>
            </button>
          </div>
        </div>

        {/* Bottom Note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          PULSE FIT PLATFORM INFRASTRUCTURE • PRIVILEGED SESSION
        </p>
      </div>
    </div>
  );
};
