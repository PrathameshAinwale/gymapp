import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { useGymData } from '../../context/GymDataContext';
import { Modal } from '../common/Modal';

// Helper to convert "HH:MM" or "HH:MM AM/PM" to 12h display
export const formatTimeTo12Hour = (timeStr) => {
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
export const formatTimeTo24HourInput = (timeStr) => {
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
export const calculateSlotMinutes = (start, end) => {
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

export const formatDurationDisplay = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '0 hrs';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs} ${hrs === 1 ? 'hr' : 'hrs'}`;
  return `${mins} mins`;
};

export const COLOR_OPTIONS = [
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', light: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500', light: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-600', light: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export const ShiftFormModal = ({
  isOpen,
  onClose,
  editingShift = null,
  onSuccess = null,
  zIndexOverride = null
}) => {
  const { createShift, updateShift, addToast } = useGymData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: 'emerald',
    is_active: true,
    timings: [
      { start_time: '06:00 AM', end_time: '02:00 PM', label: 'Slot 1' }
    ]
  });

  useEffect(() => {
    if (isOpen) {
      if (editingShift) {
        const timings = Array.isArray(editingShift.timings) && editingShift.timings.length > 0
          ? editingShift.timings.map((t, idx) => ({
              start_time: t.start_time || '06:00 AM',
              end_time: t.end_time || '02:00 PM',
              label: t.label || `Slot ${idx + 1}`
            }))
          : [{ start_time: '06:00 AM', end_time: '02:00 PM', label: 'Slot 1' }];

        setFormData({
          name: editingShift.name || '',
          description: editingShift.description || '',
          color: editingShift.color || 'emerald',
          is_active: editingShift.is_active !== undefined ? Boolean(editingShift.is_active) : true,
          timings
        });
      } else {
        setFormData({
          name: '',
          description: '',
          color: 'emerald',
          is_active: true,
          timings: [
            { start_time: '06:00 AM', end_time: '02:00 PM', label: 'Slot 1' }
          ]
        });
      }
    }
  }, [isOpen, editingShift]);

  const handleAddTimingSlot = () => {
    const nextSlotNum = formData.timings.length + 1;
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
        description: formData.description?.trim() || null,
        color: formData.color || 'emerald',
        is_active: formData.is_active,
        timings: formData.timings.map((t, idx) => ({
          start_time: formatTimeTo12Hour(t.start_time),
          end_time: formatTimeTo12Hour(t.end_time),
          label: t.label?.trim() || `Slot ${idx + 1}`
        }))
      };

      let result;
      if (editingShift?.id) {
        result = await updateShift(editingShift.id, payload);
      } else {
        result = await createShift(payload);
      }

      // Compute display label for staff form
      let timingLabel = '';
      if (Array.isArray(payload.timings) && payload.timings.length > 0) {
        timingLabel = payload.timings.map((t) => `${t.start_time} - ${t.end_time}`).join(' & ');
      }
      const formattedLabel = timingLabel ? `${payload.name} (${timingLabel})` : payload.name;

      if (onSuccess) {
        onSuccess(result || payload, formattedLabel);
      }
      onClose();
    } catch (err) {
      console.error('Save shift error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingShift ? 'Edit Shift Profile' : 'Create New Working Shift'}
      maxWidth="max-w-2xl"
      zIndexOverride={zIndexOverride}
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
            <div className="relative">
              <select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer appearance-none shadow-2xs"
              >
                <option value="active">Active & Selectable</option>
                <option value="inactive">Inactive (Archived)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
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
            value={formData.description || ''}
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
            onClick={onClose}
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
                <span>{editingShift ? 'Update Shift Profile' : 'Save & Publish Shift'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ShiftFormModal;
