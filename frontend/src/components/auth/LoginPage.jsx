import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PulseFitLogo } from '../common/PulseFitLogo';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Award,
  Zap
} from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();

  const [email, setEmail] = useState('owner@pulsefit.in');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to authenticate');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-6 sm:py-8 relative overflow-hidden bg-ambient-grid">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-1/6 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/4 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-4 sm:space-y-5">
        
        {/* Brand Header */}
        <div className="text-center py-0.5">
          <PulseFitLogo variant="full" size="md" animate={true} />
        </div>

        {/* Login Form Card */}
        <div className="bg-white p-5 sm:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl relative space-y-3.5 sm:space-y-4">
          


          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email / Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@pulsefit.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white text-xs font-bold tracking-wider uppercase shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all duration-200 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill for All 3 Roles */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-emerald-600" /> INSTANT DEMO PROFILES:
              </span>
              <span className="text-[10px] text-slate-400">1-click fill</span>
            </div>

            {/* Owner Option */}
            <button
              type="button"
              onClick={() => handleQuickDemoFill('owner@pulsefit.in', 'admin123')}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer group flex items-center justify-between active:scale-[0.98] min-h-[48px] ${
                email === 'owner@pulsefit.in'
                  ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/40'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Gym Owner & Admin
                </div>
                <div className="text-[10px] text-slate-500 font-mono">owner@pulsefit.in</div>
              </div>
              <div className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                admin123
              </div>
            </button>

            {/* Trainer Option */}
            <button
              type="button"
              onClick={() => handleQuickDemoFill('trainer@pulsefit.in', 'trainer123')}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer group flex items-center justify-between active:scale-[0.98] min-h-[48px] ${
                email === 'trainer@pulsefit.in'
                  ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400/40'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-teal-600" /> Personal Trainer / Coach
                </div>
                <div className="text-[10px] text-slate-500 font-mono">trainer@pulsefit.in</div>
              </div>
              <div className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-mono text-[10px] font-bold">
                trainer123
              </div>
            </button>

            {/* Member Option */}
            <button
              type="button"
              onClick={() => handleQuickDemoFill('member@pulsefit.in', 'member123')}
              className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer group flex items-center justify-between active:scale-[0.98] min-h-[48px] ${
                email === 'member@pulsefit.in'
                  ? 'bg-cyan-50 border-cyan-300 ring-1 ring-cyan-400/40'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-600" /> Athlete Club Member
                </div>
                <div className="text-[10px] text-slate-500 font-mono">member@pulsefit.in</div>
              </div>
              <div className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-mono text-[10px] font-bold">
                member123
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
