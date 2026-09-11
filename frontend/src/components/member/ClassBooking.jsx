import React from 'react';
import { useGymData } from '../../context/GymDataContext';
import { Calendar, Clock, MapPin, CheckCircle, Flame, Plus } from 'lucide-react';

export const ClassBooking = () => {
  const { classes, bookedClasses, toggleBookClass } = useGymData();

  return (
    <div className="space-y-6 animate-fadeIn pb-10 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-600" />
          <span>Group Fitness & Studio Classes</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Reserve your spot in high-energy instructor-led workout classes.
        </p>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {classes.map((cls) => {
          const isBooked = bookedClasses.includes(cls.id);

          return (
            <div
              key={cls.id}
              className={`bg-white rounded-2xl overflow-hidden border flex flex-col justify-between transition-all duration-300 shadow-sm ${
                isBooked
                  ? 'border-emerald-400 ring-1 ring-emerald-300/60'
                  : 'border-slate-200'
              }`}
            >
              {/* Image banner */}
              <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                <img
                  src={cls.image}
                  alt={cls.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-xs">
                  {cls.category}
                </div>

                {isBooked && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <CheckCircle className="w-3 h-3" /> Slot Reserved
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/10">
                    <Flame className="w-3.5 h-3.5" />
                    <span>{cls.intensity || 'High Intensity'}</span>
                  </div>
                  <div className="text-xs text-white font-medium bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-white/10">
                    {cls.room}
                  </div>
                </div>
              </div>

              {/* Class Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 mb-0.5">
                    {cls.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {cls.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{cls.time}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{cls.days.join(', ')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500">Instructor:</span>
                  <span className="font-bold text-slate-800">{cls.trainerName}</span>
                </div>

                {/* Booking Button */}
                <button
                  type="button"
                  onClick={() => toggleBookClass(cls.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    isBooked
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20'
                  }`}
                >
                  {isBooked ? (
                    <span>Cancel Reservation</span>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Book Slot ({cls.capacity - cls.enrolledCount} left)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
