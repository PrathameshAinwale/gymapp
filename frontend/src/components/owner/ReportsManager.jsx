import React, { useState, useEffect, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
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
  RotateCw
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
    fetchAllFromBackend?.();
  }, [fetchAllFromBackend]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllFromBackend?.();
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

  // Active Report Category
  const [reportCategory, setReportCategory] = useState('members'); // 'members' | 'revenue' | 'attendance' | 'pt' | 'payroll'
  const [dateRange, setDateRange] = useState('ALL'); // 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Filter logic based on Category
  const getFilteredData = () => {
    const term = searchTerm.toLowerCase();

    if (reportCategory === 'members') {
      return gymMembers.filter((m) => {
        const matchesTerm = (m.name || '').toLowerCase().includes(term) || (m.email || '').toLowerCase().includes(term);
        const effectiveStatus = calculateMemberStatus ? calculateMemberStatus(m.expiryDate, m.status) : (m.status || 'Active');
        const matchesType = filterType === 'ALL' || effectiveStatus.toLowerCase() === filterType.toLowerCase();
        return matchesTerm && matchesType;
      });
    }

    if (reportCategory === 'revenue') {
      return gymInvoices.filter((inv) => {
        const matchesTerm = (inv.memberName || '').toLowerCase().includes(term) || (inv.planName || '').toLowerCase().includes(term);
        const matchesType = filterType === 'ALL' || (inv.status || '').toLowerCase() === filterType.toLowerCase();
        return matchesTerm && matchesType;
      });
    }

    if (reportCategory === 'attendance') {
      return gymAttendance.filter((a) => {
        const matchesTerm = (a.memberName || a.name || '').toLowerCase().includes(term) || (a.planName || '').toLowerCase().includes(term);
        const matchesType = filterType === 'ALL' || (a.status || '').toLowerCase() === filterType.toLowerCase();
        return matchesTerm && matchesType;
      });
    }

    if (reportCategory === 'pt') {
      return gymPtSessions.filter((pt) => {
        const matchesTerm = (pt.memberName || '').toLowerCase().includes(term) || (pt.trainerName || '').toLowerCase().includes(term);
        return matchesTerm;
      });
    }

    if (reportCategory === 'payroll') {
      return gymPayrollRecords.filter((p) => {
        const matchesTerm = (p.trainerName || p.employeeName || p.name || '').toLowerCase().includes(term) || (p.role || '').toLowerCase().includes(term);
        const matchesType = filterType === 'ALL' || p.status === filterType;
        return matchesTerm && matchesType;
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
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Reports & Analytics Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate customized operational, revenue, attendance, PT sessions, and payroll reports with instant CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer disabled:opacity-50 active:scale-95"
            title="Refresh from MySQL Database"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`} />
            <span className="hidden sm:inline">Refresh DB</span>
          </button>

          {setActiveTab && (
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/20 transition-all cursor-pointer active:scale-95"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>View Visual Charts</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar gap-1">
        {[
          { id: 'members', label: 'Members Report', icon: Users, count: gymMembers.length },
          { id: 'revenue', label: 'Revenue & Inflow', icon: IndianRupee, count: gymInvoices.length },
          { id: 'attendance', label: 'Attendance & Punch Out', icon: CalendarCheck, count: gymAttendance.length },
          { id: 'pt', label: 'PT Sessions & OTP', icon: Dumbbell, count: gymPtSessions.length },
          { id: 'payroll', label: 'Staff Payroll & Advances', icon: Wallet, count: gymPayrollRecords.length }
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Filter ${reportCategory} records...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {reportCategory === 'members' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active Members</option>
              <option value="expiring soon">Expiring Soon</option>
              <option value="expired">Expired Members</option>
            </select>
          )}

          {reportCategory === 'revenue' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Payments</option>
              <option value="paid">Paid Invoices</option>
              <option value="pending">Pending Invoices</option>
            </select>
          )}

          {reportCategory === 'attendance' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Check-ins</option>
              <option value="inside">Currently Inside Gym</option>
              <option value="completed">Completed Workouts</option>
            </select>
          )}

          {reportCategory === 'payroll' && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Payouts</option>
              <option value="Paid">Disbursed (Paid)</option>
              <option value="Pending">Pending Approval</option>
            </select>
          )}

          <span className="text-xs text-slate-500 font-bold whitespace-nowrap px-2">
            Showing: <strong>{currentData.length}</strong> items
          </span>
        </div>
      </div>

      {/* Report Dynamic Content Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {reportCategory === 'members' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                    <td className="py-3.5 px-4 font-bold text-slate-900">{m.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{m.email} • {m.phone || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{m.planName}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-medium">{m.trainerName || 'None'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{m.expiryDate}</td>
                    <td className="py-3.5 px-4">
                      {(() => {
                        const effectiveStatus = calculateMemberStatus ? calculateMemberStatus(m.expiryDate, m.status) : (m.status || 'Active');
                        const isExp = effectiveStatus === 'Expiring Soon';
                        const isExpired = effectiveStatus === 'Expired';
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isExpired
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{inv.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{inv.memberName || inv.member_name}</td>
                    <td className="py-3.5 px-4 text-slate-700">{inv.planName}</td>
                    <td className="py-3.5 px-4 font-mono font-black text-emerald-600">₹{Number(inv.amount).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-slate-500">{inv.paymentMethod || 'UPI'}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">{inv.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                    <td className="py-3.5 px-4 font-bold text-slate-900">{att.memberName || att.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{att.planName}</td>
                    <td className="py-3.5 px-4 text-slate-500">{att.displayDate || formatDateDisplay(att.date || att.rawDate, { withRelative: true }) || 'Today'}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">{att.checkInTime}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">{att.checkOutTime || '--'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{att.duration || (att.checkOutTime ? '1h 15m' : 'In Progress')}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                    <td className="py-3.5 px-4 font-bold text-slate-900">{pt.memberName}</td>
                    <td className="py-3.5 px-4 text-teal-700 font-semibold">{pt.trainerName}</td>
                    <td className="py-3.5 px-4 text-slate-700">{pt.packageTitle}</td>
                    <td className="py-3.5 px-4 font-bold">{pt.totalSessions}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-bold">{pt.completedSessions}</td>
                    <td className="py-3.5 px-4 text-amber-700 font-bold">{pt.remainingSessions}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{pt.otp || '****'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportCategory === 'payroll' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                    <td className="py-3.5 px-4 font-bold text-slate-900">{pay.trainerName || pay.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{pay.role}</td>
                    <td className="py-3.5 px-4 font-semibold">₹{Number(pay.baseSalary).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">+₹{Number(pay.commissions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">+₹{Number(pay.bonus || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-rose-600 font-semibold">-₹{Number(pay.deductions || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">₹{Number(pay.netPay).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
