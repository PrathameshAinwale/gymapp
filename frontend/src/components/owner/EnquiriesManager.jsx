import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  isValidEmail,
  isValidPhone,
  hasSqlInjection,
  sanitizeText,
  sanitizePhone,
  preventNonPhoneKey
} from '../../utils/validation';
import {
  PhoneCall,
  Search,
  Plus,
  Filter,
  X,
  UserPlus,
  UserCheck,
  Calendar,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  Trash2,
  TrendingUp,
  AlertCircle,
  Tag,
  ArrowRight,
  User,
  MessageSquare,
  MessageSquarePlus,
  UserX,
  MessageCircle,
  Archive,
  Edit2,
  Flame,
  Zap,
  Snowflake,
  KeyRound,
  Sparkles,
  Camera,
  Upload,
  Copy,
  Check,
  ChevronDown,
  Loader2,
  RotateCw
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { AddMemberModal } from './AddMemberModal';
import { EmptyState } from '../common/EmptyState';

export const EnquiriesManager = ({ onConvertLeadToMember }) => {
  const {
    enquiries,
    fetchEnquiries,
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    convertEnquiryToMember,
    scrapEnquiry,
    plans,
    trainers,
    addMember,
    addToast,
    loadingModules
  } = useGymData();
  const { currentUser, registerAccount } = useAuth();

  const [isLoadingEnquiries, setIsLoadingEnquiries] = useState(false);

  useEffect(() => {
    let active = true;
    const runFetch = async () => {
      if (!enquiries || enquiries.length === 0) {
        setIsLoadingEnquiries(true);
      }
      try {
        await fetchEnquiries?.();
      } finally {
        if (active) setIsLoadingEnquiries(false);
      }
    };
    runFetch();
    return () => { active = false; };
  }, [fetchEnquiries]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingScrap, setIsSubmittingScrap] = useState(false);
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);

  // Edit Lead Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState(null);

  // Scrap Modal State
  const [scrapModalOpen, setScrapModalOpen] = useState(false);
  const [leadToScrap, setLeadToScrap] = useState(null);
  const [scrapReason, setScrapReason] = useState('Pricing Too High');

  // Comment Modal State
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedEnquiryForComment, setSelectedEnquiryForComment] = useState(null);
  const [commentText, setCommentText] = useState('');

  // Intended Add Member Modal State (opens comprehensive AddMemberModal)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberInitialData, setAddMemberInitialData] = useState(null);

  const defaultStaffName = currentUser?.name
    ? `${currentUser.name} (${currentUser.role === 'owner' ? 'Owner' : 'Staff'})`
    : 'Pooja Sharma (Front Desk)';

  // Helper: Format today's date as DD-MM-YYYY
  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Helper: Parse note to extract leading date or attach fallback date
  const parseNoteWithDate = (notes, fallbackDate) => {
    if (!notes) return { date: null, text: '' };

    const match = notes.match(/^\[([0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4})\]\s*(.*)/s);
    if (match) {
      return { date: match[1], text: match[2] };
    }

    let displayDate = null;
    if (fallbackDate) {
      if (fallbackDate.includes('-')) {
        const parts = fallbackDate.split('-');
        if (parts[0].length === 4) {
          displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        } else {
          displayDate = fallbackDate;
        }
      } else {
        displayDate = fallbackDate;
      }
    }

    return { date: displayDate, text: notes };
  };

  // Helper: Normalize any legacy status / priority to exactly the 5 allowed statuses
  const normalizeStatus = (enquiry) => {
    if (!enquiry) return 'Warm';
    if (enquiry.isScrapped || enquiry.status === 'Dropped' || enquiry.status === 'Lost' || enquiry.status === 'Not Interested') {
      return 'Not Interested';
    }
    if (enquiry.status === 'Converted') {
      return 'Converted';
    }
    if (['Hot', 'Warm', 'Cold', 'Converted', 'Not Interested'].includes(enquiry.status)) {
      return enquiry.status;
    }
    if (['Hot', 'Warm', 'Cold'].includes(enquiry.priority)) {
      return enquiry.priority;
    }
    return 'Warm';
  };
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Walk-in',
    interestedPlan: plans[0]?.name || '',
    goal: 'Weight Loss & Fitness',
    status: 'Warm',
    staffName: defaultStaffName,
    notes: ''
  });

  // KPI Calculations based on unified statuses
  const totalCount = enquiries.length;
  const hotCount = enquiries.filter((e) => normalizeStatus(e) === 'Hot').length;
  const warmCount = enquiries.filter((e) => normalizeStatus(e) === 'Warm').length;
  const coldCount = enquiries.filter((e) => normalizeStatus(e) === 'Cold').length;
  const convertedCount = enquiries.filter((e) => normalizeStatus(e) === 'Converted').length;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'ALL') count++;
    if (selectedMonth) count++;
    if (startDate || endDate) count++;
    if (sourceFilter !== 'ALL') count++;
    if (planFilter !== 'ALL') count++;
    return count;
  }, [statusFilter, selectedMonth, startDate, endDate, sourceFilter, planFilter]);

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setSelectedMonth('');
    setStartDate('');
    setEndDate('');
    setSourceFilter('ALL');
    setPlanFilter('ALL');
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase().trim();
    return enquiries
      .filter((e) =>
        (e.name || '').toLowerCase().includes(term) ||
        (e.phone || '').includes(term) ||
        (e.email || '').toLowerCase().includes(term) ||
        (e.interestedPlan || '').toLowerCase().includes(term) ||
        (e.source || '').toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [searchTerm, enquiries]);

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      const currentStatus = normalizeStatus(e);
      const term = (searchTerm || '').trim().toLowerCase();
      const matchesSearch =
        !term ||
        (e.name || '').toLowerCase().includes(term) ||
        (e.phone || '').includes(term) ||
        (e.email || '').toLowerCase().includes(term) ||
        (e.staffName || '').toLowerCase().includes(term) ||
        (e.source || '').toLowerCase().includes(term) ||
        (e.interestedPlan || '').toLowerCase().includes(term) ||
        (e.goal || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // Status
      if (statusFilter !== 'ALL' && currentStatus !== statusFilter) return false;

      // Source
      if (sourceFilter !== 'ALL' && (e.source || '').toLowerCase() !== sourceFilter.toLowerCase()) return false;

      // Plan
      if (planFilter !== 'ALL' && !(e.interestedPlan || '').toLowerCase().includes(planFilter.toLowerCase())) return false;

      // Date Range (created_at, date, noteDate)
      if (selectedMonth || startDate || endDate) {
        const rawDate = e.date || e.created_at || e.createdAt || e.noteDate;
        if (!rawDate) return false;
        const d = String(rawDate).split('T')[0];
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }

      return true;
    });
  }, [enquiries, searchTerm, statusFilter, sourceFilter, planFilter, selectedMonth, startDate, endDate]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      if (addToast) addToast('Please enter both prospect full name and mobile number.', 'error');
      return;
    }

    if (
      hasSqlInjection(formData.name) ||
      hasSqlInjection(formData.phone) ||
      hasSqlInjection(formData.email) ||
      hasSqlInjection(formData.notes) ||
      hasSqlInjection(formData.goal)
    ) {
      if (addToast) addToast('Security Warning: Disallowed characters or potential SQL injection detected.', 'error');
      return;
    }

    if (!isValidPhone(formData.phone)) {
      if (addToast) addToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      if (addToast) addToast('Please enter a valid email address.', 'error');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const today = getTodayFormatted();
      const cleanNotes = (formData.notes || '').replace(/^\[[0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4}\]\s*/, '').trim();
      const stampedNote = cleanNotes ? `[${today}] ${cleanNotes}` : '';

      await addEnquiry({
        ...formData,
        status: formData.status || 'Warm',
        priority: ['Hot', 'Warm', 'Cold'].includes(formData.status) ? formData.status : 'Warm',
        notes: stampedNote,
        noteDate: cleanNotes ? today : null
      });

      setIsAddModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        source: 'Walk-in',
        interestedPlan: plans[0]?.name || '',
        goal: 'Weight Loss & Fitness',
        status: 'Warm',
        staffName: defaultStaffName,
        notes: ''
      });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    const updates = { status: newStatus };
    if (['Hot', 'Warm', 'Cold'].includes(newStatus)) {
      updates.priority = newStatus;
      updates.isScrapped = false;
    } else if (newStatus === 'Not Interested') {
      updates.isScrapped = true;
    } else if (newStatus === 'Converted') {
      updates.isScrapped = false;
    } else {
      updates.isScrapped = false;
    }
    updateEnquiry(id, updates);
  };

  const handleOpenEditModal = (enquiry) => {
    const currentStatus = normalizeStatus(enquiry);
    const cleanNotes = (enquiry.notes || '').replace(/^\[[0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4}\]\s*/, '').trim();
    setEditingEnquiry({
      id: enquiry.id,
      name: enquiry.name || '',
      phone: enquiry.phone || '',
      email: enquiry.email || '',
      source: enquiry.source || 'Walk-in',
      interestedPlan: enquiry.interestedPlan || (plans[0]?.name || ''),
      goal: enquiry.goal || 'Weight Loss & Fitness',
      status: currentStatus,
      staffName: enquiry.staffName || defaultStaffName,
      notes: cleanNotes
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEnquiry || !editingEnquiry.name || !editingEnquiry.phone) {
      if (addToast) addToast('Please enter both prospect full name and mobile number.', 'error');
      return;
    }

    if (
      hasSqlInjection(editingEnquiry.name) ||
      hasSqlInjection(editingEnquiry.phone) ||
      hasSqlInjection(editingEnquiry.email) ||
      hasSqlInjection(editingEnquiry.notes) ||
      hasSqlInjection(editingEnquiry.goal)
    ) {
      if (addToast) addToast('Security Warning: Disallowed characters or potential SQL injection detected.', 'error');
      return;
    }

    if (!isValidPhone(editingEnquiry.phone)) {
      if (addToast) addToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    if (editingEnquiry.email && !isValidEmail(editingEnquiry.email)) {
      if (addToast) addToast('Please enter a valid email address.', 'error');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      const today = getTodayFormatted();
      const cleanNotes = (editingEnquiry.notes || '').replace(/^\[[0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4}\]\s*/, '').trim();
      const stampedNote = cleanNotes ? `[${today}] ${cleanNotes}` : '';

      await updateEnquiry(editingEnquiry.id, {
        ...editingEnquiry,
        notes: stampedNote,
        noteDate: cleanNotes ? today : null,
        priority: ['Hot', 'Warm', 'Cold'].includes(editingEnquiry.status) ? editingEnquiry.status : 'Warm'
      });
      setIsEditModalOpen(false);
      setEditingEnquiry(null);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleOpenCommentModal = (enquiry) => {
    setSelectedEnquiryForComment(enquiry);
    const cleanNotes = (enquiry.notes || '').replace(/^\[[0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4}\]\s*/, '').trim();
    setCommentText(cleanNotes);
    setCommentModalOpen(true);
  };

  const handleSaveComment = async (e) => {
    e.preventDefault();
    if (!selectedEnquiryForComment) return;
    try {
      setIsSubmittingComment(true);
      const today = getTodayFormatted();
      const cleanText = commentText.replace(/^\[[0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4}\]\s*/, '').trim();
      const stampedNote = cleanText ? `[${today}] ${cleanText}` : '';
      await updateEnquiry(selectedEnquiryForComment.id, { 
        notes: stampedNote,
        noteDate: cleanText ? today : null
      });
      setCommentModalOpen(false);
      setSelectedEnquiryForComment(null);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleOpenScrapModal = (enquiry) => {
    setLeadToScrap(enquiry);
    setScrapReason('Pricing Too High');
    setScrapModalOpen(true);
  };

  const handleConfirmScrap = async (e) => {
    e.preventDefault();
    if (!leadToScrap) return;
    try {
      setIsSubmittingScrap(true);
      const today = getTodayFormatted();
      const existingNotes = (leadToScrap.notes || '').trim();
      const reasonText = `[Reason: ${scrapReason}]`;
      const updatedNotes = existingNotes
        ? `${existingNotes} ${reasonText}`
        : `[${today}] ${reasonText}`;

      await updateEnquiry(leadToScrap.id, {
        status: 'Not Interested',
        isScrapped: true,
        notes: updatedNotes
      });
      setScrapModalOpen(false);
      setLeadToScrap(null);
    } finally {
      setIsSubmittingScrap(false);
    }
  };

  const handleConvertToMember = (enquiry) => {
    updateEnquiry(enquiry.id, { status: 'Converted' });
    if (onConvertLeadToMember) {
      onConvertLeadToMember(enquiry);
    }
  };

  const handleOpenAddMemberModal = (enquiry) => {
    // Match plan from interestedPlan if possible
    const matchedPlan = plans.find((p) =>
      p.name?.toLowerCase().trim() === (enquiry.interestedPlan || '').toLowerCase().trim() ||
      p.id === enquiry.interestedPlan
    ) || plans[0];

    const cleanNotes = (enquiry.notes || '').replace(/^\[[0-9]{2,4}[-/][0-9]{2}[-/][0-9]{2,4}\]\s*/, '').trim();

    setAddMemberInitialData({
      name: enquiry.name || '',
      phone: enquiry.phone || '',
      email: enquiry.email || '',
      goal: enquiry.goal || 'Muscle Gain & Strength',
      planId: matchedPlan?.id || plans[0]?.id || '',
      medicalNotes: '',
      enquiryNotes: cleanNotes || '',
      emergencyContact: enquiry.phone || '',
      enquiryId: enquiry.id,
    });
    setIsAddMemberModalOpen(true);
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">Leads & Enquiries</h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Capture, track, and convert prospective walk-ins, calls, and online inquiries into active gym members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">New Enquiry</span>
            <span className="inline sm:hidden">Add Lead</span>
          </button>
        </div>
      </div>
      {/* Search & Filter Toolbar (Matches Member Directory, Invoices & Reports) */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
          {/* Search Input with Autocomplete */}
          <div className="relative flex-1" ref={searchContainerRef}>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              placeholder="Search leads by name, phone, email, source, plan, or notes..."
              className="w-full pl-8 sm:pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
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
                  Matching Leads ({searchSuggestions.length})
                </div>
                {searchSuggestions.map((ld) => (
                  <div
                    key={ld.id}
                    onClick={() => {
                      setSearchTerm(ld.name);
                      setIsSearchDropdownOpen(false);
                    }}
                    className="p-2.5 hover:bg-emerald-50/70 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center border border-emerald-200">
                        {(ld.name || 'L').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-emerald-700">
                          {ld.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ld.phone || ld.email || ld.source}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                        {ld.interestedPlan || ld.goal || 'General Lead'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        normalizeStatus(ld) === 'Hot' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        normalizeStatus(ld) === 'Warm' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        normalizeStatus(ld) === 'Converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {normalizeStatus(ld)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Dedicated Filter Button */}
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeFiltersCount > 0
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
            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                Status: {statusFilter}
                <button type="button" onClick={() => setStatusFilter('ALL')} className="hover:text-emerald-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {sourceFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-medium">
                Source: {sourceFilter}
                <button type="button" onClick={() => setSourceFilter('ALL')} className="hover:text-blue-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {planFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-medium">
                Plan: {planFilter}
                <button type="button" onClick={() => setPlanFilter('ALL')} className="hover:text-purple-950 cursor-pointer">
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

      {/* Leads Count & Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5 font-medium">
        <span>
          Showing <strong className="text-emerald-700">{filteredEnquiries.length}</strong> of {totalCount} Enquiries
        </span>
        {searchTerm && (
          <span className="text-[11px] text-slate-400">
            Filtered by "{searchTerm}"
          </span>
        )}
      </div>

      {/* Leads Mobile Cards View */}
      <div className="block sm:hidden space-y-2.5">
        {isLoadingEnquiries ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading Leads & Enquiries...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching records from database</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-200">
            <EmptyState
              icon={PhoneCall}
              title={searchTerm || statusFilter !== 'ALL' ? "No matching enquiries found" : "No Enquiries Yet"}
              description={
                searchTerm || statusFilter !== 'ALL'
                  ? "No prospect leads match your current search or status filters. Try clearing your filters or add a new enquiry."
                  : "Capture prospect walk-ins, phone calls, and web inquiries to grow your gym membership base."
              }
              actionText="Add New Enquiry"
              onAction={() => setIsAddModalOpen(true)}
              secondaryActionText={activeFiltersCount > 0 || searchTerm ? "Clear All Filters" : undefined}
              onSecondaryAction={handleResetFilters}
              color="emerald"
            />
          </div>
        ) : (
          filteredEnquiries.map((enq) => {
            const currentStatus = normalizeStatus(enq);
            const noteInfo = parseNoteWithDate(enq.notes, enq.noteDate || enq.followUpDate || enq.createdDate);

            return (
              <div
                key={enq.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">{enq.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{enq.phone}</div>
                  </div>
                  <div className="relative inline-flex items-center shrink-0">
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                      className={`appearance-none pl-5 pr-4 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer focus:outline-none transition-all ${
                        currentStatus === 'Hot'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : currentStatus === 'Warm'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : currentStatus === 'Cold'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : currentStatus === 'Converted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="Converted">Converted</option>
                      <option value="Not Interested">Dropped</option>
                    </select>
                    <div className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      {currentStatus === 'Hot' ? (
                        <Flame className="w-2.5 h-2.5 text-rose-600" />
                      ) : currentStatus === 'Warm' ? (
                        <Zap className="w-2.5 h-2.5 text-amber-600" />
                      ) : currentStatus === 'Cold' ? (
                        <Snowflake className="w-2.5 h-2.5 text-blue-500" />
                      ) : currentStatus === 'Converted' ? (
                        <UserCheck className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <UserX className="w-2.5 h-2.5 text-slate-500" />
                      )}
                    </div>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 text-[10px]">
                  <div>
                    <span className="text-slate-400 font-medium block">Interested In</span>
                    <span className="font-bold text-slate-800 truncate block">{enq.interestedPlan || 'General / Not Decided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Goal</span>
                    <span className="font-semibold text-slate-700 truncate block">{enq.goal}</span>
                  </div>
                </div>

                {enq.notes && (
                  <div
                    onClick={() => handleOpenCommentModal(enq)}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 cursor-pointer"
                  >
                    <span className="italic line-clamp-1">"{noteInfo.text}"</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {enq.phone && (
                      <a
                        href={`https://wa.me/${(enq.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${enq.name}, greetings from Pulse Fitness! Following up on your enquiry.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>Chat</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenCommentModal(enq)}
                      className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3 text-slate-400" />
                      <span>Note</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {currentStatus === 'Converted' && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddMemberModal(enq)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                        title="Add Member - Register & Enroll this Lead"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Add Member</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(enq)}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 active:scale-95 transition-all cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEnquiry(enq.id)}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 active:scale-95 transition-all cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Enquiries Table Card (Desktop View) */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl lg:rounded-3xl shadow-sm overflow-hidden">
        {isLoadingEnquiries ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-9 h-9 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading Leads & Enquiries...</p>
            <p className="text-xs text-slate-400 mt-1">Fetching records from database</p>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={PhoneCall}
              title={searchTerm || statusFilter !== 'ALL' ? "No matching enquiries found" : "No Enquiries Yet"}
              description={
                searchTerm || statusFilter !== 'ALL'
                  ? "No prospect leads match your current search or status filters. Try clearing your filters or add a new enquiry."
                  : "Capture prospect walk-ins, phone calls, and web inquiries to grow your gym membership base."
              }
              actionText="Add New Enquiry"
              onAction={() => setIsAddModalOpen(true)}
              secondaryActionText={activeFiltersCount > 0 || searchTerm ? "Clear All Filters" : undefined}
              onSecondaryAction={handleResetFilters}
              color="emerald"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Prospect Details</th>
                  <th className="py-3.5 px-4">Interested Plan & Goal</th>
                  <th className="py-3.5 px-4">Status & Source</th>
                  <th className="py-3.5 px-4">Logged By Staff</th>
                  <th className="py-3.5 px-4">Staff Comments</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEnquiries.map((enq) => {
                  const currentStatus = normalizeStatus(enq);
                  const isConverted = currentStatus === 'Converted';
                  const isNotInterested = currentStatus === 'Not Interested';
                  const noteInfo = parseNoteWithDate(enq.notes, enq.noteDate || enq.followUpDate || enq.createdDate);

                  return (
                    <tr key={enq.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Prospect Name & Phone */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-bold text-slate-900 text-sm leading-snug">{enq.name}</div>
                        <div className="flex items-center gap-1.5 font-medium text-slate-900 text-[11px] flex-wrap">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{enq.phone}</span>
                          {enq.phone && (
                            <a
                              href={`https://wa.me/${(enq.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${enq.name}, greetings from Pulse Fitness! We are following up on your enquiry for the ${enq.interestedPlan} plan. Would you like to book a complimentary trial session this week?`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold transition-colors"
                              title="1-Click WhatsApp Follow-up"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Interested Plan & Goal */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{enq.interestedPlan || 'General / Not Decided'}</div>
                        <div className="text-[11px] text-slate-500">{enq.goal}</div>
                      </td>

                      {/* Unified Status & Source (Only: Hot, Warm, Cold, Converted, Not Interested) */}
                      <td className="py-3.5 px-4">
                        <div className="relative inline-flex items-center">
                          <select
                            value={currentStatus}
                            onChange={(e) => handleStatusChange(enq.id, e.target.value)}
                            className={`appearance-none pl-5 pr-4 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer focus:outline-none transition-colors ${
                              currentStatus === 'Hot'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : currentStatus === 'Warm'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : currentStatus === 'Cold'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : currentStatus === 'Converted'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                            title="Change Lead Status"
                          >
                            <option value="Hot">Hot</option>
                            <option value="Warm">Warm</option>
                            <option value="Cold">Cold</option>
                            <option value="Converted">Converted</option>
                            <option value="Not Interested">Not Interested</option>
                          </select>
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            {currentStatus === 'Hot' ? (
                              <Flame className="w-2.5 h-2.5 text-rose-600" />
                            ) : currentStatus === 'Warm' ? (
                              <Zap className="w-2.5 h-2.5 text-amber-600" />
                            ) : currentStatus === 'Cold' ? (
                              <Snowflake className="w-2.5 h-2.5 text-blue-500" />
                            ) : currentStatus === 'Converted' ? (
                              <UserCheck className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <UserX className="w-2.5 h-2.5 text-slate-500" />
                            )}
                          </div>
                          <ChevronDown className="w-2.5 h-2.5 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Source: {enq.source || 'Walk-in'}</div>
                      </td>

                      {/* Logged By Staff */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs truncate max-w-[135px]" title={enq.staffName}>
                              {enq.staffName || 'Front Desk Staff'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Staff Comments / Discussion Notes with Date in Front */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        {enq.notes ? (
                          <div
                            onClick={() => handleOpenCommentModal(enq)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-slate-700 text-[11px] leading-relaxed cursor-pointer transition-all group"
                            title="Click to view or edit comment"
                          >
                            <div className="flex items-start gap-1.5 flex-wrap">
                              {noteInfo.date && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-100/90 text-emerald-800 border border-emerald-300 font-bold text-[10px] not-italic">
                                  {noteInfo.date}
                                </span>
                              )}
                              <p className="line-clamp-2 italic text-slate-600 group-hover:text-slate-900">
                                "{noteInfo.text}"
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 mt-1">
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>Edit Comment</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenCommentModal(enq)}
                            className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-[11px] font-medium text-slate-400 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            <span>+ Add Comment</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {currentStatus === 'Converted' && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddMemberModal(enq)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
                              title="Add Member - Register & Enroll this Lead"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add Member</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(enq)}
                            className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit All Lead Fields"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEnquiry(enq.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Enquiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Enquiry Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Gym Enquiry / Lead"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Prospect Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vikram Malhotra"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Phone Number *</label>
              <input
                type="tel"
                required
                maxLength={10}
                inputMode="numeric"
                onKeyDown={preventNonPhoneKey}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                placeholder="10-digit mobile number"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="prospect@email.com"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Lead Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Walk-in">Walk-in Visit</option>
                <option value="Phone Call">Phone Inquiry</option>
                <option value="Instagram Ad">Instagram / Social Media</option>
                <option value="Google Search">Google Search / Maps</option>
                <option value="Member Referral">Member Referral</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Interested Plan</label>
              <select
                value={formData.interestedPlan || ''}
                onChange={(e) => setFormData({ ...formData, interestedPlan: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">-- General / Not Decided --</option>
                {plans && plans.length > 0 ? (
                  plans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} (₹{p.price})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No membership plans added yet</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Fitness Goal</label>
              <input
                type="text"
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="e.g. Weight Loss & Muscle Gain"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Lead Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Hot">Hot (Ready to join immediately)</option>
              <option value="Warm">Warm (Interested / in discussions)</option>
              <option value="Cold">Cold (Just enquiring)</option>
              <option value="Converted">Converted (Active Member)</option>
              <option value="Not Interested">Not Interested (Dropped / Scrapped)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Logged By Staff Member <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.staffName}
                onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                placeholder="e.g. Pooja Sharma, Coach Alex, Owner"
                list="staff-name-datalist"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
              <datalist id="staff-name-datalist">
                <option value={`${currentUser?.name || 'Vikramaditya Singhania'} (Owner)`} />
                <option value="Pooja Sharma (Front Desk)" />
                <option value="Rohan Deshmukh (Front Desk)" />
                {trainers?.map((t) => (
                  <option key={t.id} value={`${t.name} (Coach)`} />
                ))}
              </datalist>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Identifies which staff member, coach, or receptionist received and registered this lead.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="block text-[10px] font-bold text-slate-700">Notes & Discussion Summary</label>
              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Date Stamped: {getTodayFormatted()}
              </span>
            </div>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add details about their requirement, preferred gym timings, questions asked..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
            <p className="text-[9px] text-slate-400 mt-0.5">
              Today's date ({getTodayFormatted()}) will automatically be saved in front of this note.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAdd}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isSubmittingAdd && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmittingAdd ? 'Saving...' : 'Save Enquiry'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Edit Comment Modal */}
      <Modal
        isOpen={commentModalOpen}
        onClose={() => {
          setCommentModalOpen(false);
          setSelectedEnquiryForComment(null);
        }}
        title={`Staff Comment - ${selectedEnquiryForComment?.name || 'Prospect'}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveComment} className="space-y-2.5">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-0.5">
            <div className="font-bold text-slate-800">Prospect: {selectedEnquiryForComment?.name}</div>
            <div className="text-[10px] text-slate-500">
              Plan: {selectedEnquiryForComment?.interestedPlan} | Logged by: {selectedEnquiryForComment?.staffName || 'Staff'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="block text-[10px] font-bold text-slate-700">
                Staff Comment / Discussion Notes
              </label>
              <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Note Date: {getTodayFormatted()}
              </span>
            </div>
            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Enter discussion notes, specific requirements, trial feedback, or follow-up summary..."
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
            <p className="text-[9px] text-slate-400 mt-0.5">
              Today's date ({getTodayFormatted()}) will automatically be placed in front of this note.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setCommentModalOpen(false);
                setSelectedEnquiryForComment(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingComment}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isSubmittingComment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmittingComment ? 'Saving...' : 'Save Comment'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Scrap Lead Modal (24-Month Retention Policy) */}
      <Modal
        isOpen={scrapModalOpen}
        onClose={() => {
          setScrapModalOpen(false);
          setLeadToScrap(null);
        }}
        title="Mark Lead as Not Interested"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleConfirmScrap} className="space-y-2.5">
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-0.5">
            <div className="font-bold flex items-center gap-1 text-amber-900 text-[11px]">
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>Lead Retention Policy</span>
            </div>
            <p className="text-[10px] leading-relaxed text-amber-700">
              This lead will be marked as <strong>Not Interested</strong> and archived for compliance audits.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-0.5">
            <div className="font-bold text-slate-900">{leadToScrap?.name}</div>
            <div className="text-[10px] text-slate-500">
              {leadToScrap?.phone} | Plan: {leadToScrap?.interestedPlan}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Select Reason *
            </label>
            <select
              value={scrapReason}
              onChange={(e) => setScrapReason(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Pricing Too High">Pricing Too High / Budget Constraint</option>
              <option value="Location / Relocation">Location / Relocation Far Away</option>
              <option value="Joined Another Gym">Joined Another Gym / Competitor</option>
              <option value="No Longer Interested">No Longer Interested in Fitness</option>
              <option value="Unreachable After Multiple Calls">Unreachable After Multiple Callback Attempts</option>
              <option value="Other">Other / Miscellaneous</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setScrapModalOpen(false);
                setLeadToScrap(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingScrap}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isSubmittingScrap && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmittingScrap ? 'Updating...' : 'Mark as Not Interested'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Enquiry / Lead Modal (All Fields Editable) */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEnquiry(null);
        }}
        title={`Edit Lead Details - ${editingEnquiry?.name || 'Enquiry'}`}
        maxWidth="max-w-lg"
      >
        {editingEnquiry && (
          <form onSubmit={handleSaveEdit} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Prospect Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingEnquiry.name}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, name: e.target.value })}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  inputMode="numeric"
                  onKeyDown={preventNonPhoneKey}
                  value={editingEnquiry.phone}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, phone: sanitizePhone(e.target.value) })}
                  placeholder="10-digit mobile number"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Email Address</label>
                <input
                  type="email"
                  value={editingEnquiry.email}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, email: e.target.value })}
                  placeholder="prospect@email.com"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Lead Source</label>
                <select
                  value={editingEnquiry.source}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, source: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Walk-in">Walk-in Visit</option>
                  <option value="Phone Call">Phone Inquiry</option>
                  <option value="Instagram Ad">Instagram / Social Media</option>
                  <option value="Google Search">Google Search / Maps</option>
                  <option value="Member Referral">Member Referral</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Interested Plan</label>
                <select
                  value={editingEnquiry.interestedPlan || ''}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, interestedPlan: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- General / Not Decided --</option>
                  {plans && plans.length > 0 ? (
                    plans.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (₹{p.price})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No membership plans added yet</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Fitness Goal</label>
                <input
                  type="text"
                  value={editingEnquiry.goal}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, goal: e.target.value })}
                  placeholder="e.g. Weight Loss & Muscle Gain"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Lead Status</label>
              <select
                value={editingEnquiry.status}
                onChange={(e) => setEditingEnquiry({ ...editingEnquiry, status: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
                <option value="Converted">Converted</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                Logged By Staff Member <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={editingEnquiry.staffName || ''}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, staffName: e.target.value })}
                  placeholder="e.g. Pooja Sharma, Coach Alex, Owner"
                  list="edit-staff-name-datalist"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
                <datalist id="edit-staff-name-datalist">
                  <option value={`${currentUser?.name || 'Vikramaditya Singhania'} (Owner)`} />
                  <option value="Pooja Sharma (Front Desk)" />
                  <option value="Rohan Deshmukh (Front Desk)" />
                  {trainers?.map((t) => (
                    <option key={t.id} value={`${t.name} (Coach)`} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-[10px] font-bold text-slate-700">Discussion Notes / Staff Comment</label>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Note Date: {getTodayFormatted()}
                </span>
              </div>
              <textarea
                rows={2}
                value={editingEnquiry.notes || ''}
                onChange={(e) => setEditingEnquiry({ ...editingEnquiry, notes: e.target.value })}
                placeholder="Add requirement details, notes, preferences, or reasons..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
              />
              <p className="text-[9px] text-slate-400 mt-0.5">
                Today's date ({getTodayFormatted()}) will automatically be saved in front of this note.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEnquiry(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingEdit}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                {isSubmittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmittingEdit ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Intended Add Member Modal Prepopulated from Selected Lead */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setAddMemberInitialData(null);
        }}
        initialData={addMemberInitialData}
      />

      {/* Advanced Filter Modal (Portalled to document.body) */}
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
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Filter Leads & Enquiries</h3>
                  <p className="text-xs text-slate-500">Filter prospective members by lead status, lead source, date range, or plan</p>
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
                  <span className="text-[11px] font-normal text-slate-400">Select specific month</span>
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
                      key={mPreset.label}
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
                </div>
              </div>

              {/* Custom Date Range */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Custom Date Range
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">From Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">To Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Status */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Lead Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Statuses' },
                    { id: 'Hot', label: '🔥 Hot' },
                    { id: 'Warm', label: '⚡ Warm' },
                    { id: 'Cold', label: '❄️ Cold' },
                    { id: 'Converted', label: '✅ Converted' },
                    { id: 'Not Interested', label: '❌ Dropped' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold transition-colors cursor-pointer text-center ${
                        statusFilter === st.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Source */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Lead Source</span>
                  {sourceFilter !== 'ALL' && (
                    <button type="button" onClick={() => setSourceFilter('ALL')} className="text-[10px] text-emerald-600 font-bold hover:underline">
                      Reset
                    </button>
                  )}
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Acquisition Sources</option>
                  <option value="Walk-in">Walk-in Visit</option>
                  <option value="Instagram">Instagram / Social Media</option>
                  <option value="Google / Website">Google Search / Website</option>
                  <option value="Member Referral">Member Referral</option>
                  <option value="Phone Call">Inbound Phone Call</option>
                  <option value="WhatsApp">WhatsApp Inquiry</option>
                  <option value="Other">Other Source</option>
                </select>
              </div>

              {/* Interested Membership Plan */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Target Membership Plan</span>
                  {planFilter !== 'ALL' && (
                    <button type="button" onClick={() => setPlanFilter('ALL')} className="text-[10px] text-emerald-600 font-bold hover:underline">
                      Reset
                    </button>
                  )}
                </label>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="ALL">All Membership Plans</option>
                  {(plans || []).map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Apply Filters ({filteredEnquiries.length} Results)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
