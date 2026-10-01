import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import archFitLogoImg from '../../assets/archfit-logo.png';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  AlertCircle,
  Dumbbell,
  CheckCircle2,
  Activity,
  Sparkles,
  ShieldCheck,
  Receipt,
  Users,
  Zap,
  ArrowRight,
  Smartphone
} from 'lucide-react';
import { isValidEmail, hasSqlInjection, sanitizeText } from '../../utils/validation';

export const LoginPage = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage('');

    const cleanLogin = sanitizeText(username);
    const cleanPassword = password ? password.trim() : '';

    if (!cleanLogin || !cleanPassword) {
      setErrorMessage('Please enter both username/email/mobile and password.');
      return;
    }

    if (hasSqlInjection(cleanLogin) || hasSqlInjection(cleanPassword)) {
      setErrorMessage('Security Warning: Disallowed characters detected.');
      return;
    }

    if (cleanLogin.includes('@') && !isValidEmail(cleanLogin)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(cleanLogin, cleanPassword);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to authenticate');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = (userStr, passStr) => {
    setUsername(userStr);
    setPassword(passStr);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-slate-800 relative overflow-hidden">
      {/* Background Decorative Emerald Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card (Matching ArchFit Emerald & Slate Aesthetics) */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 animate-fadeIn">
        
        {/* LEFT COLUMN: Login Form (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Brand Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-900 p-2 flex items-center justify-center shadow-sm">
                <img
                  src={archFitLogoImg}
                  alt="ArchFit"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-slate-900 tracking-tight">ARCHFIT</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Gym Management System</p>
              </div>
            </div>

            {/* Welcome Heading */}
            <div className="space-y-1 mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-normal">
                Enter your credentials to access your dashboard.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Username / Mobile / Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number / Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    id="login-identifier"
                    autoComplete="username"
                    placeholder="e.g. 9876543210 or owner@archfit.in"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Login Button (Emerald Theme) */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Brand Showcase & Features (5 cols, Signature Emerald Dark) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white p-8 sm:p-10 flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Rings */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Brand Tag */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            </span>
          </div>

          {/* Center Graphic: Animated Application Logo & Orbiting Rings */}
          <div className="relative z-10 my-auto py-8 flex flex-col items-center justify-center text-center">
            {/* Animated Logo Container with Multi-layer Glow & Rings */}
            <div className="relative flex items-center justify-center mb-6">
              {/* Outer Ambient Glow Aura */}
              <div className="absolute w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-400/25 to-emerald-300/15 blur-2xl animate-pulse pointer-events-none" />

              {/* Outer Slow-Rotating Dashed Orbit Ring */}
              <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-dashed border-emerald-400/30 animate-spin [animation-duration:30s] pointer-events-none" />

              {/* Inner Counter-Rotating Orbit Ring with Satellite Nodes */}
              <div className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-emerald-400/20 animate-spin [animation-duration:18s] [animation-direction:reverse] pointer-events-none">
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/60" />
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-teal-300 shadow-md shadow-teal-300/60" />
              </div>

              {/* Floating Chip 1 (Top Left) */}
              <div className="absolute -top-3 -left-6 sm:-left-10 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-400/30 shadow-lg backdrop-blur-md animate-bounce [animation-duration:3s]">
                <span className="text-[10px] font-bold text-emerald-200">Member App</span>
              </div>

              {/* Floating Chip 2 (Bottom Right) */}
              <div className="absolute -bottom-3 -right-6 sm:-right-8 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-400/30 shadow-lg backdrop-blur-md animate-bounce [animation-duration:3.5s]">
                <span className="text-[10px] font-bold text-emerald-200">Trainer App</span>
              </div>

              {/* Main Glowing Logo Card */}
              <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-b from-slate-900/90 to-emerald-950/90 border-2 border-emerald-400/40 shadow-2xl shadow-emerald-500/30 backdrop-blur-xl flex items-center justify-center p-5 group hover:scale-105 transition-transform duration-500">
                <img
                  src={archFitLogoImg}
                  alt="ArchFit Application Logo"
                  className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(16,185,129,0.4)] animate-pulse [animation-duration:4s]"
                />
              </div>
            </div>

            {/* Application Branding & Typography */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  ARCHFIT
                </h2>
              </div>
              <p className="text-xs sm:text-sm font-medium text-emerald-100/80 max-w-xs">
                Unified Platform for Owners, Trainers & Members
              </p>
            </div>

            {/* High-Impact Capabilities Badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-4">
              <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-semibold text-emerald-200 backdrop-blur-xs flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-emerald-400" />
                <span>Mobile App Support</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-semibold text-emerald-200 backdrop-blur-xs flex items-center gap-1">
                <Receipt className="w-3 h-3 text-emerald-400" />
                <span>WhatsApp Receipts</span>
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-semibold text-emerald-200 backdrop-blur-xs flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>Multi-Role Access</span>
              </span>
            </div>
          </div>

          {/* Bottom Security / Trust Footer */}
        </div>
      </div>

      {/* Forgot Password Dialog (Styled with Emerald Theme) */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl border border-emerald-100 shadow-2xs">
              🔑
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Forgot Password?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                To reset your account password, please contact your gym manager or reception desk. They will verify your account and provide you with a new password instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Register New Member Dialog (Styled with Emerald Theme) */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl border border-emerald-100 shadow-2xs">
              🏋️
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Join ArchFit</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                New member accounts are provisioned during registration at our gym front desk. Please visit reception to pick your membership package and get your login pass!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRegisterModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition-all shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
