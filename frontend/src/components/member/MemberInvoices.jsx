import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { CreditCard, CheckCircle, Download, FileText } from 'lucide-react';

export const MemberInvoices = () => {
  const { currentUser } = useAuth();
  const { invoices } = useGymData();

  const myInvoices = invoices.filter(
    (inv) =>
      String(inv.memberId) === String(currentUser?.id) ||
      String(inv.userId) === String(currentUser?.id) ||
      String(inv.user_id) === String(currentUser?.id)
  );

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-16 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold font-heading text-slate-900 tracking-tight truncate">
              Invoices & Billing History
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            View subscription transaction receipts and download official payment vouchers.
          </p>
        </div>
      </div>

      {/* Invoice Records */}
      <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
        <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900">
          Payment Receipts ({myInvoices.length})
        </h3>

        {myInvoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No payment receipts on record yet.
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {myInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-heading font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {inv.planName}
                    </h4>
                    <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                      Invoice #{inv.id?.toUpperCase()} • Paid on {inv.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200">
                  <div className="text-left sm:text-right">
                    <div className="text-sm sm:text-base font-black text-slate-900 font-heading">
                      ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700">
                      {inv.paymentMethod || 'UPI / Net Banking'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-2xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
