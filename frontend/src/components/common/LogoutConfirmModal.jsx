import React from 'react';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LogoutConfirmModal = () => {
  const { isLogoutConfirmOpen, cancelLogout, confirmLogout, currentUser } = useAuth();

  if (!isLogoutConfirmOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        onClick={cancelLogout}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-white border border-slate-200 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 z-10 animate-scaleUp text-center space-y-4 sm:space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={cancelLogout}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <LogOut className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>

        {/* Title and Message */}
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-black text-slate-900 font-heading tracking-tight">
            Log Out Confirmation
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
            Are you sure you want to log out of your <span className="font-semibold text-slate-800">PulseFit</span> account?
          </p>
        </div>


        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
          <button
            type="button"
            onClick={cancelLogout}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 border border-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmLogout}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Yes, Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
