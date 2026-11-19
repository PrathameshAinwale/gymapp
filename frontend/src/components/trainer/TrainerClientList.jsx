import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Users,
  Search,
  Dumbbell,
  Utensils,
  Eye,
  Target,
  Clock,
  Phone,
  Mail,
  AlertCircle,
  X,
  ShieldCheck,
  ChevronRight,
  User
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';

const UserAvatar = ({ src, alt, className = "w-10 h-10 rounded-full", iconClassName = "w-5 h-5 text-emerald-600" }) => {
  const [hasError, setHasError] = useState(false);
  if (!src || hasError) {
    return (
      <div className={`${className} bg-emerald-50 border border-slate-200 flex items-center justify-center shrink-0`}>
        <User className={iconClassName} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Avatar"}
      className={`${className} object-cover shrink-0`}
      onError={() => setHasError(true)}
    />
  );
};

export const TrainerClientList = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const { members } = useGymData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Filter clients assigned to trainer (or all if unassigned) matching search
  const assignedClients = members.filter((m) => {
    const isAssigned = m.trainerId === currentUser?.id || !m.trainerId;
    const matchSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.goal && m.goal.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.planName && m.planName.toLowerCase().includes(searchTerm.toLowerCase()));
    return isAssigned && matchSearch;
  });

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn pb-16 max-w-2xl mx-auto w-full">
      
      {/* Header & Search */}
      <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="app-page-title font-bold text-slate-900 tracking-normal truncate">
              My Client Roster
            </h1>
            <p className="text-2xs text-slate-500 mt-0.5 hidden sm:block max-w-[70ch]">
              Assigned members and personal training clients
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-2xs sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            {assignedClients.length} {assignedClients.length === 1 ? 'Client' : 'Clients'}
          </span>
        </div>

        {/* Responsive Search Input */}
        <SearchInput
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClear={() => setSearchTerm('')}
          placeholder="Search by name, goal, or plan..."
          mobilePlaceholder="Search clients..."
          containerClassName="w-full"
        />
      </div>

      {/* Empty Search State */}
      {assignedClients.length === 0 && (
        <div className="p-8 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No clients found</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {searchTerm
              ? `No members match "${searchTerm}". Try a different search.`
              : 'You do not have any assigned clients yet.'}
          </p>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Clients List / Grid */}
      <div className="space-y-2.5 sm:space-y-3">
        {assignedClients.map((client) => (
          <div
            key={client.id}
            className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-all space-y-2.5 sm:space-y-3.5 shadow-sm"
          >
            {/* Top Row: Avatar + Name + Plan + Demographics */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <UserAvatar
                  src={client.avatar}
                  alt={client.name}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0"
                  iconClassName="w-5 h-5 text-emerald-600"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate" title={client.name}>{client.name}</h3>
                  <div className="text-2xs sm:text-xs text-emerald-700 font-semibold truncate" title={client.planName || 'Standard Pass'}>
                    {client.planName || 'Standard Pass'}
                  </div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-lg text-2xs sm:text-2xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0 whitespace-nowrap">
                {client.gender || 'Member'}{client.age ? `, ${client.age}y` : ''}
              </span>
            </div>

            {/* Goal & Target Weight Pill */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-start gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-2xs sm:text-2xs uppercase font-semibold text-slate-400 block">Goal:</span>
                  <span className="text-slate-800 font-medium line-clamp-2 text-2xs sm:text-xs" title={client.goal}>{client.goal}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-2xs sm:text-2xs">
                <span className="text-slate-500">Weight:</span>
                <span className="font-bold text-slate-900 whitespace-nowrap shrink-0">
                  {client.weight} kg <span className="text-emerald-700">→ {client.targetWeight} kg</span>
                </span>
              </div>
            </div>

            {/* Attendance Streak & Last Checked In */}
            <div className="flex items-center justify-between text-2xs sm:text-xs text-slate-500 px-0.5 gap-2">
              <span className="font-bold text-emerald-700 whitespace-nowrap shrink-0">
                {client.attendanceStreak || 0} Days Streak
              </span>
              <span className="truncate min-w-0" title={`Last in gym: ${client.lastCheckIn || 'Recently'}`}>
                Last in gym: {client.lastCheckIn || 'Recently'}
              </span>
            </div>

            {/* Action Buttons (Touch-friendly & Clean) */}
            <div className="pt-2 sm:pt-3 border-t border-slate-100 flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('workout-builder')}
                className="flex-1 py-2 sm:py-2.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-2xs sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Workout</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diet-builder')}
                className="flex-1 py-2 sm:py-2.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-2xs sm:text-xs font-bold border border-slate-200 transition-colors active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                <span>Diet Plan</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedClient(client)}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
                title="View Client Details"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CLIENT ASSESSMENT & MEDICAL MODAL */}
      <Modal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient ? `Athlete File: ${selectedClient.name}` : ''}
      >
        {selectedClient && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <UserAvatar
                src={selectedClient.avatar}
                alt={selectedClient.name}
                className="w-12 h-12 rounded-full shrink-0"
                iconClassName="w-6 h-6 text-emerald-600"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm truncate" title={selectedClient.name}>{selectedClient.name}</h4>
                <p className="text-slate-500 text-xs truncate" title={selectedClient.planName}>{selectedClient.planName}</p>
                <div className="flex items-center gap-2 mt-1 text-2xs text-slate-500">
                  <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <Phone className="w-3 h-3 text-emerald-600 shrink-0" /> {selectedClient.phone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-2xs text-slate-400 uppercase font-medium block">Current</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">{selectedClient.weight} kg</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-2xs text-slate-400 uppercase font-medium block">Target</span>
                <span className="text-sm font-bold text-emerald-700 mt-0.5 block">{selectedClient.targetWeight} kg</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-2xs text-slate-400 uppercase font-medium block">Streak</span>
                <span className="text-sm font-bold text-amber-600 mt-0.5 block">{selectedClient.attendanceStreak || 0}d</span>
              </div>
            </div>

            {/* Medical Notes & Injuries */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div>
                <span className="font-semibold text-slate-500 uppercase text-2xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Medical Notes & Considerations:
                </span>
                <p className="text-amber-800 mt-1 pl-5">
                  {selectedClient.medicalNotes || 'No known health risks or injuries reported.'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-500 uppercase text-2xs block">
                  Emergency Contact:
                </span>
                <p className="text-slate-800 mt-0.5">
                  {selectedClient.emergencyContact || 'Not specified'}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedClient(null);
                  setActiveTab('workout-builder');
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Assign Workout</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedClient(null);
                  setActiveTab('diet-builder');
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
              >
                <Utensils className="w-3.5 h-3.5 text-amber-600" />
                <span>Assign Diet</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
