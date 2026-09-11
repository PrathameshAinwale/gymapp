import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGymData } from '../../context/GymDataContext';
import {
  Award,
  Users,
  Plus,
  Phone,
  Mail,
  CheckCircle2,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  DollarSign,
  GraduationCap
} from 'lucide-react';
import { Modal } from '../common/Modal';

export const TrainerList = () => {
  const { registerAccount } = useAuth();
  const { trainers, members, addTrainer, addToast } = useGymData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [newlyCreatedCredentials, setNewlyCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Head Strength & Conditioning Coach',
    email: '',
    phone: '',
    password: 'trainer' + Math.floor(100 + Math.random() * 900),
    specialty: 'Hypertrophy & Powerlifting',
    monthlySalary: 45000,
    bio: '',
    certifications: 'NASM-CPT, CSCS',
    age: '',
    gender: 'Male',
    bloodGroup: 'B+',
    address: ''
  });

  const generateRandomPassword = () => {
    const pass = 'coach' + Math.floor(1000 + Math.random() * 9000);
    setFormData({ ...formData, password: pass });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    // 1. Add to Gym state
    const createdTrainer = {
      id: `trn-${trainers.length + 1}`,
      name: formData.name,
      role: formData.role,
      email: formData.email,
      phone: formData.phone,
      specialty: formData.specialty,
      monthlySalary: Number(formData.monthlySalary),
      bio: formData.bio || 'Passionate fitness professional committed to member transformation.',
      certifications: formData.certifications.split(',').map((c) => c.trim()).filter(Boolean),
      age: formData.age ? Number(formData.age) : null,
      gender: formData.gender || null,
      bloodGroup: formData.bloodGroup || null,
      address: formData.address || null
    };

    addTrainer(createdTrainer);

    // 2. Register Account in Auth Database
    registerAccount({
      id: createdTrainer.id,
      name: formData.name,
      email: formData.email,
      username: formData.email.split('@')[0],
      password: formData.password || 'trainer123',
      role: 'trainer',
      specialty: formData.specialty
    });

    // 3. Open Credentials Receipt
    setNewlyCreatedCredentials({
      name: formData.name,
      email: formData.email,
      password: formData.password || 'trainer123',
      id: createdTrainer.id,
      role: formData.role,
      specialty: formData.specialty
    });

    setIsAddOpen(false);
    setFormData({
      name: '',
      role: 'Head Strength & Conditioning Coach',
      email: '',
      phone: '',
      password: 'trainer' + Math.floor(100 + Math.random() * 900),
      specialty: 'Hypertrophy & Powerlifting',
      monthlySalary: 45000,
      bio: '',
      certifications: 'NASM-CPT, CSCS',
      age: '',
      gender: 'Male',
      bloodGroup: 'B+',
      address: ''
    });
    addToast('New coach onboarded and credentials generated!', 'success');
  };

  const handleCopyCredentials = () => {
    if (!newlyCreatedCredentials) return;
    const text = `Coach Login Credentials:\n• App URL: http://localhost:5173/\n• Email: ${newlyCreatedCredentials.email}\n• Password: ${newlyCreatedCredentials.password}\n• Role: ${newlyCreatedCredentials.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Trainers & Coaches
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Hire certified coaches, issue trainer portal login accounts, and monitor assigned member athlete loads.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Hire Coach & Issue Login</span>
          <span className="inline sm:hidden">Hire Coach</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Total Coaches</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{trainers.length} Coaches</div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Certified strength & group instructors</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Assigned Clients</span>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1">
            {members.filter((m) => m.trainerId).length} Members
          </div>
          <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium hidden sm:block">1-on-1 personal training guidance</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Monthly Base Payroll</span>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
            ₹{trainers.reduce((acc, t) => acc + (Number(t.monthlySalary) || 0), 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block">Fixed retainer commitments</span>
        </div>
      </div>

      {/* Trainers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
        {trainers.map((trainer) => {
          const assignedMembers = members.filter((m) => m.trainerId === trainer.id);

          return (
            <div
              key={trainer.id}
              className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-base shrink-0">
                    {trainer.name ? trainer.name.charAt(0) : 'C'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">{trainer.name}</h3>
                    <div className="text-[11px] sm:text-xs text-emerald-700 font-medium truncate">{trainer.role}</div>
                    <div className="text-[10px] text-slate-400 truncate">{trainer.email}</div>
                  </div>
                </div>

                <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 mb-3 italic leading-relaxed">
                  "{trainer.bio || 'Dedicated fitness mentor guiding members toward strength, conditioning, and sustainable health.'}"
                </p>

                {/* Specialties & Certs Info */}
                <div className="space-y-1.5 text-[11px] sm:text-xs mb-3">
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">Specialty:</span>
                    <span className="font-semibold text-slate-900 truncate ml-2">{trainer.specialty}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">Experience:</span>
                    <span className="font-semibold text-slate-900">{trainer.experience || '5+ Years'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">Assigned Clients:</span>
                    <span className="font-bold text-emerald-700">{assignedMembers.length} Active</span>
                  </div>
                </div>

                {/* Certifications badges */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(trainer.certifications || ['CSCS', 'NASM-CPT']).map((cert, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrainer({ ...trainer, assignedMembers })}
                  className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>View Roster ({assignedMembers.length})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* VIEW TRAINER MEMBERS MODAL */}
      <Modal
        isOpen={!!selectedTrainer}
        onClose={() => setSelectedTrainer(null)}
        title={`Coach Roster: ${selectedTrainer?.name}`}
      >
        {selectedTrainer && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 font-medium">Monthly Compensation:</span>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  ₹{Number(selectedTrainer.monthlySalary).toLocaleString('en-IN')} / mo
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 font-medium">Coach Email:</span>
                <div className="text-slate-800 font-semibold mt-0.5">{selectedTrainer.email}</div>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assigned Active Members ({selectedTrainer.assignedMembers.length})
            </h4>

            {selectedTrainer.assignedMembers.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No members currently assigned to this coach. Assign members from the Members tab.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedTrainer.assignedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-[11px] text-slate-500">{m.goal || 'General Fitness'}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {m.planName}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedTrainer(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Close Roster
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* HIRE NEW COACH MODAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Hire Coach & Provision Portal Access"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Coach Portal Login Account</span>
              </div>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[11px] text-emerald-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Auto-generate
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="coach@pulsefit.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Coach Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Coach Alex Rivers"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98201 11223"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation / Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Specialty</label>
              <input
                type="text"
                placeholder="e.g. Hypertrophy, Crossfit, Powerlifting"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Retainer (₹)</label>
              <input
                type="number"
                value={formData.monthlySalary}
                onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Certifications</label>
              <input
                type="text"
                placeholder="e.g. CSCS, NASM-CPT"
                value={formData.certifications}
                onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Bio / Profile Summary</label>
            <textarea
              rows={3}
              placeholder="Background, coaching philosophy, and athletic credentials..."
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              Create Coach Account
            </button>
          </div>
        </form>
      </Modal>

      {/* TRAINER CREDENTIALS RECEIPT MODAL */}
      <Modal
        isOpen={!!newlyCreatedCredentials}
        onClose={() => setNewlyCreatedCredentials(null)}
        title="Trainer Account Created & Credentials Ready"
        maxWidth="max-w-md"
      >
        {newlyCreatedCredentials && (
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900">
                Coach {newlyCreatedCredentials.name} Provisioned
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Share these login credentials with the trainer to access their coaching schedule.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Web URL</span>
                <span className="text-slate-900 font-bold">http://localhost:5173/</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Login Email</span>
                <span className="text-slate-900 font-bold">{newlyCreatedCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Password</span>
                <span className="text-emerald-700 font-bold">{newlyCreatedCredentials.password}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-2 border border-slate-200 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
              </button>

              <button
                type="button"
                onClick={() => setNewlyCreatedCredentials(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
