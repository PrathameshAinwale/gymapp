import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Building2,
  Users,
  Search,
  Sparkles,
  Lock,
  Layers,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  CreditCard,
  UserCheck,
  TrendingUp,
  Settings,
  Dumbbell
} from 'lucide-react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

export const ALL_APP_PAGES = [
  {
    category: 'Operations & Schedule',
    icon: Activity,
    pages: [
      { id: 'dashboard', label: 'Operations Dashboard', desc: 'KPI counters, check-in feeds & admissions' },
      { id: 'members', label: 'Member Directory', desc: 'Athlete profiles, memberships & emergency details' },
      { id: 'classes', label: 'Classes & Batches', desc: 'Group class scheduling & batch enrollment' },
      { id: 'pt-sessions', label: 'PT Sessions Tracker', desc: 'Personal training tracking & check-offs' },
      { id: 'enquiries', label: 'Enquiries & Leads', desc: 'Lead capture, follow-ups & trial bookings' },
      { id: 'attendance', label: 'Attendance Tracker', desc: 'Daily attendance logs & biometric sync' },
      { id: 'whatsapp-automation', label: 'WhatsApp & Templates', desc: 'Manual & automated WhatsApp notices' }
    ]
  },
  {
    category: 'Memberships & Compliance',
    icon: CreditCard,
    pages: [
      { id: 'plans', label: 'Membership Plans', desc: 'Admission plan tariffs, durations & offers' },
      { id: 'membership-freeze', label: 'Freeze & Extensions', desc: 'Medical holds & membership extensions' }
    ]
  },
  {
    category: 'Staff & Payroll',
    icon: UserCheck,
    pages: [
      { id: 'staff-accounts', label: 'Create Account / Staff', desc: 'Staff account provisioning & roles' },
      { id: 'shifts', label: 'Shift Timings & Slots', desc: 'Employee shift allocations' },
      { id: 'leaves', label: 'Leave Management', desc: 'Staff leaves & quota review' },
      { id: 'advance-pay', label: 'Advance Pay Requests', desc: 'Salary advance approvals & status' },
      { id: 'payroll', label: 'Employee Payroll', desc: 'Monthly wage calculations & slips' },
      { id: 'commissions', label: 'Trainer Commissions', desc: 'Coach PT & sales commission payouts' }
    ]
  },
  {
    category: 'Finance & Analytics',
    icon: TrendingUp,
    pages: [
      { id: 'analytics', label: 'Analytics & Insights', desc: 'Club retention, growth & peak traffic curves' },
      { id: 'reports', label: 'Export Reports', desc: 'Download CSV / Excel / PDF financial summaries' },
      { id: 'financials', label: 'Revenue & Billing', desc: 'Income, expense ledger & cash registers' },
      { id: 'invoices', label: 'Member Invoices', desc: 'Tax invoicing, GST receipts & payments' }
    ]
  },
  {
    category: 'Inventory & Setup',
    icon: Settings,
    pages: [
      { id: 'products', label: 'Pro Shop & POS Store', desc: 'Supplement inventory & retail register' },
      { id: 'equipment', label: 'Equipment & Assets', desc: 'Fitness equipment inventory & service logs' },
      { id: 'settings', label: 'Gym Settings', desc: 'Logo, contact info, taxes & business rules' }
    ]
  },
  {
    category: 'Personal Training Modules',
    icon: Dumbbell,
    pages: [
      { id: 'sessions', label: '1-on-1 PT Sessions', desc: 'Coach view: PT session check-off' },
      { id: 'clients', label: 'My Client Roster', desc: 'Coach view: Assigned clients list' },
      { id: 'workout-builder', label: 'Workout Builder', desc: 'Create routine templates & exercise charts' },
      { id: 'diet-builder', label: 'Diet & Macro Builder', desc: 'Personalized meal schedules & macro ratios' },
      { id: 'trainer-leaves', label: 'Coach Leaves & Profile', desc: 'Coach leave requests & profile management' }
    ]
  },
  {
    category: 'About & Support',
    icon: HelpCircle,
    pages: [
      { id: 'privacy-policy', label: 'Privacy Policy', desc: 'Platform privacy terms' },
      { id: 'terms-conditions', label: 'Terms & Conditions', desc: 'Club terms & conditions' },
      { id: 'help-support', label: 'Help & Support', desc: 'Customer help desk & FAQs' }
    ]
  }
];

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', ring: 'ring-indigo-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', ring: 'ring-purple-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', ring: 'ring-emerald-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', ring: 'ring-amber-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', ring: 'ring-rose-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-700', ring: 'ring-cyan-500' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', ring: 'ring-blue-500' }
];

export const GymRolesManager = ({ gyms = [], initialSelectedGymId = null, isOwnerMode = true, gymName = '' }) => {
  const [selectedGymId, setSelectedGymId] = useState(
    initialSelectedGymId || (gyms.length > 0 ? gyms[0].id : 1)
  );
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    color: 'indigo',
    assigned_pages: []
  });

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync selected gym when prop changes
  useEffect(() => {
    if (initialSelectedGymId) {
      setSelectedGymId(initialSelectedGymId);
    } else if (!selectedGymId && gyms.length > 0) {
      setSelectedGymId(gyms[0].id);
    }
  }, [initialSelectedGymId, gyms]);

  // Fetch roles for the selected gym
  const fetchRoles = async () => {
    if (!selectedGymId && !isOwnerMode) return;
    setIsLoading(true);
    try {
      const res = isOwnerMode
        ? await api.gymRoles.getAll(selectedGymId)
        : await api.superadmin.getGymRoles(selectedGymId);
      if (res?.roles && Array.isArray(res.roles)) {
        setRoles(res.roles);
      }
    } catch (err) {
      console.error('Failed to load gym roles:', err);
      showToast(err.message || 'Failed to fetch roles for this gym', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [selectedGymId, isOwnerMode]);

  const activeGym = useMemo(() => {
    return gyms.find((g) => Number(g.id) === Number(selectedGymId)) || null;
  }, [gyms, selectedGymId]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      color: 'indigo',
      assigned_pages: ['dashboard', 'members', 'attendance']
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      slug: role.slug || '',
      description: role.description || '',
      color: role.color || 'indigo',
      assigned_pages: Array.isArray(role.assigned_pages) ? [...role.assigned_pages] : []
    });
    setIsModalOpen(true);
  };

  // Toggle Page Permission
  const togglePage = (pageId) => {
    setFormData((prev) => {
      const exists = prev.assigned_pages.includes(pageId);
      const updated = exists
        ? prev.assigned_pages.filter((p) => p !== pageId)
        : [...prev.assigned_pages, pageId];
      return { ...prev, assigned_pages: updated };
    });
  };

  // Select all / clear all pages
  const handleSelectAllPages = () => {
    const all = [];
    ALL_APP_PAGES.forEach((cat) => {
      cat.pages.forEach((p) => all.push(p.id));
    });
    setFormData((prev) => ({ ...prev, assigned_pages: Array.from(new Set(all)) }));
  };

  const handleClearAllPages = () => {
    setFormData((prev) => ({ ...prev, assigned_pages: [] }));
  };

  // Apply Presets
  const applyPreset = (presetName) => {
    if (presetName === 'receptionist') {
      setFormData((prev) => ({
        ...prev,
        assigned_pages: [
          'dashboard', 'members', 'enquiries', 'attendance', 'classes', 'pt-sessions',
          'products', 'privacy-policy', 'terms-conditions', 'help-support'
        ]
      }));
    } else if (presetName === 'sales') {
      setFormData((prev) => ({
        ...prev,
        assigned_pages: [
          'dashboard', 'members', 'enquiries', 'plans', 'whatsapp-automation',
          'privacy-policy', 'terms-conditions', 'help-support'
        ]
      }));
    } else if (presetName === 'trainer') {
      setFormData((prev) => ({
        ...prev,
        assigned_pages: [
          'dashboard', 'sessions', 'clients', 'workout-builder', 'diet-builder',
          'trainer-leaves', 'commissions', 'privacy-policy', 'terms-conditions', 'help-support'
        ]
      }));
    } else if (presetName === 'finance') {
      setFormData((prev) => ({
        ...prev,
        assigned_pages: [
          'dashboard', 'financials', 'invoices', 'payroll', 'advance-pay',
          'commissions', 'reports', 'privacy-policy', 'terms-conditions', 'help-support'
        ]
      }));
    }
  };

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a role name', 'error');
      return;
    }
    if (formData.assigned_pages.length === 0) {
      showToast('Please select at least one page permission for this role', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRole) {
        // Update
        const payload = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          assigned_pages: formData.assigned_pages
        };
        const res = isOwnerMode
          ? await api.gymRoles.update(editingRole.id, payload)
          : await api.superadmin.updateGymRole(editingRole.id, payload);
        showToast(res.message || 'Role updated successfully!', 'success');
      } else {
        // Create
        const payload = {
          gym_id: Number(selectedGymId) || undefined,
          name: formData.name.trim(),
          slug: formData.slug.trim() || undefined,
          description: formData.description.trim(),
          color: formData.color,
          assigned_pages: formData.assigned_pages
        };
        const res = isOwnerMode
          ? await api.gymRoles.create(payload)
          : await api.superadmin.createGymRole(payload);
        showToast(res.message || 'Role created successfully!', 'success');
      }

      setIsModalOpen(false);
      fetchRoles();
    } catch (err) {
      showToast(err.message || 'Failed to save role', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      const res = isOwnerMode
        ? await api.gymRoles.delete(roleToDelete.id)
        : await api.superadmin.deleteGymRole(roleToDelete.id);
      showToast(res.message || 'Role deleted successfully!', 'success');
      setRoleToDelete(null);
      fetchRoles();
    } catch (err) {
      showToast(err.message || 'Failed to delete role', 'error');
      setRoleToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm font-medium shadow-md transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 ml-3 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Staff Roles & Permission Access
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Create and customize employee roles for your gym facility. Select exact operational screens staff can access.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Create Role Button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Role</span>
          </button>
        </div>
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading roles for this facility...</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Roles Defined Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Create the first custom role for this gym or auto-seed standard roles.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
          >
            + Create First Role
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const colorMeta = COLOR_OPTIONS.find((c) => c.id === role.color) || COLOR_OPTIONS[0];
            const pageCount = Array.isArray(role.assigned_pages) ? role.assigned_pages.length : 0;

            return (
              <div
                key={role.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Title & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${colorMeta.bg} ${colorMeta.border} border shrink-0`} />
                      <h4 className="text-sm font-bold text-slate-900">{role.name}</h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {role.is_default && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                          Default
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${colorMeta.bg} ${colorMeta.border} ${colorMeta.text}`}
                      >
                        {role.slug}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                    {role.description || 'Custom staff role with tailored operational page access.'}
                  </p>

                  {/* Assigned Pages Count & Preview */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" /> Accessible Pages
                      </span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                        {pageCount} Pages
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                      {Array.isArray(role.assigned_pages) &&
                        role.assigned_pages.map((pSlug) => {
                          let pLabel = pSlug;
                          ALL_APP_PAGES.forEach((cat) => {
                            const found = cat.pages.find((p) => p.id === pSlug);
                            if (found) pLabel = found.label;
                          });
                          return (
                            <span
                              key={pSlug}
                              className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md"
                            >
                              {pLabel}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Footer: Staff Count & Actions */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      <strong className="text-slate-800 font-semibold">{role.staff_count || 0}</strong>{' '}
                      staff assigned
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(role)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                      title="Edit Role & Permissions"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!role.is_default && (
                      <button
                        type="button"
                        onClick={() => setRoleToDelete(role)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ROLE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingRole ? `Edit Role: ${editingRole.name}` : `Create New Role for ${activeGym?.name || 'Gym'}`}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role Name / Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Front Desk Receptionist, Dietitian"
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    name: val,
                    slug: editingRole ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
                  }));
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Role Slug (Unique Code) *
              </label>
              <input
                type="text"
                required
                disabled={!!editingRole}
                placeholder="e.g. front_desk_receptionist"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '')
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Description / Job Responsibilities
            </label>
            <input
              type="text"
              placeholder="e.g. Front desk greeting, membership check-ins and client lead follow-up"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Role Badge Theme
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = formData.color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.id })}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? `${c.bg} ${c.border} ${c.text} ring-2 ${c.ring}`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.text}`} />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Page Permissions Header & Quick Actions */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Assign Accessible Pages & Features *
                </h4>
                <p className="text-[11px] text-slate-500">
                  Staff assigned this role will only be able to view and use the pages checked below.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllPages}
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAllPages}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 mb-4 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Apply Presets:
              </span>
              <button
                type="button"
                onClick={() => applyPreset('receptionist')}
                className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer"
              >
                Front Desk
              </button>
              <button
                type="button"
                onClick={() => applyPreset('sales')}
                className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer"
              >
                Sales & CRM
              </button>
              <button
                type="button"
                onClick={() => applyPreset('trainer')}
                className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer"
              >
                PT Coach
              </button>
              <button
                type="button"
                onClick={() => applyPreset('finance')}
                className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer"
              >
                Accounts & Billing
              </button>
            </div>

            {/* Category Groups */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {ALL_APP_PAGES.map((cat) => {
                const Icon = cat.icon;
                const checkedInCat = cat.pages.filter((p) =>
                  formData.assigned_pages.includes(p.id)
                ).length;
                const allInCatChecked = checkedInCat === cat.pages.length;

                return (
                  <div
                    key={cat.category}
                    className="border border-slate-200/90 rounded-xl p-3 bg-white"
                  >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">{cat.category}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({checkedInCat}/{cat.pages.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const catPageIds = cat.pages.map((p) => p.id);
                          if (allInCatChecked) {
                            setFormData((prev) => ({
                              ...prev,
                              assigned_pages: prev.assigned_pages.filter(
                                (id) => !catPageIds.includes(id)
                              )
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              assigned_pages: Array.from(
                                new Set([...prev.assigned_pages, ...catPageIds])
                              )
                            }));
                          }
                        }}
                        className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {allInCatChecked ? 'Deselect Category' : 'Select Category'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.pages.map((p) => {
                        const isChecked = formData.assigned_pages.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            onClick={() => togglePage(p.id)}
                            className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2 ${
                              isChecked
                                ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 ring-1 ring-indigo-300'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold">{p.label}</div>
                              <div className="text-[10px] text-slate-500 line-clamp-1">{p.desc}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Selected Pages: <strong className="text-indigo-600">{formData.assigned_pages.length}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingRole ? 'Update Role' : 'Create Role'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={handleDeleteRole}
        title={`Delete Role: ${roleToDelete?.name}`}
        message={`Are you sure you want to delete the role "${roleToDelete?.name}"? Staff members can no longer be assigned to this role. If any staff are currently assigned, deletion will be blocked.`}
      />
    </div>
  );
};
