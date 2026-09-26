import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGymData } from '../../context/GymDataContext';
import { useAuth } from '../../context/AuthContext';
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
  BookOpen
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import {
  hasSqlInjection,
  sanitizeDigits,
  preventNonNumericKey
} from '../../utils/validation';

export const ClassAdminManager = () => {
  const { classes = [], fetchClasses, addClass, deleteClass, trainers = [], fetchTrainers, members = [], addToast } = useGymData();
  const { canEditDelete, currentRole } = useAuth();

  useEffect(() => {
    fetchClasses?.();
    fetchTrainers?.();
  }, [fetchClasses, fetchTrainers]);

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
    trainerId: trainers[0]?.id || '',
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

    const assignedCoach = trainers.find((t) => t.id === form.trainerId) || trainers[0];
    const classDescription = form.description || `High-energy ${form.category} training batch led by ${assignedCoach?.name || 'our certified coach'}. All equipment and locker access provided.`;

    try {
      await addClass({
        name: form.name,
        title: form.name,
        trainerId: assignedCoach?.id,
        trainerName: assignedCoach?.name || 'Coach Alex Rivers',
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
        trainerId: trainers[0]?.id || '',
        time: '07:00 AM - 08:00 AM',
        days: ['Mon', 'Wed', 'Fri'],
        capacity: 25,
        category: 'Cardio & HIIT',
        room: 'Studio A (Main Floor)',
        difficulty: 'All Levels',
        description: ''
      });
    } catch (err) {
      addToast(err.message || 'Failed to create class', 'error');
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
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Group Classes & Batch Scheduling
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create group workout batches, allocate certified coaches, set hall capacity, and monitor member enrollment.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Class</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
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
              placeholder="Search group class batch by name, coach, category, room..."
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
                      <button
                        type="button"
                        onClick={() => deleteClass(cls.id)}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 transition-all cursor-pointer"
                        title="Remove Class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Assigned Coach</label>
            <select
              value={form.trainerId}
              onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
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
    </div>
  );
};
