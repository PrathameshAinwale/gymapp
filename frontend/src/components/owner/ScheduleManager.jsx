import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import { Calendar, Clock, MapPin, Users, Plus, Flame, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';

export const ScheduleManager = () => {
  const { classes = [], trainers = [], addClass, deleteClass, addToast } = useGymData();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newClass, setNewClass] = useState({
    title: '',
    category: 'HIIT & Cardio',
    trainerName: trainers[0]?.name || 'Alex Mercer',
    trainerId: trainers[0]?.id || '',
    time: '07:00 AM - 08:00 AM',
    days: ['Mon', 'Wed', 'Fri'],
    room: 'Studio A (Floor 2)',
    capacity: 25,
    enrolledCount: 0,
    intensity: 'High',
    description: 'High intensity interval training designed to burn calories and boost endurance.'
  });

  const totalCapacity = classes.reduce((acc, c) => acc + (Number(c.capacity) || 0), 0);
  const totalBooked = classes.reduce((acc, c) => acc + (Number(c.enrolledCount || c.bookedCount) || 0), 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (addClass) {
      await addClass({
        ...newClass,
        image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=60'
      });
    }
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Classes & Timetable
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Schedule studio classes, track occupancy limits, and assign certified instructors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Schedule New Class</span>
          <span className="inline sm:hidden">Add Class</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Sessions</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">{classList.length} Classes</div>
          <span className="text-[10px] sm:text-[11px] text-slate-500 block truncate">Weekly recurring</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Booked Capacity</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5">{totalBooked} / {totalCapacity}</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium block truncate">Member reservations</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Avg Occupancy</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5">{avgOccupancy}% Full</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium block truncate">Overall studio utilization</span>
        </div>
      </div>

      {/* Class Schedule Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {classes.map((cls) => {
          const percentFull = Math.round(((cls.enrolledCount || cls.bookedCount || 0) / (cls.capacity || 1)) * 100);

          return (
            <div
              key={cls.id}
              className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
            >
              {/* Image banner */}
              <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-slate-900">
                <img
                  src={cls.image || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=60'}
                  alt={cls.title || cls.name}
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

                <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  {cls.category || 'Fitness'}
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-amber-300 font-bold bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-amber-500/20">
                    <Flame className="w-3 h-3" />
                    <span>{cls.intensity || cls.difficulty || 'High'}</span>
                  </div>
                  <div className="text-[10px] text-slate-200 font-bold bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-700">
                    {cls.room || 'Studio A'}
                  </div>
                </div>
              </div>

              {/* Class Info */}
              <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-0.5 truncate">
                      {cls.title || cls.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {cls.description || 'Group training session for members.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteClass(cls.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details Matrix */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium truncate">{cls.time}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1.5 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-medium truncate">{Array.isArray(cls.days) ? cls.days.join(', ') : cls.days}</span>
                  </div>
                </div>

                {/* Instructor */}
                <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium">Instructor:</span>
                  <span className="font-bold text-slate-900">{cls.trainerName || 'Coach Alex'}</span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-600" /> Booked Capacity
                    </span>
                    <span className="font-bold text-slate-900">
                      {cls.enrolledCount || cls.bookedCount || 0} / {cls.capacity} ({percentFull}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentFull >= 90
                          ? 'bg-rose-500'
                          : percentFull >= 70
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(percentFull, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule New Class Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Schedule New Group Class"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Class Title *</label>
            <input
              type="text"
              required
              value={newClass.title}
              onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
              placeholder="e.g. Morning Power Yoga"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
              <select
                value={newClass.category}
                onChange={(e) => setNewClass({ ...newClass, category: e.target.value })}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="HIIT & Cardio">HIIT & Cardio</option>
                <option value="Yoga & Mobility">Yoga & Mobility</option>
                <option value="Strength & Conditioning">Strength & Conditioning</option>
                <option value="Zumba & Dance">Zumba & Dance</option>
                <option value="Spin & Cycling">Spin & Cycling</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Instructor</label>
              <select
                value={newClass.trainerName}
                onChange={(e) => setNewClass({ ...newClass, trainerName: e.target.value })}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {trainers.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Time Slot *</label>
              <input
                type="text"
                required
                value={newClass.time}
                onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                placeholder="07:00 AM - 08:00 AM"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Room / Studio *</label>
              <input
                type="text"
                required
                value={newClass.room}
                onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                placeholder="Studio A (Floor 2)"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Max Capacity *</label>
              <input
                type="number"
                required
                min="1"
                max="100"
                value={newClass.capacity}
                onChange={(e) => setNewClass({ ...newClass, capacity: Number(e.target.value) })}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Intensity</label>
              <select
                value={newClass.intensity}
                onChange={(e) => setNewClass({ ...newClass, intensity: e.target.value })}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Low">Low (Relaxed)</option>
                <option value="Moderate">Moderate</option>
                <option value="High">High (Cardio Burn)</option>
                <option value="Extreme">Extreme (Athlete)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              value={newClass.description}
              onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
            >
              Create Class
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
