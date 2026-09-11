import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Eye,
  Calendar,
  Phone,
  User,
  Clock,
  Filter,
  Plus,
  ChevronDown,
  Check
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const ConsentFormsManager = () => {
  const { consentForms, members, addConsentForm, updateConsentStatus, addToast } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewingForm, setViewingForm] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    memberId: '',
    memberName: '',
    phone: '',
    planName: '',
    formType: 'General Fitness & Liability Waiver',
    emergencyContact: '',
    emergencyPhone: '',
    medicalNotes: '',
    status: 'Pending'
  });

  const totalForms = consentForms.length;
  const signedCount = consentForms.filter((f) => f.status === 'Signed').length;
  const pendingCount = consentForms.filter((f) => f.status === 'Pending').length;

  const filteredForms = consentForms.filter((f) => {
    const term = (searchTerm || '').trim().toLowerCase();
    const matchesSearch =
      !term ||
      (f.memberName || '').toLowerCase().includes(term) ||
      (f.formType || '').toLowerCase().includes(term) ||
      (f.emergencyContact || '').toLowerCase().includes(term);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && f.status === statusFilter;
  });

  const handleSendReminder = (form) => {
    addToast(`Digital consent link sent via WhatsApp & SMS to ${form.memberName}!`);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.memberId || !createForm.memberName) {
      addToast('Please select a registered gym member from the list.');
      return;
    }

    await addConsentForm(createForm);
    setIsCreateModalOpen(false);
    setCreateForm({
      memberId: '',
      memberName: '',
      phone: '',
      planName: '',
      formType: 'General Fitness & Liability Waiver',
      emergencyContact: '',
      emergencyPhone: '',
      medicalNotes: '',
      status: 'Pending'
    });
  };

  return (
    <div className="space-y-3 sm:space-y-5 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-5 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                Consent Forms & Waivers
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
                Ensure safety and legal compliance with digital liability waivers, PAR-Q, and health clearances.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (members.length > 0) {
              const defaultMember = members[0];
              setCreateForm({
                memberId: defaultMember.id,
                memberName: defaultMember.name,
                phone: defaultMember.phone || '',
                planName: defaultMember.planName || 'General Membership',
                emergencyContact: defaultMember.emergencyContact || '',
                emergencyPhone: '',
                medicalNotes: defaultMember.medicalNotes || '',
                formType: 'General Fitness & Liability Waiver',
                status: 'Pending'
              });
            }
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Consent Form</span>
          <span className="inline sm:hidden">New Form</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Pending Signatures</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1">{pendingCount}</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium hidden sm:block">Awaiting member sign-off</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Forms</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{totalForms}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Compliance records</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Signed</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">{signedCount}</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium hidden sm:block">Verified signatures</span>
        </div>
      </div>

      {/* Sleek Compact Search & Filter Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1 sm:w-72 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search consent forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-[10px] sm:placeholder:text-[11px] placeholder:text-slate-400 text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 text-[10px] font-bold cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] sm:text-[11px] font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs cursor-pointer"
          >
            <option value="ALL">All ({totalForms})</option>
            <option value="Signed">Signed ({signedCount})</option>
            <option value="Pending">Pending ({pendingCount})</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Forms Mobile Cards View */}
      <div className="block sm:hidden space-y-2.5">
        {filteredForms.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs font-medium">
            No consent forms match this filter.
          </div>
        ) : (
          filteredForms.map((f) => {
            const isSigned = f.status === 'Signed';

            return (
              <div
                key={f.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900 text-xs truncate">{f.memberName}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSigned
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isSigned ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                    <span>{f.status}</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 text-[10px] space-y-1">
                  <div className="font-semibold text-slate-900">{f.formType}</div>
                  <div className="text-slate-500">Emergency: {f.emergencyContact || '—'}</div>
                  {f.signedDate && <div className="text-emerald-700 font-semibold">Signed: {f.signedDate}</div>}
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setViewingForm(f)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>

                  {!isSigned && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSendReminder(f)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Send className="w-3 h-3" />
                        <span>Remind</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateConsentStatus(f.id, 'Signed')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm cursor-pointer active:scale-95"
                      >
                        Sign Off
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Forms Table (Desktop View) */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Member Name</th>
                <th className="py-3.5 px-4">Agreement / Form Title</th>
                <th className="py-3.5 px-4">Emergency Contact</th>
                <th className="py-3.5 px-4">Medical Clearance Notes</th>
                <th className="py-3.5 px-4">Date Signed</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredForms.map((f) => {
                const isSigned = f.status === 'Signed';

                return (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{f.memberName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">ID: {f.memberId}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs">
                      {f.formType}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {f.emergencyContact || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={f.medicalNotes}>
                      {f.medicalNotes || 'None'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {f.signedDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{f.signedDate}</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 text-[11px] font-medium">Pending</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSigned
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isSigned ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        <span>{f.status}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingForm(f)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {!isSigned ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSendReminder(f)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Send reminder to member"
                            >
                              <Send className="w-3 h-3" />
                              <span>Remind</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateConsentStatus(f.id, 'Signed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-sm cursor-pointer"
                            >
                              Sign Off
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE NEW CONSENT FORM MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Member Consent & Waiver Form"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-2.5">
          {/* Member Selector - STRICTLY FROM GYM MEMBERS */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Gym Member <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={createForm.memberId}
              onChange={(e) => {
                const selected = members.find((m) => String(m.id) === String(e.target.value));
                setCreateForm({
                  ...createForm,
                  memberId: e.target.value,
                  memberName: selected?.name || '',
                  phone: selected?.phone || '',
                  planName: selected?.planName || 'General Membership',
                  emergencyContact: selected?.emergencyContact || createForm.emergencyContact || '',
                  medicalNotes: selected?.medicalNotes || createForm.medicalNotes || ''
                });
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Select a registered gym member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.phone ? m.phone : m.email}) — Plan: {m.planName || 'Active Member'}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-slate-400 mt-0.5">
              Only athletes registered in the Gym Member Directory are selectable.
            </p>
          </div>

          {/* Agreement / Waiver Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Agreement / Form Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={createForm.formType}
              onChange={(e) => setCreateForm({ ...createForm, formType: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="General Fitness & Liability Waiver">General Fitness & Liability Waiver</option>
              <option value="PAR-Q (Physical Activity Readiness Questionnaire)">PAR-Q (Physical Activity Readiness Questionnaire)</option>
              <option value="High-Intensity / CrossFit Training Clearance">High-Intensity / CrossFit Training Clearance</option>
              <option value="Personal Coaching & Dietary Consent">Personal Coaching & Dietary Consent</option>
              <option value="Minor / Youth Facility Access Consent">Minor / Youth Facility Access Consent</option>
              <option value="Hydrotherapy & Steam Room Safety Waiver">Hydrotherapy & Steam Room Safety Waiver</option>
            </select>
          </div>

          {/* Emergency Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                Emergency Contact Name & Relation
              </label>
              <input
                type="text"
                value={createForm.emergencyContact}
                onChange={(e) => setCreateForm({ ...createForm, emergencyContact: e.target.value })}
                placeholder="e.g. Priya Sharma (Spouse)"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                value={createForm.emergencyPhone}
                onChange={(e) => setCreateForm({ ...createForm, emergencyPhone: e.target.value })}
                placeholder="+91 98200 00000"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Medical Notes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Medical Conditions & Health Clearance Notes
            </label>
            <textarea
              rows={2}
              value={createForm.medicalNotes}
              onChange={(e) => setCreateForm({ ...createForm, medicalNotes: e.target.value })}
              placeholder="e.g. Asthma, prior knee ACL surgery, lower back disc herniation, or None"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Initial Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
              Form Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={createForm.status}
              onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="Pending">Pending (Send digital link to member for signature)</option>
              <option value="Signed">Signed (Paper/verbal clearance verified)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              Save Consent Form
            </button>
          </div>
        </form>
      </Modal>

      {/* View Form Details Modal */}
      <Modal
        isOpen={Boolean(viewingForm)}
        onClose={() => setViewingForm(null)}
        title={viewingForm?.formType || 'Member Consent Document'}
        maxWidth="max-w-lg"
      >
        {viewingForm && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Member Name:</span>
                <span className="font-bold text-slate-900">{viewingForm.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Emergency Contact:</span>
                <span className="text-slate-900">{viewingForm.emergencyContact || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Signed Status:</span>
                <span className={`font-bold ${viewingForm.status === 'Signed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {viewingForm.status}
                </span>
              </div>
              {viewingForm.signedDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Date of Signature:</span>
                  <span className="text-slate-900">{viewingForm.signedDate}</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1.5 text-slate-600">
              <h4 className="font-bold text-slate-900 text-xs">Declaration & Terms:</h4>
              <p className="text-[11px] leading-relaxed">
                1. I understand that physical fitness training, weightlifting, and group exercises involve potential risk of injury.
              </p>
              <p className="text-[11px] leading-relaxed">
                2. I affirm that I am in good physical condition and do not suffer from any known disability or condition which would prevent or limit my participation in sports or gym activities.
              </p>
              <p className="text-[11px] leading-relaxed">
                3. I voluntarily agree to assume all risks and release PULSE FIT Athletic Club and its trainers from any liability.
              </p>
              <div className="pt-1.5 border-t border-slate-100">
                <span className="font-bold text-slate-900 text-[11px] block">Medical / Health Notes:</span>
                <p className="text-slate-500 text-[10px] mt-0.5">{viewingForm.medicalNotes || 'None recorded'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              {viewingForm.status === 'Pending' && (
                <button
                  type="button"
                  onClick={() => {
                    updateConsentStatus(viewingForm.id, 'Signed');
                    setViewingForm(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Verify & Sign Off
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingForm(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
