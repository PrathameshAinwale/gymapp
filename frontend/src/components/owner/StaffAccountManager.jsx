import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { api } from '../../services/api';
import {
  isValidEmail,
  isValidPhone,
  isValidPan,
  isValidAadhaar,
  hasSqlInjection,
  sanitizeText,
  sanitizePhone,
  sanitizeAadhaar,
  sanitizePan,
  sanitizeDigits,
  sanitizeDecimal,
  preventNonNumericKey,
  preventNonPhoneKey
} from '../../utils/validation';
import {
  UserPlus,
  Users,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ShieldAlert,
  RotateCw,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Upload,
  Image,
  X,
  CreditCard,
  Award,
  Dumbbell,
  Star,
  ChevronRight,
  UserCheck,
  Filter,
  ChevronDown
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

// Helper to retrieve saved/default password for staff
const getStaffPassword = (stf) => {
  if (!stf) return '';
  if (stf.plain_password && stf.plain_password !== '••••••••' && stf.plain_password !== 'password123') {
    return stf.plain_password;
  }
  if (stf.password && stf.password !== '••••••••' && stf.password !== 'password123') {
    return stf.password;
  }
  try {
    const saved = JSON.parse(localStorage.getItem('pulsefit_staff_passwords') || '{}');
    const fromSaved =
      (stf.email && saved[stf.email.toLowerCase()]) ||
      (stf.userId && saved[String(stf.userId)]) ||
      (stf.id && saved[String(stf.id)]);
    if (fromSaved && fromSaved !== 'password123') return fromSaved;
  } catch (e) {}

  const emailLower = stf.email?.toLowerCase();
  if (emailLower === 'sohan@gmail.com') return 'sohan123';
  if (emailLower === 'coach1@gmail.com') return 'trainer123';
  if (emailLower === 'ajay@gmail.com') return '123456';
  if (stf.role === 'manager') return 'manager123';
  if (stf.role === 'accounts') return 'accounts123';
  if (stf.role === 'trainer') return 'trainer123';
  return 'sohan123';
};

const saveStaffPassword = (identifier, pass) => {
  if (!identifier || !pass) return;
  try {
    const saved = JSON.parse(localStorage.getItem('pulsefit_staff_passwords') || '{}');
    saved[String(identifier).toLowerCase()] = pass;
    localStorage.setItem('pulsefit_staff_passwords', JSON.stringify(saved));
  } catch (e) {}
};

// Component for rendering staff avatar with SVG person icon fallback
const StaffAvatar = ({ src, name, size = 'sm' }) => {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === 'lg' ? 'w-11 h-11' : 'w-8 h-8';
  const iconSize = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';

  if (!src || imgError) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400`}
        title={name || 'Staff Member'}
      >
        <User className={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || 'Staff Member'}
      className={`${sizeClasses} rounded-full object-cover border border-slate-200 shrink-0`}
      onError={() => setImgError(true)}
    />
  );
};

export const StaffAccountManager = () => {
  const { accounts, createStaffAccount, deleteStaffAccount, currentUser } = useAuth();
  const { addToast, members = [], trainers = [], fetchTrainers } = useGymData();

  const activeGymId = currentUser?.gymId || currentUser?.gym_id;

  const [dbStaff, setDbStaff] = useState([]);
  const fetchStaffFromDb = async () => {
    try {
      const res = await api.staff.getAll({ gym_id: activeGymId });
      if (res?.data && Array.isArray(res.data)) {
        setDbStaff(res.data);
        try {
          const saved = JSON.parse(localStorage.getItem('pulsefit_staff_passwords') || '{}');
          res.data.forEach((s) => {
            const actualPass = s.plain_password || (s.password && s.password !== '••••••••' ? s.password : null);
            if (actualPass) {
              if (s.email) saved[s.email.toLowerCase()] = actualPass;
              if (s.id) saved[String(s.id)] = actualPass;
            }
          });
          localStorage.setItem('pulsefit_staff_passwords', JSON.stringify(saved));
        } catch (err) {}
      }
    } catch (e) {
      console.warn('Fetch staff db note:', e.message);
    }
  };

  useEffect(() => {
    fetchStaffFromDb();
  }, [activeGymId]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Filter and Coach Roster view modals
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all'); // 'all' | 'manager' | 'accounts' | 'trainer'
  const [selectedCoachRoster, setSelectedCoachRoster] = useState(null);

  // Modals for Share ID, Edit Staff, and Delete Staff
  const [sharingStaff, setSharingStaff] = useState(null);
  const [showSharePassword, setShowSharePassword] = useState(false);

  // Document preview lightbox
  const [previewDoc, setPreviewDoc] = useState(null); // { title: '', imageUrl: '' }

  const [editingStaff, setEditingStaff] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'manager',
    phone: '',
    password: '',
    dob: '',
    aadhaar_card: '',
    aadhaar_image: '',
    pan_card: '',
    pan_image: '',
    salary: '',
    shifts: 'Morning Shift (6:00 AM - 2:00 PM)',
    specialty: 'Head Strength & Conditioning Coach',
    experience: '3+ Years',
    bio: '',
    certifications: 'NASM-CPT, CSCS',
    gender: 'Male',
    blood_group: 'B+',
    address: ''
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingStaff, setDeletingStaff] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add staff form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager', // 'manager' | 'accounts' | 'trainer'
    phone: '',
    dob: '',
    aadhaar_card: '',
    aadhaar_image: '',
    pan_card: '',
    pan_image: '',
    salary: '',
    shifts: 'Morning Shift (6:00 AM - 2:00 PM)',
    specialty: 'Head Strength & Conditioning Coach',
    experience: '3+ Years',
    bio: 'Dedicated fitness mentor guiding members toward strength, conditioning, and sustainable health.',
    certifications: 'NASM-CPT, CSCS',
    gender: 'Male',
    blood_group: 'B+',
    address: ''
  });

  // Handle file uploads to base64
  const handleFileUpload = (e, field, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size must be less than 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (isEdit) {
        setEditFormData((prev) => ({ ...prev, [field]: reader.result }));
      } else {
        setFormData((prev) => ({ ...prev, [field]: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Merge database staff accounts with auth accounts, strictly isolated to active gym
  const staffList = React.useMemo(() => {
    const map = new Map();
    const currentGymId = Number(currentUser?.gymId || currentUser?.gym_id || activeGymId || 0);

    // Add auth context accounts
    accounts
      .filter((acc) => {
        if (acc.role === 'superadmin' || acc.role === 'owner' || acc.role === 'member') {
          return false;
        }
        const accGymId = Number(acc.gymId || acc.gym_id || 0);
        if (currentGymId > 0) {
          return accGymId === currentGymId;
        }
        return false;
      })
      .forEach((a) => {
        const pass = getStaffPassword(a);
        map.set(a.email?.toLowerCase(), {
          ...a,
          password: pass,
          plain_password: pass
        });
      });

    // Overlay database records
    dbStaff
      .filter((stf) => {
        if (stf.role === 'superadmin' || stf.role === 'owner' || stf.role === 'member') {
          return false;
        }
        const stfGymId = Number(stf.gym_id || stf.gymId || 0);
        if (currentGymId > 0) {
          return stfGymId === currentGymId;
        }
        return false;
      })
      .forEach((stf) => {
        const emailKey = stf.email?.toLowerCase();
        const existing = map.get(emailKey) || {};
        const pass =
          (stf.plain_password && stf.plain_password !== '••••••••' && stf.plain_password !== 'password123')
            ? stf.plain_password
            : ((stf.password && stf.password !== '••••••••' && stf.password !== 'password123')
                ? stf.password
                : getStaffPassword(stf));

        const isTrainer = stf.role === 'trainer' || existing.role === 'trainer';
        const assigned = stf.assigned_members || stf.assignedMembers || existing.assigned_members || existing.assignedMembers || (isTrainer ? members.filter((m) => {
          const mTrn = String(m.trainerId || m.trainer_id || '');
          const sId = String(stf.id || '');
          const sUsr = String(stf.userId || stf.id || '');
          return mTrn === sId || mTrn === `trn-${sUsr}` || mTrn === sUsr;
        }) : []);

        map.set(emailKey, {
          ...existing,
          id: existing.id || `usr-${stf.role}-${stf.id}`,
          userId: stf.id,
          name: stf.name,
          email: stf.email,
          role: stf.role,
          phone: stf.phone || existing.phone,
          avatar: stf.avatar || existing.avatar || null,
          dob: stf.dob || existing.dob || '',
          aadhaar_card: stf.aadhaar_card || existing.aadhaar_card || '',
          aadhaar_image: stf.aadhaar_image || existing.aadhaar_image || null,
          pan_card: stf.pan_card || existing.pan_card || '',
          pan_image: stf.pan_image || existing.pan_image || null,
          salary: stf.salary !== undefined ? stf.salary : (stf.monthly_salary || existing.salary),
          monthly_salary: stf.monthly_salary || stf.salary || existing.salary,
          shifts: stf.shifts || existing.shifts || 'Morning Shift (6:00 AM - 2:00 PM)',
          specialty: stf.specialty || existing.specialty || (isTrainer ? 'Head Strength & Conditioning Coach' : null),
          experience: stf.experience || existing.experience || (isTrainer ? '3+ Years' : null),
          bio: stf.bio || existing.bio || '',
          certifications: stf.certifications || existing.certifications || (isTrainer ? ['NASM-CPT', 'CSCS'] : []),
          rating: stf.rating || existing.rating || 5.0,
          gender: stf.gender || existing.gender || '',
          blood_group: stf.blood_group || stf.bloodGroup || existing.blood_group || '',
          address: stf.address || existing.address || '',
          assigned_members: assigned,
          assignedMembers: assigned,
          activeClientsCount: assigned.length,
          password: pass,
          plain_password: pass,
          gymId: stf.gym_id || currentGymId,
          gym_id: stf.gym_id || currentGymId
        });
      });

    return Array.from(map.values());
  }, [accounts, dbStaff, currentUser, activeGymId, members]);

  const filteredStaffList = React.useMemo(() => {
    if (selectedRoleFilter === 'all') return staffList;
    return staffList.filter((s) => s.role === selectedRoleFilter);
  }, [staffList, selectedRoleFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      addToast('Please fill in Name, Email and Password', 'error');
      return;
    }

    if (
      hasSqlInjection(formData.name) ||
      hasSqlInjection(formData.email) ||
      hasSqlInjection(formData.password) ||
      hasSqlInjection(formData.phone) ||
      hasSqlInjection(formData.address) ||
      hasSqlInjection(formData.bio)
    ) {
      addToast('Security Warning: Disallowed characters or potential SQL injection detected.', 'error');
      return;
    }

    if (!isValidEmail(formData.email)) {
      addToast('Please enter a valid email address.', 'error');
      return;
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      addToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    if (formData.aadhaar_card && !isValidAadhaar(formData.aadhaar_card)) {
      addToast('Please enter a valid 12-digit Aadhaar number.', 'error');
      return;
    }

    if (formData.pan_card && !isValidPan(formData.pan_card)) {
      addToast('Please enter a valid 10-character PAN number (e.g. ABCDE1234F).', 'error');
      return;
    }

    try {
      const newAcc = await createStaffAccount({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
        dob: formData.dob,
        aadhaar_card: formData.aadhaar_card,
        aadhaar_image: formData.aadhaar_image,
        pan_card: formData.pan_card,
        pan_image: formData.pan_image,
        salary: formData.salary,
        shifts: formData.shifts,
        gym_id: activeGymId,
        gymId: activeGymId,
        specialty: formData.role === 'trainer' ? formData.specialty : null,
        experience: formData.role === 'trainer' ? formData.experience : null,
        bio: formData.role === 'trainer' ? formData.bio : null,
        certifications: formData.role === 'trainer' ? formData.certifications : null,
        gender: formData.gender,
        blood_group: formData.blood_group,
        address: formData.address,
        monthly_salary: formData.salary
      });

      saveStaffPassword(formData.email, formData.password);
      if (newAcc.userId) saveStaffPassword(newAcc.userId, formData.password);

      setIsCreateModalOpen(false);
      setCreatedCredentials({
        name: newAcc.name,
        email: newAcc.email,
        password: formData.password,
        role: newAcc.role,
        roleLabel: newAcc.roleLabel
      });

      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'manager',
        phone: '',
        dob: '',
        aadhaar_card: '',
        aadhaar_image: '',
        pan_card: '',
        pan_image: '',
        salary: '',
        shifts: 'Morning Shift (6:00 AM - 2:00 PM)',
        specialty: 'Head Strength & Conditioning Coach',
        experience: '3+ Years',
        bio: 'Dedicated fitness mentor guiding members toward strength, conditioning, and sustainable health.',
        certifications: 'NASM-CPT, CSCS',
        gender: 'Male',
        blood_group: 'B+',
        address: ''
      });

      addToast(`${formData.role === 'trainer' ? 'Coach' : 'Staff member'} ${newAcc.name} added successfully!`, 'success');
      fetchStaffFromDb();
      fetchTrainers?.();
    } catch (err) {
      addToast(err.message || 'Failed to create staff account', 'error');
    }
  };

  const handleOpenEdit = (stf) => {
    setEditingStaff(stf);
    setEditFormData({
      name: stf.name || '',
      email: stf.email || '',
      role: stf.role || 'manager',
      phone: stf.phone || '',
      password: '',
      dob: stf.dob || '',
      aadhaar_card: stf.aadhaar_card || '',
      aadhaar_image: stf.aadhaar_image || '',
      pan_card: stf.pan_card || '',
      pan_image: stf.pan_image || '',
      salary: stf.salary || '',
      shifts: stf.shifts || 'Morning Shift (6:00 AM - 2:00 PM)',
      specialty: stf.specialty || 'Head Strength & Conditioning Coach',
      experience: stf.experience || '3+ Years',
      bio: stf.bio || '',
      certifications: Array.isArray(stf.certifications) ? stf.certifications.join(', ') : (stf.certifications || 'NASM-CPT, CSCS'),
      gender: stf.gender || 'Male',
      blood_group: stf.blood_group || stf.bloodGroup || 'B+',
      address: stf.address || ''
    });
    setShowEditPassword(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.email) {
      addToast('Please fill in Name and Email', 'error');
      return;
    }

    if (
      hasSqlInjection(editFormData.name) ||
      hasSqlInjection(editFormData.email) ||
      hasSqlInjection(editFormData.phone) ||
      hasSqlInjection(editFormData.address) ||
      hasSqlInjection(editFormData.bio)
    ) {
      addToast('Security Warning: Disallowed characters or potential SQL injection detected.', 'error');
      return;
    }

    if (!isValidEmail(editFormData.email)) {
      addToast('Please enter a valid email address.', 'error');
      return;
    }

    if (editFormData.phone && !isValidPhone(editFormData.phone)) {
      addToast('Please enter a valid 10-digit mobile number.', 'error');
      return;
    }

    if (editFormData.aadhaar_card && !isValidAadhaar(editFormData.aadhaar_card)) {
      addToast('Please enter a valid 12-digit Aadhaar number.', 'error');
      return;
    }

    if (editFormData.pan_card && !isValidPan(editFormData.pan_card)) {
      addToast('Please enter a valid 10-character PAN number (e.g. ABCDE1234F).', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        phone: editFormData.phone || '',
        dob: editFormData.dob || null,
        aadhaar_card: editFormData.aadhaar_card || null,
        aadhaar_image: editFormData.aadhaar_image || null,
        pan_card: editFormData.pan_card || null,
        pan_image: editFormData.pan_image || null,
        salary: editFormData.salary ? Number(editFormData.salary) : null,
        shifts: editFormData.shifts || null
      };

      if (editFormData.role === 'trainer') {
        payload.specialty = editFormData.specialty;
        payload.experience = editFormData.experience;
        payload.bio = editFormData.bio;
        payload.certifications = editFormData.certifications;
        payload.gender = editFormData.gender;
        payload.blood_group = editFormData.blood_group;
        payload.address = editFormData.address;
        payload.monthly_salary = editFormData.salary ? Number(editFormData.salary) : null;
      }

      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      const staffId = editingStaff.userId || editingStaff.id;
      await api.staff.update(staffId, payload);

      if (editFormData.password) {
        saveStaffPassword(editFormData.email, editFormData.password);
        if (editingStaff.userId) saveStaffPassword(editingStaff.userId, editFormData.password);
      }

      addToast(`${editFormData.role === 'trainer' ? 'Coach' : 'Staff'} profile for ${editFormData.name} updated successfully!`, 'success');
      setEditingStaff(null);
      fetchStaffFromDb();
      fetchTrainers?.();
    } catch (err) {
      console.error('Update staff error:', err);
      addToast(err.message || 'Failed to update staff account', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;
    setIsDeleting(true);
    try {
      const staffId = deletingStaff.userId || deletingStaff.id;
      try {
        await api.staff.delete(staffId);
      } catch (apiErr) {
        console.warn('Backend delete note:', apiErr.message);
      }

      if (typeof deleteStaffAccount === 'function') {
        deleteStaffAccount(deletingStaff.userId || deletingStaff.id);
        deleteStaffAccount(deletingStaff.email);
      }

      setDbStaff((prev) =>
        prev.filter(
          (s) =>
            (!deletingStaff.userId || String(s.id) !== String(deletingStaff.userId)) &&
            (!deletingStaff.email || s.email?.toLowerCase() !== deletingStaff.email.toLowerCase())
        )
      );

      addToast(`Staff account for ${deletingStaff.name} deleted successfully!`, 'success');
      setDeletingStaff(null);
      fetchStaffFromDb();
      fetchTrainers?.();
    } catch (err) {
      console.error('Delete staff error:', err);
      addToast(err.message || 'Failed to delete staff account', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    addToast('Credentials copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Staff & Employee Directory
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create and maintain staff entries with identity verification (Aadhaar & PAN cards with document photos), working shifts, salaries, and secure login access.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Staff Team</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{staffList.length} Staff</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Managers, accounts & coaches</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Certified Coaches</span>
          <div className="text-lg sm:text-2xl font-black text-purple-600 mt-0.5 sm:mt-1">
            {staffList.filter((s) => s.role === 'trainer').length} Coaches
          </div>
          <span className="text-[10px] sm:text-[11px] text-purple-700/80 font-medium hidden sm:block">1-on-1 PT & group coaches</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Assigned PT Athletes</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">
            {members.filter((m) => m.trainerId || m.trainer_id).length} Members
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700/80 font-medium hidden sm:block">Guided under coaches</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Monthly Base Payroll</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
            ₹{staffList.reduce((acc, s) => acc + (Number(s.salary) || 0), 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Staff retainers committed</span>
        </div>
      </div>

      {/* Role Access Explanatory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Manager Role</span>
          </div>
          <p className="text-[11px] text-indigo-700/90 mt-1">
            Add-only permissions for member directory, enquiries, attendance, and front desk operations.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Accounts & Finance</span>
          </div>
          <p className="text-[11px] text-amber-800/90 mt-1">
            Full administrative access over revenue, expenses, invoices, payroll disbursement, and discounts.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
          <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
            <User className="w-4 h-4 text-purple-600" />
            <span>Trainer / Fitness Coach</span>
          </div>
          <p className="text-[11px] text-purple-800/90 mt-1">
            Access to PT client roster, workout plans, diet charts, biometric attendance, and session logs.
          </p>
        </div>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Staff & Coach Directory</h3>
            <p className="text-[11px] text-slate-500">Employee credentials, coach specializations, salary records & KYC verification</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="relative inline-flex items-center">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="pl-8.5 pr-8 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-all appearance-none shadow-2xs"
              >
                <option value="all">All Roles ({staffList.length})</option>
                <option value="trainer">Coaches & Trainers ({staffList.filter((s) => s.role === 'trainer').length})</option>
                <option value="manager">Managers ({staffList.filter((s) => s.role === 'manager').length})</option>
                <option value="accounts">Accounts & Finance ({staffList.filter((s) => s.role === 'accounts').length})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {selectedRoleFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('all')}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                title="Reset filter to all staff"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {filteredStaffList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={UserPlus}
              title={selectedRoleFilter === 'trainer' ? 'No Coaches Registered Yet' : 'No Staff Members Found'}
              description={
                selectedRoleFilter === 'trainer'
                  ? 'Click Add Staff Member to register your certified fitness coaches, assign specializations, and issue trainer portal accounts.'
                  : 'Add staff members with full details including Aadhaar card, PAN card, photo documents, salary, and shift timings.'
              }
              actionText="Add Staff Member"
              onAction={() => {
                if (selectedRoleFilter === 'trainer') {
                  setFormData((prev) => ({ ...prev, role: 'trainer' }));
                }
                setIsCreateModalOpen(true);
              }}
              color="emerald"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role & Specialty</th>
                  <th className="py-3 px-4">DOB / Age</th>
                  <th className="py-3 px-4">Salary</th>
                  <th className="py-3 px-4">Working Shift</th>
                  <th className="py-3 px-4">KYC Documents</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStaffList.map((stf) => {
                  const isSuper = stf.role === 'superadmin' || stf.role === 'owner';
                  const isMgr = stf.role === 'manager';
                  const isAcc = stf.role === 'accounts';
                  const isTrainer = stf.role === 'trainer';

                  return (
                    <tr key={stf.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <StaffAvatar src={stf.avatar} name={stf.name} size="sm" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{stf.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{stf.email}</div>
                            {stf.phone && <div className="text-[10px] text-slate-500">{stf.phone}</div>}
                            {isTrainer && stf.specialty && (
                              <div className="text-[10px] text-purple-700 font-semibold truncate flex items-center gap-1 mt-0.5">
                                <Award className="w-3 h-3 text-purple-600 shrink-0" />
                                <span className="truncate">{stf.specialty}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isSuper && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" /> Owner
                          </span>
                        )}
                        {isMgr && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Users className="w-3 h-3" /> Manager
                          </span>
                        )}
                        {isAcc && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <ShieldCheck className="w-3 h-3 text-amber-600" /> Accounts
                          </span>
                        )}
                        {isTrainer && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Award className="w-3 h-3 text-purple-600" /> Fitness Coach
                            </span>
                            {stf.experience && (
                              <div className="text-[10px] text-slate-500 font-medium">Exp: {stf.experience}</div>
                            )}
                            {Array.isArray(stf.certifications) && stf.certifications.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {stf.certifications.slice(0, 2).map((c, i) => (
                                  <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {stf.dob ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{stf.dob}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {stf.salary ? `₹${Number(stf.salary).toLocaleString('en-IN')}/mo` : <span className="text-slate-400 font-normal">—</span>}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {stf.shifts || 'Morning Shift'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Aadhaar badge / preview */}
                          {stf.aadhaar_card ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (stf.aadhaar_image) {
                                  setPreviewDoc({ title: `Aadhaar Card - ${stf.name}`, imageUrl: stf.aadhaar_image, docNumber: stf.aadhaar_card });
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                stf.aadhaar_image
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer'
                                  : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                              title={stf.aadhaar_image ? "Click to view Aadhaar photo" : "Aadhaar number recorded"}
                            >
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span>UID: {stf.aadhaar_card.slice(-4)}</span>
                              {stf.aadhaar_image && <Image className="w-2.5 h-2.5 text-blue-500" />}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">No Aadhaar</span>
                          )}

                          {/* PAN badge / preview */}
                          {stf.pan_card ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (stf.pan_image) {
                                  setPreviewDoc({ title: `PAN Card - ${stf.name}`, imageUrl: stf.pan_image, docNumber: stf.pan_card });
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                stf.pan_image
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                  : 'bg-slate-50 text-slate-600 border border-slate-200'
                              }`}
                              title={stf.pan_image ? "Click to view PAN photo" : "PAN number recorded"}
                            >
                              <CreditCard className="w-3 h-3 text-emerald-600" />
                              <span>PAN: {stf.pan_card.slice(0, 5)}...</span>
                              {stf.pan_image && <Image className="w-2.5 h-2.5 text-emerald-500" />}
                            </button>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isTrainer && (
                            <button
                              type="button"
                              onClick={() => setSelectedCoachRoster(stf)}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                              title="View Assigned Athletes Roster"
                            >
                              <Users className="w-3.5 h-3.5 text-purple-600" />
                              <span>Roster ({(stf.assigned_members || []).length})</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSharingStaff(stf);
                              setShowSharePassword(false);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                            title="View Email and Password"
                          >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Share ID</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(stf)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors cursor-pointer shrink-0"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isSuper && (
                            <button
                              type="button"
                              onClick={() => setDeletingStaff(stf)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors cursor-pointer shrink-0"
                              title="Delete Staff Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / ADD STAFF MEMBER MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Staff Member"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date of Birth (DOB)</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Login ID / Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. staff@archfit.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="e.g. 9820012345 (10 digits)"
                  value={formData.phone}
                  onKeyDown={preventNonPhoneKey}
                  onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Role Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Role *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'manager' })}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  formData.role === 'manager'
                    ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 text-indigo-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" /> Manager
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Front desk & Add only</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'accounts' })}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  formData.role === 'accounts'
                    ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Accounts
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Finances & Billing</div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'trainer' })}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  formData.role === 'trainer'
                    ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400 text-purple-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-purple-600" /> Trainer
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">PT & Fitness Coach</div>
              </button>
            </div>
          </div>

          {/* Salary & Shifts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Monthly Salary (₹)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  placeholder="e.g. 25000"
                  value={formData.salary}
                  onKeyDown={(e) => preventNonNumericKey(e, true)}
                  onChange={(e) => setFormData({ ...formData, salary: sanitizeDecimal(e.target.value) })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Shifts Working</label>
              <select
                value={formData.shifts}
                onChange={(e) => setFormData({ ...formData, shifts: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="Morning Shift (6:00 AM - 2:00 PM)">Morning Shift (6:00 AM - 2:00 PM)</option>
                <option value="Evening Shift (2:00 PM - 10:00 PM)">Evening Shift (2:00 PM - 10:00 PM)</option>
                <option value="General / Full Day (9:00 AM - 6:00 PM)">General / Full Day (9:00 AM - 6:00 PM)</option>
                <option value="Split Shift (6 AM - 11 AM & 5 PM - 9 PM)">Split Shift (6 AM - 11 AM & 5 PM - 9 PM)</option>
                <option value="Night Shift (10:00 PM - 6:00 AM)">Night Shift (10:00 PM - 6:00 AM)</option>
              </select>
            </div>
          </div>

          {/* Dedicated Coach Profile Details (Only when Trainer role selected) */}
          {formData.role === 'trainer' && (
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Coach Specialization & Athletic Profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Specialty / Training Focus *
                  </label>
                  <select
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Head Strength & Conditioning Coach">Head Strength & Conditioning Coach</option>
                    <option value="Hypertrophy & Bodybuilding Specialist">Hypertrophy & Bodybuilding Specialist</option>
                    <option value="CrossFit & Olympic Lifting">CrossFit & Olympic Lifting</option>
                    <option value="Functional Fitness & Athletic Performance">Functional Fitness & Athletic Performance</option>
                    <option value="Yoga & Flexibility Mobility Master">Yoga & Flexibility Mobility Master</option>
                    <option value="Fat Loss & High Intensity Cardio">Fat Loss & High Intensity Cardio</option>
                    <option value="Biomechanics & Post-Rehabilitation">Biomechanics & Post-Rehabilitation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Coaching Experience Level
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                  >
                    <option value="1-2 Years">1-2 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                    <option value="8+ Years">8+ Years</option>
                    <option value="10+ Years Master Coach">10+ Years Master Coach</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Certifications (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NASM-CPT, CSCS, ACE, ISSA"
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-2 py-2 bg-white border border-purple-200 rounded-lg text-xs text-slate-800"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Blood Group
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B+"
                      value={formData.blood_group}
                      onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                      className="w-full px-2 py-2 bg-white border border-purple-200 rounded-lg text-xs uppercase text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Coach Bio & Transformation Philosophy
                </label>
                <textarea
                  rows={2}
                  placeholder="Committed coach specializing in form biomechanics, athletic longevity, and nutrition."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 resize-none focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* Aadhaar Card Section with Photo Upload */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Aadhaar Card Verification & Document Photo</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Aadhaar Number (12 Digits)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  inputMode="numeric"
                  placeholder="12 digit Aadhaar number"
                  value={formData.aadhaar_card}
                  onKeyDown={(e) => preventNonNumericKey(e, false)}
                  onChange={(e) => setFormData({ ...formData, aadhaar_card: sanitizeAadhaar(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Upload Aadhaar Document Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'aadhaar_image')}
                  className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 cursor-pointer"
                />
              </div>
            </div>

            {formData.aadhaar_image && (
              <div className="relative inline-block mt-1">
                <img
                  src={formData.aadhaar_image}
                  alt="Aadhaar Preview"
                  className="w-24 h-16 object-cover rounded-lg border border-slate-300 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, aadhaar_image: '' })}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* PAN Card Section with Photo Upload */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>PAN Card Verification & Document Photo</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  PAN Number (10 Alphanumeric)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  value={formData.pan_card}
                  onChange={(e) => setFormData({ ...formData, pan_card: sanitizePan(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Upload PAN Document Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'pan_image')}
                  className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />
              </div>
            </div>

            {formData.pan_image && (
              <div className="relative inline-block mt-1">
                <img
                  src={formData.pan_image}
                  alt="PAN Preview"
                  className="w-24 h-16 object-cover rounded-lg border border-slate-300 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, pan_image: '' })}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Assigned Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Assigned Password *</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, password: 'staff' + Math.floor(1000 + Math.random() * 9000) })}
                className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
              >
                Generate Secure Pass
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter account password (min 6 chars)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Save Staff Member
            </button>
          </div>
        </form>
      </Modal>

      {/* CREDENTIALS SHARE POPUP */}
      <Modal
        isOpen={Boolean(createdCredentials)}
        onClose={() => setCreatedCredentials(null)}
        title="Staff Member Added Successfully"
        maxWidth="max-w-md"
      >
        {createdCredentials && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-emerald-900 text-sm">{createdCredentials.name}</h4>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200 capitalize">
                {createdCredentials.roleLabel || createdCredentials.role}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px]">
              <div>
                <span className="text-slate-400 font-bold block">Login ID / Email:</span>
                <span className="font-mono font-bold text-slate-900">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block">Password:</span>
                <span className="font-mono font-bold text-slate-900">{createdCredentials.password}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Please share these credentials with the employee. They can sign in immediately at the portal login screen.
            </p>

            <button
              type="button"
              onClick={() => {
                copyToClipboard(
                  `ArchFit Staff Login Credentials:\nName: ${createdCredentials.name}\nRole: ${createdCredentials.roleLabel || createdCredentials.role}\nLogin ID: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`,
                  'created'
                );
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Full Credentials to Clipboard</span>
            </button>
          </div>
        )}
      </Modal>

      {/* SHARE ID / VIEW CREDENTIALS MODAL */}
      <Modal
        isOpen={Boolean(sharingStaff)}
        onClose={() => setSharingStaff(null)}
        title="Staff Login Credentials"
        maxWidth="max-w-md"
      >
        {sharingStaff && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <StaffAvatar src={sharingStaff.avatar} name={sharingStaff.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm truncate">{sharingStaff.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                    {sharingStaff.roleLabel || sharingStaff.role}
                  </span>
                  {sharingStaff.phone && (
                    <span className="text-[10px] text-slate-400">{sharingStaff.phone}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Login ID / Email
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-mono font-bold text-slate-900 text-xs truncate mr-2 select-all">
                    {sharingStaff.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sharingStaff.email, 'share-email')}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer shrink-0"
                    title="Copy Email"
                  >
                    {copiedId === 'share-email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Current Password
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-mono font-bold text-slate-900 text-xs truncate mr-2 select-all">
                    {showSharePassword ? (sharingStaff.plain_password || sharingStaff.password || getStaffPassword(sharingStaff)) : '••••••••••••'}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowSharePassword(!showSharePassword)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title={showSharePassword ? 'Hide password' : 'Show password'}
                    >
                      {showSharePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sharingStaff.plain_password || sharingStaff.password || getStaffPassword(sharingStaff), 'share-password')}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      title="Copy password"
                    >
                      {copiedId === 'share-password' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const pass = sharingStaff.plain_password || sharingStaff.password || getStaffPassword(sharingStaff);
                copyToClipboard(
                  `ArchFit Staff Login Credentials\nName: ${sharingStaff.name}\nRole: ${sharingStaff.roleLabel || sharingStaff.role}\nEmail: ${sharingStaff.email}\nPassword: ${pass}`,
                  'share-all'
                );
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95"
            >
              {copiedId === 'share-all' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Credentials Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Full Credentials (Email & Password)</span>
                </>
              )}
            </button>
          </div>
        )}
      </Modal>

      {/* DOCUMENT PREVIEW LIGHTBOX MODAL */}
      <Modal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || "Document Photo"}
        maxWidth="max-w-lg"
      >
        {previewDoc && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-black/5 flex items-center justify-center">
              <img
                src={previewDoc.imageUrl}
                alt={previewDoc.title}
                className="max-h-[60vh] w-auto object-contain rounded-lg"
              />
            </div>
            {previewDoc.docNumber && (
              <p className="text-xs text-center font-mono font-bold text-slate-700">
                Document Number: {previewDoc.docNumber}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT STAFF ACCOUNT MODAL */}
      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title="Edit Staff Member Details"
        maxWidth="max-w-2xl"
      >
        {editingStaff && (
          <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date of Birth (DOB)</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={editFormData.dob}
                    onChange={(e) => setEditFormData({ ...editFormData, dob: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Login ID / Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="10 digit number"
                    value={editFormData.phone}
                    onKeyDown={preventNonPhoneKey}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: sanitizePhone(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Role</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, role: 'manager' })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    editFormData.role === 'manager'
                      ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 text-indigo-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Manager
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, role: 'accounts' })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    editFormData.role === 'accounts'
                      ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Accounts
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, role: 'trainer' })}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    editFormData.role === 'trainer'
                      ? 'bg-purple-50 border-purple-400 ring-1 ring-purple-400 text-purple-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-600" /> Trainer
                  </div>
                </button>
              </div>
            </div>

            {/* Salary & Shifts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Monthly Salary (₹)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={editFormData.salary}
                    onKeyDown={(e) => preventNonNumericKey(e, true)}
                    onChange={(e) => setEditFormData({ ...editFormData, salary: sanitizeDecimal(e.target.value) })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Working Shifts</label>
                <select
                  value={editFormData.shifts}
                  onChange={(e) => setEditFormData({ ...editFormData, shifts: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Morning Shift (6:00 AM - 2:00 PM)">Morning Shift (6:00 AM - 2:00 PM)</option>
                  <option value="Evening Shift (2:00 PM - 10:00 PM)">Evening Shift (2:00 PM - 10:00 PM)</option>
                  <option value="General / Full Day (9:00 AM - 6:00 PM)">General / Full Day (9:00 AM - 6:00 PM)</option>
                  <option value="Split Shift (6 AM - 11 AM & 5 PM - 9 PM)">Split Shift (6 AM - 11 AM & 5 PM - 9 PM)</option>
                  <option value="Night Shift (10:00 PM - 6:00 AM)">Night Shift (10:00 PM - 6:00 AM)</option>
                </select>
              </div>
            </div>

            {/* Dedicated Coach Profile Details for Edit Modal */}
            {editFormData.role === 'trainer' && (
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-1.5 font-bold text-purple-900 text-xs">
                  <Award className="w-4 h-4 text-purple-600" />
                  <span>Coach Specialization & Athletic Profile</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Specialty / Training Focus *
                    </label>
                    <select
                      value={editFormData.specialty}
                      onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                    >
                      <option value="Head Strength & Conditioning Coach">Head Strength & Conditioning Coach</option>
                      <option value="Hypertrophy & Bodybuilding Specialist">Hypertrophy & Bodybuilding Specialist</option>
                      <option value="CrossFit & Olympic Lifting">CrossFit & Olympic Lifting</option>
                      <option value="Functional Fitness & Athletic Performance">Functional Fitness & Athletic Performance</option>
                      <option value="Yoga & Flexibility Mobility Master">Yoga & Flexibility Mobility Master</option>
                      <option value="Fat Loss & High Intensity Cardio">Fat Loss & High Intensity Cardio</option>
                      <option value="Biomechanics & Post-Rehabilitation">Biomechanics & Post-Rehabilitation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Coaching Experience Level
                    </label>
                    <select
                      value={editFormData.experience}
                      onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-500"
                    >
                      <option value="1-2 Years">1-2 Years</option>
                      <option value="3-5 Years">3-5 Years</option>
                      <option value="5+ Years">5+ Years</option>
                      <option value="8+ Years">8+ Years</option>
                      <option value="10+ Years Master Coach">10+ Years Master Coach</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Certifications (comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NASM-CPT, CSCS, ACE, ISSA"
                      value={editFormData.certifications}
                      onChange={(e) => setEditFormData({ ...editFormData, certifications: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Gender
                      </label>
                      <select
                        value={editFormData.gender}
                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                        className="w-full px-2 py-2 bg-white border border-purple-200 rounded-lg text-xs text-slate-800"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Blood Group
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. B+"
                        value={editFormData.blood_group}
                        onChange={(e) => setEditFormData({ ...editFormData, blood_group: e.target.value })}
                        className="w-full px-2 py-2 bg-white border border-purple-200 rounded-lg text-xs uppercase text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Coach Bio & Transformation Philosophy
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Committed coach specializing in form biomechanics, athletic longevity, and nutrition."
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-xs text-slate-800 resize-none focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Aadhaar */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Aadhaar Card Verification</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  maxLength={12}
                  inputMode="numeric"
                  placeholder="12 digit Aadhaar number"
                  value={editFormData.aadhaar_card}
                  onKeyDown={(e) => preventNonNumericKey(e, false)}
                  onChange={(e) => setEditFormData({ ...editFormData, aadhaar_card: sanitizeAadhaar(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'aadhaar_image', true)}
                  className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-100 file:text-blue-800 cursor-pointer"
                />
              </div>
              {editFormData.aadhaar_image && (
                <div className="relative inline-block mt-1">
                  <img src={editFormData.aadhaar_image} alt="Aadhaar" className="w-20 h-14 object-cover rounded-lg border border-slate-300" />
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, aadhaar_image: '' })}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* PAN */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>PAN Card Verification</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  maxLength={10}
                  placeholder="10-digit PAN"
                  value={editFormData.pan_card}
                  onChange={(e) => setEditFormData({ ...editFormData, pan_card: sanitizePan(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono uppercase"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'pan_image', true)}
                  className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-emerald-100 file:text-emerald-800 cursor-pointer"
                />
              </div>
              {editFormData.pan_image && (
                <div className="relative inline-block mt-1">
                  <img src={editFormData.pan_image} alt="PAN" className="w-20 h-14 object-cover rounded-lg border border-slate-300" />
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, pan_image: '' })}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Optional Password update */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Update Password (Optional)</label>
                <span className="text-[10px] text-slate-400">Leave blank to keep current</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  placeholder="New password (optional)"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                disabled={isUpdating}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE STAFF CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deletingStaff)}
        onClose={() => setDeletingStaff(null)}
        title="Delete Staff Member"
        maxWidth="max-w-md"
      >
        {deletingStaff && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-rose-900 text-sm">Delete {deletingStaff.name}?</h4>
                <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete the staff member <strong>{deletingStaff.email}</strong>? This user will immediately lose access to the system.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* COACH ATHLETE ROSTER MODAL */}
      <Modal
        isOpen={Boolean(selectedCoachRoster)}
        onClose={() => setSelectedCoachRoster(null)}
        title={`Coach Roster: ${selectedCoachRoster?.name || 'Coach'}`}
        maxWidth="max-w-xl"
      >
        {selectedCoachRoster && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StaffAvatar src={selectedCoachRoster.avatar} name={selectedCoachRoster.name} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{selectedCoachRoster.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      {selectedCoachRoster.specialty || 'Personal Trainer'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedCoachRoster.email} {selectedCoachRoster.phone ? `• ${selectedCoachRoster.phone}` : ''}
                  </div>
                  <div className="text-[10px] font-semibold text-purple-700 mt-0.5">
                    Experience: {selectedCoachRoster.experience || '3+ Years'} • Base Pay: ₹{Number(selectedCoachRoster.salary || 0).toLocaleString('en-IN')}/mo
                  </div>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-purple-200 text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Athletes</span>
                <span className="text-xl font-black text-purple-700">
                  {(selectedCoachRoster.assigned_members || []).length} Active
                </span>
              </div>
            </div>

            {selectedCoachRoster.bio && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 italic text-slate-600 text-[11px]">
                "{selectedCoachRoster.bio}"
              </div>
            )}

            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Assigned 1-on-1 Athletes ({(selectedCoachRoster.assigned_members || []).length})
              </h4>
              <span className="text-[10px] text-slate-400">Assigned via Member Directory</span>
            </div>

            {(selectedCoachRoster.assigned_members || []).length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No members currently assigned to this coach. You can allocate members to this coach from the Member Directory.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedCoachRoster.assigned_members.map((m) => (
                  <div
                    key={m.id || m.numericId || Math.random()}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-purple-200 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                      <div className="text-[10px] text-slate-500">
                        Goal: {m.goal || 'General Fitness'} {m.phone ? `• ${m.phone}` : ''}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {m.planName || 'PT Subscription'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCoachRoster(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Close Roster
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
