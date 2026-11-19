import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { SearchInput } from '../common/SearchInput';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  Users,
  IndianRupee,
  CalendarCheck,
  Dumbbell,
  Wallet,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  BarChart3,
  RotateCw,
  Receipt,
  X
} from 'lucide-react';
import { formatDateDisplay } from '../../utils/dateUtils';

export const ReportsManager = ({ setActiveTab }) => {
  const {
    members = [],
    invoices = [],
    expenses = [],
    attendance = [],
    ptSessions = [],
    payrollRecords = [],
    advanceRequests = [],
    trainers = [],
    calculateMemberStatus,
    fetchAllFromBackend,
    addToast
  } = useGymData();

  const { currentUser } = useAuth();
  const currentGymId = currentUser?.gymId || currentUser?.gym_id || localStorage.getItem('pulsefit_gym_id');

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!members || members.length === 0) {
      fetchAllFromBackend?.(true);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllFromBackend?.(true);
    setIsRefreshing(false);
  };

  // Scoped datasets by currentGymId
  const gymMembers = useMemo(() => {
    if (!currentGymId) return members;
    return members.filter(m => !m.gymId || String(m.gymId) === String(currentGymId));
  }, [members, currentGymId]);

  const gymInvoices = useMemo(() => {
    if (!currentGymId) return invoices;
    return invoices.filter(inv => !inv.gymId || String(inv.gymId) === String(currentGymId));
  }, [invoices, currentGymId]);

  const gymAttendance = useMemo(() => {
    if (!currentGymId) return attendance;
    return attendance.filter(a => !a.gymId || String(a.gymId) === String(currentGymId));
  }, [attendance, currentGymId]);

  const gymPtSessions = useMemo(() => {
    if (!currentGymId) return ptSessions;
    return ptSessions.filter(p => !p.gymId || String(p.gymId) === String(currentGymId));
  }, [ptSessions, currentGymId]);

  const gymPayrollRecords = useMemo(() => {
    if (!currentGymId) return payrollRecords;
    return payrollRecords.filter(p => !p.gymId || String(p.gymId) === String(currentGymId));
  }, [payrollRecords, currentGymId]);

  // Active Report Category & Advanced Filters
  const [reportCategory, setReportCategory] = useState('members'); // 'members' | 'revenue' | 'attendance' | 'pt' | 'payroll'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // 'YYYY-MM'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'expiring soon' | 'paid' | 'pending' | 'active' | 'expired'
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL'); // 'ALL' | 'Cash' | 'UPI' | 'Split' | 'Split: GPay' | 'Split: PhonePe' | 'Split: Account' | 'Split: Other'

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (paymentMethodFilter !== 'ALL') count++;
    if (startDate) count++;
    if (endDate) count++;
    if (selectedMonth) count++;
    return count;
  }, [filterType, statusFilter, paymentMethodFilter, startDate, endDate, selectedMonth]);

  const handleResetFilters = () => {
    setFilterType('ALL');
    setStatusFilter('ALL');
    setPaymentMethodFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
    setSearchTerm('');
  };

  // Helper to test if a record date matches selected date range or month
  const matchesDateCriteria = (dateStr) => {
    if (!dateStr) return true;
    const cleanDate = String(dateStr).split('T')[0];

    if (selectedMonth) {
      if (!cleanDate.startsWith(selectedMonth)) return false;
    }
    if (startDate && cleanDate < startDate) return false;
    if (endDate && cleanDate > endDate) return false;
    return true;
  };

  // Helper to test if payment method matches filter (including split platforms: GPay, PhonePe, Account, Other)
  const matchesPaymentFilter = (record, filter) => {
    if (!filter || filter === 'ALL') return true;
    const pm = (record.paymentMethod || record.payment_method || '').toLowerCase();
    
    if (filter === 'Cash') {
      return pm.includes('cash') && !pm.includes('split');
    }
    if (filter === 'UPI') {
      return (pm === 'upi' || (pm.includes('upi') && !pm.includes('gpay') && !pm.includes('phonepe') && !pm.includes('split')));
    }
    if (filter === 'GPay') {
      return (pm === 'gpay' || pm.includes('gpay') || pm.includes('google pay')) && !pm.includes('split');
    }
    if (filter === 'PhonePe') {
      return (pm === 'phonepe' || pm.includes('phonepe') || pm.includes('phone pay') || pm.includes('phone_pe')) && !pm.includes('split');
    }
    if (filter === 'Account Transfer' || filter === 'Account') {
      return (pm.includes('account') || pm.includes('transfer') || pm.includes('bank') || pm.includes('neft') || pm.includes('imps')) && !pm.includes('split');
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

  // Filter logic based on Category
  const getFilteredData = () => {
    const term = searchTerm.toLowerCase();

    if (reportCategory === 'members') {
      return gymMembers.filter((m) => {
        const matchesTerm = (m.name || '').toLowerCase().includes(term) || (m.email || '').toLowerCase().includes(term) || (m.phone || '').includes(term);
        const effectiveStatus = calculateMemberStatus ? calculateMemberStatus(m.expiryDate, m.status) : (m.status || 'Active');

        // Status filter
        let matchesStatus = true;
        const targetStatus = statusFilter !== 'ALL' ? statusFilter : filterType;
        if (targetStatus !== 'ALL') {
          matchesStatus = effectiveStatus.toLowerCase() === targetStatus.toLowerCase();
        }

        // Date filter on joinDate or created_at
        const dateToCheck = m.joinDate || m.createdAt || m.created_at || m.expiryDate;
        const matchesDate = matchesDateCriteria(dateToCheck);

        return matchesTerm && matchesStatus && matchesDate;
      });
    }

    if (reportCategory === 'revenue') {
      return gymInvoices.filter((inv) => {
        const matchesTerm = (inv.memberName || '').toLowerCase().includes(term) || (inv.planName || '').toLowerCase().includes(term) || String(inv.id || '').includes(term);

        let matchesStatus = true;
        const targetStatus = statusFilter !== 'ALL' ? statusFilter : filterType;
        if (targetStatus !== 'ALL') {
          matchesStatus = (inv.status || '').toLowerCase() === targetStatus.toLowerCase();
        }

        const dateToCheck = inv.date || inv.invoiceDate || inv.createdAt || inv.created_at;
        const matchesDate = matchesDateCriteria(dateToCheck);
        const matchesPayment = matchesPaymentFilter(inv, paymentMethodFilter);

        return matchesTerm && matchesStatus && matchesDate && matchesPayment;
      });
    }

    if (reportCategory === 'attendance') {
      return gymAttendance.filter((a) => {
        const matchesTerm = (a.memberName || a.name || '').toLowerCase().includes(term) || (a.planName || '').toLowerCase().includes(term);

        let matchesStatus = true;
        const targetStatus = statusFilter !== 'ALL' ? statusFilter : filterType;
        if (targetStatus !== 'ALL') {
          matchesStatus = (a.status || '').toLowerCase() === targetStatus.toLowerCase();
        }

        const dateToCheck = a.date || a.rawDate || a.createdAt;
        const matchesDate = matchesDateCriteria(dateToCheck);

        return matchesTerm && matchesStatus && matchesDate;
      });
    }

    if (reportCategory === 'pt') {
      return gymPtSessions.filter((pt) => {
        const matchesTerm = (pt.memberName || '').toLowerCase().includes(term) || (pt.trainerName || '').toLowerCase().includes(term);
        const dateToCheck = pt.date || pt.sessionDate || pt.createdAt;
        const matchesDate = matchesDateCriteria(dateToCheck);
        return matchesTerm && matchesDate;
      });
    }

    if (reportCategory === 'payroll') {
      return gymPayrollRecords.filter((p) => {
        const matchesTerm = (p.trainerName || p.employeeName || p.name || '').toLowerCase().includes(term) || (p.role || '').toLowerCase().includes(term);

        let matchesStatus = true;
        const targetStatus = statusFilter !== 'ALL' ? statusFilter : filterType;
        if (targetStatus !== 'ALL') {
          matchesStatus = p.status?.toLowerCase() === targetStatus.toLowerCase();
        }

        const dateToCheck = p.paymentDate || p.createdAt || (p.month ? `${p.month}-01` : null);
        const matchesDate = matchesDateCriteria(dateToCheck);

        return matchesTerm && matchesStatus && matchesDate;
      });
    }

    return [];
  };

  const currentData = getFilteredData();

  const handleExportCSV = () => {
    if (currentData.length === 0) {
      addToast('No records available to export', 'error');
      return;
    }

    const headers = Object.keys(currentData[0]).filter(k => typeof currentData[0][k] !== 'object');
    const csvRows = [];
    csvRows.push(headers.join(','));

    currentData.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h] != null ? row[h].toString().replace(/"/g, '""') : '';
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ArchFit_Report_${reportCategory}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    addToast(`Exported ${currentData.length} records to CSV!`, 'success');
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-12 w-full">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 bg-white border border-slate-200/90 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="app-page-title font-bold text-slate-900 tracking-normal truncate">
                Reports & Analytics Center
              </h1>
              <p className="text-2xs text-slate-500 hidden sm:block truncate max-w-[70ch]">
                Generate customized operational, revenue, attendance, PT sessions, and payroll reports with instant CSV export.
              </p>
              <div className="text-2xs text-slate-400 font-medium sm:hidden truncate">
                {currentData.length} Total records
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-8.5 h-8.5 sm:w-auto sm:h-9 sm:px-3 sm:py-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
            title="Refresh from Database"
          >
            <RotateCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className="hidden sm:flex h-8.5 sm:h-9 px-2.5 sm:px-3.5 items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Visual Charts</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-8.5 sm:h-9 px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span><span className="hidden sm:inline">Export </span>CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:flex w-8.5 h-8.5 sm:w-9 sm:h-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer shrink-0"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'members', label: 'Members', icon: Users, count: gymMembers.length },
          { id: 'revenue', label: 'Revenue', icon: IndianRupee, count: gymInvoices.length },
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck, count: gymAttendance.length },
          { id: 'pt', label: 'PT Sessions', icon: Dumbbell, count: gymPtSessions.length },
          { id: 'payroll', label: 'Payroll', icon: Wallet, count: gymPayrollRecords.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setReportCategory(tab.id);
                setFilterType('ALL');
                setSearchTerm('');
              }}
              className={`min-h-[40px] flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-2xs ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 w-full">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SearchInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm('')}
              placeholder={`Search ${reportCategory} records...`}
              mobilePlaceholder="Search records..."
              containerClassName="flex-1 min-w-0"
            />

            {/* Dedicated Filter Button on mobile */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`h-9.5 sm:h-9 flex sm:hidden items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs active:scale-95 shrink-0 ${activeFiltersCount > 0
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
            >
              <Filter className={`w-3.5 h-3.5 shrink-0 ${activeFiltersCount > 0 ? 'text-white' : 'text-emerald-600'}`} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-emerald-700 rounded-full text-2xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end shrink-0">
            {reportCategory === 'revenue' && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-2xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">Payment:</span>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="px-2.5 h-9.5 sm:h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Payment Modes</option>
                  <option value="UPI">UPI</option>
                  <option value="GPay">GPay</option>
                  <option value="PhonePe">PhonePe</option>
                  <option value="Account Transfer">Account Transfer</option>
                  <option value="Cash">Cash at Reception</option>
                  <option value="Split">All Split Payments</option>
                  <option value="Split: GPay">Split: GPay</option>
                  <option value="Split: PhonePe">Split: PhonePe</option>
                  <option value="Split: Account">Split: Account / Bank</option>
                  <option value="Split: Other">Split: Other Online</option>
                </select>
              </div>
            )}

            {/* Dedicated Filter Button on desktop */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${activeFiltersCount > 0
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
            >
              <Filter className={`w-3.5 h-3.5 ${activeFiltersCount > 0 ? 'text-white' : 'text-emerald-600'}`} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-emerald-700 rounded-full text-2xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">Active Filters:</span>
            {selectedMonth && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                <Calendar className="w-3 h-3 text-emerald-600" />
                Month: {selectedMonth}
                <button type="button" onClick={() => setSelectedMonth('')} className="hover:text-emerald-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {startDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                From: {startDate}
                <button type="button" onClick={() => setStartDate('')} className="hover:text-emerald-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                To: {endDate}
                <button type="button" onClick={() => setEndDate('')} className="hover:text-emerald-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium capitalize">
                Status: {statusFilter}
                <button type="button" onClick={() => { setStatusFilter('ALL'); setFilterType('ALL'); }} className="hover:text-emerald-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {paymentMethodFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-800 border border-violet-200 rounded-lg text-xs font-medium">
                <Receipt className="w-3 h-3 text-violet-600" />
                Payment: {paymentMethodFilter}
                <button type="button" onClick={() => setPaymentMethodFilter('ALL')} className="hover:text-violet-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer ml-auto"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* Advanced Filter Modal (Portalled to document.body to avoid clipping) */}
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
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Filter Report Data</h3>
                  <p className="text-xs text-slate-500">Apply custom date ranges, month selection and statuses</p>
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
              {/* Month Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Month Selection</span>
                  <span className="text-2xs font-normal text-slate-400">View entire month's report</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      if (e.target.value) {
                        setStartDate(`${e.target.value}-01`);
                        // Set end date to last day of month
                        const [yr, mo] = e.target.value.split('-').map(Number);
                        const lastDay = new Date(yr, mo, 0).getDate();
                        setEndDate(`${e.target.value}-${String(lastDay).padStart(2, '0')}`);
                      }
                    }}
                    className="col-span-2 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: 'Current Month', value: new Date().toISOString().slice(0, 7) },
                    { label: 'Last Month', value: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7) },
                    { label: 'Sep 2026', value: '2026-09' },
                    { label: 'Aug 2026', value: '2026-08' },
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
                      className={`text-2xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${selectedMonth === mPreset.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {mPreset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date & End Date Selector */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Date Range (Start & End Date)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-2xs font-semibold text-slate-500 block mb-1">Start Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-2xs font-semibold text-slate-500 block mb-1">End Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base sm:text-xs min-h-[44px] sm:min-h-0 font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filters */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Status Filter
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Statuses' },
                    { id: 'expiring soon', label: 'Expiring Soon' },
                    { id: 'paid', label: 'Paid' },
                    { id: 'pending', label: 'Pending / Unpaid' },
                    { id: 'active', label: 'Active' },
                    { id: 'expired', label: 'Expired' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setStatusFilter(st.id);
                        setFilterType(st.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${statusFilter.toLowerCase() === st.id.toLowerCase()
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
                  <span className="text-2xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
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
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Apply Filters ({currentData.length} records)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Report Dynamic Content: Mobile Cards + Desktop Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {currentData.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No records found matching criteria.
          </div>
        ) : (
          <>
            {/* Mobile Card Layout (320px - 430px) */}
            <div className="block sm:hidden p-3 space-y-2.5">
              {reportCategory === 'members' && currentData.map((m) => {
                const effectiveStatus = calculateMemberStatus ? calculateMemberStatus(m.expiryDate, m.status) : (m.status || 'Active');
                const isExp = effectiveStatus === 'Expiring Soon';
                const isExpired = effectiveStatus === 'Expired';
                return (
                  <div key={m.id} className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 text-xs truncate min-w-0 flex-1" title={m.name}>{m.name}</div>
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-bold border shrink-0 whitespace-nowrap ${
                        isExpired ? 'bg-rose-50 text-rose-700 border-rose-200' : isExp ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {effectiveStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-50 text-2xs">
                      <div className="min-w-0">
                        <span className="text-2xs text-slate-400 uppercase font-medium block">Plan</span>
                        <span className="font-semibold text-slate-800 truncate block" title={m.planName}>{m.planName}</span>
                      </div>
                      <div className="text-right shrink-0 whitespace-nowrap">
                        <span className="text-2xs text-slate-400 uppercase font-medium block">Expires</span>
                        <span className="font-mono text-slate-600 block">{m.expiryDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-2xs text-slate-500 pt-1 border-t border-slate-100 gap-2">
                      <span className="truncate min-w-0" title={`Coach: ${m.trainerName || 'None'}`}>Coach: <strong className="text-emerald-700">{m.trainerName || 'None'}</strong></span>
                      <span className="shrink-0 whitespace-nowrap">{m.phone || m.email || ''}</span>
                    </div>
                  </div>
                );
              })}

              {reportCategory === 'revenue' && currentData.map((inv) => (
                <div key={inv.id} className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs truncate" title={inv.memberName || inv.member_name}>{inv.memberName || inv.member_name}</div>
                      <div className="text-2xs text-slate-400 font-mono whitespace-nowrap shrink-0">Invoice #{inv.id}</div>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <div className="font-bold text-emerald-600 text-sm font-mono whitespace-nowrap">₹{Number(inv.amount).toLocaleString('en-IN')}</div>
                      <span className="px-2 py-0.2 rounded-md text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 whitespace-nowrap">
                        {inv.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-2xs p-2 rounded-lg bg-slate-50 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Package</span>
                      <span className="font-semibold text-slate-800 truncate block" title={inv.planName}>{inv.planName}</span>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Mode • Date</span>
                      <span className="text-slate-600 font-medium whitespace-nowrap">{inv.paymentMethod || inv.payment_method || 'UPI'} • {inv.date}</span>
                    </div>
                  </div>
                </div>
              ))}

              {reportCategory === 'attendance' && currentData.map((att, idx) => (
                <div key={att.id || idx} className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs truncate" title={att.memberName || att.name}>{att.memberName || att.name}</div>
                      <div className="text-2xs text-slate-500 truncate" title={att.planName}>{att.planName}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 whitespace-nowrap">
                      {att.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-50 text-2xs text-center">
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Check In</span>
                      <span className="font-bold text-emerald-700 whitespace-nowrap">{att.checkInTime}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Check Out</span>
                      <span className="font-semibold text-slate-700 whitespace-nowrap">{att.checkOutTime || '--'}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Duration</span>
                      <span className="font-semibold text-slate-600 whitespace-nowrap">{att.duration || (att.checkOutTime ? '1h 15m' : 'In Progress')}</span>
                    </div>
                  </div>
                </div>
              ))}

              {reportCategory === 'pt' && currentData.map((pt) => (
                <div key={pt.id} className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs truncate" title={pt.memberName}>{pt.memberName}</div>
                      <div className="text-2xs text-teal-700 font-semibold truncate" title={pt.trainerName}>{pt.trainerName}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 shrink-0 whitespace-nowrap">
                      OTP: {pt.otp || '****'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-50 text-2xs text-center">
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Total</span>
                      <span className="font-bold text-slate-800 whitespace-nowrap">{pt.totalSessions}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Done</span>
                      <span className="font-bold text-emerald-700 whitespace-nowrap">{pt.completedSessions}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Left</span>
                      <span className="font-bold text-amber-700 whitespace-nowrap">{pt.remainingSessions}</span>
                    </div>
                  </div>
                </div>
              ))}

              {reportCategory === 'payroll' && currentData.map((pay) => (
                <div key={pay.id} className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-xs truncate" title={pay.trainerName || pay.name}>{pay.trainerName || pay.name}</div>
                      <div className="text-2xs text-slate-500 capitalize truncate" title={pay.role}>{pay.role}</div>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-sm whitespace-nowrap">₹{Number(pay.netPay).toLocaleString('en-IN')}</div>
                      <span className="px-2 py-0.2 rounded-md text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 whitespace-nowrap">
                        {pay.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-slate-50 text-2xs text-center">
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Base</span>
                      <span className="font-semibold text-slate-700 whitespace-nowrap">₹{Number(pay.baseSalary).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Comm/Bonus</span>
                      <span className="font-semibold text-emerald-700 whitespace-nowrap">+₹{(Number(pay.commissions || 0) + Number(pay.bonus || 0)).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 uppercase font-medium block">Deduct</span>
                      <span className="font-semibold text-rose-600 whitespace-nowrap">-₹{Number(pay.deductions || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View Table */}
            <div className="hidden sm:block overflow-x-auto">
              {reportCategory === 'members' && (
                <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Email / Phone</th>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Assigned Coach</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentData.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[180px] min-w-0">
                      <span className="truncate block" title={m.name}>{m.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-[200px] min-w-0">
                      <span className="truncate block" title={`${m.email} • ${m.phone || 'N/A'}`}>{m.email} • {m.phone || 'N/A'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[160px] min-w-0">
                      <span className="truncate block" title={m.planName}>{m.planName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-700 font-medium max-w-[140px] min-w-0">
                      <span className="truncate block" title={m.trainerName || 'None'}>{m.trainerName || 'None'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap shrink-0">{m.expiryDate}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap shrink-0">
                      {(() => {
                        const effectiveStatus = calculateMemberStatus ? calculateMemberStatus(m.expiryDate, m.status) : (m.status || 'Active');
                        const isExp = effectiveStatus === 'Expiring Soon';
                        const isExpired = effectiveStatus === 'Expired';
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-2xs font-bold border whitespace-nowrap ${isExpired
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isExp
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                            {effectiveStatus}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportCategory === 'revenue' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Service / Package</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentData.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800 whitespace-nowrap shrink-0">{inv.id}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[180px] min-w-0">
                      <span className="truncate block" title={inv.memberName || inv.member_name}>{inv.memberName || inv.member_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-[180px] min-w-0">
                      <span className="truncate block" title={inv.planName}>{inv.planName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-emerald-600 whitespace-nowrap shrink-0">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap shrink-0">
                      {(() => {
                        const method = inv.paymentMethod || inv.payment_method || 'UPI';
                        const isSplit = method.toLowerCase().includes('split');
                        if (isSplit) {
                          return (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                <Receipt className="w-2.5 h-2.5 text-violet-500" />
                                Split Payment
                              </span>
                              <div className="text-2xs text-slate-700 font-medium">
                                {method}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <span className="text-slate-600 font-medium">{method}</span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono whitespace-nowrap shrink-0">{inv.date}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap shrink-0">
                      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportCategory === 'attendance' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In Time</th>
                  <th className="py-3 px-4">Check-Out Time</th>
                  <th className="py-3 px-4">Workout Duration</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentData.map((att, idx) => (
                  <tr key={att.id || idx} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[180px] min-w-0">
                      <span className="truncate block" title={att.memberName || att.name}>{att.memberName || att.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-[180px] min-w-0">
                      <span className="truncate block" title={att.planName}>{att.planName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap shrink-0">{att.displayDate || formatDateDisplay(att.date || att.rawDate, { withRelative: true }) || 'Today'}</td>
                    <td className="py-3.5 px-4 font-medium text-emerald-700 whitespace-nowrap shrink-0">{att.checkInTime}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap shrink-0">{att.checkOutTime || '--'}</td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap shrink-0">{att.duration || (att.checkOutTime ? '1h 15m' : 'In Progress')}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportCategory === 'pt' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Assigned PT Trainer</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Total Sessions</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4">Remaining</th>
                  <th className="py-3 px-4">Current Session OTP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentData.map((pt) => (
                  <tr key={pt.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[180px] min-w-0">
                      <span className="truncate block" title={pt.memberName}>{pt.memberName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-teal-700 font-semibold max-w-[150px] min-w-0">
                      <span className="truncate block" title={pt.trainerName}>{pt.trainerName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-[180px] min-w-0">
                      <span className="truncate block" title={pt.packageTitle}>{pt.packageTitle}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium whitespace-nowrap shrink-0">{pt.totalSessions}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-medium whitespace-nowrap shrink-0">{pt.completedSessions}</td>
                    <td className="py-3.5 px-4 text-amber-700 font-medium whitespace-nowrap shrink-0">{pt.remainingSessions}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-700 whitespace-nowrap shrink-0">{pt.otp || '****'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportCategory === 'payroll' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium uppercase tracking-wider text-2xs">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Base Pay</th>
                  <th className="py-3 px-4">Commissions</th>
                  <th className="py-3 px-4">Incentives</th>
                  <th className="py-3 px-4">Deductions</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {currentData.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-[180px] min-w-0">
                      <span className="truncate block" title={pay.trainerName || pay.name}>{pay.trainerName || pay.name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-[140px] min-w-0">
                      <span className="truncate block" title={pay.role}>{pay.role}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold whitespace-nowrap shrink-0">₹{Number(pay.baseSalary).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold whitespace-nowrap shrink-0">+₹{Number(pay.commissions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold whitespace-nowrap shrink-0">+₹{Number(pay.bonus || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-rose-600 font-semibold whitespace-nowrap shrink-0">-₹{Number(pay.deductions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap shrink-0">₹{Number(pay.netPay).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap shrink-0">
                      <span className="px-2 py-0.5 rounded-md text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
