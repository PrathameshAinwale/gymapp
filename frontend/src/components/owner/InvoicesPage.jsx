import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { RecordPaymentModal } from './RecordPaymentModal';
import { PayDueModal } from './PayDueModal';
import { EditInvoiceModal } from './EditInvoiceModal';
import { generateInvoicePdf, shareInvoicePdfToMobile, downloadPdfBlob } from '../../utils/invoicePdfGenerator';
import { compareInvoicesDesc } from '../../utils/searchUtils';
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
  Clock,
  User,
  Mail,
  Phone,
  Plus,
  MessageCircle,
  Copy,
  Check,
  Building2,
  Banknote,
  Smartphone,
  X,
  Receipt,
  Users,
  Wallet,
  Download,
  ExternalLink,
  ShieldCheck,
  RotateCw,
  Filter,
  Edit2
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

  const resolveCreatorName = (name, inv = null) => {
    const raw = name || inv?.createdByName || inv?.created_by_name || inv?.executive || inv?.creator?.name;
    if (!raw) return currentUser?.name || 'Staff';
    const str = String(raw).trim();
    const cleaned = str.replace(/\s*\((Owner|Manager|Superadmin|Staff|Admin).*?\)/i, '').trim();
    return cleaned || currentUser?.name || 'Staff';
  };

  const resolveCreatorRole = (inv = null) => {
    const role = inv?.creatorRole || inv?.creator_role || inv?.creator?.role;
    if (role) return role;
    const name = resolveCreatorName(inv?.createdByName || inv?.created_by_name, inv);
    if (currentUser?.name && name.toLowerCase() === currentUser.name.toLowerCase()) {
      return currentUser.role || 'Staff';
    }
    return 'Staff';
  };

  useEffect(() => {
    fetchInvoices?.();
    fetchMembers?.();
    fetchPlans?.();
  }, [fetchInvoices, fetchMembers, fetchPlans]);

  // Search & Filter States (Mirrors ReportsManager filters + Date selector)
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'THIS_YEAR'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // 'YYYY-MM'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'paid' | 'pending'
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL'); // 'ALL' | 'Cash' | 'UPI' | 'Split' | 'Split: GPay' | ...
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState({});
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfGeneratedData, setPdfGeneratedData] = useState(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [payingDueMember, setPayingDueMember] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (paymentMethodFilter !== 'ALL') count++;
    if (startDate) count++;
    if (endDate) count++;
    if (selectedMonth) count++;
    return count;
  }, [activeFilter, statusFilter, paymentMethodFilter, startDate, endDate, selectedMonth]);

  const handleResetFilters = () => {
    setActiveFilter('ALL');
    setStatusFilter('ALL');
    setPaymentMethodFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedMonth('');
    setSearchTerm('');
  };

  // Helper to test if a record date matches selected date range or month (Same as ReportsManager)
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

  // Helper to test if payment method matches filter (Same as ReportsManager)
  const matchesPaymentFilter = (inv, filter) => {
    if (!filter || filter === 'ALL') return true;
    const pm = (inv.paymentMethod || inv.payment_method || '').toLowerCase();

    if (filter === 'Cash') {
      const b = parseInvoicePaymentBreakdown(inv);
      return b.cash > 0 || (pm.includes('cash') && !pm.includes('split'));
    }
    if (filter === 'UPI') {
      const b = parseInvoicePaymentBreakdown(inv);
      return b.upi > 0 || pm === 'upi' || pm.includes('upi') || pm.includes('gpay') || pm.includes('phonepe');
    }
    if (filter === 'GPay') {
      return (pm === 'gpay' || pm.includes('gpay') || pm.includes('google pay'));
    }
    if (filter === 'PhonePe') {
      return (pm === 'phonepe' || pm.includes('phonepe') || pm.includes('phone pay') || pm.includes('phone_pe'));
    }
    if (filter === 'Account Transfer' || filter === 'Account') {
      const b = parseInvoicePaymentBreakdown(inv);
      return b.accountTransfer > 0 || pm.includes('account') || pm.includes('transfer') || pm.includes('bank') || pm.includes('neft') || pm.includes('imps');
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
    const cleanId = (v) => String(v || '').replace(/\D/g, '');

    gymInvoices.forEach((inv) => {
      const cleanInvId = cleanId(inv.memberId || inv.userId || inv.user_id);
      const cleanInvPhone = String(inv.memberPhone || inv.phone || '').replace(/\D/g, '').slice(-10);
      const invName = (inv.memberName || inv.member_name || '').trim().toLowerCase();

      const matchedMember = (members || []).find((m) => {
        const cleanMId = cleanId(m.id || m.userId || m.user_id);
        if (cleanInvId && cleanMId && cleanInvId === cleanMId) return true;
        const cleanMPhone = String(m.phone || '').replace(/\D/g, '').slice(-10);
        if (cleanInvPhone && cleanMPhone && cleanInvPhone === cleanMPhone) return true;
        if (invName && (m.name || '').trim().toLowerCase() === invName) return true;
        return false;
      });

      const memberKey = matchedMember?.id || (cleanInvId ? `mem-${cleanInvId}` : (inv.memberId || invName || 'Unknown'));
      const memberName = matchedMember?.name || inv.memberName || inv.member_name || 'Member';
      const memberAvatar = matchedMember?.avatar || null;
      const memberPhone = matchedMember?.phone || inv.memberPhone || inv.phone || '';
      const memberEmail = matchedMember?.email || inv.memberEmail || inv.email || '';
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
      const sortedInvoices = [...item.invoices].sort(compareInvoicesDesc);
      const matchedMemberObj = (members || []).find((m) => String(m.id) === String(item.memberId));
      const totalAmount = sortedInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const totalPending = sortedInvoices.reduce((sum, i) => {
        const p = Number(i.pendingAmount ?? i.duesAmount ?? ((i.status || '').toLowerCase() === 'pending' || (i.status || '').toLowerCase() === 'partial' ? (matchedMemberObj?.duesAmount || 0) : 0));
        return sum + p;
      }, 0);
      const paidCount = sortedInvoices.filter((i) => {
        const isPend = (i.status || '').toLowerCase() === 'pending' || (i.status || '').toLowerCase() === 'partial' || Number(i.pendingAmount || i.duesAmount || 0) > 0;
        return (i.status || '').toLowerCase() === 'paid' && !isPend;
      }).length;
      const pendingCount = sortedInvoices.filter((i) => {
        return (i.status || '').toLowerCase() !== 'paid' || Number(i.pendingAmount || i.duesAmount || 0) > 0;
      }).length;
      const latestInvoice = sortedInvoices[0];
      const latestDate = latestInvoice?.date || 'N/A';

      result.push({
        ...item,
        invoices: sortedInvoices,
        latestInvoice,
        totalAmount,
        totalPending,
        invoiceCount: sortedInvoices.length,
        paidCount,
        pendingCount,
        latestDate
      });
    });

    return result.sort((a, b) => compareInvoicesDesc(a.latestInvoice, b.latestInvoice));
  }, [gymInvoices, members]);

  // Selected Invoice Member Resolution
  const selectedInvoiceMember = useMemo(() => {
    if (!selectedInvoice) return null;
    const cleanId = (v) => String(v || '').replace(/\D/g, '');
    const cleanInvId = cleanId(selectedInvoice.memberId || selectedInvoice.userId || selectedInvoice.user_id);
    const invName = (selectedInvoice.memberName || selectedInvoice.member_name || '').trim().toLowerCase();

    return (
      members.find(
        (m) => {
          const cleanMId = cleanId(m.id || m.userId || m.user_id);
          if (cleanInvId && cleanMId && cleanInvId === cleanMId) return true;
          if (invName && (m.name || '').trim().toLowerCase() === invName) return true;
          return false;
        }
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

  const totalPendingAmount = useMemo(() => {
    return gymInvoices
      .filter((i) => (i.status || '').toLowerCase() !== 'paid')
      .reduce((acc, i) => acc + (Number(i.duesAmount || i.dues_amount || i.amount) || 0), 0);
  }, [gymInvoices]);

  // Filtered members based on search term AND active filters (dates, status, payment)
  const filteredMembers = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();

    return memberInvoicesMap
      .map((m) => {
        const matchingInvoices = m.invoices.filter((inv) => {
          // Status filter
          if (statusFilter !== 'ALL') {
            const s = String(inv.status || '').toLowerCase();
            const isPaid = s === 'paid' && Number(inv.pendingAmount || inv.duesAmount || 0) === 0;
            if (statusFilter.toLowerCase() === 'paid' && !isPaid) return false;
            if (statusFilter.toLowerCase() === 'pending' && isPaid) return false;
          }

          // Date criteria (Month, Start Date, End Date)
          const invDate = inv.date || inv.invoiceDate || inv.invoice_date || inv.issueDate || inv.issue_date || inv.createdAt || inv.created_at;
          if (!matchesDateCriteria(invDate)) return false;

          // Quick preset filter
          if (activeFilter !== 'ALL') {
            if (!matchesFilter(inv, activeFilter)) return false;
          }

          // Payment mode filter (covers All Modes, UPI, GPay, PhonePe, Account, Cash, and Split variants)
          if (paymentMethodFilter !== 'ALL') {
            if (!matchesPaymentFilter(inv, paymentMethodFilter)) return false;
          }

          return true;
        });

        const matchesSearch =
          !term ||
          m.name.toLowerCase().includes(term) ||
          (m.phone && m.phone.includes(term)) ||
          (m.email && m.email.toLowerCase().includes(term)) ||
          matchingInvoices.some(
            (inv) =>
              (inv.id && inv.id.toLowerCase().includes(term)) ||
              (inv.planName && inv.planName.toLowerCase().includes(term)) ||
              (inv.createdByName && inv.createdByName.toLowerCase().includes(term)) ||
              (inv.created_by_name && inv.created_by_name.toLowerCase().includes(term))
          );

        if (!matchesSearch || matchingInvoices.length === 0) return null;

        const sortedMatchingInvoices = [...matchingInvoices].sort(compareInvoicesDesc);
        const filteredTotal = sortedMatchingInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

        return {
          ...m,
          displayedInvoices: sortedMatchingInvoices,
          displayedTotal: filteredTotal,
          latestMatchingInvoice: sortedMatchingInvoices[0]
        };
      })
      .filter(Boolean)
      .sort((a, b) => compareInvoicesDesc(a.latestMatchingInvoice, b.latestMatchingInvoice));
  }, [memberInvoicesMap, searchTerm, statusFilter, selectedMonth, startDate, endDate, activeFilter, paymentMethodFilter]);

  // Dynamic figures for KPI cards based on current filtered state
  const currentDisplayedInvoices = useMemo(() => {
    const all = [];
    filteredMembers.forEach((m) => {
      all.push(...(m.displayedInvoices || []));
    });
    return all;
  }, [filteredMembers]);

  const displayedRevenue = useMemo(() => {
    if (activeFiltersCount === 0 && !searchTerm) return totalBilledRevenue;
    return currentDisplayedInvoices.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [currentDisplayedInvoices, activeFiltersCount, searchTerm, totalBilledRevenue]);

  const displayedPaidCount = useMemo(() => {
    if (activeFiltersCount === 0 && !searchTerm) return totalPaidInvoicesCount;
    return currentDisplayedInvoices.filter((i) => (i.status || '').toLowerCase() === 'paid').length;
  }, [currentDisplayedInvoices, activeFiltersCount, searchTerm, totalPaidInvoicesCount]);

  const displayedPendingCount = useMemo(() => {
    if (activeFiltersCount === 0 && !searchTerm) return totalPendingInvoicesCount;
    return currentDisplayedInvoices.filter((i) => (i.status || '').toLowerCase() !== 'paid').length;
  }, [currentDisplayedInvoices, activeFiltersCount, searchTerm, totalPendingInvoicesCount]);

  const displayedPendingAmount = useMemo(() => {
    if (activeFiltersCount === 0 && !searchTerm) return totalPendingAmount;
    return currentDisplayedInvoices
      .filter((i) => (i.status || '').toLowerCase() !== 'paid')
      .reduce((acc, i) => acc + (Number(i.duesAmount || i.dues_amount || i.amount) || 0), 0);
  }, [currentDisplayedInvoices, activeFiltersCount, searchTerm, totalPendingAmount]);

  const displayedAvgAmount = useMemo(() => {
    if (currentDisplayedInvoices.length === 0) return 0;
    return Math.round(displayedRevenue / currentDisplayedInvoices.length);
  }, [displayedRevenue, currentDisplayedInvoices.length]);

  // Live breakdown across all payment methods calculated directly from currentDisplayedInvoices
  // Dynamically recalculates whenever any filter (Month, Date Range, Status, Payment Mode, Preset, Search) changes
  const paymentBreakdown = useMemo(() => {
    let totalAllPayments = 0;
    let cashTotal = 0;
    let cashCount = 0;
    let upiTotal = 0;
    let upiCount = 0;
    let accountTransferTotal = 0;
    let accountTransferCount = 0;

    currentDisplayedInvoices.forEach((inv) => {
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
      totalCount: currentDisplayedInvoices.length,
      cashTotal,
      cashCount,
      upiTotal,
      upiCount,
      accountTransferTotal,
      accountTransferCount,
    };
  }, [currentDisplayedInvoices]);

  const filterSummaryTitle = useMemo(() => {
    const parts = [];
    if (paymentMethodFilter && paymentMethodFilter !== 'ALL') {
      parts.push(`${paymentMethodFilter} Payments`);
    }
    if (statusFilter && statusFilter !== 'ALL') {
      parts.push(statusFilter === 'paid' ? 'Paid Invoices' : 'Pending Invoices');
    }
    if (selectedMonth) {
      parts.push(`Month: ${selectedMonth}`);
    } else if (startDate || endDate) {
      parts.push(`Range: ${startDate || 'Any'} → ${endDate || 'Any'}`);
    } else if (activeFilter && activeFilter !== 'ALL') {
      const presetMap = {
        TODAY: "Today's",
        LAST_7_DAYS: "Last 7 Days",
        LAST_30_DAYS: "Last 30 Days",
        LAST_90_DAYS: "Last 90 Days",
        THIS_YEAR: "This Year's",
        PAID: "Paid Invoices",
        PENDING: "Pending Dues"
      };
      parts.push(presetMap[activeFilter] || activeFilter);
    }
    if (searchTerm) {
      parts.push(`Search: "${searchTerm}"`);
    }

    if (parts.length === 0) {
      return 'All Billed Invoices';
    }
    return parts.join(' • ');
  }, [paymentMethodFilter, statusFilter, selectedMonth, startDate, endDate, activeFilter, searchTerm]);

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
    <div className="space-y-4 animate-fadeIn pb-12 w-full">

      {/* 1. CLEAN & CALM HEADER */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
            Member Invoices
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Search member billing records, view payment history, and generate GST invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0 shadow-2xs"
          >
            {filteredMembers.length > 0 && filteredMembers.every((m) => expandedMembers[m.memberKey])
              ? 'Collapse All'
              : 'Expand All'}
          </button>

          <button
            type="button"
            onClick={() => setIsRecordPaymentOpen(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* 2. THE 4 COMPACT STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">

        {/* Total Invoiced */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setActiveFilter('ALL');
          }}
          className={`bg-white border rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between ${
            activeFilter === 'ALL' && statusFilter === 'ALL'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Total Invoiced
            </span>
            <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <IndianRupee className="w-3 h-3" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight my-0.5">
            ₹{(displayedRevenue / 100000).toFixed(2)}L
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-slate-500 font-medium pt-1 mt-0.5 border-t border-slate-100">
            <span>₹{displayedRevenue.toLocaleString('en-IN')} Total</span>
            <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold">
              {activeFilter === 'ALL' && statusFilter === 'ALL' ? '● Active' : 'View All'}
            </span>
          </div>
        </div>

        {/* Paid Invoices */}
        <div
          onClick={() => {
            setStatusFilter('paid');
            setActiveFilter('PAID');
          }}
          className={`bg-white border rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between ${
            statusFilter === 'paid' || activeFilter === 'PAID'
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Paid Invoices
            </span>
            <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
              <CheckCircle className="w-3 h-3" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight my-0.5">
            {displayedPaidCount}
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-blue-700 font-medium pt-1 mt-0.5 border-t border-slate-100">
            <span>Verified Settled</span>
            <span className="text-[9px] sm:text-[10px] text-blue-600 font-bold">
              {statusFilter === 'paid' || activeFilter === 'PAID' ? '● Active' : 'Filter'}
            </span>
          </div>
        </div>

        {/* Billed Members */}
        <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Billed Members
            </span>
            <div className="w-5 h-5 rounded-md bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
              <Users className="w-3 h-3" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight my-0.5">
            {filteredMembers.length}
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-purple-700 font-medium pt-1 mt-0.5 border-t border-slate-100">
            <span>Active Accounts</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">of {memberInvoicesMap.length} Total</span>
          </div>
        </div>

        {/* Pending Invoices */}
        <div
          onClick={() => {
            setStatusFilter('pending');
            setActiveFilter('PENDING');
          }}
          className={`bg-white border rounded-lg sm:rounded-xl p-2 sm:p-2.5 shadow-2xs cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between ${
            statusFilter === 'pending' || activeFilter === 'PENDING'
              ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Pending Invoices
            </span>
            <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-3 h-3" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-amber-600 tracking-tight my-0.5">
            {displayedPendingCount}
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-amber-700 font-medium pt-1 mt-0.5 border-t border-slate-100">
            <span>₹{displayedPendingAmount.toLocaleString('en-IN')} Due</span>
            <span className="text-[9px] sm:text-[10px] text-amber-600 font-bold">
              {statusFilter === 'pending' || activeFilter === 'PENDING' ? '● Active' : 'Filter'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SEARCH BAR, DATE & ADVANCED FILTERS (Matches Reports Page) */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-2 sm:gap-3">

          {/* Search Input with Autocomplete */}
          <div className="relative flex-1 min-w-0" ref={searchContainerRef}>
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
              className="w-full pl-8 sm:pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium truncate"
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

          <div className="flex items-center gap-2 shrink-0">

            {/* Dedicated Filter Button (With active badge - same as Reports page) */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${activeFiltersCount > 0
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
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
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Filters:</span>
            {selectedMonth && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                <Calendar className="w-3 h-3 text-emerald-600" />
                Month: {selectedMonth}
                <button type="button" onClick={() => setSelectedMonth('')} className="hover:text-emerald-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {startDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                From: {startDate}
                <button type="button" onClick={() => setStartDate('')} className="hover:text-emerald-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                To: {endDate}
                <button type="button" onClick={() => setEndDate('')} className="hover:text-emerald-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(statusFilter !== 'ALL' || (activeFilter !== 'ALL' && ['PAID', 'PENDING'].includes(activeFilter))) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium capitalize">
                Status: {statusFilter !== 'ALL' ? statusFilter : activeFilter}
                <button type="button" onClick={() => { setStatusFilter('ALL'); setActiveFilter('ALL'); }} className="hover:text-emerald-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {paymentMethodFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-800 border border-violet-200 rounded-lg text-xs font-medium">
                <Receipt className="w-3 h-3 text-violet-600" />
                Payment: {paymentMethodFilter}
                <button type="button" onClick={() => setPaymentMethodFilter('ALL')} className="hover:text-violet-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer ml-auto"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* 4 LIVE PAYMENT BREAKDOWN CARDS (FULL WIDTH, CENTERED & COMPACT) */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-emerald-50/70 border border-emerald-200/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 shadow-2xs w-full">
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

      {/* Advanced Filter Modal (Portalled to document.body, matching ReportsManager) */}
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
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Filter Invoice Data</h3>
                  <p className="text-xs text-slate-500">Apply custom date ranges, month selection, and payment statuses</p>
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
                  <span className="text-[11px] font-normal text-slate-400">View entire month's invoices</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMonth(val);
                      if (val) {
                        setStartDate(`${val}-01`);
                        const [yr, mo] = val.split('-').map(Number);
                        const lastDay = new Date(yr, mo, 0).getDate();
                        setEndDate(`${val}-${String(lastDay).padStart(2, '0')}`);
                      } else {
                        setStartDate('');
                        setEndDate('');
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
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${selectedMonth === mPreset.value
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

              {/* Start Date & End Date Selector */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Date Range (Start & End Date)
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
                    { id: 'paid', label: 'Paid Invoices' },
                    { id: 'pending', label: 'Pending / Due' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
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
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${paymentMethodFilter === pm.id
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
                    {currentDisplayedInvoices.length} {currentDisplayedInvoices.length === 1 ? 'Record' : 'Records'} Matched
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Total Filtered Amount
                    </span>
                    <span className="text-lg font-black text-slate-900">
                      ₹{displayedRevenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Average Ticket Value
                    </span>
                    <span className="text-sm font-black text-emerald-800">
                      ₹{displayedAvgAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Apply Filters (₹{displayedRevenue.toLocaleString('en-IN')} • {currentDisplayedInvoices.length} Invoices)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
              actionText="Create Invoice"
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
                  className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50/90 border-b border-slate-200' : 'hover:bg-slate-50/60'
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
                      {Number(member.totalPending || 0) > 0 && (
                        <div className="text-[10px] font-bold text-rose-600 flex items-center justify-end gap-0.5">
                          <span>₹{Number(member.totalPending).toLocaleString('en-IN')} Pending</span>
                        </div>
                      )}
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
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${isExpanded
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
                              <th className="py-2 px-3">Billed / Created By</th>
                              <th className="py-2 px-3 text-right">Amount</th>
                              <th className="py-2 px-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {invoicesList.map((inv) => {
                              const invPending = Number(
                                inv.pendingAmount ??
                                inv.duesAmount ??
                                inv.dues_amount ??
                                ((inv.status || '').toLowerCase() === 'pending' || (inv.status || '').toLowerCase() === 'partial'
                                  ? (member?.duesAmount || 0)
                                  : 0)
                              );
                              const isPendingInv = (inv.status || '').toLowerCase() === 'pending' || (inv.status || '').toLowerCase() === 'partial' || invPending > 0;

                              return (
                                <tr
                                  key={inv.id}
                                  onClick={() => setSelectedInvoice(inv)}
                                  className="hover:bg-emerald-50/50 cursor-pointer transition-colors group/row"
                                  title="Click to view tax invoice & receipt"
                                >
                                  <td className="py-2 sm:py-2.5 px-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold text-slate-900 group-hover/row:text-emerald-700 transition-colors text-xs">
                                        #{inv.id?.toUpperCase()}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyInvoiceId(inv.id, e);
                                        }}
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
                                    {isPendingInv ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        <span>Pending</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                        <span>Paid</span>
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-2 sm:py-2.5 px-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                        <User className="w-3 h-3" />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="font-semibold text-slate-800 text-xs block truncate max-w-[130px]">
                                          {resolveCreatorName(inv.createdByName || inv.created_by_name, inv)}
                                        </span>
                                        <span className="text-[9px] text-slate-400 capitalize block leading-none">
                                          {resolveCreatorRole(inv)}
                                        </span>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-2 sm:py-2.5 px-3 text-right whitespace-nowrap">
                                    <div>
                                      <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                                        ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                                      </span>
                                      {invPending > 0 && (
                                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">
                                          ₹{invPending.toLocaleString('en-IN')} Pending
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-2 sm:py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1.5">

                                      {/* 1. EDIT INVOICE BUTTON */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingInvoice(inv);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1"
                                        title="Edit Invoice Details, Amount, or Payment Method"
                                      >
                                        <Edit2 className="w-3 h-3 text-indigo-600" />
                                      </button>

                                      {/* 2. DIRECT DOWNLOAD PDF BUTTON */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadInvoicePdf(inv, member);
                                        }}
                                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
                                        title="Download Invoice as PDF"
                                      >
                                        <Download className="w-3.5 h-3.5 text-blue-600" />
                                      </button>

                                      {/* 3. SHARE INVOICE IN PDF FORMAT TO PARTICULAR MOBILE NUMBER */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSharePdfToMobileNumber(inv, member);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1"
                                        title={`Share invoice in PDF format to ${member.phone || 'mobile number'}`}
                                      >
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      </button>

                                      {/* 4. PAY REMAINING BALANCE DUE */}
                                      {invPending > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const target = member || {
                                              id: inv.memberId || inv.userId || inv.user_id,
                                              name: inv.memberName,
                                              phone: inv.memberPhone,
                                              email: inv.memberEmail,
                                              planName: inv.planName,
                                              duesAmount: invPending,
                                              dueDate: inv.dueDate || inv.due_date
                                            };
                                            setPayingDueMember(target);
                                          }}
                                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1 shadow-2xs"
                                          title="Pay remaining balance amount"
                                        >
                                          <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                                          <span>Pay Due</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
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
        title={`Invoice: #${selectedInvoice?.id?.toUpperCase()}`}
        maxWidth="max-w-4xl"
      >
        {selectedInvoice && (
          <div className="space-y-3.5">

            {/* CLEAN UNIFIED ACTION TOOLBAR */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-50/90 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">
                    Tax Invoice & Receipt
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Official gym payment voucher & tax summary
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDownloadInvoicePdf(selectedInvoice, selectedInvoiceMember)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  title="Download actual PDF file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSharePdfToMobileNumber(selectedInvoice, selectedInvoiceMember)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title={`Send PDF on WhatsApp to ${selectedInvoiceMember?.phone || 'Mobile'}`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingInvoice(selectedInvoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                  title="Edit invoice data and update revenue"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Edit</span>
                </button>

                {pdfPreviewUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(pdfPreviewUrl, '_blank')}
                    className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 cursor-pointer active:scale-95 transition-all shadow-2xs"
                    title="Open PDF in new browser tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* AUTHENTIC GYM MEMBERSHIP RECEIPT SHEET */}
            <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 text-slate-900 shadow-sm space-y-6 print:p-0 print:border-none">

                {/* Gym Header Branding & Receipt Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-base shadow-sm">
                      AF
                    </div>
                    <div>
                      <h2 className="font-bold text-lg sm:text-xl text-slate-900 tracking-tight">
                        {gymInfo?.name || 'ARCHFIT ATHLETIC CLUB'}
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
                    {(() => {
                      const selPending = Number(
                        selectedInvoice.pendingAmount ??
                        selectedInvoice.duesAmount ??
                        selectedInvoice.dues_amount ??
                        ((selectedInvoice.status || '').toLowerCase() === 'pending' || (selectedInvoice.status || '').toLowerCase() === 'partial'
                          ? (selectedInvoiceMember?.duesAmount || 0)
                          : 0)
                      );
                      const isPendingModal = (selectedInvoice.status || '').toLowerCase() === 'pending' || (selectedInvoice.status || '').toLowerCase() === 'partial' || selPending > 0;

                      if (isPendingModal) {
                        return (
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-700 border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Pending {selPending > 0 ? `• ₹${selPending.toLocaleString('en-IN')} Due` : ''}
                          </span>
                        );
                      }
                      return (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Payment Verified
                        </span>
                      );
                    })()}
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
                      <span>Member ID: <strong className="text-slate-800">{selectedInvoiceMember?.id || selectedInvoice.memberId || 'AF-M-101'}</strong></span>
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
                      <strong className="text-slate-800">{selectedInvoice.paymentMethod || 'UPI'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Created / Billed By:</span>
                      <strong className="text-slate-800 flex items-center gap-1 font-semibold text-xs">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{resolveCreatorName(selectedInvoice.createdByName || selectedInvoice.created_by_name, selectedInvoice)}</span>
                      </strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Settlement Status:</span>
                      {(() => {
                        const selPending = Number(
                          selectedInvoice.pendingAmount ??
                          selectedInvoice.duesAmount ??
                          selectedInvoice.dues_amount ??
                          ((selectedInvoice.status || '').toLowerCase() === 'pending' || (selectedInvoice.status || '').toLowerCase() === 'partial'
                            ? (selectedInvoiceMember?.duesAmount || 0)
                            : 0)
                        );
                        const isPendingModal = (selectedInvoice.status || '').toLowerCase() === 'pending' || (selectedInvoice.status || '').toLowerCase() === 'partial' || selPending > 0;

                        if (isPendingModal) {
                          return (
                            <strong className="text-amber-700 flex items-center gap-1 font-bold">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>Pending {selPending > 0 ? `(₹${selPending.toLocaleString('en-IN')} Due)` : ''}</span>
                            </strong>
                          );
                        }
                        return (
                          <strong className="text-emerald-700 flex items-center gap-1 font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Paid & Active</span>
                          </strong>
                        );
                      })()}
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
                      {(() => {
                        const selPending = Number(
                          selectedInvoice.pendingAmount ??
                          selectedInvoice.duesAmount ??
                          selectedInvoice.dues_amount ??
                          ((selectedInvoice.status || '').toLowerCase() === 'pending' || (selectedInvoice.status || '').toLowerCase() === 'partial'
                            ? (selectedInvoiceMember?.duesAmount || 0)
                            : 0)
                        );
                        return (
                          <>
                            <span className="text-xs text-slate-400 block">Total Subscription Fee</span>
                            <span className="text-xl sm:text-2xl font-black text-slate-900">
                              ₹{Number(selectedInvoice.totalAmount || (Number(selectedInvoice.amount || 0) + selPending)).toLocaleString('en-IN')}
                            </span>
                            {selPending > 0 && (
                              <span className="text-[11px] font-bold text-rose-600 block mt-0.5">
                                (₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')} Paid • ₹{selPending.toLocaleString('en-IN')} Pending)
                              </span>
                            )}
                          </>
                        );
                      })()}
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
                      <span>Turnstile QR Pass on ArchFit Mobile App</span>
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
                    {Boolean(selectedInvoice.isGstIncluded ?? selectedInvoice.hasGst ?? selectedInvoice.gst_included ?? true) ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Plan Base Fee:</span>
                          <span className="font-semibold text-slate-800">
                            ₹{Math.round(Number(selectedInvoice.amount || 0) / 1.18).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>CGST (9%):</span>
                          <span>₹{Math.round((Number(selectedInvoice.amount || 0) - Math.round(Number(selectedInvoice.amount || 0) / 1.18)) / 2).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>SGST (9%):</span>
                          <span>₹{(Number(selectedInvoice.amount || 0) - Math.round(Number(selectedInvoice.amount || 0) / 1.18) - Math.round((Number(selectedInvoice.amount || 0) - Math.round(Number(selectedInvoice.amount || 0) / 1.18)) / 2)).toLocaleString('en-IN')}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Tax Type:</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          Non-GST Payment (No Tax Bifurcation)
                        </span>
                      </div>
                    )}
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
                    <div className="font-bold text-slate-800 text-xs mt-0.5">
                      {resolveCreatorName(selectedInvoice.createdByName || selectedInvoice.created_by_name, selectedInvoice)}
                    </div>
                    <div className="text-[10px] text-slate-400">ArchFit Athletic Club</div>
                  </div>
                </div>
              </div>

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

      {/* PAY REMAINING BALANCE MODAL */}
      <PayDueModal
        isOpen={!!payingDueMember}
        onClose={() => setPayingDueMember(null)}
        member={payingDueMember}
      />

      {/* EDIT INVOICE & REVENUE MODAL */}
      <EditInvoiceModal
        isOpen={Boolean(editingInvoice)}
        invoice={editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onUpdated={(updated) => {
          if (selectedInvoice && (selectedInvoice.id === updated.id || selectedInvoice.numericId === updated.numericId)) {
            setSelectedInvoice((prev) => ({ ...prev, ...updated }));
          }
        }}
      />

    </div>
  );
};
