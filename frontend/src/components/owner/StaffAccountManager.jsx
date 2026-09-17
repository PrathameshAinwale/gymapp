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
  RotateCw
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';

export const StaffAccountManager = () => {
  const { accounts, createStaffAccount, currentRole } = useAuth();
  const { addToast } = useGymData();

  const [dbStaff, setDbStaff] = useState([]);
  const fetchStaffFromDb = async () => {
    try {
      const res = await api.staff.getAll();
      if (res?.data && Array.isArray(res.data)) {
        setDbStaff(res.data);
      }
    } catch (e) {
      console.warn('Fetch staff db note:', e.message);
    }
  };

  useEffect(() => {
    fetchStaffFromDb();
  }, []);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'manager', // 'manager' | 'accounts'
    phone: ''
  });

  // Merge database staff accounts with auth accounts, prioritizing live database records
  const staffList = React.useMemo(() => {
    const map = new Map();
    // Add auth context accounts
    accounts.filter(
      (acc) => acc.role === 'manager' || acc.role === 'accounts' || acc.role === 'superadmin' || acc.role === 'owner'
    ).forEach(a => map.set(a.email?.toLowerCase(), a));

    // Overlay database records
    dbStaff.forEach(stf => {
      const emailKey = stf.email?.toLowerCase();
      const existing = map.get(emailKey) || {};
      map.set(emailKey, {
        ...existing,
        id: existing.id || `usr-${stf.role}-${stf.id}`,
        userId: stf.id,
        name: stf.name,
        email: stf.email,
        role: stf.role,
        phone: stf.phone || existing.phone,
        avatar: stf.avatar || existing.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        password: existing.password || '••••••••'
      });
    });

    return Array.from(map.values());
  }, [accounts, dbStaff]);

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
        phone: formData.phone
      });

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
                  <th className="py-3 px-4">Temporary Password</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Copy</th>
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

                      <td className="py-3.5 px-4 font-mono text-slate-500 font-semibold">
                        {stf.password || '••••••••'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`ID: ${stf.email} | Password: ${stf.password}`, stf.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        >
                          {copiedId === stf.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Share ID</span>
                            </>
                          )}
                        </button>
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
                placeholder="e.g. manager@pulsefit.in"
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
                <span className="text-slate-400 font-bold block">Temporary Password:</span>
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
                  `PulseFit Login Credentials:\nRole: ${createdCredentials.roleLabel}\nLogin ID: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`,
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
    </div>
  );
};
