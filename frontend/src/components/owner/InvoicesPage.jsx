import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { RecordPaymentModal } from './RecordPaymentModal';
import { generateInvoicePdf, shareInvoicePdfToMobile, downloadPdfBlob } from '../../utils/invoicePdfGenerator';
import {
  Search,
  FileText,
  ChevronDown,
  ChevronUp,
  Printer,
  CreditCard,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  Calendar,
  User,
  Mail,
  Phone,
  Plus,
  MessageCircle,
  Copy,
  Check,
  Building2,
  X,
  Receipt,
  Users,
  Wallet,
  Download,
  ExternalLink,
  ShieldCheck,
  Eye,
  RotateCw
} from 'lucide-react';

export const InvoicesPage = () => {
  const {
    invoices = [],
    members = [],
    gymInfo,
    ownerStats,
    fetchInvoices,
    fetchMembers,
    fetchPlans,
    addToast
  } = useGymData();
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchInvoices?.();
    fetchMembers?.();
    fetchPlans?.();
  }, [fetchInvoices, fetchMembers, fetchPlans]);

  // Search & Unified Dropdown Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_YEAR'
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState({});
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceViewMode, setInvoiceViewMode] = useState('sheet'); // 'sheet' | 'pdf'
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfGeneratedData, setPdfGeneratedData] = useState(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const searchContainerRef = useRef(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Copy invoice ID helper
  const handleCopyInvoiceId = (id, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper: check if invoice matches the unified dropdown filter
  const matchesFilter = (inv, filter) => {
    if (filter === 'ALL') return true;

    const statusLower = (inv.status || '').toLowerCase();
    if (filter === 'PAID') {
      return statusLower === 'paid';
    }
    if (filter === 'PENDING') {
      return statusLower !== 'paid';
    }

    const invDateStr = inv.date;
    if (!invDateStr) return false;

    if (filter === 'TODAY') {
      if (invDateStr.toLowerCase() === 'today') return true;
      const todayIso = new Date().toISOString().split('T')[0];
      return invDateStr === todayIso;
    }

    const d = new Date(invDateStr);
    if (isNaN(d.getTime())) return true;
    const now = new Date();
    const diffDays = (now - d) / (1000 * 60 * 60 * 24);

    if (filter === 'LAST_7_DAYS') {
      return diffDays >= -0.5 && diffDays <= 7.5;
    }
    if (filter === 'LAST_30_DAYS') {
      return diffDays >= -0.5 && diffDays <= 30.5;
    }
    if (filter === 'LAST_90_DAYS') {
      return diffDays >= -0.5 && diffDays <= 90.5;
    }
    if (filter === 'THIS_YEAR') {
      return d.getFullYear() === now.getFullYear();
    }

    return true;
  };

  const currentGymId = Number(currentUser?.gymId || currentUser?.gym_id);

  // Filter invoices strictly to the active gym
  const gymInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => {
      if (!currentGymId) return true;
      const invGym = Number(inv.gymId || inv.gym_id);
      return !invGym || invGym === currentGymId;
    });
  }, [invoices, currentGymId]);

  // Group all invoices by member
  const memberInvoicesMap = useMemo(() => {
    const map = new Map();

    gymInvoices.forEach((inv) => {
      const matchedMember = (members || []).find(
        (m) =>
          (inv.memberId && String(m.id) === String(inv.memberId)) ||
          (inv.userId && String(m.userId) === String(inv.userId)) ||
          (inv.user_id && String(m.userId) === String(inv.user_id)) ||
          ((m.name || '').trim().toLowerCase() === (inv.memberName || inv.member_name || '').trim().toLowerCase())
      );

      const memberKey = matchedMember?.id || inv.memberId || (inv.memberName || 'Unknown');
      const memberName = matchedMember?.name || inv.memberName || inv.member_name || 'Member';
      const memberAvatar = matchedMember?.avatar || null;
      const memberPhone = matchedMember?.phone || '';
      const memberEmail = matchedMember?.email || '';
      const memberPlan = matchedMember?.planName || inv.planName || 'Gym Membership';

      if (!map.has(memberKey)) {
        map.set(memberKey, {
          memberKey,
          memberId: matchedMember?.id || inv.memberId || memberKey,
          name: memberName,
          avatar: memberAvatar,
          phone: memberPhone,
          email: memberEmail,
          planName: memberPlan,
          invoices: []
        });
      }

      map.get(memberKey).invoices.push(inv);
    });

    const result = [];
    map.forEach((item) => {
      const sortedInvoices = [...item.invoices].sort(
        (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
      );
      const totalAmount = sortedInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const paidCount = sortedInvoices.filter((i) => (i.status || '').toLowerCase() === 'paid').length;
      const pendingCount = sortedInvoices.filter((i) => (i.status || '').toLowerCase() !== 'paid').length;
      const latestDate = sortedInvoices[0]?.date || 'N/A';

      result.push({
        ...item,
        invoices: sortedInvoices,
        totalAmount,
        invoiceCount: sortedInvoices.length,
        paidCount,
        pendingCount,
        latestDate
      });
    });

    return result.sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0));
  }, [invoices, members]);

  // Selected Invoice Member Resolution
  const selectedInvoiceMember = useMemo(() => {
    if (!selectedInvoice) return null;
    return (
      members.find(
        (m) =>
          (selectedInvoice.memberId && String(m.id) === String(selectedInvoice.memberId)) ||
          (m.name || '').toLowerCase() === (selectedInvoice.memberName || selectedInvoice.member_name || '').toLowerCase()
      ) || {
        name: selectedInvoice.memberName,
        phone: selectedInvoice.phone || '',
        email: selectedInvoice.email || '',
        id: selectedInvoice.memberId || 'PF-M'
      }
    );
  }, [selectedInvoice, members]);

  // Generate live PDF Preview Blob URL when an invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      try {
        const generated = generateInvoicePdf({
          invoice: selectedInvoice,
          member: selectedInvoiceMember,
          gymInfo
        });
        const url = URL.createObjectURL(generated.blob);
        setPdfPreviewUrl(url);
        setPdfGeneratedData(generated);

        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Failed to create PDF preview:', err);
      }
    } else {
      setPdfPreviewUrl(null);
      setPdfGeneratedData(null);
    }
  }, [selectedInvoice?.id, selectedInvoice?.amount, selectedInvoice?.status, selectedInvoiceMember?.id, selectedInvoiceMember?.phone]);

  // Overall KPIs
  const totalBilledRevenue = useMemo(() => {
    return gymInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [gymInvoices]);

  const totalPaidInvoicesCount = useMemo(() => {
    return gymInvoices.filter((i) => (i.status || '').toLowerCase() === 'paid').length;
  }, [gymInvoices]);

  const totalPendingInvoicesCount = useMemo(() => {
    return gymInvoices.filter((i) => (i.status || '').toLowerCase() !== 'paid').length;
  }, [gymInvoices]);

  // Filtered members based on search term AND active unified dropdown filter
  const filteredMembers = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();

    return memberInvoicesMap
      .map((m) => {
        const matchingInvoices = m.invoices.filter((inv) => matchesFilter(inv, activeFilter));

        const matchesSearch =
          !term ||
          m.name.toLowerCase().includes(term) ||
          (m.phone && m.phone.includes(term)) ||
          (m.email && m.email.toLowerCase().includes(term)) ||
          matchingInvoices.some(
            (inv) =>
              (inv.id && inv.id.toLowerCase().includes(term)) ||
              (inv.planName && inv.planName.toLowerCase().includes(term))
          );

        if (!matchesSearch || matchingInvoices.length === 0) return null;

        const filteredTotal = matchingInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

        return {
          ...m,
          displayedInvoices: matchingInvoices,
          displayedTotal: filteredTotal
        };
      })
      .filter(Boolean);
  }, [memberInvoicesMap, searchTerm, activeFilter]);

  // Autocomplete suggestions in search bar dropdown
  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.trim().toLowerCase();
    return memberInvoicesMap
      .filter((m) => m.name.toLowerCase().includes(term) || (m.phone && m.phone.includes(term)))
      .slice(0, 5);
  }, [memberInvoicesMap, searchTerm]);

  // Toggle single member dropdown
  const toggleMemberDropdown = (memberKey) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [memberKey]: !prev[memberKey]
    }));
  };

  // Expand or Collapse All
  const handleToggleExpandAll = () => {
    const allExpanded = filteredMembers.every((m) => expandedMembers[m.memberKey]);
    if (allExpanded) {
      setExpandedMembers({});
    } else {
      const newExp = {};
      filteredMembers.forEach((m) => {
        newExp[m.memberKey] = true;
      });
      setExpandedMembers(newExp);
    }
  };

  // When selecting a member from the autocomplete dropdown
  const handleSelectSuggestion = (member) => {
    setSearchTerm(member.name);
    setIsSearchDropdownOpen(false);
    setExpandedMembers((prev) => ({
      ...prev,
      [member.memberKey]: true
    }));
  };

  // Auto-expand if single member matches
  useEffect(() => {
    if (searchTerm.trim() && filteredMembers.length === 1) {
      const singleKey = filteredMembers[0].memberKey;
      setExpandedMembers((prev) => ({
        ...prev,
        [singleKey]: true
      }));
    }
  }, [searchTerm, filteredMembers]);

  // Direct PDF Download Handler
  const handleDownloadInvoicePdf = (inv, memb) => {
    const targetMember = memb || members.find(
      (m) =>
        (inv.memberId && String(m.id) === String(inv.memberId)) ||
        (m.name || '').toLowerCase() === (inv.memberName || inv.member_name || '').toLowerCase()
    );

    const generated = generateInvoicePdf({
      invoice: inv,
      member: targetMember,
      gymInfo
    });

    const success = generated.download();
    if (success && addToast) {
      addToast(`Downloaded PDF: ${generated.fileName}`, 'success');
    }
  };

  // Share Invoice PDF to Mobile
  const handleSharePdfToMobileNumber = async (inv, memb) => {
    const targetMember = memb || members.find(
      (m) =>
        (inv.memberId && String(m.id) === String(inv.memberId)) ||
        (m.name || '').toLowerCase() === (inv.memberName || inv.member_name || '').toLowerCase()
    ) || {
      name: inv.memberName,
      phone: inv.phone || ''
    };

    await shareInvoicePdfToMobile({
      invoice: inv,
      member: targetMember,
      gymInfo,
      onToast: addToast
    });
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      
      {/* 1. CLEAN & CALM HEADER */}
      <div className="bg-white border border-slate-200 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Member Invoices
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
              Search member billing records, view payment history, and generate GST invoices.
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 lg:pt-0">
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] sm:text-xs font-bold border border-slate-200 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 shadow-2xs"
            >
              {filteredMembers.length > 0 && filteredMembers.every((m) => expandedMembers[m.memberKey])
                ? 'Collapse All'
                : 'Expand All'}
            </button>

            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-sm shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. THE 4 ESSENTIAL STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        
        {/* Total Invoiced */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Invoiced
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:my-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              ₹{(totalBilledRevenue / 100000).toFixed(2)}L
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-bold text-slate-500 items-center justify-between pt-2 border-t border-slate-100">
            <span>₹{totalBilledRevenue.toLocaleString('en-IN')} Total</span>
          </div>
        </div>

        {/* Paid Invoices */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Paid Invoices
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:my-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              {totalPaidInvoicesCount}
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-bold text-emerald-700 items-center justify-between pt-2 border-t border-slate-100">
            <span>Verified Settled</span>
          </div>
        </div>

        {/* Billed Members */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Billed Members
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:my-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              {memberInvoicesMap.length}
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-bold text-purple-700 items-center justify-between pt-2 border-t border-slate-100">
            <span>Active Accounts</span>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg Receipt
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-1.5 sm:my-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              ₹{invoices.length > 0 ? Math.round(totalBilledRevenue / invoices.length).toLocaleString('en-IN') : 0}
            </div>
          </div>
          <div className="hidden sm:flex text-xs font-bold text-amber-700 items-center justify-between pt-2 border-t border-slate-100">
            <span>Per Transaction</span>
          </div>
        </div>
      </div>

      {/* 3. SEARCH BAR & SINGLE UNIFIED DROPDOWN FILTER */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-sm flex items-center justify-between gap-2.5 sm:gap-3">
        
        {/* Search Input with Autocomplete */}
        <div className="relative flex-1" ref={searchContainerRef}>
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onFocus={() => setIsSearchDropdownOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchDropdownOpen(true);
            }}
            placeholder="Search member name, phone, or invoice..."
            className="w-full pl-8 sm:pl-9 pr-7 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl text-[11px] sm:text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs font-medium"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 text-[10px] font-bold cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {isSearchDropdownOpen && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-slate-100">
              <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Matching Members ({searchSuggestions.length})
              </div>
              {searchSuggestions.map((member) => (
                <div
                  key={member.memberKey}
                  onClick={() => handleSelectSuggestion(member)}
                  className="p-2.5 hover:bg-emerald-50/70 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-6 h-6 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center border border-emerald-200">
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-emerald-700">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {member.phone || member.email || member.planName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      {member.invoices.length} {member.invoices.length === 1 ? 'Invoice' : 'Invoices'}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      ₹{member.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SINGLE COMBINED DROPDOWN FILTER */}
        <div className="relative shrink-0">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="appearance-none pl-2.5 pr-7 py-1.5 sm:py-2 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs cursor-pointer"
          >
            <option value="ALL">All Status ({invoices.length})</option>
            <option value="PAID">Paid Only ({totalPaidInvoicesCount})</option>
            <option value="PENDING">Pending Only ({totalPendingInvoicesCount})</option>
            <option value="TODAY">Today's Invoices</option>
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="LAST_90_DAYS">Last 90 Days</option>
            <option value="THIS_YEAR">This Year (2026)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Quick Summary Row */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5 font-medium">
        <span>
          Showing <strong className="text-emerald-700">{filteredMembers.length}</strong> of {memberInvoicesMap.length} Members
        </span>
        {searchTerm && (
          <span className="text-[11px] text-slate-400">
            Filtered by "{searchTerm}"
          </span>
        )}
      </div>

      {/* 4. MEMBER INVOICES LIST (WITH ACCORDION DROPDOWNS ON NAME CLICK) */}
      <div className="space-y-2.5 sm:space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="p-8 bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs">
            <EmptyState
              icon={FileText}
              title={searchTerm || activeFilter !== 'ALL' ? "No matching invoices found" : "No Member Invoices Yet"}
              description={
                searchTerm || activeFilter !== 'ALL'
                  ? "No billing records match your search or date filter. Try clearing filters or record a new member fee payment."
                  : "Track member billing transactions, issue GST invoices, and record fee collections."
              }
              actionText="Record Fee Payment"
              onAction={() => setIsRecordPaymentOpen(true)}
              secondaryActionText={searchTerm || activeFilter !== 'ALL' ? "Clear Filters" : undefined}
              onSecondaryAction={searchTerm || activeFilter !== 'ALL' ? () => { setSearchTerm(''); setActiveFilter('ALL'); } : undefined}
              color="emerald"
            />
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isExpanded = !!expandedMembers[member.memberKey];
            const invoicesList = member.displayedInvoices || member.invoices;
            const currentTotal = member.displayedTotal != null ? member.displayedTotal : member.totalAmount;

            return (
              <div
                key={member.memberKey}
                className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm transition-all overflow-hidden"
              >
                {/* MEMBER HEADER ROW (CLICKABLE NAME & SUMMARY) */}
                <div
                  onClick={() => toggleMemberDropdown(member.memberKey)}
                  className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-slate-50/90 border-b border-slate-200' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {/* Avatar */}
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm flex items-center justify-center border border-emerald-200 shrink-0">
                        {member.name.charAt(0)}
                      </div>
                    )}

                    {/* Member Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMemberDropdown(member.memberKey);
                          }}
                          className="font-bold text-slate-900 text-xs sm:text-sm hover:text-emerald-700 transition-colors text-left flex items-center gap-1.5 cursor-pointer group"
                        >
                          <span className="truncate group-hover:underline">{member.name}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{member.phone}</span>
                          </span>
                        )}
                        {member.email && (
                          <span className="hidden sm:flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[180px]">{member.email}</span>
                          </span>
                        )}
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 font-medium truncate max-w-[160px]">
                          {member.planName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary & Dropdown Toggle Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        ₹{currentTotal.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {invoicesList.length} {invoicesList.length === 1 ? 'Invoice' : 'Invoices'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMemberDropdown(member.memberKey);
                      }}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        isExpanded
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{isExpanded ? 'Hide' : `Invoices (${invoicesList.length})`}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE INVOICES DROPDOWN LIST */}
                {isExpanded && (
                  <div className="bg-slate-50/70 p-3 sm:p-4 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pb-0.5">
                      <span className="font-bold flex items-center gap-1.5 text-slate-800">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Invoices for {member.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                        Click "View PDF" to open document or "Download" to save PDF
                      </span>
                    </div>

                    {/* Table View */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                            <tr>
                              <th className="py-2 px-3">Invoice ID</th>
                              <th className="py-2 px-3">Issued Date</th>
                              <th className="py-2 px-3">Item / Plan Details</th>
                              <th className="py-2 px-3">Payment Mode</th>
                              <th className="py-2 px-3">Status</th>
                              <th className="py-2 px-3 text-right">Amount</th>
                              <th className="py-2 px-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {invoicesList.map((inv) => (
                              <tr
                                key={inv.id}
                                className="hover:bg-slate-50/80 transition-colors"
                              >
                                <td className="py-2 sm:py-2.5 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-slate-900 text-xs">
                                      #{inv.id?.toUpperCase()}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyInvoiceId(inv.id, e)}
                                      className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                                      title="Copy Invoice ID"
                                    >
                                      {copiedId === inv.id ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </td>

                                <td className="py-2 sm:py-2.5 px-3 whitespace-nowrap text-slate-500 font-medium text-xs">
                                  {inv.date || 'Today'}
                                </td>

                                <td className="py-2 sm:py-2.5 px-3">
                                  <div className="font-bold text-slate-900 truncate max-w-[200px] text-xs">
                                    {inv.planName || 'Membership Plan'}
                                  </div>
                                </td>

                                <td className="py-2 sm:py-2.5 px-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                                    {inv.paymentMethod || 'UPI Transfer'}
                                  </span>
                                </td>

                                <td className="py-2 sm:py-2.5 px-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      (inv.status || '').toLowerCase() === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                    <span>{inv.status || 'Paid'}</span>
                                  </span>
                                </td>

                                <td className="py-2 sm:py-2.5 px-3 text-right whitespace-nowrap">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                    ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                                  </span>
                                </td>

                                <td className="py-2 sm:py-2.5 px-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1.5">
                                    
                                    {/* 1. VIEW PDF INVOICE MODAL */}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedInvoice(inv)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1"
                                      title="View Tax Invoice in PDF Format"
                                    >
                                      <Eye className="w-3 h-3 text-slate-600" />
                                      <span>View PDF</span>
                                    </button>

                                    {/* 2. DIRECT DOWNLOAD PDF BUTTON */}
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadInvoicePdf(inv, member)}
                                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
                                      title="Download Invoice as PDF"
                                    >
                                      <Download className="w-3.5 h-3.5 text-blue-600" />
                                    </button>

                                    {/* 3. SHARE INVOICE IN PDF FORMAT TO PARTICULAR MOBILE NUMBER */}
                                    <button
                                      type="button"
                                      onClick={() => handleSharePdfToMobileNumber(inv, member)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1"
                                      title={`Share invoice in PDF format to ${member.phone || 'mobile number'}`}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Send PDF</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. GENERAL TAX INVOICE TEMPLATE MODAL (WITH LIVE EMBEDDED PDF VIEWER) */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Tax Invoice: #${selectedInvoice?.id?.toUpperCase()}`}
        maxWidth="max-w-4xl"
      >
        {selectedInvoice && (
          <div className="space-y-3.5">
            
            {/* VIEW MODE TOGGLE & PDF ACTION TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
              
              {/* Toggle View: PDF Document vs Printable Sheet */}
              <div className="inline-flex p-1 rounded-lg bg-white border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('pdf')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceViewMode === 'pdf'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Document View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceViewMode('sheet')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceViewMode === 'sheet'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Tax Sheet View</span>
                </button>
              </div>

              {/* PDF Action Buttons */}
              <div className="flex items-center gap-1.5">
                {pdfPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(pdfPreviewUrl, '_blank')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Open PDF in Full Browser Window"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>Open in Tab</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePdf(selectedInvoice, selectedInvoiceMember)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  title="Download actual PDF file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSharePdfToMobileNumber(selectedInvoice, selectedInvoiceMember)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  title={`Send PDF to ${selectedInvoiceMember?.phone || 'Mobile'}`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Share PDF to {selectedInvoiceMember?.phone ? selectedInvoiceMember.phone : 'Mobile'}</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: 1. NATIVE PDF DOCUMENT VIEWER */}
            {invoiceViewMode === 'pdf' && pdfPreviewUrl && (
              <div className="w-full h-[68vh] min-h-[520px] rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shadow-inner flex flex-col relative">
                <object
                  data={`${pdfPreviewUrl}#toolbar=1&navpanes=0&view=FitH`}
                  type="application/pdf"
                  className="w-full h-full flex-1"
                >
                  <iframe
                    src={`${pdfPreviewUrl}#toolbar=1&navpanes=0&view=FitH`}
                    title="Invoice PDF Document"
                    className="w-full h-full border-0"
                  >
                    <div className="p-8 text-center bg-white h-full flex flex-col items-center justify-center space-y-3">
                      <FileText className="w-12 h-12 text-emerald-600 mx-auto" />
                      <p className="text-slate-800 font-bold">PDF Document Ready</p>
                      <p className="text-slate-500 text-xs max-w-sm">
                        If your browser does not render PDFs directly inside the frame, click below to open or download the PDF file.
                      </p>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => window.open(pdfPreviewUrl, '_blank')}
                          className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
                        >
                          Open in Browser
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadInvoicePdf(selectedInvoice, selectedInvoiceMember)}
                          className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl"
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </iframe>
                </object>
              </div>
            )}

            {/* TAB CONTENT: 2. AUTHENTIC GYM MEMBERSHIP RECEIPT SHEET */}
            {(invoiceViewMode === 'sheet' || !pdfPreviewUrl) && (
              <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-sm space-y-6 print:p-0 print:border-none">
                
                {/* Gym Header Branding & Receipt Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                      PF
                    </div>
                    <div>
                      <h2 className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">
                        {gymInfo?.name || 'PULSEFIT ATHLETIC CLUB'}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {gymInfo?.address || 'Central Avenue, Hiranandani Gardens, Powai, Mumbai - 400076'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400 mt-1">
                        <span>GSTIN: <strong className="text-slate-600 font-mono">{gymInfo?.gstin || '27AAPCP1234F1Z8'}</strong></span>
                        <span>•</span>
                        <span>Phone: <strong className="text-slate-600">{gymInfo?.phone || '+91 98201 54321'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Payment Verified
                    </span>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-1.5">
                      Receipt #{selectedInvoice.id?.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Issued: {selectedInvoice.date || 'Today'}
                    </div>
                  </div>
                </div>

                {/* Two-Column Info: Billed Member & Payment Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Billed To Customer */}
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Member Information
                    </span>
                    <div className="font-bold text-slate-900 text-sm">
                      {selectedInvoiceMember?.name || selectedInvoice.memberName}
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Member ID: <strong className="text-slate-800">{selectedInvoiceMember?.id || selectedInvoice.memberId || 'PF-M-101'}</strong></span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mobile: <strong className="text-slate-800">{selectedInvoiceMember?.phone || selectedInvoice.phone || 'N/A'}</strong></span>
                    </div>
                    {selectedInvoiceMember?.email && (
                      <div className="text-slate-600 flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Email: {selectedInvoiceMember.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Details */}
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Payment Verification
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Receipt No:</span>
                      <strong className="text-slate-900 font-mono">#{selectedInvoice.id?.toUpperCase()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date Paid:</span>
                      <strong className="text-slate-800">{selectedInvoice.date || 'Today'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Mode:</span>
                      <strong className="text-slate-800">{selectedInvoice.paymentMethod || 'UPI / Instant Transfer'}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Settlement Status:</span>
                      <strong className="text-emerald-700 flex items-center gap-1 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Paid & Active</span>
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Membership Plan Highlight Card (Modern Fitness Receipt format) */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase tracking-wider">
                        Active Membership Subscription
                      </span>
                      <h3 className="font-bold text-base sm:text-lg text-slate-900 mt-1">
                        {selectedInvoice.planName || 'Comprehensive Gym Membership Pass'}
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total Subscription Fee</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900">
                        ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Included Privileges Checkmarks */}
                  <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Full cardio, strength & free-weight floor access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Turnstile QR Pass on PulseFit Mobile App</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Locker, steam room & recovery zone facilities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Complimentary InBody body composition scan</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary & Amount in Words */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start text-xs">
                  {/* Left: Notes and Words */}
                  <div className="sm:col-span-7 bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Amount In Words
                    </span>
                    <div className="font-bold text-slate-900 text-xs">
                      Rupees {Math.round(Number(selectedInvoice.amount || 0)).toLocaleString('en-IN')} Only
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 leading-relaxed">
                      Official tax invoice receipt generated under the Indian Information Technology Act 2000. Valid for corporate wellness reimbursement.
                    </p>
                  </div>

                  {/* Right: Tax Breakdown */}
                  <div className="sm:col-span-5 space-y-2 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Plan Base Fee:</span>
                      <span className="font-semibold text-slate-800">
                        ₹{Math.round(Number(selectedInvoice.amount || 0) / 1.18).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>CGST (9%):</span>
                      <span>₹{Math.round(((Number(selectedInvoice.amount || 0) / 1.18) * 0.09)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>SGST (9%):</span>
                      <span>₹{Math.round(((Number(selectedInvoice.amount || 0) / 1.18) * 0.09)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-baseline">
                      <span className="font-bold text-slate-900 text-sm">Total Paid:</span>
                      <span className="text-2xl font-black text-emerald-600 font-mono">
                        ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Terms & Official Seal Signature */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500">
                  <div className="space-y-1">
                    <p>• Membership passes are non-transferable & non-refundable once activated.</p>
                    <p>• Turnstile QR Pass is required for gym floor access.</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center shrink-0 min-w-[180px]">
                    <div className="text-emerald-700 font-bold uppercase text-[10px] flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Digitally Verified</span>
                    </div>
                    <div className="font-bold text-slate-800 text-xs mt-0.5">Authorized Signatory</div>
                    <div className="text-[10px] text-slate-400">PulseFit Athletic Club</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer active:scale-95 transition-all"
                title="Print Invoice"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
      />

    </div>
  );
};
