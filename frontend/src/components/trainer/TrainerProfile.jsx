import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { api } from '../../services/api';
import {
  Award,
  Phone,
  Mail,
  User,
  MapPin,
  Edit3,
  Lock,
  Calendar,
  Clock,
  CheckCircle2,
  Shield,
  Heart,
  ArrowLeft
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const TrainerProfile = () => {
  const { currentUser, updateCurrentUser } = useAuth();
  const { trainers, updateTrainer, addToast, fetchTrainers } = useGymData();

  const [avatarError, setAvatarError] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Robust trainer matching against database trainers list without fallback to seed trainers
  const cleanCurrentId = String(currentUser?.userId || currentUser?.id || '').replace(/\D/g, '');
  const cleanCurrentPhone = currentUser?.phone ? String(currentUser.phone).replace(/\D/g, '').slice(-10) : '';

  const matchedTrainer = (trainers || []).find((t) => {
    const cleanTId = String(t.userId || t.id || '').replace(/\D/g, '');
    const cleanTPhone = t.phone ? String(t.phone).replace(/\D/g, '').slice(-10) : '';
    if (cleanCurrentId && cleanTId && cleanCurrentId === cleanTId) return true;
    if (currentUser?.email && t.email && currentUser.email.toLowerCase() === t.email.toLowerCase()) return true;
    if (cleanCurrentPhone && cleanTPhone && cleanCurrentPhone === cleanTPhone) return true;
    return false;
  });

  // Pull fresh profile directly from backend endpoint on mount
  useEffect(() => {
    const numericId = cleanCurrentId || currentUser?.userId;
    if (!numericId) return;

    let isMounted = true;
    setIsLoadingProfile(true);
    api.trainers.getById(numericId)
      .then((res) => {
        if (isMounted && res?.success && res?.data) {
          setProfileData(res.data);
        }
      })
      .catch((err) => {
        console.warn('Trainer profile fetch note:', err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false);
      });

    return () => { isMounted = false; };
  }, [cleanCurrentId, currentUser?.userId]);

  // Merge authoritative data: direct API data > matched trainer from context > currentUser state
  const activeTrainer = {
    ...currentUser,
    ...(matchedTrainer || {}),
    ...(profileData || {})
  };

  // Helper to parse certifications into array
  const rawCerts = activeTrainer?.certifications;
  const certList = Array.isArray(rawCerts)
    ? rawCerts.filter(Boolean)
    : (typeof rawCerts === 'string' && rawCerts.trim()
      ? rawCerts.split(',').map((s) => s.trim()).filter(Boolean)
      : []);

  // Form state for editing profile
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    avatar: '',
    specialty: '',
    experience: '',
    bio: '',
    certifications: '',
    age: '',
    dob: '',
    gender: '',
    blood_group: '',
    address: '',
    salary: 0,
    shifts: '',
    joining_date: ''
  });

  const startEditing = () => {
    const certString = Array.isArray(activeTrainer?.certifications)
      ? activeTrainer.certifications.join(', ')
      : (activeTrainer?.certifications || '');

    setEditForm({
      name: activeTrainer?.name || '',
      phone: activeTrainer?.phone || '',
      email: activeTrainer?.email || '',
      avatar: activeTrainer?.avatar || '',
      specialty: activeTrainer?.specialty || '',
      experience: activeTrainer?.experience || '',
      bio: activeTrainer?.bio || '',
      certifications: certString,
      age: activeTrainer?.age || '',
      dob: activeTrainer?.dob ? activeTrainer.dob.slice(0, 10) : '',
      gender: activeTrainer?.gender || '',
      blood_group: activeTrainer?.bloodGroup || activeTrainer?.blood_group || '',
      address: activeTrainer?.address || '',
      salary: activeTrainer?.monthlySalary ?? activeTrainer?.salary ?? 0,
      shifts: activeTrainer?.shifts || 'Regular Shift',
      joining_date: activeTrainer?.joiningDate || activeTrainer?.joining_date || ''
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      addToast('Please enter your full name.', 'error');
      return;
    }
    if (!editForm.phone.trim()) {
      addToast('Please enter your mobile number.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const numericId = cleanCurrentId || currentUser?.userId;
      const certArray = editForm.certifications
        ? editForm.certifications.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      // Strictly DO NOT send salary, shifts, or joining date in the coach profile update payload
      const payload = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || null,
        avatar: editForm.avatar.trim() || null,
        specialty: editForm.specialty.trim(),
        experience: editForm.experience.trim(),
        bio: editForm.bio.trim(),
        certifications: certArray,
        age: editForm.age ? Number(editForm.age) : null,
        dob: editForm.dob || null,
        gender: editForm.gender || null,
        blood_group: editForm.blood_group || null,
        bloodGroup: editForm.blood_group || null,
        address: editForm.address.trim() || null
      };

      const res = await api.trainers.update(numericId, payload);
      const returnedData = res?.data || payload;

      const updatedState = {
        ...activeTrainer,
        ...returnedData,
        ...payload,
        id: `trn-${numericId}`,
        userId: Number(numericId)
      };

      setProfileData(updatedState);

      // Sync with global AuthContext
      if (updateCurrentUser) {
        updateCurrentUser(payload);
      }

      // Sync with GymDataContext trainers list
      if (updateTrainer) {
        updateTrainer(`trn-${numericId}`, payload);
      }

      if (fetchTrainers) {
        fetchTrainers();
      }

      addToast('Coach profile updated successfully!', 'success');
      setIsEditing(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Update trainer profile error:', err);
      addToast(`Failed to update profile: ${err.message || 'Please check your connection'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = activeTrainer?.name || 'Coach';
  const displaySpecialty = activeTrainer?.specialty || activeTrainer?.roleLabel || 'Fitness Coach';
  const displayExperience = activeTrainer?.experience || 'Not Specified';
  const displaySalary = Number(activeTrainer?.monthlySalary ?? activeTrainer?.salary ?? 0);
  const displayGender = activeTrainer?.gender || 'Not Specified';
  const displayBlood = activeTrainer?.bloodGroup || activeTrainer?.blood_group || 'Not Specified';
  const displayAge = activeTrainer?.age ? `${activeTrainer.age} Yrs` : 'Not Specified';
  const displayAddress = activeTrainer?.address || 'Not Specified';
  const displayBio = activeTrainer?.bio || 'No bio or coaching philosophy provided yet.';
  const displayEmail = activeTrainer?.email || 'N/A';
  const displayPhone = activeTrainer?.phone || 'N/A';
  const displayShift = activeTrainer?.shifts || 'Regular Shift';
  const displayJoiningDate = activeTrainer?.joiningDate || activeTrainer?.joining_date || 'N/A';

  // -------------------------------------------------------------
  // DIRECT EDIT PROFILE PAGE (Full view, mobile-optimized, no popup)
  // -------------------------------------------------------------
  if (isEditing) {
    return (
      <div className="space-y-4 animate-fadeIn pb-24 max-w-xl mx-auto w-full px-2 sm:px-0">
        
        {/* Page Header with Back Button */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </button>
          <div className="text-right">
            <h1 className="text-sm sm:text-base font-bold text-slate-900">Edit Profile</h1>
            <p className="text-[11px] text-slate-500">Update coach information</p>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          
          {/* Section 1: Basic & Contact Details */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              Personal & Contact Details
            </h2>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mobile Number *</label>
              <input
                type="tel"
                required
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="10-digit mobile"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="coach@example.com"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Profile Picture (Image URL)</label>
              <input
                type="url"
                value={editForm.avatar}
                onChange={(e) => setEditForm({ ...editForm, avatar: e.target.value })}
                placeholder="https://..."
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Section 2: Coaching Credentials & Philosophy */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Coaching Specialization & Philosophy
            </h2>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Specialization / Domain</label>
              <input
                type="text"
                value={editForm.specialty}
                onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                placeholder="e.g. Strength & Conditioning, HIIT"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Experience</label>
              <input
                type="text"
                value={editForm.experience}
                onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                placeholder="e.g. 4+ Years"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Certifications (comma separated)
              </label>
              <input
                type="text"
                value={editForm.certifications}
                onChange={(e) => setEditForm({ ...editForm, certifications: e.target.value })}
                placeholder="e.g. ACE-CPT, CSCS, CrossFit L1"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Separate multiple accreditations with commas.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Coach Bio & Transformation Philosophy
              </label>
              <textarea
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Describe your training ethos, member transformation approach, coaching style, etc."
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-none"
              />
            </div>
          </div>

          {/* Section 3: Demographics & Blood Group */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-rose-500" />
              Demographics & Address
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Blood Group</label>
                <select
                  value={editForm.blood_group}
                  onChange={(e) => setEditForm({ ...editForm, blood_group: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                >
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
              <input
                type="date"
                value={editForm.dob}
                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Residential Address</label>
              <textarea
                rows={2}
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Enter residential address"
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-none"
              />
            </div>
          </div>

          {/* Section 4: Employment & Compensation (LOCKED / READ-ONLY) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-500" />
                Employment & Compensation
              </h2>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Locked
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-900 leading-snug">
                Salary, shift allocations, and joining date are locked for coaches and can only be modified by gym management.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Monthly Salary</span>
                  <span className="text-xs font-bold text-slate-800">
                    ₹{Number(editForm.salary).toLocaleString('en-IN')}
                  </span>
                </div>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Assigned Shift</span>
                  <span className="text-xs font-bold text-slate-800">
                    {editForm.shifts || 'Regular Shift'}
                  </span>
                </div>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Joining Date</span>
                  <span className="text-xs font-bold text-slate-800">
                    {editForm.joining_date || 'N/A'}
                  </span>
                </div>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setIsEditing(false)}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/25 active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PROFILE VIEW PAGE (Default)
  // -------------------------------------------------------------
  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn pb-24 max-w-xl mx-auto w-full px-2 sm:px-0">
      
      {/* Profile Header Hero Card (Mobile-First) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs relative overflow-hidden">
        {/* Top Right Edit Profile Button */}
        <button
          type="button"
          onClick={startEditing}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer z-10"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        {/* Avatar */}
        <div className="relative inline-block mt-1">
          {activeTrainer?.avatar && !avatarError ? (
            <img
              src={activeTrainer.avatar}
              alt={displayName}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl object-cover border-2 border-emerald-500/40 shadow-sm mx-auto"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-emerald-50 border-2 border-emerald-500/40 shadow-sm flex items-center justify-center mx-auto text-emerald-600">
              <User className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight">
            {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-700 font-semibold mt-0.5">
            {displaySpecialty}
          </p>
        </div>
      </div>

      {/* Career & Compensation Metrics */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">Experience</span>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
            {displayExperience}
          </div>
          <span className="text-[10px] text-slate-500">Career Background</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-center shadow-xs relative">
          <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-slate-400">
            <span>Monthly Salary</span>
            <Lock className="w-2.5 h-2.5 text-slate-400" title="Managed by gym administration" />
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
            ₹{displaySalary.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-500">Base Compensation</span>
        </div>
      </div>

      {/* Employment Details (Shift & Joining Date) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Working Shift</span>
            <span className="text-xs font-semibold text-slate-800 truncate block">
              {displayShift}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Joined On</span>
            <span className="text-xs font-semibold text-slate-800 truncate block">
              {displayJoiningDate}
            </span>
          </div>
        </div>
      </div>

      {/* Certifications Card */}
      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
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
      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
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
              {displayAge}
            </span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase">Gender</span>
            <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
              {displayGender}
            </span>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase">Blood Group</span>
            <span className="font-semibold text-rose-600 text-[11px] sm:text-xs">
              {displayBlood}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold uppercase">Residential Address</span>
            <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
              {displayAddress}
            </span>
          </div>
        </div>
      </div>

      {/* Bio & Credentials */}
      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Bio & Profile Summary
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed italic">
          "{displayBio}"
        </p>
      </div>

      {/* Contact Details */}
      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Contact Details
        </h2>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">Email Address (Login)</span>
              <span className="font-semibold text-slate-900 truncate block text-[11px] sm:text-xs">
                {displayEmail}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <Phone className="w-4 h-4 text-teal-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">Mobile Phone</span>
              <span className="font-semibold text-slate-900 block text-[11px] sm:text-xs">
                {displayPhone}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
