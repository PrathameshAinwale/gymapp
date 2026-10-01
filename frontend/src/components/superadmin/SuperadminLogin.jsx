import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Key, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { isValidEmail, hasSqlInjection, sanitizeText } from '../../utils/validation';

export const SuperadminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuickFill = () => {
    setEmail('archdevops360@gmail.com');
    setPassword('111111');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const cleanEmail = sanitizeText(email);
    const cleanPassword = password ? password.trim() : '';

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both Superadmin ID and security password.');
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
      // Authenticate exclusively via backend API & database
      const res = await api.auth.login(cleanEmail, cleanPassword);
      
      if (res?.user) {
        if (res.user.role !== 'superadmin') {
          setError('Access Denied: This account does not possess Superadmin privileges.');
          setIsLoading(false);
          return;
        }
        
        // Pass user and token to parent (never store persistent user so /superadmin prompts every time)
        onLoginSuccess(res.user, res.token);
        return;
      }

      setError('Authentication failed. No user details returned.');
    } catch (err) {
      setError(err.message || 'Invalid Superadmin credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060810] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Decorative Cyber & Mesh Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-cyan-600/15 via-blue-600/10 to-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fadeIn">
        {/* Top Control Center Badge */}
        <div className="text-center mb-6">

          <h1 className="text-3xl font-black tracking-tight text-white font-heading">
            SUPER<span className="text-cyan-400">ADMIN</span> PORTAL
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
            Multi-gym infrastructure, owner management & SaaS plans
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0b101e]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Direct URL Gate</h2>
                <span className="text-[10px] text-slate-400 font-mono">/superadmin Security Check</span>
              </div>
            </div>
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
                Master Admin ID / Email
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
                  placeholder="archdevops360@gmail.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Master Security Password
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
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-mono"
                  placeholder="••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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
        </div>
      </div>
    </div>
  );
};
