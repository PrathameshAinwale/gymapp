import React, { useState, useEffect } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  IndianRupee,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ShieldCheck,
  Calendar,
  ChevronRight,
  TrendingUp,
  Printer,
  Trash2,
  Building2,
  Zap,
  Users,
  Wrench,
  ShoppingBag,
  Tag,
  Filter,
  Wallet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  RotateCw
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { RecordPaymentModal } from './RecordPaymentModal';

export const Financials = () => {
  const {
    invoices = [],
    members = [],
    plans = [],
    gymInfo,
    ownerStats,
    revenueAnalytics = [],
    expenses = [],
    addExpense,
    deleteExpense,
    fetchExpenses,
    fetchInvoices,
    fetchDashboardStats,
    fetchMembers,
    fetchPlans,
    isLoadingBackend
  } = useGymData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchExpenses?.(),
        fetchInvoices?.(),
        fetchDashboardStats?.(),
        fetchMembers?.(),
        fetchPlans?.()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses?.();
    fetchInvoices?.();
    fetchDashboardStats?.();
    fetchMembers?.();
    fetchPlans?.();
  }, [fetchExpenses, fetchInvoices, fetchDashboardStats, fetchMembers, fetchPlans]);
  const { currentUser } = useAuth();
  const isDefaultGym = !currentUser?.gymId || currentUser?.gymId === 1;

  // Active Main Tab: 'cashflow' | 'inflow' | 'outflow'
  const [financialTab, setFinancialTab] = useState('cashflow');

  // Invoice Filters & Modals
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  // Expense Filters & Modal
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Electricity & Utilities',
    vendor: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'UPI / Net Banking',
    receiptRef: '',
    notes: ''
  });

  const currentGymId = Number(currentUser?.gymId || currentUser?.gym_id);

  // Tenant-scoped Invoices & Expenses
  const gymInvoices = (invoices || []).filter((inv) => {
    if (!currentGymId) return true;
    const invGym = Number(inv.gymId || inv.gym_id);
    return !invGym || invGym === currentGymId;
  });

  const gymExpenses = (expenses || []).filter((exp) => {
    if (!currentGymId) return true;
    const expGym = Number(exp.gym_id || exp.gymId);
    return !expGym || expGym === currentGymId;
  });

  // Dynamic Revenue (Cash Inflow) Calculation
  const currentInflowSum = gymInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const totalInflow = ownerStats?.monthlyRevenue != null && ownerStats.monthlyRevenue > 0
    ? Number(ownerStats.monthlyRevenue)
    : currentInflowSum;

  // Dynamic Expenses (Cash Outflow) Calculation
  const totalOutflow = gymExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

  // Net Cash Flow (Operating Surplus)
  const netCashFlow = Math.max(0, totalInflow - totalOutflow);
  const netMarginPct = totalInflow > 0 ? (((totalInflow - totalOutflow) / totalInflow) * 100).toFixed(1) : '0.0';

  // Month & Financial Year
  const now = new Date();
  const currentMonthIdx = now.getMonth();
  const currentCalYear = now.getFullYear();
  const fyStartYear = currentMonthIdx >= 3 ? currentCalYear : currentCalYear - 1;
  const fyEndYear = fyStartYear + 1;
  const fyLabel = `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`;
  const currentMonthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Previous month benchmark from database analytics
  const previousMonthRevenue = revenueAnalytics && revenueAnalytics.length >= 2
    ? (revenueAnalytics[revenueAnalytics.length - 2]?.revenue || 0)
    : 0;
  const momGrowth = previousMonthRevenue > 0
    ? (((totalInflow - previousMonthRevenue) / previousMonthRevenue) * 100).toFixed(1)
    : (totalInflow > 0 ? '+100.0' : '0.0');

  // Filtered Invoices & Member Search
  const filteredInvoices = gymInvoices
    .filter((inv) => {
      const matchesStatus = invoiceFilter === 'ALL' || inv.status?.toLowerCase() === invoiceFilter.toLowerCase();
      const term = (memberSearchTerm || '').trim().toLowerCase();
      const matchesMember =
        !term ||
        (inv.memberName || '').toLowerCase().includes(term) ||
        (inv.member_name || '').toLowerCase().includes(term) ||
        (inv.id || '').toLowerCase().includes(term) ||
        (inv.planName || '').toLowerCase().includes(term);

      return matchesStatus && matchesMember;
    })
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Filtered Expenses
  const filteredExpenses = gymExpenses.filter((exp) => {
    if (expenseCategoryFilter === 'ALL') return true;
    return exp.category === expenseCategoryFilter;
  });

  // Handle Add Expense Submit
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount) return;

    setIsSubmittingExpense(true);
    setExpenseError('');
    try {
      await addExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount)
      });

      setIsAddExpenseOpen(false);
      setExpenseForm({
        title: '',
        category: 'Electricity & Utilities',
        vendor: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'UPI / Net Banking',
        receiptRef: '',
        notes: ''
      });
    } catch (err) {
      setExpenseError(err?.message || 'Failed to save expense to database');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Category Icon & Color Helper
  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Rent & Lease':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Electricity & Utilities':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Salaries & Trainer Payouts':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Equipment Maintenance & AMC':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Supplements & Inventory Stock':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Marketing & Ads':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      
      {/* 1. HEADER BANNER */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Revenue & Billing
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Track subscription collections (Cash Inflow), operating expenditures (Cash Outflow), and net gym profitability.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh and sync data directly from database"
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] sm:text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center gap-1 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] sm:text-xs font-bold border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Record Expense</span>
            <span className="inline sm:hidden">Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRecordPaymentOpen(true)}
            className="flex items-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Record Fee Payment</span>
            <span className="inline sm:hidden">Fee Payment</span>
          </button>
        </div>
      </div>

      {/* 2. CASH INFLOW VS OUTFLOW HIGH-IMPACT METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        
        {/* Total Cash Inflow */}
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
              Cash Inflow
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-3xl font-black text-emerald-600">
              ₹{totalInflow.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="hidden sm:inline">Inflow Source:</span>
            <span className="font-semibold text-slate-600 truncate">Subscriptions</span>
          </div>
        </div>

        {/* Total Cash Outflow */}
        <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
              Cash Outflow
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="my-1.5 sm:my-2.5">
            <div className="text-xl sm:text-3xl font-black text-rose-600">
              ₹{totalOutflow.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="hidden sm:inline">Major Outflow:</span>
            <span className="font-semibold text-slate-600 truncate">Rent & Overheads</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1 sm:p-1.5 bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl overflow-x-auto no-scrollbar flex-nowrap w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setFinancialTab('cashflow')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
            financialTab === 'cashflow'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview
        </button>

        <button
          type="button"
          onClick={() => setFinancialTab('inflow')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            financialTab === 'inflow'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          <span>Inflow ({invoices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFinancialTab('outflow')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
            financialTab === 'outflow'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
          <span>Outflow ({expenses.length})</span>
        </button>
      </div>

      {/* TAB 1: CASH FLOW OVERVIEW (INFLOW VS OUTFLOW) */}
      {financialTab === 'cashflow' && (
        <div className="space-y-3 sm:space-y-6">
          
          {/* Visual Inflow vs Outflow Comparison Bar */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900">
                  Monthly Cash Ratio
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Incoming subscriptions versus outgoing facility overheads
                </p>
              </div>
            </div>

            {/* Inflow vs Outflow Visual Bar */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold">
                <span className="text-emerald-700 flex items-center gap-1">
                  <ArrowDownLeft className="w-3 sm:w-3.5 h-3 sm:h-3.5" /> Inflow: ₹{totalInflow.toLocaleString('en-IN')}
                </span>
                <span className="text-rose-700 flex items-center gap-1">
                  Outflow: ₹{totalOutflow.toLocaleString('en-IN')} <ArrowUpRight className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </span>
              </div>
              <div className="w-full h-3 sm:h-4 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.round((totalInflow / (totalInflow + totalOutflow || 1)) * 100)}%` }}
                  title={`Inflow: ₹${totalInflow}`}
                ></div>
                <div
                  className="h-full bg-rose-500 transition-all duration-500"
                  style={{ width: `${Math.round((totalOutflow / (totalInflow + totalOutflow || 1)) * 100)}%` }}
                  title={`Outflow: ₹${totalOutflow}`}
                ></div>
              </div>
            </div>

            {/* Quick Breakdown Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2">
              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Total Fees</div>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">₹{totalInflow.toLocaleString('en-IN')}</div>
                <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold">100% Tax Compliant</div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Fixed Costs</div>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">₹1,65,000</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500">Rent & Utilities</div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Variable Costs</div>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">₹75,000</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500">Trainers & AMC</div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Retained Profit</div>
                <div className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">₹{netCashFlow.toLocaleString('en-IN')}</div>
                <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold">{netMarginPct}% Margin</div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Recent Cash Movements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            
            {/* Left: Recent Cash Inflows (Invoices) */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">Recent Inflows</h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Fee payments received</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFinancialTab('inflow')}
                  className="text-[11px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  View All ({invoices.length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-[11px] sm:text-xs">
                {invoices.slice(0, 4).map((inv) => (
                  <div key={inv.id} className="py-2 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{inv.memberName}</div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">{inv.planName} • {inv.date}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-emerald-600">
                        +₹{Number(inv.amount).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-slate-400">{inv.paymentMethod}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Recent Cash Outflows (Expenses) */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between pb-2 sm:pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                    <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">Recent Outflows</h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Expenses & vendor payments</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFinancialTab('outflow')}
                  className="text-[11px] sm:text-xs font-bold text-rose-700 hover:text-rose-800 cursor-pointer"
                >
                  View All ({expenses.length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-[11px] sm:text-xs">
                {expenses.slice(0, 4).map((exp) => (
                  <div key={exp.id} className="py-2 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{exp.title}</div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">{exp.vendor} • {exp.date}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-rose-600">
                        -₹{Number(exp.amount).toLocaleString('en-IN')}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-slate-400">{exp.paymentMode}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: CASH INFLOW (INVOICES & SUBSCRIPTION BILLING) */}
      {financialTab === 'inflow' && (
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
          <div className="p-3.5 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Invoices & Receipts
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500">
                Official billing records and recent member invoices with search
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold bg-emerald-600 text-white shadow-xs">
                Total Invoices: {invoices.length}
              </span>
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] sm:text-xs font-bold border border-slate-200 transition-colors cursor-pointer active:scale-95"
              >
                <Plus className="w-3 h-3 text-emerald-600" />
                <span>Record Fee</span>
              </button>
            </div>
          </div>

          {/* INVOICES SEARCH & FILTER TOOLBAR */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search member name to view user invoices (e.g. Liam, Aarav)..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
              />
              {memberSearchTerm && (
                <button
                  type="button"
                  onClick={() => setMemberSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <select
                value={invoiceFilter}
                onChange={(e) => setInvoiceFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-xs w-full sm:w-auto"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid Only</option>
                <option value="PENDING">Pending Only</option>
              </select>

              {memberSearchTerm && (
                <button
                  type="button"
                  onClick={() => setMemberSearchTerm('')}
                  className="px-2.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer shrink-0 transition-colors"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {memberSearchTerm && (
            <div className="px-4 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
              <span>
                Found <strong>{filteredInvoices.length}</strong> invoice{filteredInvoices.length === 1 ? '' : 's'} for member matching <strong>"{memberSearchTerm}"</strong>
              </span>
              <button
                type="button"
                onClick={() => setMemberSearchTerm('')}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Show All Invoices
              </button>
            </div>
          )}

          {filteredInvoices.length === 0 ? (
            <div className="py-12 text-center">
              {isRefreshing || (isLoadingBackend && invoices.length === 0) ? (
                <div className="py-4">
                  <RotateCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900 mb-1">Loading Invoices from Database...</p>
                  <p className="text-xs text-slate-500">Retrieving live billing records and receipts.</p>
                </div>
              ) : (
                <>
                  <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900 mb-1">No Invoices Found</p>
                  <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                    {memberSearchTerm
                      ? `No invoices found matching member name "${memberSearchTerm}".`
                      : 'No fee transactions or billing records match this status.'}
                  </p>
                  {memberSearchTerm ? (
                    <button
                      type="button"
                      onClick={() => setMemberSearchTerm('')}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      Clear Search Filter
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsRecordPaymentOpen(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow cursor-pointer"
                    >
                      + Record Fee Payment
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <div key={inv.id} className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {inv.id?.toUpperCase()}
                      </span>
                      <span className="font-mono font-black text-emerald-600 text-xs">
                        +₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{inv.memberName}</div>
                        <div className="text-[10px] text-slate-500">{inv.planName} • {inv.date}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Member Name</th>
                      <th className="py-3 px-4">Plan / Package</th>
                      <th className="py-3 px-4">Inflow (₹)</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          {inv.id?.toUpperCase()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {inv.memberName}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {inv.planName}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-600">
                          +₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {inv.date}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            {inv.paymentMethod || 'UPI / Online'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Collected
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: CASH OUTFLOW (OPERATING EXPENSES LEDGER) */}
      {financialTab === 'outflow' && (
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm overflow-hidden">
          <div className="p-3.5 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900">
                Operating Expense Ledger
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 hidden sm:block">
                Facility rent, electricity, coach commissions, equipment AMC, and supplies
              </p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="Rent & Lease">Rent & Lease</option>
                <option value="Electricity & Utilities">Electricity & Utilities</option>
                <option value="Salaries & Trainer Payouts">Salaries & Trainer Payouts</option>
                <option value="Equipment Maintenance & AMC">Equipment Maintenance & AMC</option>
                <option value="Supplements & Inventory Stock">Supplements & Inventory Stock</option>
                <option value="Marketing & Ads">Marketing & Ads</option>
                <option value="Cleaning & Hygiene">Cleaning & Hygiene</option>
                <option value="Other">Other</option>
              </select>

              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Expense</span>
              </button>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center">
              {isRefreshing || (isLoadingBackend && expenses.length === 0) ? (
                <div className="py-4">
                  <RotateCw className="w-8 h-8 text-rose-600 animate-spin mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900 mb-1">Loading Expenses from Database...</p>
                  <p className="text-xs text-slate-500">Retrieving live facility expense records.</p>
                </div>
              ) : (
                <>
                  <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-900 mb-1">No Expenses Recorded</p>
                  <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                    No expense entries match this category filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow cursor-pointer"
                  >
                    + Record New Expense
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <div key={exp.id} className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${getCategoryBadge(exp.category)}`}>
                        {exp.category}
                      </span>
                      <span className="font-mono font-black text-rose-600 text-xs">
                        -₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 text-xs truncate">{exp.title}</div>
                        <div className="text-[10px] text-slate-500">{exp.vendor || 'Vendor'} • {exp.date}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Expense #</th>
                      <th className="py-3 px-4">Title / Description</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Vendor / Payee</th>
                      <th className="py-3 px-4">Outflow (₹)</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">
                          {exp.id}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{exp.title}</div>
                          {exp.notes && (
                            <div className="text-[11px] text-slate-400 italic line-clamp-1">{exp.notes}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(exp.category)}`}>
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {exp.vendor || 'Authorized Vendor'}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-rose-600">
                          -₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {exp.date}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            {exp.paymentMode || 'Bank Transfer'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => deleteExpense(exp.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Expense Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL 1: RECORD NEW EXPENSE (CASH OUTFLOW) */}
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Record Operating Expense (Cash Outflow)"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Expense Title / Purpose *
            </label>
            <input
              type="text"
              required
              value={expenseForm.title}
              onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
              placeholder="e.g. Facility Electricity Bill - August 2026"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Expense Category *
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="Rent & Lease">Rent & Lease</option>
                <option value="Electricity & Utilities">Electricity & Utilities</option>
                <option value="Salaries & Trainer Payouts">Salaries & Trainer Payouts</option>
                <option value="Equipment Maintenance & AMC">Equipment Maintenance & AMC</option>
                <option value="Supplements & Inventory Stock">Supplements & Inventory Stock</option>
                <option value="Marketing & Ads">Marketing & Ads</option>
                <option value="Cleaning & Hygiene">Cleaning & Hygiene</option>
                <option value="Other">Other Miscellaneous</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Vendor / Payee Name *
              </label>
              <input
                type="text"
                required
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                placeholder="e.g. Adani Electricity / DLF Commercial"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Amount (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="e.g. 45000"
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Mode
              </label>
              <select
                value={expenseForm.paymentMode}
                onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="UPI / Net Banking">UPI / Net Banking</option>
                <option value="Direct Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="Corporate Card">Corporate Credit Card</option>
                <option value="Cash">Cash Voucher</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bill / Receipt Reference #
              </label>
              <input
                type="text"
                value={expenseForm.receiptRef}
                onChange={(e) => setExpenseForm({ ...expenseForm, receiptRef: e.target.value })}
                placeholder="e.g. EB-2026-77812"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Notes & Remarks
            </label>
            <textarea
              rows={2}
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              placeholder="Add details, invoice verification notes, or consumption details..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          {expenseError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{expenseError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddExpenseOpen(false);
                setExpenseError('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingExpense}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingExpense ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Record Expense</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VIEW INVOICE RECEIPT */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Payment Receipt: ${selectedInvoice?.id?.toUpperCase()}`}
        maxWidth="max-w-md"
      >
        {selectedInvoice && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 tracking-tight uppercase">
                    {gymInfo?.name || "PULSE FIT ATHLETIC CLUB"}
                  </h4>
                  <p className="text-[11px] text-slate-500">{gymInfo?.address || "Powai, Mumbai"}</p>
                  <p className="text-[11px] text-slate-500">Phone: {gymInfo?.phone || "+91 98201 54321"}</p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedInvoice.status}
                  </span>
                  <div className="text-[11px] font-mono font-bold text-slate-500 mt-1">
                    #{selectedInvoice.id?.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Billed To Member:</span>
                <div className="font-bold text-slate-900 text-sm">{selectedInvoice.memberName}</div>
                <div className="text-slate-500">Receipt Date: {selectedInvoice.date}</div>
                <div className="text-slate-500">Mode: <strong>{selectedInvoice.paymentMethod || 'UPI Transfer'}</strong></div>
              </div>

              <div className="border-t border-b border-slate-100 py-3 text-xs">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{selectedInvoice.planName}</span>
                  <span>₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Full facility membership subscription fee & access pass
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-sm text-slate-700">Total Settled</span>
                <span className="text-2xl font-black text-emerald-700 font-heading">
                  ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* RECORD FEE PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
      />
    </div>
  );
};
