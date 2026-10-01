import React, { useState, useMemo } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  Edit3,
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  X,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useGymData } from '../../context/GymDataContext';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

// Helper to convert "HH:MM" or "HH:MM AM/PM" to 12h display
const formatTimeTo12Hour = (timeStr) => {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  if (clean.includes('AM') || clean.includes('PM')) {
    return clean;
  }
  const parts = clean.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].slice(0, 2);
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return timeStr;
};

// Helper to convert 12-hour or arbitrary time string to "HH:MM" 24h format for input[type="time"]
const formatTimeTo24HourInput = (timeStr) => {
  if (!timeStr) return '09:00';
  const clean = timeStr.trim().toUpperCase();
  if (clean.includes('AM') || clean.includes('PM')) {
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const numPart = clean.replace(/[^\d:]/g, '');
    const [hStr, mStr = '00'] = numPart.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return '09:00';
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(mStr).padStart(2, '0')}`;
  }
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parts[1].slice(0, 2);
    if (!isNaN(h)) {
      return `${String(h).padStart(2, '0')}:${m}`;
    }
  }
  return '09:00';
};

// Calculate minutes between two time strings
const calculateSlotMinutes = (start, end) => {
  if (!start || !end) return 0;
  const s24 = formatTimeTo24HourInput(start);
  const e24 = formatTimeTo24HourInput(end);
  const [sh, sm] = s24.split(':').map(Number);
  const [eh, em] = e24.split(':').map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    // Overnight slot crossing midnight
    endMinutes += 24 * 60;
  }
  return Math.max(0, endMinutes - startMinutes);
};

const formatDurationDisplay = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '0 hrs';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  return `${mins} mins`;
};

const COLOR_OPTIONS = [
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', light: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500', light: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-600', light: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const ShiftManager = ({ onNavigateTab = null }) => {
  const {
    shifts = [],
    createShift,
    updateShift,
    deleteShift,
    addToast
  } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all'); // 'all' | 'active' | 'inactive'
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [deleteConfirmShift, setDeleteConfirmShift] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'emerald',
    is_active: true,
    timings: [
      { start_time: '06:00 AM', end_time: '02:00 PM', label: 'Slot 1' }
    ]
  });

  const openCreateModal = () => {
    setEditingShiftId(null);
    setFormData({
      name: '',
      description: '',
      color: 'emerald',
      is_active: true,
      timings: [
        { start_time: '06:00 AM', end_time: '02:00 PM', label: 'Slot 1' }
      ]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (shift) => {
    setEditingShiftId(shift.id);
    const timings = Array.isArray(shift.timings) && shift.timings.length > 0
      ? shift.timings.map((t, idx) => ({
          start_time: t.start_time || '06:00 AM',
          end_time: t.end_time || '02:00 PM',
          label: t.label || `Slot ${idx + 1}`
        }))
      : [{ start_time: '06:00 AM', end_time: '02:00 PM', label: 'Slot 1' }];

    setFormData({
      name: shift.name || '',
      description: shift.description || '',
      color: shift.color || 'emerald',
      is_active: shift.is_active !== undefined ? Boolean(shift.is_active) : true,
      timings
    });
    setIsModalOpen(true);
  };

  const handleAddTimingSlot = () => {
    const nextSlotNum = formData.timings.length + 1;
    // Suggest next timing after previous slot
    let nextStart = '05:00 PM';
    let nextEnd = '09:00 PM';
    if (formData.timings.length === 1) {
      nextStart = '05:00 PM';
      nextEnd = '09:00 PM';
    } else if (formData.timings.length === 2) {
      nextStart = '09:00 PM';
      nextEnd = '11:00 PM';
    }
    setFormData((prev) => ({
      ...prev,
      timings: [
        ...prev.timings,
        { start_time: nextStart, end_time: nextEnd, label: `Slot ${nextSlotNum}` }
      ]
    }));
  };

  const handleRemoveTimingSlot = (index) => {
    if (formData.timings.length <= 1) {
      addToast('A shift must have at least one timing slot.', 'error');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      timings: prev.timings.filter((_, idx) => idx !== index)
    }));
  };

  const handleUpdateTimingSlot = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.timings];
      let formattedVal = value;
      if (field === 'start_time' || field === 'end_time') {
        formattedVal = formatTimeTo12Hour(value);
      }
      updated[index] = {
        ...updated[index],
        [field]: formattedVal
      };
      return { ...prev, timings: updated };
    });
  };

  // Calculate total hours of the shift across all slots
  const totalFormMinutes = useMemo(() => {
    return formData.timings.reduce((sum, slot) => {
      return sum + calculateSlotMinutes(slot.start_time, slot.end_time);
    }, 0);
  }, [formData.timings]);

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      addToast('Please enter a shift name.', 'error');
      return;
    }
    if (!formData.timings || formData.timings.length === 0) {
      addToast('Please configure at least one timing slot.', 'error');
      return;
    }

    // Validate that each slot has valid start & end
    for (let i = 0; i < formData.timings.length; i++) {
      const slot = formData.timings[i];
      if (!slot.start_time || !slot.end_time) {
        addToast(`Timing slot #${i + 1} has incomplete start or end times.`, 'error');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color || 'emerald',
        is_active: formData.is_active,
        timings: formData.timings.map((t, idx) => ({
          start_time: formatTimeTo12Hour(t.start_time),
          end_time: formatTimeTo12Hour(t.end_time),
          label: t.label?.trim() || `Slot ${idx + 1}`
        }))
      };

      if (editingShiftId) {
        await updateShift(editingShiftId, payload);
      } else {
        await createShift(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save shift error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmShift) return;
    try {
      setIsSubmitting(true);
      await deleteShift(deleteConfirmShift.id);
      setDeleteConfirmShift(null);
    } catch (err) {
      console.error('Delete shift error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(s.timings) && s.timings.some((t) =>
          `${t.start_time} ${t.end_time} ${t.label}`.toLowerCase().includes(searchTerm.toLowerCase())
        ));

      const matchesStatus =
        filterActive === 'all' ||
        (filterActive === 'active' && s.is_active !== false) ||
        (filterActive === 'inactive' && s.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [shifts, searchTerm, filterActive]);

  // Aggregate stats
  const totalShiftsCount = shifts.length;
  const activeShiftsCount = shifts.filter((s) => s.is_active !== false).length;
  const multiSlotShiftsCount = shifts.filter((s) => Array.isArray(s.timings) && s.timings.length > 1).length;
  const totalAssignedStaffCount = shifts.reduce((acc, s) => acc + (s.assigned_staff_count || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-7xl mx-auto">
      {/* 1. HEADER SECTION */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Staff Shift Management
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Create customized shifts with multiple timing options and slots. These shifts will be dynamically selectable in staff accounts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('staff-accounts')}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span>Go to Staff Accounts</span>
              </button>
            )}

            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Shift</span>
            </button>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Shift Profiles</span>
            <div className="text-xl font-black text-slate-900 mt-0.5">{totalShiftsCount}</div>
            <span className="text-[10px] text-slate-500 font-medium">Configured in gym</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Active Shifts</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{activeShiftsCount}</div>
            <span className="text-[10px] text-emerald-600/80 font-medium">Ready for roster</span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Multi-Slot / Split Shifts</span>
            <div className="text-xl font-black text-indigo-700 mt-0.5">{multiSlotShiftsCount}</div>
            <span className="text-[10px] text-indigo-600/80 font-medium">Multiple time slots</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Staff on Duty</span>
            <div className="text-xl font-black text-amber-700 mt-0.5">{totalAssignedStaffCount}</div>
            <span className="text-[10px] text-amber-600/80 font-medium">Assigned employees</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search shift name or timings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-semibold hidden md:inline">Status:</span>
          {['all', 'active', 'inactive'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterActive(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                filterActive === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 3. SHIFTS LISTING */}
      {filteredShifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <EmptyState
            icon={Clock}
            title={searchTerm ? 'No matching shifts found' : 'No working shifts configured'}
            description={
              searchTerm
                ? `No shift profiles match "${searchTerm}". Try resetting your search filter.`
                : 'Click "Create New Shift" above to add your first working shift with custom multi-slot timings.'
            }
            actionLabel={searchTerm ? null : 'Create First Shift'}
            onAction={searchTerm ? null : openCreateModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShifts.map((shift) => {
            const colorMeta = COLOR_OPTIONS.find((c) => c.id === shift.color) || COLOR_OPTIONS[0];
            const timings = Array.isArray(shift.timings) ? shift.timings : [];
            const totalMinutes = timings.reduce((acc, t) => acc + calculateSlotMinutes(t.start_time, t.end_time), 0);

            return (
              <div
                key={shift.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top Bar with Color Indicator and Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${colorMeta.bg} ring-2 ring-white shadow-xs`} />
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${colorMeta.light}`}>
                        {colorMeta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          shift.is_active !== false
                            ? 'bg-emerald-100/70 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {shift.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Shift Title & Description */}
                  <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {shift.name}
                  </h3>
                  {shift.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {shift.description}
                    </p>
                  )}

                  {/* Timing Slots Box */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Timing Slots ({timings.length})</span>
                      </span>
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-extrabold text-[10px]">
                        Total {formatDurationDisplay(totalMinutes)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {timings.map((slot, sIdx) => {
                        const slotMinutes = calculateSlotMinutes(slot.start_time, slot.end_time);
                        return (
                          <div
                            key={sIdx}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-100/90 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                {slot.label || `Slot ${sIdx + 1}`}
                              </span>
                              <div className="font-extrabold text-slate-900 text-xs mt-0.5 flex items-center gap-1.5">
                                <span>{slot.start_time}</span>
                                <span className="text-slate-400 font-normal">→</span>
                                <span>{slot.end_time}</span>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                              {formatDurationDisplay(slotMinutes)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Info & Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      <strong className="text-slate-800 font-bold">{shift.assigned_staff_count || 0}</strong> assigned
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(shift)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Edit Shift"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmShift(shift)}
                      className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                      title="Delete Shift"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL: CREATE / EDIT SHIFT */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingShiftId ? 'Edit Shift Profile' : 'Create New Working Shift'}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmitForm} className="space-y-5 py-1">
            {/* Shift Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Shift Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Morning Floor Shift, Evening Rush, Split Duty"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Shift Tag Color & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Color Tag Indicator
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c.id })}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all cursor-pointer flex items-center justify-center ${
                        formData.color === c.id
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {formData.color === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Availability Status
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    formData.is_active
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <span>{formData.is_active ? 'Active & Selectable' : 'Inactive (Archived)'}</span>
                  <div
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      formData.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.is_active ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Shift Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Primary coach floor coverage during morning rush and circuit classes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* TIMING SLOTS BUILDER */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Shift Timing Slots</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Add multiple timing options/slots to this shift (e.g. for split shifts or flexible schedules).
                  </p>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 text-xs font-black border border-emerald-200">
                  Total: {formatDurationDisplay(totalFormMinutes)}
                </div>
              </div>

              {/* Slots List */}
              <div className="space-y-3">
                {formData.timings.map((slot, index) => {
                  const sMinutes = calculateSlotMinutes(slot.start_time, slot.end_time);
                  return (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder={`Slot ${index + 1} Name`}
                          value={slot.label || ''}
                          onChange={(e) => handleUpdateTimingSlot(index, 'label', e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 w-44 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">
                            {formatDurationDisplay(sMinutes)}
                          </span>
                          {formData.timings.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTimingSlot(index)}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove timing slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            required
                            value={formatTimeTo24HourInput(slot.start_time)}
                            onChange={(e) => handleUpdateTimingSlot(index, 'start_time', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                            Preview: {slot.start_time}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            required
                            value={formatTimeTo24HourInput(slot.end_time)}
                            onChange={(e) => handleUpdateTimingSlot(index, 'end_time', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                            Preview: {slot.end_time}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Slot Button */}
              <button
                type="button"
                onClick={handleAddTimingSlot}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Timing Slot Option</span>
              </button>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingShiftId ? 'Update Shift Profile' : 'Save & Publish Shift'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. MODAL: DELETE CONFIRMATION */}
      {deleteConfirmShift && (
        <Modal
          isOpen={Boolean(deleteConfirmShift)}
          onClose={() => setDeleteConfirmShift(null)}
          title="Delete Shift Profile"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 py-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Are you sure you want to delete "{deleteConfirmShift.name}"?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {deleteConfirmShift.assigned_staff_count > 0 ? (
                  <span className="text-amber-700 font-semibold block">
                    ⚠️ {deleteConfirmShift.assigned_staff_count} staff member(s) are currently assigned to this shift.
                  </span>
                ) : null}
                This action will permanently delete this shift configuration from your gym.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmShift(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Deleting...' : 'Yes, Delete Shift'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
