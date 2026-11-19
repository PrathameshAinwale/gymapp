import React, { useState, useMemo } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { SearchInput } from '../common/SearchInput';
import {
  Calendar,
  Clock,
  CheckCircle,
  Flame,
  Plus,
  Loader2,
  Users,
  Search,
  MapPin,
  Award,
  Check,
  Zap,
  Activity
} from 'lucide-react';

const formatClassDays = (days) => {
  if (Array.isArray(days)) return days;
  if (typeof days === 'string') {
    if (days.startsWith('[')) {
      try {
        const parsed = JSON.parse(days);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return days.split(',').map((d) => d.trim()).filter(Boolean);
  }
  return ['Mon', 'Wed', 'Fri'];
};

const getCategoryColor = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('yoga') || cat.includes('flexibility')) {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  if (cat.includes('hiit') || cat.includes('cardio')) {
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }
  if (cat.includes('strength') || cat.includes('power') || cat.includes('lifting')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (cat.includes('dance') || cat.includes('zumba')) {
    return 'bg-pink-50 text-pink-700 border-pink-200';
  }
  if (cat.includes('rehab') || cat.includes('mobility')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (cat.includes('crossfit')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-teal-50 text-teal-700 border-teal-200';
};

export const ClassBooking = () => {
  const { classes = [], bookedClasses = [], toggleBookClass } = useGymData();
  const [loadingClassId, setLoadingClassId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const set = new Set(['All']);
    classes.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const title = (cls.title || cls.name || '').toLowerCase();
      const coach = (cls.trainerName || cls.instructor || '').toLowerCase();
      const cat = (cls.category || '').toLowerCase();
      const room = (cls.room || '').toLowerCase();
      const term = searchTerm.toLowerCase();

      const matchesSearch =
        title.includes(term) || coach.includes(term) || cat.includes(term) || room.includes(term);

      const matchesCategory =
        selectedCategory === 'All' || (cls.category || '').toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [classes, searchTerm, selectedCategory]);

  const handleToggleBooking = async (classId) => {
    setLoadingClassId(classId);
    try {
      await toggleBookClass(classId);
    } finally {
      setLoadingClassId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="app-page-title font-bold text-slate-900 tracking-normal">
              Group Fitness & Studio Batches
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse daily studio timetables, check batch capacity, and reserve your workout spots.
          </p>
        </div>

        {/* Quick Member Slot Counter */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-800 self-start sm:self-auto shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{bookedClasses.length} Active Reservation{bookedClasses.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
          placeholder="Search class by title, coach, or studio room..."
          mobilePlaceholder="Search classes..."
          containerClassName="flex-1 max-w-md"
        />

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Classes Grid (Clean, Photo-less Modern Cards) */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Group Classes Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `No classes matching "${searchTerm}". Try a different search term or category filter.`
              : 'There are currently no classes scheduled in this category. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const isBooked = bookedClasses.includes(cls.id) || bookedClasses.includes(cls.numericId);
            const isLoading = loadingClassId === cls.id;
            const classTitle = cls.title || cls.name || 'Studio Batch';
            const coachName = cls.trainerName || cls.instructor || 'Lead Trainer';
            const capacity = Number(cls.capacity) || 20;
            const enrolled = Number(cls.enrolledCount ?? cls.bookedCount ?? 0);
            const slotsLeft = Math.max(0, capacity - enrolled);
            const occupancyPct = Math.min(100, Math.round((enrolled / capacity) * 100));
            const daysList = formatClassDays(cls.days);
            const categoryBadgeColor = getCategoryColor(cls.category);

            return (
              <div
                key={cls.id}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between space-y-4 transition-all duration-200 shadow-xs hover:shadow-md ${
                  isBooked
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Top Status & Category Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-2xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border shrink-0 whitespace-nowrap ${categoryBadgeColor}`}
                    >
                      {cls.category || 'Group Fitness'}
                    </span>

                    {isBooked ? (
                      <span className="flex items-center gap-1 text-2xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs shrink-0 whitespace-nowrap">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Slot Reserved</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-2xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg shrink-0 whitespace-nowrap">
                        <Flame className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>{cls.intensity || cls.difficulty || 'All Levels'}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-900 tracking-tight leading-snug truncate" title={classTitle}>
                      {classTitle}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed" title={cls.description || `${cls.category || 'Studio fitness'} batch focusing on form, endurance, and functional training.`}>
                      {cls.description || `${cls.category || 'Studio fitness'} batch focusing on form, endurance, and functional training.`}
                    </p>
                  </div>

                  {/* Schedule Details Strip */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 min-w-0">
                      <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-2xs text-slate-400 uppercase font-semibold block leading-none">Timing</span>
                        <span className="font-bold text-slate-800 text-2xs truncate block mt-0.5" title={cls.time}>{cls.time}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-2xs text-slate-400 uppercase font-semibold block leading-none">Location</span>
                        <span className="font-bold text-slate-800 text-2xs truncate block mt-0.5" title={cls.room || 'Studio A'}>{cls.room || 'Studio A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Days */}
                  <div className="space-y-1">
                    <span className="text-2xs uppercase font-semibold text-slate-400 tracking-wider block">Weekly Schedule</span>
                    <div className="flex flex-wrap gap-1.5">
                      {daysList.map((d, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-2xs border border-slate-200"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Coach Banner */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs gap-2">
                    <div className="flex items-center gap-1.5 text-slate-500 shrink-0 whitespace-nowrap">
                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-2xs">Instructor:</span>
                    </div>
                    <span className="font-bold text-slate-900 truncate max-w-[170px]" title={coachName}>{coachName}</span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1 pt-0.5">
                    <div className="flex items-center justify-between text-2xs gap-2">
                      <span className="text-slate-500 flex items-center gap-1 font-medium truncate">
                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">Roster Capacity</span>
                      </span>
                      <span className={`font-bold shrink-0 whitespace-nowrap ${slotsLeft <= 3 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {slotsLeft > 0 ? `${slotsLeft} of ${capacity} slots left` : 'Batch Full'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          occupancyPct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Booking Button */}
                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={isLoading || (!isBooked && slotsLeft === 0)}
                    onClick={() => handleToggleBooking(cls.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isBooked
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:scale-98'
                        : slotsLeft === 0
                        ? 'bg-slate-100 text-slate-400 border border-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs shadow-emerald-600/20 active:scale-98'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : isBooked ? (
                      <span>Cancel Reservation</span>
                    ) : slotsLeft === 0 ? (
                      <span>Batch Full</span>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Book Slot</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
