import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import {
  PhoneCall,
  Search,
  Plus,
  Filter,
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
  Loader2
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const EnquiriesManager = ({ onConvertLeadToMember }) => {
  const {
    enquiries,
    addEnquiry,
    updateEnquiry,
    deleteEnquiry,
    convertEnquiryToMember,
    scrapEnquiry,
    plans,
    trainers,
    addMember,
    addToast
  } = useGymData();
  const { currentUser, registerAccount } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

  // Register Member Modal State (Direct converted lead enrolment)
  const [isRegisterMemberModalOpen, setIsRegisterMemberModalOpen] = useState(false);
  const [leadForMemberRegistration, setLeadForMemberRegistration] = useState(null);
  const [newlyCreatedCredentials, setNewlyCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [memberFormData, setMemberFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    avatar: '',
    age: 25,
    gender: 'Male',
    planId: '',
    trainerId: '',
    goal: 'Muscle Gain & Strength',
    weight: 70,
    targetWeight: 75,
    height: 175,
    medicalNotes: 'None',
    emergencyContact: '',
    kycDocType: 'Aadhaar Card',
    kycDocNumber: '',
    kycStatus: 'Verified'
  });

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

  // Form State (Follow-up date removed, Priority merged into Status)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Walk-in',
    interestedPlan: plans[0]?.name || 'Gold Quarterly Fitness',
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

  const filteredEnquiries = enquiries.filter((e) => {
    const currentStatus = normalizeStatus(e);
    const matchesSearch =
      (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.phone || '').includes(searchTerm) ||
      (e.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.staffName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && currentStatus === statusFilter;
  });

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

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
        interestedPlan: plans[0]?.name || 'Gold Quarterly Fitness',
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
      interestedPlan: enquiry.interestedPlan || (plans[0]?.name || 'Gold Quarterly Fitness'),
      goal: enquiry.goal || 'Weight Loss & Fitness',
      status: currentStatus,
      staffName: enquiry.staffName || defaultStaffName,
      notes: cleanNotes
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEnquiry || !editingEnquiry.name || !editingEnquiry.phone) return;
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

  const handleOpenRegisterModal = (enquiry) => {
    setLeadForMemberRegistration(enquiry);

    // Only Name and Phone Number are prefilled from the enquiry; owner fills the rest
    setMemberFormData({
      name: enquiry.name || '',
      phone: enquiry.phone || '',
      email: '',
      password: '',
      avatar: '',
      age: '',
      gender: '',
      planId: '',
      trainerId: '',
      goal: '',
      weight: '',
      targetWeight: '',
      height: '',
      medicalNotes: '',
      emergencyContact: '',
    });
    setIsRegisterMemberModalOpen(true);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMemberFormData((prev) => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const generateRandomPassword = () => {
    const pass = 'fit' + Math.floor(1000 + Math.random() * 9000);
    setMemberFormData((prev) => ({ ...prev, password: pass }));
  };

  const handleRegisterMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberFormData.name || !memberFormData.email) return;

    try {
      setIsSubmittingRegister(true);
      const chosenPlan = plans.find((p) => p.id === memberFormData.planId) || plans[0];
      const chosenTrainer = trainers.find((t) => t.id === memberFormData.trainerId);

      const today = new Date();
      const expiry = new Date();
      expiry.setMonth(today.getMonth() + (chosenPlan?.durationMonths || 1));

      const enquiryId = leadForMemberRegistration?.id;
      const finalPassword = memberFormData.password || ('fit' + Math.floor(1000 + Math.random() * 9000));

      const memberPayload = {
        name: memberFormData.name,
        email: memberFormData.email,
        phone: memberFormData.phone,
        password: finalPassword,
        enquiryId: enquiryId,
        enquiry_id: enquiryId,
        avatar: memberFormData.avatar || `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=200&auto=format&fit=crop&q=80`,
        age: memberFormData.age ? Number(memberFormData.age) : 25,
        gender: memberFormData.gender || 'Unspecified',
        planId: chosenPlan?.id,
        plan_id: chosenPlan?.id,
        planName: chosenPlan?.name,
        trainerId: chosenTrainer ? chosenTrainer.id : null,
        trainer_id: chosenTrainer ? chosenTrainer.id : null,
        trainerName: chosenTrainer ? chosenTrainer.name : 'None / Self Guided',
        goal: memberFormData.goal || 'General Fitness',
        weight: memberFormData.weight ? Number(memberFormData.weight) : 70,
        targetWeight: memberFormData.targetWeight ? Number(memberFormData.targetWeight) : 65,
        target_weight: memberFormData.targetWeight ? Number(memberFormData.targetWeight) : 65,
        height: memberFormData.height ? Number(memberFormData.height) : 175,
        medicalNotes: memberFormData.medicalNotes || 'None',
        medical_notes: memberFormData.medicalNotes || 'None',
        emergencyContact: memberFormData.emergencyContact || memberFormData.phone || 'N/A',
        emergency_contact: memberFormData.emergencyContact || memberFormData.phone || 'N/A',
        expiryDate: expiry.toISOString().split('T')[0]
      };

      // 1. Convert enquiry to member via backend / context
      let createdMember = null;
      if (convertEnquiryToMember && enquiryId) {
        createdMember = await convertEnquiryToMember(enquiryId, memberPayload);
      } else {
        createdMember = await addMember(memberPayload);
        if (enquiryId) {
          deleteEnquiry(enquiryId);
        }
      }

      // 2. Provision / sync Login Account in Auth Database
      if (registerAccount) {
        registerAccount({
          id: createdMember?.id || `mem-${Date.now()}`,
          name: memberFormData.name,
          email: memberFormData.email,
          username: memberFormData.email.split('@')[0],
          password: finalPassword,
          role: 'member',
          planName: chosenPlan?.name,
          qrPassCode: createdMember?.qrPassCode
        });
      }

      // 3. Show credentials receipt
      setNewlyCreatedCredentials({
        name: memberFormData.name,
        email: memberFormData.email,
        password: finalPassword,
        id: createdMember?.id,
        qrPassCode: createdMember?.qrPassCode,
        planName: chosenPlan?.name
      });

      setIsRegisterMemberModalOpen(false);
      setLeadForMemberRegistration(null);
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!newlyCreatedCredentials) return;
    const text = `Welcome to PULSE FIT!\nHere are your Member Login Credentials:\n• App URL: http://localhost:5173/\n• Login Email: ${newlyCreatedCredentials.email}\n• Password: ${newlyCreatedCredentials.password}\n• Member ID: ${newlyCreatedCredentials.id}\n• Plan: ${newlyCreatedCredentials.planName}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (addToast) addToast('Credentials copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
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
      {/* Sleek Compact Search & Filter Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1 sm:w-72 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-[10px] sm:placeholder:text-[11px] placeholder:text-slate-400 text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs transition-all"
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
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs cursor-pointer"
          >
            <option value="ALL">All ({totalCount})</option>
            <option value="Hot"> Hot ({hotCount})</option>
            <option value="Warm">Warm ({warmCount})</option>
            <option value="Cold">Cold ({coldCount})</option>
            <option value="Converted">Converted ({convertedCount})</option>
            <option value="Not Interested">Dropped</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Leads Mobile Cards View */}
      <div className="block sm:hidden space-y-2.5">
        {filteredEnquiries.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium">
            No enquiries match the current filter or search criteria.
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
                    <span className="font-bold text-slate-800 truncate block">{enq.interestedPlan}</span>
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
                        onClick={() => handleOpenRegisterModal(enq)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Register</span>
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
              {filteredEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No enquiries match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredEnquiries.map((enq) => {
                  const currentStatus = normalizeStatus(enq);
                  const isConverted = currentStatus === 'Converted';
                  const isNotInterested = currentStatus === 'Not Interested';
                  const noteInfo = parseNoteWithDate(enq.notes, enq.noteDate || enq.followUpDate || enq.createdDate);

                  return (
                    <tr key={enq.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Combined Prospect Name, Contact & Email */}
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
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                        {enq.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[220px]" title={enq.email}>{enq.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Interested Plan & Goal */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{enq.interestedPlan}</div>
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
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                            {(enq.staffName || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-xs truncate max-w-[135px]" title={enq.staffName}>
                              {enq.staffName || 'Front Desk Staff'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {enq.createdDate ? `Logged: ${enq.createdDate}` : 'Front Desk'}
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
                              onClick={() => handleOpenRegisterModal(enq)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm shadow-emerald-600/20"
                              title="Register Member & Issue Login Account"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
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
                })
              )}
            </tbody>
          </table>
        </div>
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
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98200 00000"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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
                value={formData.interestedPlan}
                onChange={(e) => setFormData({ ...formData, interestedPlan: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
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
                  value={editingEnquiry.phone}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, phone: e.target.value })}
                  placeholder="+91 98200 00000"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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
                  value={editingEnquiry.interestedPlan}
                  onChange={(e) => setEditingEnquiry({ ...editingEnquiry, interestedPlan: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} (₹{p.price})
                    </option>
                  ))}
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

      {/* REGISTER MEMBER & ISSUE LOGIN ACCOUNT MODAL */}
      <Modal
        isOpen={isRegisterMemberModalOpen}
        onClose={() => {
          setIsRegisterMemberModalOpen(false);
          setLeadForMemberRegistration(null);
        }}
        title="Register Member & Issue Login Account"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleRegisterMemberSubmit} className="space-y-4">
          {/* Member Photo Upload */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 border-2 border-slate-300 shrink-0 flex items-center justify-center group shadow-sm">
              {memberFormData.avatar ? (
                <img
                  src={memberFormData.avatar}
                  alt="Member Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-1.5 text-center sm:text-left">
              <label className="block text-xs font-bold text-slate-800">
                Member Profile Photo
              </label>
              <p className="text-[11px] text-slate-500">
                Upload a photo for attendance, QR turnstile verification, and member profile.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {memberFormData.avatar && (
                  <button
                    type="button"
                    onClick={() => setMemberFormData({ ...memberFormData, avatar: '' })}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Account Credentials Box */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <KeyRound className="w-4 h-4" />
                <span>Member Portal Login Credentials</span>
              </div>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-generate Password
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Login Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="member@example.com"
                  value={memberFormData.email}
                  onChange={(e) => setMemberFormData({ ...memberFormData, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. fit4829 or custom password"
                  value={memberFormData.password}
                  onChange={(e) => setMemberFormData({ ...memberFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              The member can log into the PULSE FIT Member Portal using this email and password.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Liam Hemsworth"
                value={memberFormData.name}
                onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98200 00000"
                value={memberFormData.phone}
                onChange={(e) => setMemberFormData({ ...memberFormData, phone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
              <input
                type="number"
                placeholder="e.g. 25"
                value={memberFormData.age}
                onChange={(e) => setMemberFormData({ ...memberFormData, age: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={memberFormData.gender}
                onChange={(e) => setMemberFormData({ ...memberFormData, gender: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Select Gender...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Membership Plan</label>
              <select
                value={memberFormData.planId}
                onChange={(e) => setMemberFormData({ ...memberFormData, planId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Select Membership Plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price.toLocaleString('en-IN')} / {p.period})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign Trainer</label>
              <select
                value={memberFormData.trainerId}
                onChange={(e) => setMemberFormData({ ...memberFormData, trainerId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">None / Self Guided</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Weight (kg)</label>
              <input
                type="number"
                placeholder="e.g. 70"
                value={memberFormData.weight}
                onChange={(e) => setMemberFormData({ ...memberFormData, weight: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Weight (kg)</label>
              <input
                type="number"
                placeholder="e.g. 65"
                value={memberFormData.targetWeight}
                onChange={(e) => setMemberFormData({ ...memberFormData, targetWeight: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Height (cm)</label>
              <input
                type="number"
                placeholder="e.g. 175"
                value={memberFormData.height}
                onChange={(e) => setMemberFormData({ ...memberFormData, height: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Fitness Goal</label>
            <input
              type="text"
              placeholder="e.g. Fat loss, Marathon training, Hypertrophy"
              value={memberFormData.goal}
              onChange={(e) => setMemberFormData({ ...memberFormData, goal: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Medical Notes & Allergies</label>
            <input
              type="text"
              placeholder="e.g. Asthma, Lower back pain history"
              value={memberFormData.medicalNotes}
              onChange={(e) => setMemberFormData({ ...memberFormData, medicalNotes: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Contact</label>
            <input
              type="text"
              placeholder="e.g. Jane Doe (+91 98200 12345)"
              value={memberFormData.emergencyContact}
              onChange={(e) => setMemberFormData({ ...memberFormData, emergencyContact: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMemberModalOpen(false);
                setLeadForMemberRegistration(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingRegister}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              {isSubmittingRegister && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSubmittingRegister ? 'Completing Registration...' : 'Complete Registration & Issue Account'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Newly Created Credentials Modal */}
      <Modal
        isOpen={!!newlyCreatedCredentials}
        onClose={() => setNewlyCreatedCredentials(null)}
        title="Member Account Successfully Created"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-emerald-900 text-base">
              Member Added & Enrolled!
            </h3>
            <p className="text-xs text-emerald-700">
              The converted lead has been added to the <strong>Member Directory</strong> and removed from the enquiry pipeline.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 font-mono">
            <div className="flex justify-between pb-1.5 border-b border-slate-200 text-slate-600">
              <span className="font-sans font-semibold text-slate-500">Full Name:</span>
              <span className="font-bold text-slate-900 font-sans">{newlyCreatedCredentials?.name}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-slate-200 text-slate-600">
              <span className="font-sans font-semibold text-slate-500">Login Email:</span>
              <span className="font-bold text-slate-900">{newlyCreatedCredentials?.email}</span>
            </div>
            <div className="flex justify-between pb-1.5 border-b border-slate-200 text-slate-600">
              <span className="font-sans font-semibold text-slate-500">Password:</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {newlyCreatedCredentials?.password}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="font-sans font-semibold text-slate-500">Plan Assigned:</span>
              <span className="font-semibold text-slate-800 font-sans">{newlyCreatedCredentials?.planName}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Details!' : 'Copy Credentials'}</span>
            </button>
            <button
              type="button"
              onClick={() => setNewlyCreatedCredentials(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
