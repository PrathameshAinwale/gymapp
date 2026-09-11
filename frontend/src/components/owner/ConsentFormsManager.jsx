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
  Filter
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const ConsentFormsManager = () => {
  const { consentForms, updateConsentStatus, addToast } = useGymData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewingForm, setViewingForm] = useState(null);

  const totalForms = consentForms.length;
  const signedCount = consentForms.filter((f) => f.status === 'Signed').length;
  const pendingCount = consentForms.filter((f) => f.status === 'Pending').length;

  const filteredForms = consentForms.filter((f) => {
    const matchesSearch =
      (f.memberName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.formType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.emergencyContact || '').includes(searchTerm);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && f.status === statusFilter;
  });

  const handleSendReminder = (form) => {
    addToast(`Digital consent link sent via WhatsApp & SMS to ${form.memberName}!`);
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">Consent Forms & Waivers</h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Ensure safety and legal compliance with digital liability waivers, physical readiness, and health clearance forms.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Forms</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{totalForms}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Compliance records</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Signed</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">{signedCount}</div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium hidden sm:block">Verified signatures</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Pending Signatures</span>
          <div className="text-lg sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1">{pendingCount}</div>
          <span className="text-[10px] sm:text-[11px] text-amber-700 font-medium hidden sm:block">Awaiting member sign-off</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by member name, form title, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Signed">Signed (Compliant)</option>
            <option value="Pending">Pending Sign-off</option>
          </select>
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
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900 text-xs truncate">{f.memberName}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isSigned
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isSigned ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                    <span>{f.status}</span>
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 text-[10px] space-y-1">
                  <div className="font-semibold text-slate-900">{f.formType}</div>
                  <div className="text-slate-500">Emergency: {f.emergencyContact || '—'}</div>
                  {f.signedDate && <div className="text-emerald-700">Signed: {f.signedDate}</div>}
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
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl lg:rounded-3xl shadow-sm overflow-hidden">
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
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
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

                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingForm(f)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {!isSigned ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSendReminder(f)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Send reminder to member"
                            >
                              <Send className="w-3 h-3" />
                              <span>Remind</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateConsentStatus(f.id, 'Signed')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm cursor-pointer"
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

      {/* View Form Details Modal */}
      <Modal
        isOpen={Boolean(viewingForm)}
        onClose={() => setViewingForm(null)}
        title={viewingForm?.formType || 'Member Consent Document'}
        maxWidth="max-w-lg"
      >
        {viewingForm && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Member Name:</span>
                <span className="font-bold text-slate-900">{viewingForm.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Emergency Contact:</span>
                <span className="text-slate-900">{viewingForm.emergencyContact}</span>
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

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-slate-600">
              <h4 className="font-bold text-slate-900 text-sm">Declaration & Terms:</h4>
              <p>
                1. I understand that physical fitness training, weightlifting, and group exercises involve potential risk of injury.
              </p>
              <p>
                2. I affirm that I am in good physical condition and do not suffer from any known disability or condition which would prevent or limit my participation in sports or gym activities.
              </p>
              <p>
                3. I voluntarily agree to assume all risks and release PULSE FIT Athletic Club and its trainers from any liability.
              </p>
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900 block">Medical / Health Notes:</span>
                <p className="text-slate-500 mt-0.5">{viewingForm.medicalNotes || 'None recorded'}</p>
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Verify & Sign Off
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingForm(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
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
