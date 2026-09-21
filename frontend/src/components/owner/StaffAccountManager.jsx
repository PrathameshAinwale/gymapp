import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import { api } from '../../services/api';
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
  Trash2
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

export const StaffAccountManager = () => {
  const { accounts, createStaffAccount, deleteStaffAccount, currentRole, currentUser } = useAuth();
  const { addToast } = useGymData();

  const activeGymId = currentUser?.gymId || currentUser?.gym_id;

  const [dbStaff, setDbStaff] = useState([]);
  const fetchStaffFromDb = async () => {
    try {
      const res = await api.staff.getAll({ gym_id: activeGymId });
      if (res?.data && Array.isArray(res.data)) {
        setDbStaff(res.data);
        // Sync database plain passwords into local cache and purge stale 'password123'
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

          // Clean up pulsefit_accounts_v2 so stale 'password123' is overwritten
          const rawAcc = localStorage.getItem('pulsefit_accounts_v2');
          if (rawAcc) {
            let accList = JSON.parse(rawAcc);
            accList = accList.map((a) => {
              const match = res.data.find(
                (d) =>
                  d.email?.toLowerCase() === a.email?.toLowerCase() ||
                  String(d.id) === String(a.userId)
              );
              if (match && (match.plain_password || match.password)) {
                return {
                  ...a,
                  password: match.plain_password || match.password,
                  plain_password: match.plain_password || match.password
                };
              }
              return a;
            });
            localStorage.setItem('pulsefit_accounts_v2', JSON.stringify(accList));
          }
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

  // Modals for Share ID, Edit Staff, and Delete Staff
  const [sharingStaff, setSharingStaff] = useState(null);
  const [showSharePassword, setShowSharePassword] = useState(false);

  const [editingStaff, setEditingStaff] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'manager',
    phone: '',
    password: ''
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingStaff, setDeletingStaff] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager', // 'manager' | 'accounts'
    phone: ''
  });

  // Merge database staff accounts with auth accounts, strictly isolated to active gym
  const staffList = React.useMemo(() => {
    const map = new Map();
    const currentGymId = Number(currentUser?.gymId || currentUser?.gym_id);

    // Add auth context accounts
    accounts
      .filter((acc) => {
        // Exclude other owners or superadmins; only include the owner if it is the current logged-in user
        if (acc.role === 'superadmin' || acc.role === 'owner') {
          return (
            (acc.userId && acc.userId === currentUser?.userId) ||
            (acc.email && acc.email?.toLowerCase() === currentUser?.email?.toLowerCase())
          );
        }
        return acc.role === 'manager' || acc.role === 'accounts' || acc.role === 'trainer';
      })
      .forEach((a) => {
        const pass = getStaffPassword(a);
        map.set(a.email?.toLowerCase(), {
          ...a,
          password: pass,
          plain_password: pass
        });
      });

    // Overlay database records (database takes highest priority for real password)
    dbStaff
      .filter((stf) => {
        // Exclude other owners or superadmins
        if (stf.role === 'superadmin' || stf.role === 'owner') {
          return (
            (stf.id && stf.id === currentUser?.userId) ||
            (stf.email && stf.email?.toLowerCase() === currentUser?.email?.toLowerCase())
          );
        }
        return stf.role === 'manager' || stf.role === 'accounts' || stf.role === 'trainer';
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

        map.set(emailKey, {
          ...existing,
          id: existing.id || `usr-${stf.role}-${stf.id}`,
          userId: stf.id,
          name: stf.name,
          email: stf.email,
          role: stf.role,
          phone: stf.phone || existing.phone,
          avatar: stf.avatar || existing.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          password: pass,
          plain_password: pass,
          gymId: stf.gym_id || currentGymId,
          gym_id: stf.gym_id || currentGymId
        });
      });

    return Array.from(map.values());
  }, [accounts, dbStaff, currentUser]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      addToast('Please fill in Name, Email/ID and Password', 'error');
      return;
    }

    try {
      const newAcc = await createStaffAccount({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
        gym_id: activeGymId,
        gymId: activeGymId
      });

      // Save password into storage so Share ID modal retrieves it instantly
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
        phone: ''
      });

      addToast(`Account created for ${newAcc.name}! Role: ${newAcc.roleLabel}`, 'success');
      fetchStaffFromDb();
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
      password: ''
    });
    setShowEditPassword(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.email) {
      addToast('Please fill in Name and Email', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        phone: editFormData.phone || ''
      };
      if (editFormData.password) {
        payload.password = editFormData.password;
      }

      const staffId = editingStaff.userId || editingStaff.id;
      await api.staff.update(staffId, payload);

      if (editFormData.password) {
        saveStaffPassword(editFormData.email, editFormData.password);
        if (editingStaff.userId) saveStaffPassword(editingStaff.userId, editFormData.password);
      }

      // Sync local storage accounts if exists
      try {
        const saved = localStorage.getItem('pulsefit_accounts_v2');
        if (saved) {
          let list = JSON.parse(saved);
          list = list.map((a) => {
            if (
              (editingStaff.email && a.email?.toLowerCase() === editingStaff.email.toLowerCase()) ||
              (editingStaff.userId && a.userId === editingStaff.userId) ||
              a.id === editingStaff.id
            ) {
              return {
                ...a,
                name: editFormData.name,
                email: editFormData.email,
                role: editFormData.role,
                phone: editFormData.phone,
                password: editFormData.password || a.password
              };
            }
            return a;
          });
          localStorage.setItem('pulsefit_accounts_v2', JSON.stringify(list));
        }
      } catch (err) {}

      addToast(`Staff account for ${editFormData.name} updated successfully!`, 'success');
      setEditingStaff(null);
      fetchStaffFromDb();
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
        console.warn('Backend delete note (user may be mock or already deleted):', apiErr.message);
      }

      // Remove from auth context accounts
      if (typeof deleteStaffAccount === 'function') {
        deleteStaffAccount(deletingStaff.userId || deletingStaff.id);
        deleteStaffAccount(deletingStaff.email);
      }

      // Remove from local storage accounts
      try {
        const saved = localStorage.getItem('pulsefit_accounts_v2');
        if (saved) {
          let list = JSON.parse(saved);
          list = list.filter(
            (a) =>
              (deletingStaff.email && a.email?.toLowerCase() !== deletingStaff.email.toLowerCase()) &&
              (!deletingStaff.userId || String(a.userId) !== String(deletingStaff.userId)) &&
              a.id !== deletingStaff.id
          );
          localStorage.setItem('pulsefit_accounts_v2', JSON.stringify(list));
        }
      } catch (err) {}

      // Optimistically remove from dbStaff
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
    <div className="space-y-4 sm:space-y-6 animate-fadeIn pb-12 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Staff Account Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provision secure login IDs and passwords for <strong>Managers</strong> (Add-only, restricted finances) and <strong>Accounts</strong> officers (full access).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New Staff Account</span>
          </button>
        </div>
      </div>

      {/* Role Access Explanatory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Manager Role Permissions</span>
          </div>
          <p className="text-[11px] text-indigo-700/90 mt-1 leading-relaxed">
            • <strong>Allowed Modules:</strong> Member Directory, Enquiries, Attendance, Classes, Equipment, Shop.
            <br />
            • <strong>Permissions:</strong> <strong>Add data only</strong>. No edit or delete capability.
            <br />
            • <strong>Excluded Modules:</strong> Complete exclusion from Revenue, Billing, Expenses, and Financial analytics.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Accounts Role Permissions</span>
          </div>
          <p className="text-[11px] text-amber-800/90 mt-1 leading-relaxed">
            • <strong>Accessibility:</strong> <strong>All pages and actions</strong> identical to Superadmin.
            <br />
            • <strong>Special Badge:</strong> Displays an official <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[10px]">[Accounts]</span> badge across navigation.
            <br />
            • <strong>Responsibilities:</strong> Full control over revenue inflow, expense outflows, payroll, and advance salary approvals.
          </p>
        </div>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Administrative Accounts</h3>
            <p className="text-[11px] text-slate-500">System credentials and access levels</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
            Total: {staffList.length} Accounts
          </span>
        </div>

        {staffList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={UserPlus}
              title="No Staff Accounts Configured"
              description="Create administrative staff accounts with role-based permissions (Manager or Accounts) to delegate day-to-day front desk and financial operations."
              actionText="Create Staff Account"
              onAction={() => setIsCreateModalOpen(true)}
              color="emerald"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role & Level</th>
                  <th className="py-3 px-4">Login ID / Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffList.map((stf) => {
                  const isSuper = stf.role === 'superadmin' || stf.role === 'owner';
                  const isMgr = stf.role === 'manager';
                  const isAcc = stf.role === 'accounts';

                  return (
                    <tr key={stf.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={stf.avatar}
                            alt={stf.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <div className="font-bold text-slate-900">{stf.name}</div>
                            <div className="text-[10px] text-slate-400">{stf.phone || 'No phone recorded'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isSuper && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" /> Superadmin
                          </span>
                        )}
                        {isMgr && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Users className="w-3 h-3" /> Manager (Add Only)
                          </span>
                        )}
                        {isAcc && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <ShieldCheck className="w-3 h-3 text-amber-600" /> Accounts & Finance
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                        {stf.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                            title="Edit Staff Account"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {!isSuper && (
                            <button
                              type="button"
                              onClick={() => setDeletingStaff(stf)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors cursor-pointer shrink-0"
                              title="Delete Staff Account"
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

      {/* CREATE STAFF ACCOUNT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Staff Account"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Full Name</label>
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
            <label className="block font-bold text-slate-700 mb-1">Login ID / Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. manager@archfit.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Account Role</label>
            <div className="grid grid-cols-2 gap-2">
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
                <div className="text-[10px] text-slate-500 mt-0.5">Add-only, No Finance</div>
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
                <div className="text-[10px] text-slate-500 mt-0.5">Full Superadmin Access</div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Assigned Password</label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, password: 'pass' + Math.floor(1000 + Math.random() * 9000) })}
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
                placeholder="Enter account password"
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

          <div>
            <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="+91 98200 00000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
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
              Provision Account
            </button>
          </div>
        </form>
      </Modal>

      {/* CREDENTIALS SHARE POPUP */}
      <Modal
        isOpen={Boolean(createdCredentials)}
        onClose={() => setCreatedCredentials(null)}
        title="Account Created Successfully"
        maxWidth="max-w-md"
      >
        {createdCredentials && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-emerald-900 text-sm">{createdCredentials.name}</h4>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200">
                {createdCredentials.roleLabel}
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
                  `ArchFit Login Credentials:\nRole: ${createdCredentials.roleLabel}\nLogin ID: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`,
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
              <img
                src={sharingStaff.avatar}
                alt={sharingStaff.name}
                className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
                }}
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-900 text-sm truncate">{sharingStaff.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 capitalize">
                    {sharingStaff.roleLabel || (sharingStaff.role === 'manager' ? 'Operations Manager' : sharingStaff.role === 'accounts' ? 'Senior Finance Officer' : sharingStaff.role)}
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

            <p className="text-[11px] text-slate-500 text-center">
              Share these credentials with the staff member to sign in to their administrative account.
            </p>

            <button
              type="button"
              onClick={() => {
                const pass = sharingStaff.plain_password || sharingStaff.password || getStaffPassword(sharingStaff);
                copyToClipboard(
                  `ArchFit Login Credentials\nStaff: ${sharingStaff.name}\nRole: ${sharingStaff.roleLabel || sharingStaff.role}\nEmail: ${sharingStaff.email}\nPassword: ${pass}`,
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

      {/* EDIT STAFF ACCOUNT MODAL */}
      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title="Edit Staff Account"
        maxWidth="max-w-md"
      >
        {editingStaff && (
          <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Login ID / Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Account Role</label>
              <div className="grid grid-cols-2 gap-2">
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
                  <div className="text-[10px] text-slate-500 mt-0.5">Add-only, No Finance</div>
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
                  <div className="text-[10px] text-slate-500 mt-0.5">Full Superadmin Access</div>
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Update Password (Optional)</label>
                <span className="text-[10px] text-slate-400">Leave blank to keep existing</span>
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

            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="+91 98200 00000"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
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
        title="Delete Staff Account"
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
                  Are you sure you want to permanently delete the staff account for <strong>{deletingStaff.email}</strong>? This user will immediately lose access to the system.
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
    </div>
  );
};
