import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Calendar,
  Users,
  Plus,
  Clock,
  Award,
  Trash2,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  X,
  BookOpen,
  UserPlus,
  Edit2,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  hasSqlInjection,
  sanitizeDigits,
  preventNonNumericKey
} from '../../utils/validation';

// Time overlap helpers for class schedule conflict detection
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = (match[3] || '').toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const checkTimesOverlap = (range1, range2) => {
  if (!range1 || !range2) return false;
  const p1 = range1.split('-');
  const p2 = range2.split('-');
  if (p1.length !== 2 || p2.length !== 2) return false;
  const s1 = parseTimeToMinutes(p1[0]);
  const e1 = parseTimeToMinutes(p1[1]);
  const s2 = parseTimeToMinutes(p2[0]);
  const e2 = parseTimeToMinutes(p2[1]);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  return Math.max(s1, s2) < Math.min(e1, e2);
};

export const ClassAdminManager = () => {
  const { classes = [], fetchClasses, addClass, updateClass, deleteClass, trainers = [], fetchTrainers, members = [], addToast } = useGymData();
  const { canEditDelete, currentRole } = useAuth();

  useEffect(() => {
    fetchClasses?.();
    fetchTrainers?.();
  }, [fetchClasses, fetchTrainers]);

  const [classToDelete, setClassToDelete] = useState(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  const [editingClass, setEditingClass] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [enrollingClass, setEnrollingClass] = useState(null);
  const [classEnrollments, setClassEnrollments] = useState([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [enrollFee, setEnrollFee] = useState('0');
  const [enrollPaymentMethod, setEnrollPaymentMethod] = useState('UPI');
  const [isEnrollingMember, setIsEnrollingMember] = useState(false);
  const [enrollmentToRemove, setEnrollmentToRemove] = useState(null);

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      setIsDeletingClass(true);
      await deleteClass(classToDelete.id);
      setClassToDelete(null);
    } catch (err) {
      console.error('Delete class error:', err);
    } finally {
      setIsDeletingClass(false);
    }
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [trainerFilter, setTrainerFilter] = useState('ALL');
  const [dayFilter, setDayFilter] = useState('ALL');
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

  const [form, setForm] = useState({
    name: '',
    trainerId: '',
    time: '07:00 AM - 08:00 AM',
    days: ['Mon', 'Wed', 'Fri'],
    capacity: 25,
    category: 'Cardio & HIIT',
    room: 'Studio A (Main Floor)',
    difficulty: 'All Levels',
    description: ''
  });

  const handleDayToggle = (day) => {
    setForm((prev) => {
      const exists = prev.days.includes(day);
      const nextDays = exists ? prev.days.filter((d) => d !== day) : [...prev.days, day];
      return { ...prev, days: nextDays };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (hasSqlInjection(form.name) || hasSqlInjection(form.room) || hasSqlInjection(form.description)) {
      addToast('Disallowed characters or SQL injection syntax detected.', 'error');
      return;
    }
    if (!form.name || form.days.length === 0) {
      addToast('Please provide Class Name and select at least one schedule day', 'error');
      return;
    }
    if (!form.trainerId) {
      addToast('Please select an assigned coach for this class.', 'error');
      return;
    }

    const assignedCoach = trainers.find((t) => String(t.id) === String(form.trainerId) || String(t.userId) === String(form.trainerId));
    if (!assignedCoach) {
      addToast('Selected coach was not found. Please choose a valid coach.', 'error');
      return;
    }

    // Schedule Overlap check on client before submit
    const cleanTId = String(assignedCoach.id || '').replace(/\D/g, '');
    const overlappingClass = classes.find((c) => {
      const cTId = String(c.trainerId || '').replace(/\D/g, '');
      if (cleanTId && cTId && cleanTId === cTId) {
        const cDays = Array.isArray(c.days) ? c.days : (typeof c.days === 'string' ? c.days.split(',').map(s => s.trim()) : []);
        const commonDays = form.days.filter((d) => cDays.includes(d));
        if (commonDays.length > 0 && checkTimesOverlap(form.time, c.time)) {
          return true;
        }
      }
      return false;
    });

    if (overlappingClass) {
      addToast(`Coach "${assignedCoach.name}" already has an overlapping class ("${overlappingClass.name || overlappingClass.title}") scheduled at ${overlappingClass.time}.`, 'error');
      return;
    }

    const classDescription = form.description || `High-energy ${form.category} training batch led by ${assignedCoach.name}. All equipment and locker access provided.`;

    try {
      await addClass({
        name: form.name,
        title: form.name,
        trainerId: assignedCoach.id,
        trainerName: assignedCoach.name,
        time: form.time,
        days: form.days,
        capacity: Number(form.capacity) || 20,
        category: form.category,
        room: form.room,
        difficulty: form.difficulty,
        intensity: form.difficulty || 'High',
        description: classDescription
      });

      setIsAddModalOpen(false);
      setForm({
        name: '',
        trainerId: '',
        time: '07:00 AM - 08:00 AM',
        days: ['Mon', 'Wed', 'Fri'],
        capacity: 25,
        category: 'Cardio & HIIT',
        room: 'Studio A (Main Floor)',
        difficulty: 'All Levels',
        description: ''
      });
    } catch (err) {
      addToast(err?.message || 'Failed to create class', 'error');
    }
  };

  const handleOpenEditModal = (cls) => {
    setEditingClass(cls);
    const matchedCoach = trainers.find((t) => String(t.id) === String(cls.trainerId) || String(t.userId) === String(cls.trainerId));
    setEditForm({
      name: cls.name || cls.title || '',
      trainerId: matchedCoach?.id || cls.trainerId || '',
      time: cls.time || '07:00 AM - 08:00 AM',
      days: Array.isArray(cls.days) ? cls.days : (typeof cls.days === 'string' ? cls.days.split(',').map(s => s.trim()) : ['Mon', 'Wed', 'Fri']),
      capacity: cls.capacity || 20,
      category: cls.category || 'Group Fitness',
      room: cls.room || 'Studio A',
      difficulty: cls.difficulty || 'All Levels',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingClass || !editForm) return;
    if (!editForm.name || editForm.days.length === 0) {
      addToast('Please provide Class Name and select at least one schedule day', 'error');
      return;
    }
    if (!editForm.trainerId) {
      addToast('Please select an assigned coach for this class.', 'error');
      return;
    }

    const assignedCoach = trainers.find((t) => String(t.id) === String(editForm.trainerId) || String(t.userId) === String(editForm.trainerId));
    const cleanTId = String(editForm.trainerId).replace(/\D/g, '');

    // Overlap validation: exclude the class being edited
    const overlappingClass = classes.find((c) => {
      if (c.id === editingClass.id || c.numericId === editingClass.numericId) return false;
      const cTId = String(c.trainerId || '').replace(/\D/g, '');
      if (cleanTId && cTId && cleanTId === cTId) {
        const cDays = Array.isArray(c.days) ? c.days : (typeof c.days === 'string' ? c.days.split(',').map(s => s.trim()) : []);
        const commonDays = editForm.days.filter((d) => cDays.includes(d));
        if (commonDays.length > 0 && checkTimesOverlap(editForm.time, c.time)) {
          return true;
        }
      }
      return false;
    });

    if (overlappingClass) {
      addToast(`Coach "${assignedCoach?.name || 'Selected'}" already has an overlapping class ("${overlappingClass.name || overlappingClass.title}") scheduled at ${overlappingClass.time}.`, 'error');
      return;
    }

    try {
      await updateClass(editingClass.id, {
        name: editForm.name,
        title: editForm.name,
        trainer_id: editForm.trainerId,
        trainerId: editForm.trainerId,
        trainer_name: assignedCoach?.name,
        trainerName: assignedCoach?.name,
        time: editForm.time,
        days: editForm.days,
        capacity: Number(editForm.capacity) || 20,
        category: editForm.category,
        room: editForm.room,
        difficulty: editForm.difficulty
      });
      setEditingClass(null);
      setEditForm(null);
    } catch (err) {
      // toast shown by updateClass
    }
  };

  const handleOpenEnrollModal = async (cls) => {
    setEnrollingClass(cls);
    setSelectedMemberId('');
    setEnrollFee('0');
    setEnrollPaymentMethod('UPI');
    setIsLoadingEnrollments(true);
    try {
      const res = await api.classes.getEnrollments(cls.id);
      if (res?.data && Array.isArray(res.data)) {
        setClassEnrollments(res.data);
      } else {
        setClassEnrollments([]);
      }
    } catch (e) {
      console.warn('Failed to load class enrollments:', e);
      setClassEnrollments([]);
    } finally {
      setIsLoadingEnrollments(false);
    }
  };

  const handleEnrollMemberSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMemberId || !enrollingClass) return;
    const capacity = Number(enrollingClass.capacity) || 20;
    if (classEnrollments.length >= capacity) {
      addToast(`Class has reached full capacity of ${capacity} members.`, 'error');
      return;
    }
    const cleanId = String(selectedMemberId).replace(/\D/g, '');
    const alreadyEnrolled = classEnrollments.some((enr) => String(enr.userId || enr.id).replace(/\D/g, '') === cleanId);
    if (alreadyEnrolled) {
      addToast('This member is already enrolled in this class roster.', 'error');
      return;
    }

    setIsEnrollingMember(true);
    try {
      const feeNum = Number(enrollFee) || 0;
      const res = await api.classes.enrollMember(enrollingClass.id, {
        user_id: selectedMemberId,
        amount: feeNum,
        fee: feeNum,
        payment_method: enrollPaymentMethod || 'UPI',
      });
      const memberObj = members.find((m) => String(m.userId || m.id).replace(/\D/g, '') === cleanId);
      const newEnrollment = res?.data || {
        id: Date.now(),
        userId: selectedMemberId,
        memberId: 'mem-' + cleanId,
        name: memberObj?.name || 'Member',
        phone: memberObj?.phone || '',
        enrolledDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        invoiceNumber: res?.invoice?.invoiceNumber,
        invoiceUrl: res?.invoice?.invoiceUrl,
      };
      setClassEnrollments((prev) => [newEnrollment, ...prev]);
      fetchClasses?.();
      setSelectedMemberId('');
      setEnrollFee('0');
      const invNum = res?.invoice?.invoiceNumber || res?.data?.invoiceNumber;
      addToast(`Member enrolled successfully!${invNum ? ` Official invoice #${invNum} generated.` : ''}`, 'success');
    } catch (err) {
      addToast(err?.message || 'Failed to enroll member in class', 'error');
    } finally {
      setIsEnrollingMember(false);
    }
  };

  const handleConfirmRemoveEnrollment = async () => {
    if (!enrollmentToRemove || !enrollingClass) return;
    try {
      const userId = enrollmentToRemove.userId || enrollmentToRemove.id;
      await api.classes.unenrollMember(enrollingClass.id, userId);
      setClassEnrollments((prev) => prev.filter((enr) => (enr.userId || enr.id) !== userId));
      fetchClasses?.();
      addToast(`Member removed from class roster.`, 'info');
      setEnrollmentToRemove(null);
    } catch (err) {
      addToast(err?.message || 'Failed to remove member from class', 'error');
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'ALL') count++;
    if (trainerFilter !== 'ALL') count++;
    if (dayFilter !== 'ALL') count++;
    return count;
  }, [categoryFilter, trainerFilter, dayFilter]);

  const handleResetFilters = () => {
    setCategoryFilter('ALL');
    setTrainerFilter('ALL');
    setDayFilter('ALL');
    setSearchTerm('');
  };

  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length < 2) return [];
    const term = searchTerm.toLowerCase().trim();
    return classes
      .filter((c) =>
        (c.name || c.title || '').toLowerCase().includes(term) ||
        (c.trainerName || '').toLowerCase().includes(term) ||
        (c.category || '').toLowerCase().includes(term)
      )
      .slice(0, 5);
  }, [searchTerm, classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const term = (searchTerm || '').trim().toLowerCase();
      const matchesSearch =
        !term ||
        (c.name || c.title || '').toLowerCase().includes(term) ||
        (c.trainerName || '').toLowerCase().includes(term) ||
        (c.category || '').toLowerCase().includes(term) ||
        (c.room || '').toLowerCase().includes(term);

      if (!matchesSearch) return false;

      // Category
      if (categoryFilter !== 'ALL' && (c.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // Trainer
      if (trainerFilter !== 'ALL') {
        const matchesTrnId = String(c.trainerId || '') === String(trainerFilter);
        const matchesTrnName = (c.trainerName || '').toLowerCase() === String(trainerFilter).toLowerCase();
        if (!matchesTrnId && !matchesTrnName) return false;
      }

      // Day of Week
      if (dayFilter !== 'ALL') {
        const classDays = Array.isArray(c.days) ? c.days : [];
        if (!classDays.includes(dayFilter)) return false;
      }

      return true;
    });
  }, [classes, searchTerm, categoryFilter, trainerFilter, dayFilter]);

  return (
    <div className="space-y-4 animate-fadeIn pb-12 w-full">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Group Classes & Batch Scheduling
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Create group workout batches, allocate certified coaches, set hall capacity, and monitor member enrollment.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 min-h-[40px] sm:min-h-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Schedule Class</span>
          <span className="inline sm:hidden">Schedule</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Search Input with Autocomplete */}
          <div className="relative flex-1 min-w-0" ref={searchContainerRef}>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearchDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              placeholder="Search group class batch by name, coach, category, room..."
              className="w-full pl-8 sm:pl-9 pr-7 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium truncate"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-[10px] font-bold cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}

            {/* Autocomplete Dropdown */}
            {isSearchDropdownOpen && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden divide-y divide-slate-100">
                <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Matching Classes ({searchSuggestions.length})
                </div>
                {searchSuggestions.map((cls, idx) => (
                  <div
                    key={cls.id || idx}
                    onClick={() => {
                      setSearchTerm(cls.name || cls.title);
                      setIsSearchDropdownOpen(false);
                    }}
                    className="p-2.5 hover:bg-emerald-50/70 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center border border-emerald-200">
                        {(cls.name || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs group-hover:text-emerald-700">
                          {cls.name || cls.title}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {cls.category} • Coach: {cls.trainerName || 'Coach'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                        {cls.time}
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
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
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
            {categoryFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                Category: {categoryFilter}
                <button type="button" onClick={() => setCategoryFilter('ALL')} className="hover:text-emerald-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {trainerFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-medium">
                Coach: {trainers.find(t => String(t.id) === String(trainerFilter))?.name || trainerFilter}
                <button type="button" onClick={() => setTrainerFilter('ALL')} className="hover:text-purple-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dayFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-medium">
                Day: {dayFilter}
                <button type="button" onClick={() => setDayFilter('ALL')} className="hover:text-blue-950 cursor-pointer">
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

      {/* Class Count & Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5 font-medium">
        <span>
          Showing <strong className="text-emerald-700">{filteredClasses.length}</strong> of {classes.length} Scheduled Classes
        </span>
        {searchTerm && (
          <span className="text-[11px] text-slate-400">
            Filtered by "{searchTerm}"
          </span>
        )}
      </div>

      {/* Class Cards Grid or Empty State */}
      {filteredClasses.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={classes.length === 0 ? "No Group Classes Scheduled" : "No Classes Matching Filter"}
          description={classes.length === 0 
            ? "There is no group fitness class schedule data for this gym. Click below to schedule your first batch."
            : `No classes match your search query "${searchTerm}" or the selected filters.`}
          actionText="Schedule New Class"
          onAction={() => setIsAddModalOpen(true)}
          secondaryActionText={searchTerm || activeFiltersCount > 0 ? "Clear All Filters" : undefined}
          onSecondaryAction={handleResetFilters}
          accentColor="indigo"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const coach = trainers.find((t) => t.id === cls.trainerId);
            const enrolled = cls.enrolledCount || cls.bookedCount || 0;
            const pct = Math.min(100, Math.round((enrolled / (cls.capacity || 20)) * 100));

            return (
              <div
                key={cls.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {cls.category || 'Fitness Batch'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm mt-1.5">{cls.name || cls.title}</h3>
                    </div>

                    {canEditDelete && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cls)}
                          className="p-2 min-h-[36px] min-w-[36px] rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                          title="Edit Class Schedule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassToDelete(cls)}
                          className="p-2 min-h-[36px] min-w-[36px] rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                          title="Remove Class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{cls.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Coach: <strong>{cls.trainerName || coach?.name || 'Assigned Coach'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      {(cls.days || ['Mon', 'Wed', 'Fri']).map((d) => (
                        <span key={d} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]">
                          {d}
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-400 ml-auto">{cls.room || 'Studio A'}</span>
                    </div>
                  </div>
                </div>

                {/* Progress & Capacity */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Batch Roster:</span>
                    <span className="font-bold text-slate-900">{enrolled} / {cls.capacity || 25} Enrolled</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Enroll Members Button */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEnrollModal(cls)}
                    className="w-full py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-teal-200"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Enroll Members</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CLASS MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule New Group Class"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Class Name</label>
            <input
              type="text"
              required
              placeholder="e.g. CrossFit Blitz / Power Yoga"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Assigned Coach *</label>
            <select
              required
              value={form.trainerId}
              onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
              className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">-- Select Assigned Coach * --</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Batch Timing</label>
              <input
                type="text"
                required
                placeholder="e.g. 06:30 AM - 07:30 AM"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Max Capacity</label>
              <input
                type="number"
                min={5}
                max={60}
                inputMode="numeric"
                value={form.capacity}
                onKeyDown={(e) => preventNonNumericKey(e, false)}
                onChange={(e) => setForm({ ...form, capacity: sanitizeDigits(e.target.value, 3) })}
                className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Days of Week</label>
            <div className="flex flex-wrap gap-1.5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const isSelected = form.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Cardio & HIIT">Cardio & HIIT</option>
                <option value="Strength & Power">Strength & Power</option>
                <option value="Yoga & Flexibility">Yoga & Flexibility</option>
                <option value="Dance Fitness">Dance Fitness</option>
                <option value="CrossFit">CrossFit</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Studio / Room</label>
              <input
                type="text"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Batch Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. High intensity interval circuit designed to burn fat and build stamina."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Schedule Batch
            </button>
          </div>
        </form>
      </Modal>

      {/* Advanced Filter Modal (Portalled to document.body) */}
      {showFilterModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Filter Batches & Classes</h3>
                  <p className="text-xs text-slate-500">Refine batch schedule display</p>
                </div>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['ALL', 'Cardio & HIIT', 'Strength & Power', 'Yoga & Flexibility', 'Dance Fitness', 'CrossFit'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of Week */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Day of Week
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['ALL', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDayFilter(day)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        dayFilter === day
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {day === 'ALL' ? 'All Days' : day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coach / Trainer */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Assigned Coach
                </label>
                <select
                  value={trainerFilter}
                  onChange={(e) => setTrainerFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Coaches</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} {t.role ? `(${t.role})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(classToDelete)}
        onClose={() => setClassToDelete(null)}
        onConfirm={handleConfirmDeleteClass}
        isDeleting={isDeletingClass}
        title="Confirm Deletion"
        itemType="class"
        recordName={classToDelete?.name || classToDelete?.title}
        message={
          classToDelete
            ? `Are you sure you want to delete class "${classToDelete.name || classToDelete.title}"? This action may not be reversible.`
            : 'Are you sure you want to delete this class? This action may not be reversible.'
        }
      />

      {/* EDIT CLASS MODAL */}
      <Modal
        isOpen={Boolean(editingClass && editForm)}
        onClose={() => {
          setEditingClass(null);
          setEditForm(null);
        }}
        title="Edit Group Class Schedule"
        maxWidth="max-w-md"
      >
        {editForm && (
          <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Class Name</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Coach *</label>
              <select
                required
                value={editForm.trainerId}
                onChange={(e) => setEditForm({ ...editForm, trainerId: e.target.value })}
                className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">-- Select Assigned Coach * --</option>
                {trainers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch Timing</label>
                <input
                  type="text"
                  required
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Capacity</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  inputMode="numeric"
                  value={editForm.capacity}
                  onKeyDown={(e) => preventNonNumericKey(e, false)}
                  onChange={(e) => setEditForm({ ...editForm, capacity: sanitizeDigits(e.target.value, 3) })}
                  className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Days of Week</label>
              <div className="flex flex-wrap gap-1.5">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const isSelected = editForm.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const exists = editForm.days.includes(day);
                        const nextDays = exists ? editForm.days.filter((d) => d !== day) : [...editForm.days, day];
                        setEditForm({ ...editForm, days: nextDays });
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cardio & HIIT">Cardio & HIIT</option>
                  <option value="Strength & Power">Strength & Power</option>
                  <option value="Yoga & Flexibility">Yoga & Flexibility</option>
                  <option value="Dance Fitness">Dance Fitness</option>
                  <option value="CrossFit">CrossFit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Studio / Room</label>
                <input
                  type="text"
                  value={editForm.room}
                  onChange={(e) => setEditForm({ ...editForm, room: e.target.value })}
                  className="w-full px-3 py-2 min-h-[44px] sm:min-h-0 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setEditingClass(null);
                  setEditForm(null);
                }}
                className="px-4 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 min-h-[44px] sm:min-h-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ENROLL MEMBERS MODAL */}
      <Modal
        isOpen={Boolean(enrollingClass)}
        onClose={() => {
          setEnrollingClass(null);
          setClassEnrollments([]);
          setSelectedMemberId('');
        }}
        title={`Enroll Members - ${enrollingClass?.name || enrollingClass?.title || 'Class'}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          {/* Class Summary Bar */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-800">{enrollingClass?.name || enrollingClass?.title}</div>
              <div className="text-[11px] text-slate-500">
                {enrollingClass?.time} • {Array.isArray(enrollingClass?.days) ? enrollingClass.days.join(', ') : enrollingClass?.days}
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900">
                {classEnrollments.length} / {enrollingClass?.capacity || 25}
              </span>
              <span className="text-[10px] text-slate-500 block">Enrolled Members</span>
            </div>
          </div>

          {/* Enroll New Member Form */}
          <form onSubmit={handleEnrollMemberSubmit} className="space-y-2.5 pt-1 border-t border-slate-100">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Member to Enroll *</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                disabled={classEnrollments.length >= (enrollingClass?.capacity || 25)}
              >
                <option value="">-- Choose Member from Active Roster --</option>
                {members
                  .filter((m) => {
                    const cleanMId = String(m.userId || m.id).replace(/\D/g, '');
                    return !classEnrollments.some((enr) => String(enr.userId || enr.id).replace(/\D/g, '') === cleanMId);
                  })
                  .map((m) => (
                    <option key={m.userId || m.id} value={m.userId || m.id}>
                      {m.name} ({m.phone || 'No Phone'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Enrollment Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={enrollFee}
                  onChange={(e) => setEnrollFee(e.target.value)}
                  placeholder="0 for complimentary"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={enrollPaymentMethod}
                  onChange={(e) => setEnrollPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="UPI">UPI / QR</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedMemberId || isEnrollingMember || classEnrollments.length >= (enrollingClass?.capacity || 25)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {isEnrollingMember ? 'Issuing Invoice & Enrolling...' : 'Enroll & Generate Official Invoice'}
            </button>
            {classEnrollments.length >= (enrollingClass?.capacity || 25) && (
              <p className="text-[11px] text-amber-600 font-medium">Class capacity reached. No further enrollments allowed.</p>
            )}
          </form>

          {/* Enrolled Roster */}
          <div className="pt-2">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span>Enrolled Members ({classEnrollments.length})</span>
              {isLoadingEnrollments && <span className="text-[11px] font-normal text-slate-400">Loading...</span>}
            </h4>

            {isLoadingEnrollments ? (
              <div className="py-6 text-center text-slate-400 text-xs">Loading roster...</div>
            ) : classEnrollments.length === 0 ? (
              <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No members currently enrolled in this batch.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {classEnrollments.map((enr) => (
                  <div key={enr.id || enr.userId} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{enr.name || 'Member'}</span>
                        {enr.invoiceNumber && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                            {enr.invoiceNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {enr.phone ? `${enr.phone} • ` : ''}Enrolled: {enr.enrolledDate || 'Recent'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnrollmentToRemove(enr)}
                      className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setEnrollingClass(null);
                setClassEnrollments([]);
                setSelectedMemberId('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Remove Member from Class Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(enrollmentToRemove)}
        onClose={() => setEnrollmentToRemove(null)}
        onConfirm={handleConfirmRemoveEnrollment}
        title="Remove Member from Class"
        itemType="enrollment"
        recordName={enrollmentToRemove?.name}
        message={`Are you sure you want to remove ${enrollmentToRemove?.name || 'this member'} from this class batch?`}
      />
    </div>
  );
};
