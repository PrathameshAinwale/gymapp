import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { isValidEmail, hasSqlInjection, sanitizeText } from '../../utils/validation';

export const SuperadminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const cleanEmail = sanitizeText(email);
    const cleanPassword = password ? password.trim() : '';

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both Superadmin email and password.');
      return;
    }

    if (hasSqlInjection(cleanEmail) || hasSqlInjection(cleanPassword)) {
      setError('Security Warning: Disallowed characters or potential SQL injection detected.');
      return;
    }

    if (cleanEmail.includes('@') && !isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.auth.login(cleanEmail, cleanPassword);
      
      if (res?.user) {
        if (res.user.role !== 'superadmin') {
          setError('Access Denied: This account does not possess Superadmin privileges.');
          setIsLoading(false);
          return;
        }
        
        onLoginSuccess(res.user, res.token);
        return;
      }

      setError('Authentication failed. No user details returned.');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('aborted') || msg.includes('Failed to fetch') || msg.includes('Network error') || msg.includes('Load failed')) {
        setError('Unable to reach backend server (127.0.0.1:8000). Please ensure Laravel server is running: php artisan serve');
      } else {
        setError(msg || 'Invalid Superadmin credentials. Please verify your email and password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 text-slate-800 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-indigo-600 selection:text-white">
      {/* Ambient Radial Soft Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-200/40 via-purple-200/30 to-sky-200/30 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-violet-200/30 rounded-full blur-[110px] pointer-events-none" />

      {/* Subtle Micro-Grid */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)', backgroundSize: '32px 32px' }}
      />

      <div className="w-full max-w-md z-10 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center mb-7">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-3 mx-auto mb-3 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <ShieldCheck className="w-full h-full" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-heading">
            SUPER<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">ADMIN</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed font-medium">
            Sign in to access platform orchestration and facility management
          </p>
        </div>

        {/* Login Card in Light Theme */}
        <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.12)] relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-xs animate-shake shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold leading-tight">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Superadmin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans shadow-sm"
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono shadow-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
