import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Award,
  Phone,
  Mail,
  Users,
  Dumbbell,
  Utensils,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  LogOut,
  ChevronRight,
  User,
  TrendingUp
} from 'lucide-react';

export const TrainerProfile = ({ setActiveTab }) => {
  const { currentUser, logout } = useAuth();
  const { trainers, members } = useGymData();
  const [avatarError, setAvatarError] = useState(false);

  // Match current trainer in trainers list or fallback
  const trainer = trainers.find((t) => t.id === currentUser?.id || t.email === currentUser?.email) || trainers[0];

  // Helper to parse certifications
  const rawCerts = trainer?.certifications;
  const certList = Array.isArray(rawCerts)
    ? rawCerts.filter(Boolean)
    : (typeof rawCerts === 'string' && rawCerts.trim()
      ? rawCerts.split(',').map((s) => s.trim()).filter(Boolean)
      : []);

  // Assigned clients count
  const assignedClients = members.filter((m) => m.trainerId === trainer?.id || m.trainerName?.toLowerCase().includes('alex'));

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn pb-24 max-w-xl mx-auto w-full">
      
      {/* Profile Header Hero Card */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
        <div className="relative inline-block">
          {(trainer?.avatar || currentUser?.avatar) && !avatarError ? (
            <img
              src={trainer?.avatar || currentUser?.avatar}
              alt={trainer?.name || 'Coach'}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md shadow-emerald-500/20 mx-auto"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-50 border-2 border-emerald-500/40 shadow-md shadow-emerald-500/20 flex items-center justify-center mx-auto text-emerald-600">
              <User className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-lg sm:text-2xl font-black font-heading text-slate-900 mt-0.5">
            {trainer?.name || currentUser?.name || 'Coach Alex Rivers'}
          </h1>
          <p className="text-xs text-emerald-700 font-semibold mt-0.5">
            {trainer?.specialty || trainer?.role || 'Strength & Conditioning Coach'}
          </p>
        </div>
      </div>

      {/* 2 Registered Metrics: Experience & Monthly Salary */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block truncate">Experience</span>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
            {trainer?.experience || '5+ Years'}
          </div>
          <span className="text-[10px] text-slate-500">Career Background</span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-center shadow-sm">
          <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block truncate">Monthly Salary</span>
          <div className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
            ₹{Number(trainer?.monthlySalary || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">Base Compensation</span>
        </div>
      </div>

      {/* Certifications Card */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Certifications & Accreditations
          </h2>
        </div>

        {certList.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {certList.map((cert, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold"
              >
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>{cert}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No certifications listed yet.</p>
        )}
      </div>

      {/* Personal Information */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Personal Information
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase">Age</span>
            <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
              {trainer?.age ? `${trainer.age} Yrs` : 'Not Specified'}
            </span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase">Gender</span>
            <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
              {trainer?.gender || 'Not Specified'}
            </span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase">Blood</span>
            <span className="font-semibold text-rose-600 text-[11px] sm:text-xs">
              {trainer?.bloodGroup || trainer?.blood_group || 'B+'}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase">Residential Address</span>
            <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
              {trainer?.address || 'Powai, Mumbai'}
            </span>
          </div>
        </div>
      </div>

      {/* Bio & Credentials */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Bio & Profile Summary
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed italic">
          "{trainer?.bio || 'Dedicated fitness professional guiding members toward peak performance, hypertrophy, and sustainable athletic conditioning.'}"
        </p>
      </div>

      {/* Contact Details */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Contact Details
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">Email Address (Login)</span>
              <span className="font-semibold text-slate-900 truncate block text-[11px] sm:text-xs">
                {trainer?.email || currentUser?.email || 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <Phone className="w-4 h-4 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">Phone Number</span>
              <span className="font-semibold text-slate-900 block text-[11px] sm:text-xs">
                {trainer?.phone || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        type="button"
        onClick={logout}
        className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out</span>
      </button>

    </div>
  );
};
