import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Building2,
  Banknote,
  Smartphone,
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
import {
  hasSqlInjection,
  sanitizeDecimal,
  preventNonNumericKey
} from '../../utils/validation';

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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (invoiceFilter !== 'ALL') count++;
    if (paymentMethodFilter !== 'ALL') count++;
    if (startDate) count++;
    if (endDate) count++;
    if (selectedMonth) count++;
    if (activeFilter && activeFilter !== 'ALL') count++;
    return count;
  }, [invoiceFilter, paymentMethodFilter, startDate, endDate, selectedMonth, activeFilter]);

  const handleResetInvoiceFilters = () => {
    setInvoiceFilter('ALL');
    setPaymentMethodFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
    setActiveFilter('ALL');
  };

  // Helper to test if a record date matches selected date range or month
  const matchesDateCriteria = (dateStr) => {
    if (!startDate && !endDate && !selectedMonth) return true;
    if (!dateStr) return false;

    let cleanDate = String(dateStr).split('T')[0].trim();
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(cleanDate)) {
      const parts = cleanDate.split(/[-/]/);
      cleanDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else {
      const parsed = new Date(cleanDate);
      if (!isNaN(parsed.getTime())) {
        const yr = parsed.getFullYear();
        const mo = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        cleanDate = `${yr}-${mo}-${day}`;
      }
    }

    if (selectedMonth) {
      if (!cleanDate.startsWith(selectedMonth)) return false;
    }
    if (startDate && cleanDate < startDate) return false;
    if (endDate && cleanDate > endDate) return false;
    return true;
  };

  // Helper to parse individual invoice payment breakdown
  const parseInvoicePaymentBreakdown = (inv) => {
    const totalAmount = Number(inv.amount) || 0;
    const pm = String(inv.paymentMethod || inv.payment_method || '').trim();
    const pmLower = pm.toLowerCase();

    let cash = 0;
    let upi = 0;
    let accountTransfer = 0;

    if (pmLower.includes('split')) {
      const cashMatch = pm.match(/cash[:\s]+₹?\s*([\d,]+(?:\.\d+)?)/i);
      const upiMatch = pm.match(/(?:upi|gpay|google\s*pay|phonepe|phone\s*pay|online(?:\[.*?\])?)[:\s]+₹?\s*([\d,]+(?:\.\d+)?)/i);
      const accountMatch = pm.match(/(?:account(?:\s*transfer)?|bank(?:\s*transfer)?|neft|imps|cheque|card)[:\s]+₹?\s*([\d,]+(?:\.\d+)?)/i);

      if (cashMatch) cash = parseFloat(cashMatch[1].replace(/,/g, '')) || 0;
      if (upiMatch) upi = parseFloat(upiMatch[1].replace(/,/g, '')) || 0;
      if (accountMatch) accountTransfer = parseFloat(accountMatch[1].replace(/,/g, '')) || 0;

      if (!cash && (inv.splitCash || inv.split_cash)) cash = Number(inv.splitCash || inv.split_cash) || 0;
      if (!upi && (inv.splitOnline || inv.split_online || inv.splitUpi || inv.split_upi)) {
        upi = Number(inv.splitOnline || inv.split_online || inv.splitUpi || inv.split_upi) || 0;
      }
      if (!accountTransfer && (inv.splitAccount || inv.split_account || inv.splitBank || inv.split_bank)) {
        accountTransfer = Number(inv.splitAccount || inv.split_account || inv.splitBank || inv.split_bank) || 0;
      }

      const sumParsed = cash + upi + accountTransfer;
      if (sumParsed === 0) {
        if (pmLower.includes('cash') && (pmLower.includes('online') || pmLower.includes('upi') || pmLower.includes('gpay') || pmLower.includes('phonepe'))) {
          cash = Math.round(totalAmount / 2);
          upi = totalAmount - cash;
        } else if (pmLower.includes('cash')) {
          cash = totalAmount;
        } else if (pmLower.includes('account') || pmLower.includes('bank')) {
          accountTransfer = totalAmount;
        } else {
          upi = totalAmount;
        }
      }
    } else if (pmLower.includes('cash')) {
      cash = totalAmount;
    } else if (
      pmLower === 'upi' ||
      pmLower.includes('upi') ||
      pmLower.includes('gpay') ||
      pmLower.includes('google pay') ||
      pmLower.includes('phonepe') ||
      pmLower.includes('phone pay') ||
      pmLower.includes('phone_pe') ||
      pmLower.includes('paytm') ||
      pmLower.includes('qr') ||
      pmLower.includes('digital')
    ) {
      upi = totalAmount;
    } else if (
      pmLower.includes('account') ||
      pmLower.includes('transfer') ||
      pmLower.includes('bank') ||
      pmLower.includes('neft') ||
      pmLower.includes('imps') ||
      pmLower.includes('rtgs') ||
      pmLower.includes('cheque') ||
      pmLower.includes('card')
    ) {
      accountTransfer = totalAmount;
    } else {
      upi = totalAmount;
    }

    return { totalAmount, cash, upi, accountTransfer };
  };

  // Helper to test if payment method matches filter
  const matchesPaymentFilter = (inv, filter) => {
    if (!filter || filter === 'ALL') return true;
    const pm = (inv.paymentMethod || inv.payment_method || '').toLowerCase();
    const b = parseInvoicePaymentBreakdown(inv);

    if (filter === 'Cash') {
      return b.cash > 0 || (pm.includes('cash') && !pm.includes('split'));
    }
    if (filter === 'UPI') {
      return b.upi > 0 || pm === 'upi' || pm.includes('upi') || pm.includes('gpay') || pm.includes('phonepe') || pm.includes('paytm') || pm.includes('qr');
    }
    if (filter === 'GPay') {
      return pm === 'gpay' || pm.includes('gpay') || pm.includes('google pay');
    }
    if (filter === 'PhonePe') {
      return pm === 'phonepe' || pm.includes('phonepe') || pm.includes('phone pay') || pm.includes('phone_pe');
    }
    if (filter === 'Account Transfer' || filter === 'Account') {
      return b.accountTransfer > 0 || pm.includes('account') || pm.includes('transfer') || pm.includes('bank') || pm.includes('neft') || pm.includes('imps') || pm.includes('rtgs') || pm.includes('cheque');
    }
    if (filter === 'Split') {
      return pm.includes('split');
    }
    if (filter === 'Split: GPay') {
      return pm.includes('split') && (pm.includes('gpay') || pm.includes('google pay'));
    }
    if (filter === 'Split: PhonePe') {
      return pm.includes('split') && (pm.includes('phonepe') || pm.includes('phone pay') || pm.includes('phone_pe'));
    }
    if (filter === 'Split: Account') {
      return pm.includes('split') && (pm.includes('account') || pm.includes('bank') || pm.includes('neft') || pm.includes('imps') || pm.includes('transfer'));
    }
    if (filter === 'Split: Other' || filter === 'Other') {
      return pm.includes('split') &&
        !pm.includes('gpay') && !pm.includes('google pay') &&
        !pm.includes('phonepe') && !pm.includes('phone pay') && !pm.includes('phone_pe') &&
        !pm.includes('account') && !pm.includes('bank') && !pm.includes('neft') && !pm.includes('imps');
    }
    return pm.includes(filter.toLowerCase());
  };

  // Expense Filters & Modal
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Electricity & Utilities',
    vendor: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'UPI',
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
  const totalInflow = currentInflowSum > 0
    ? currentInflowSum
    : (ownerStats?.monthlyRevenue != null && ownerStats.monthlyRevenue > 0
      ? Number(ownerStats.monthlyRevenue)
      : 0);

  // Dynamic Expenses (Cash Outflow) Calculation
  const isFixedCategory = (cat = '') => {
    const c = String(cat).toLowerCase();
    return c.includes('rent') || c.includes('lease') || c.includes('utilit') || c.includes('electric') || c.includes('water') || c.includes('internet') || c.includes('wifi') || c.includes('maintenance') || c.includes('software');
  };

  const fixedExpensesList = gymExpenses.filter((exp) => isFixedCategory(exp.category));
  const fixedCosts = fixedExpensesList.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

  const variableExpensesList = gymExpenses.filter((exp) => !isFixedCategory(exp.category));
  const variableCosts = variableExpensesList.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

  const totalOutflow = gymExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

  // Net Cash Flow (Operating Surplus / Deficit)
  const netProfit = totalInflow - totalOutflow;
  const isProfitable = netProfit >= 0;
  const netCashFlow = Math.max(0, netProfit);
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
  const filteredInvoices = useMemo(() => {
    return gymInvoices
      .filter((inv) => {
        const matchesStatus =
          invoiceFilter === 'ALL' ||
          (invoiceFilter.toLowerCase() === 'paid'
            ? (String(inv.status || '').toLowerCase() === 'paid' && Number(inv.pendingAmount || inv.duesAmount || 0) === 0)
            : (String(inv.status || '').toLowerCase() !== 'paid' || Number(inv.pendingAmount || inv.duesAmount || 0) > 0));

        const term = (memberSearchTerm || '').trim().toLowerCase();
        const matchesMember =
          !term ||
          (inv.memberName || '').toLowerCase().includes(term) ||
          (inv.member_name || '').toLowerCase().includes(term) ||
          (inv.id || '').toLowerCase().includes(term) ||
          (inv.planName || '').toLowerCase().includes(term);

        const invDate = inv.date || inv.invoiceDate || inv.invoice_date || inv.issueDate || inv.issue_date || inv.createdAt || inv.created_at;
        const matchesDate = matchesDateCriteria(invDate);
        const matchesPayment = matchesPaymentFilter(inv, paymentMethodFilter);

        let matchesPreset = true;
        if (activeFilter && activeFilter !== 'ALL') {
          const invDateObj = invDate ? new Date(invDate) : null;
          if (invDateObj && !isNaN(invDateObj.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const target = new Date(invDateObj);
            target.setHours(0, 0, 0, 0);

            if (activeFilter === 'TODAY') {
              matchesPreset = target.getTime() === today.getTime();
            } else if (activeFilter === 'THIS_WEEK') {
              const weekStart = new Date(today);
              weekStart.setDate(today.getDate() - today.getDay());
              matchesPreset = target >= weekStart;
            } else if (activeFilter === 'THIS_MONTH') {
              matchesPreset = target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
            } else if (activeFilter === 'THIS_YEAR') {
              matchesPreset = target.getFullYear() === today.getFullYear();
            }
          }
        }

        return matchesStatus && matchesMember && matchesDate && matchesPayment && matchesPreset;
      })
      .sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
  }, [gymInvoices, invoiceFilter, memberSearchTerm, startDate, endDate, selectedMonth, paymentMethodFilter, activeFilter]);

  // Filtered Expenses
  const filteredExpenses = gymExpenses.filter((exp) => {
    if (expenseCategoryFilter === 'ALL') return true;
    return exp.category === expenseCategoryFilter;
  });

  // Filtered Results Summary Metrics for Total Tab
  const filteredInflowTotal = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  }, [filteredInvoices]);

  const filteredInvoicesCount = filteredInvoices.length;

  const filteredAvgAmount = useMemo(() => {
    if (filteredInvoicesCount === 0) return 0;
    return Math.round(filteredInflowTotal / filteredInvoicesCount);
  }, [filteredInflowTotal, filteredInvoicesCount]);

  const filteredUniqueMembersCount = useMemo(() => {
    const set = new Set();
    filteredInvoices.forEach((inv) => {
      const id = inv.memberId || inv.member_id || inv.userId || inv.user_id || inv.memberName || inv.member_name;
      if (id) set.add(id);
    });
    return set.size;
  }, [filteredInvoices]);

  // Live breakdown across all payment methods for active filters in Financials
  // Dynamically recalculates whenever any filter (Month, Date Range, Status, Payment Mode, Preset, Search) changes
  const paymentBreakdown = useMemo(() => {
    let totalAllPayments = 0;
    let cashTotal = 0;
    let cashCount = 0;
    let upiTotal = 0;
    let upiCount = 0;
    let accountTransferTotal = 0;
    let accountTransferCount = 0;

    filteredInvoices.forEach((inv) => {
      const b = parseInvoicePaymentBreakdown(inv);
      totalAllPayments += b.totalAmount;
      if (b.cash > 0) {
        cashTotal += b.cash;
        cashCount++;
      }
      if (b.upi > 0) {
        upiTotal += b.upi;
        upiCount++;
      }
      if (b.accountTransfer > 0) {
        accountTransferTotal += b.accountTransfer;
        accountTransferCount++;
      }
    });

    return {
      totalAllPayments,
      totalCount: filteredInvoices.length,
      cashTotal,
      cashCount,
      upiTotal,
      upiCount,
      accountTransferTotal,
      accountTransferCount,
    };
  }, [filteredInvoices]);

  const filterSummaryTitle = useMemo(() => {
    const parts = [];
    if (paymentMethodFilter && paymentMethodFilter !== 'ALL') {
      parts.push(`${paymentMethodFilter} Payments`);
    }
    if (invoiceFilter && invoiceFilter !== 'ALL') {
      parts.push(invoiceFilter === 'PAID' ? 'Paid Invoices' : 'Pending Invoices');
    }
    if (selectedMonth) {
      parts.push(`Month: ${selectedMonth}`);
    } else if (startDate || endDate) {
      parts.push(`Range: ${startDate || 'Any'} → ${endDate || 'Any'}`);
    } else if (activeFilter && activeFilter !== 'ALL') {
      const presetMap = {
        TODAY: "Today's",
        THIS_WEEK: "This Week's",
        THIS_MONTH: "This Month's",
        THIS_YEAR: "This Year's"
      };
      parts.push(presetMap[activeFilter] || activeFilter);
    }
    if (memberSearchTerm) {
      parts.push(`Member: "${memberSearchTerm}"`);
    }

    if (parts.length === 0) {
      return 'All Collections';
    }
    return parts.join(' • ');
  }, [paymentMethodFilter, invoiceFilter, selectedMonth, startDate, endDate, activeFilter, memberSearchTerm]);

  const filteredExpenseTotal = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  }, [filteredExpenses]);

  const filteredExpenseAvg = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    return Math.round(filteredExpenseTotal / filteredExpenses.length);
  }, [filteredExpenseTotal, filteredExpenses.length]);

  // Handle Add Expense Submit
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (
      hasSqlInjection(expenseForm.title) ||
      hasSqlInjection(expenseForm.vendor) ||
      hasSqlInjection(expenseForm.receiptRef) ||
      hasSqlInjection(expenseForm.notes)
    ) {
      setExpenseError('Disallowed characters or SQL injection syntax detected.');
      return;
    }
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
        paymentMode: 'UPI',
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
    <div className="space-y-4 animate-fadeIn pb-12 w-full">

      {/* 1. HEADER BANNER */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Revenue & Billing
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Track subscription collections (Cash Inflow), operating expenditures (Cash Outflow), and net gym profitability.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh and sync data directly from database"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="inline sm:hidden">Expense</span>
          </button>
        </div>
      </div>

      {/* 2. CASH INFLOW & OUTFLOW METRIC CARDS (HALF AND HALF FULL WIDTH) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 w-full">
        {/* Total Cash Inflow */}
        <div
          onClick={() => setFinancialTab('inflow')}
          className="group relative bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-2.5 sm:p-3.5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Cash Inflow
              </span>
              <span className="text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 inline-block">
                Subscriptions
              </span>
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-slate-100/80">
            <div className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">
              ₹{totalInflow.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
              <span>View</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Total Cash Outflow */}
        <div
          onClick={() => setFinancialTab('outflow')}
          className="group relative bg-white border border-slate-200 hover:border-rose-300 rounded-xl p-2.5 sm:p-3.5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-1">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Cash Outflow
              </span>
              <span className="text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200 inline-block">
                Overheads & Rent
              </span>
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between pt-1 border-t border-slate-100/80">
            <div className="text-lg sm:text-xl font-black text-rose-600 tracking-tight">
              ₹{totalOutflow.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-rose-700 group-hover:translate-x-0.5 transition-transform">
              <span>View</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 p-1 sm:p-1.5 bg-slate-100 border border-slate-200 rounded-xl sm:rounded-2xl overflow-x-auto no-scrollbar flex-nowrap w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setFinancialTab('cashflow')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${financialTab === 'cashflow'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Overview
        </button>

        <button
          type="button"
          onClick={() => setFinancialTab('inflow')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${financialTab === 'inflow'
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
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${financialTab === 'outflow'
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
                <div className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold truncate">
                  {gymInvoices.length} {gymInvoices.length === 1 ? 'Collection' : 'Collections'} • 100% Tax Compliant
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Fixed Costs</div>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">₹{fixedCosts.toLocaleString('en-IN')}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 truncate">
                  {fixedExpensesList.length > 0 ? `${fixedExpensesList.length} Items (Rent & Power)` : 'Rent & Utilities'}
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Variable Costs</div>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">₹{variableCosts.toLocaleString('en-IN')}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 truncate">
                  {variableExpensesList.length > 0 ? `${variableExpensesList.length} Items (Trainers & Stock)` : 'Trainers & AMC'}
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400">Retained Profit</div>
                <div className={`text-sm sm:text-base font-black mt-0.5 ${isProfitable ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {isProfitable ? `₹${netProfit.toLocaleString('en-IN')}` : `-₹${Math.abs(netProfit).toLocaleString('en-IN')}`}
                </div>
                <div className={`text-[9px] sm:text-[10px] font-semibold ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {netMarginPct}% {isProfitable ? 'Margin' : 'Deficit'}
                </div>
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
                  View All ({gymInvoices.length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-[11px] sm:text-xs">
                {gymInvoices.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No fee payments recorded yet
                  </div>
                ) : (
                  gymInvoices.slice(0, 4).map((inv) => (
                    <div key={inv.id || inv._id || inv.invoiceNumber} className="py-2 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">{inv.memberName || inv.member_name || 'Member'}</div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">{inv.planName || inv.plan_name || 'Membership'} • {inv.date}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-600">
                          +₹{Number(inv.amount).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400">{inv.paymentMethod || inv.payment_mode || 'Paid'}</span>
                      </div>
                    </div>
                  ))
                )}
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
                  View All ({gymExpenses.length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-[11px] sm:text-xs">
                {gymExpenses.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No expense outflows recorded yet
                  </div>
                ) : (
                  gymExpenses.slice(0, 4).map((exp) => (
                    <div key={exp.id || exp._id} className="py-2 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 truncate">{exp.title}</div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">{exp.vendor || exp.category} • {exp.date}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-rose-600">
                          -₹{Number(exp.amount).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-slate-400">{exp.paymentMode || exp.payment_mode || 'Expense'}</span>
                      </div>
                    </div>
                  ))
                )}
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
          <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search member name to view user invoices (e.g. Liam, Aarav)..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs truncate"
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

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 whitespace-nowrap ${
                  activeFiltersCount > 0
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                }`}
              >
                <Filter className={`w-3.5 h-3.5 ${activeFiltersCount > 0 ? 'text-white' : 'text-emerald-600'}`} />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-white text-emerald-700 rounded-full text-[10px] font-black">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {(activeFiltersCount > 0 || memberSearchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    handleResetInvoiceFilters();
                    setMemberSearchTerm('');
                  }}
                  className="px-2.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold cursor-pointer shrink-0 transition-colors whitespace-nowrap"
                  title="Reset all filters & search"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>

              {invoiceFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-medium">
                  Status: {invoiceFilter === 'PAID' ? 'Paid Invoices' : 'Pending / Due'}
                  <button type="button" onClick={() => setInvoiceFilter('ALL')} className="hover:text-emerald-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedMonth && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-medium">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  Month: {selectedMonth}
                  <button type="button" onClick={() => setSelectedMonth('')} className="hover:text-emerald-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(startDate || endDate) && !selectedMonth && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-medium">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  Range: {startDate || 'Any'} → {endDate || 'Any'}
                  <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-emerald-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {paymentMethodFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-800 border border-violet-200 rounded-lg text-[11px] font-medium">
                  Mode: {paymentMethodFilter}
                  <button type="button" onClick={() => setPaymentMethodFilter('ALL')} className="hover:text-violet-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {activeFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-medium">
                  Preset: {activeFilter}
                  <button type="button" onClick={() => setActiveFilter('ALL')} className="hover:text-blue-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetInvoiceFilters}
                className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer ml-1"
              >
                Clear All
              </button>
            </div>
          )}

          {/* 4 LIVE PAYMENT BREAKDOWN CARDS (FULL WIDTH, CENTERED & COMPACT) */}
          <div className="p-2 sm:p-2.5 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-emerald-50/70 border-b border-emerald-100/90 w-full">
            <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              {/* 1. Cash Total */}
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">
                    Cash Total
                  </span>
                  <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <Banknote className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-700 tracking-tight my-0.5">
                  ₹{paymentBreakdown.cashTotal.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 font-medium pt-1 mt-0.5 border-t border-slate-100">
                  <span>{paymentBreakdown.cashCount} {paymentBreakdown.cashCount === 1 ? 'Invoice' : 'Invoices'}</span>
                  <span className="text-slate-400 font-semibold">
                    {paymentBreakdown.totalAllPayments > 0
                      ? `${((paymentBreakdown.cashTotal / paymentBreakdown.totalAllPayments) * 100).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* 2. UPI Total */}
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">
                    UPI Total
                  </span>
                  <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0">
                    <Smartphone className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-blue-700 tracking-tight my-0.5">
                  ₹{paymentBreakdown.upiTotal.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 font-medium pt-1 mt-0.5 border-t border-slate-100">
                  <span>{paymentBreakdown.upiCount} {paymentBreakdown.upiCount === 1 ? 'Invoice' : 'Invoices'}</span>
                  <span className="text-slate-400 font-semibold">
                    {paymentBreakdown.totalAllPayments > 0
                      ? `${((paymentBreakdown.upiTotal / paymentBreakdown.totalAllPayments) * 100).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* 3. Account Transfer Total */}
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">
                    Account Transfer
                  </span>
                  <div className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shrink-0">
                    <Building2 className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-purple-700 tracking-tight my-0.5">
                  ₹{paymentBreakdown.accountTransferTotal.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 font-medium pt-1 mt-0.5 border-t border-slate-100">
                  <span>{paymentBreakdown.accountTransferCount} {paymentBreakdown.accountTransferCount === 1 ? 'Invoice' : 'Invoices'}</span>
                  <span className="text-slate-400 font-semibold">
                    {paymentBreakdown.totalAllPayments > 0
                      ? `${((paymentBreakdown.accountTransferTotal / paymentBreakdown.totalAllPayments) * 100).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
              </div>

              {/* 4. Total of All Payment Options */}
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-emerald-300/80 bg-white shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold text-emerald-800 tracking-wider truncate">
                    Total of All
                  </span>
                  <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight my-0.5">
                  ₹{paymentBreakdown.totalAllPayments.toLocaleString('en-IN')}
                </div>
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 font-medium pt-1 mt-0.5 border-t border-slate-100">
                  <span>{paymentBreakdown.totalCount} {paymentBreakdown.totalCount === 1 ? 'Invoice' : 'Invoices'}</span>
                  <span className="text-emerald-600 font-bold">All Modes</span>
                </div>
              </div>
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
                  {memberSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setMemberSearchTerm('')}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
                    >
                      Clear Search Filter
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
                            {inv.paymentMethod || 'UPI'}
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

          {/* Expense Total Tab */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-rose-50/90 via-pink-50/50 to-white border-b border-rose-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                    {expenseCategoryFilter === 'ALL' ? 'All Operating Expenses' : `${expenseCategoryFilter} Expenses`} Total Tab
                  </span>
                  {expenseCategoryFilter !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-2xs">
                      Filtered Category
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    ₹{filteredExpenseTotal.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Total Outflow ({totalOutflow > 0 ? ((filteredExpenseTotal / totalOutflow) * 100).toFixed(1) : 100}% of Overheads)
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block truncate">
                  Total Fields / Records
                </span>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                  {filteredExpenses.length} <span className="text-[10px] font-medium text-slate-500">Expenses</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block truncate">
                  Average Outflow
                </span>
                <div className="text-sm sm:text-base font-black text-rose-700 mt-0.5">
                  ₹{filteredExpenseAvg.toLocaleString('en-IN')}
                </div>
              </div>
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
                  step="any"
                  inputMode="decimal"
                  value={expenseForm.amount}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: sanitizeDecimal(e.target.value) })}
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
                <option value="UPI">UPI</option>
                <option value="GPay">GPay</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Account Transfer">Account Transfer</option>
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
                <span>Add Expense</span>
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

      {/* ADVANCED INVOICE FILTER MODAL */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div
            onClick={() => setShowFilterModal(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fadeIn"
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-scaleUp my-auto max-h-[88vh]"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Filter Revenue & Invoices</h3>
                  <p className="text-xs text-slate-500">Apply status, month selection, date ranges, and payment modes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Quick Time Range Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Quick Time Presets
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'ALL', label: 'All Time' },
                    { id: 'TODAY', label: 'Today' },
                    { id: 'THIS_WEEK', label: 'This Week' },
                    { id: 'THIS_MONTH', label: 'This Month' },
                    { id: 'THIS_YEAR', label: 'This Year' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setActiveFilter(preset.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        activeFilter === preset.id
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Invoice Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Statuses' },
                    { id: 'PAID', label: 'Paid Invoices' },
                    { id: 'PENDING', label: 'Pending / Due' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setInvoiceFilter(st.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        invoiceFilter.toUpperCase() === st.id.toUpperCase()
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month Selection */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Month Selection</span>
                  <span className="text-[11px] font-normal text-slate-400">View entire month's billing</span>
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    if (e.target.value) {
                      setStartDate(`${e.target.value}-01`);
                      const [yr, mo] = e.target.value.split('-').map(Number);
                      const lastDay = new Date(yr, mo, 0).getDate();
                      setEndDate(`${e.target.value}-${String(lastDay).padStart(2, '0')}`);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: 'Current Month', value: new Date().toISOString().slice(0, 7) },
                    { label: 'Last Month', value: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7) },
                  ].map((mPreset) => (
                    <button
                      key={mPreset.value}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(mPreset.value);
                        setStartDate(`${mPreset.value}-01`);
                        const [yr, mo] = mPreset.value.split('-').map(Number);
                        const lastDay = new Date(yr, mo, 0).getDate();
                        setEndDate(`${mPreset.value}-${String(lastDay).padStart(2, '0')}`);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                        selectedMonth === mPreset.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mPreset.label}
                    </button>
                  ))}
                  {selectedMonth && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonth('');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium cursor-pointer"
                    >
                      Clear Month
                    </button>
                  )}
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Custom Date Range
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">Start Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setSelectedMonth('');
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">End Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setSelectedMonth('');
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Invoice Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Statuses' },
                    { id: 'PAID', label: 'Paid Invoices' },
                    { id: 'PENDING', label: 'Pending / Due' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setInvoiceFilter(st.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        invoiceFilter.toUpperCase() === st.id.toUpperCase()
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Mode & Split Settlement Filter */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Payment Mode & Split Settlement
                  </label>
                  <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                    Online Platforms
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'ALL', label: 'All Modes' },
                    { id: 'UPI', label: 'UPI' },
                    { id: 'GPay', label: 'GPay' },
                    { id: 'PhonePe', label: 'PhonePe' },
                    { id: 'Account Transfer', label: 'Account' },
                    { id: 'Cash', label: 'Cash' },
                    { id: 'Split', label: 'All Split' },
                    { id: 'Split: GPay', label: 'Split (GPay)' },
                    { id: 'Split: PhonePe', label: 'Split (PhonePe)' },
                    { id: 'Split: Account', label: 'Split (Account)' },
                    { id: 'Split: Other', label: 'Split (Other)' },
                  ].map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethodFilter(pm.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        paymentMethodFilter === pm.id
                          ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Filter Total Tab in Modal */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Total Tab ({filterSummaryTitle})</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                    {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Record' : 'Records'} Matched
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Filtered Amount
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      ₹{filteredInflowTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Average Ticket Value
                    </span>
                    <span className="text-sm font-black text-emerald-800">
                      ₹{filteredAvgAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={handleResetInvoiceFilters}
                className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Apply Filters (₹{filteredInflowTotal.toLocaleString('en-IN')} • {filteredInvoices.length} invoices)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
