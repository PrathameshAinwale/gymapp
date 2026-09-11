import React, { useState } from 'react';
import { useGymData } from '../../context/GymDataContext';
import {
  QrCode,
  Scan,
  CheckCircle2,
  XCircle,
  Search,
  UserCheck,
  Award,
  Clock,
  ShieldCheck,
  Sparkles,
  Zap,
  Activity,
  Flame,
  User
} from 'lucide-react';

export const AttendanceScanner = () => {
  const { trainers, members, attendance, addToast } = useGymData();
  const [activeMode, setActiveMode] = useState('qr'); // 'qr' | 'staff'
  const [scannedResult, setScannedResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  // Recent scanned logs from real database attendance
  const [recentScans, setRecentScans] = useState(() =>
    (attendance || []).slice(0, 10).map((a, idx) => ({
      id: a.id || `sc-${idx}`,
      memberName: a.memberName || a.user?.name || 'Member',
      plan: a.planName || 'Active Membership',
      passId: a.passCode || `PASS-${a.userId || idx}`,
      time: a.time || a.checkInTime || 'Today',
      status: a.status || 'APPROVED',
      avatar: (a.memberName || a.user?.name || 'M')[0]
    }))
  );

  // Trainer Attendance Records from live database trainers
  const [trainerAttendance, setTrainerAttendance] = useState(() =>
    (trainers || []).map((t, idx) => ({
      id: `trn-att-${t.id || idx}`,
      trainerId: t.id,
      trainerName: t.name,
      specialty: t.specialty || t.role || 'Fitness Coach',
      shift: idx % 2 === 0 ? 'Morning (06:00 AM - 02:00 PM)' : 'Evening (02:00 PM - 10:00 PM)',
      checkInTime: '--',
      checkOutTime: '--',
      status: 'Scheduled'
    }))
  );

  const [selectedTrainerToPunch, setSelectedTrainerToPunch] = useState(trainers[0]?.id || '');
  const [punchShift, setPunchShift] = useState('Morning (06:00 AM - 02:00 PM)');

  // Handle simulated QR code Scan / Manual Code Lookup
  const handleProcessScan = (passCode) => {
    const code = passCode || manualCode;
    if (!code) return;

    // Search in members
    const matched = members.find((m) =>
      m.name.toLowerCase().includes(code.toLowerCase()) ||
      (m.id && String(m.id).toLowerCase().includes(code.toLowerCase())) ||
      code.toUpperCase().includes('PASS')
    ) || members[0];

    const isExpired = matched.status === 'Expired';

    const result = {
      name: matched.name,
      email: matched.email,
      phone: matched.phone || '+91 98765 43210',
      plan: matched.planName || 'Titan Black VIP',
      status: isExpired ? 'EXPIRED' : 'ACTIVE ACCESS',
      passId: code.startsWith('PASS-') ? code : `PASS-${Math.floor(1000 + Math.random() * 9000)}`,
      trainer: matched.trainer || 'Alex Mercer',
      expiryDate: matched.endDate || '2026-12-31',
      attendanceStreak: matched.attendanceStreak || 16,
      avatar: (matched.name || 'M').charAt(0)
    };

    setScannedResult(result);
    setManualCode('');

    if (!isExpired) {
      addToast(`Access GRANTED for ${result.name} (${result.passId})`);
      setRecentScans([
        {
          id: `sc-${Date.now()}`,
          memberName: result.name,
          plan: result.plan,
          passId: result.passId,
          time: 'Just now',
          status: 'APPROVED',
          avatar: result.avatar
        },
        ...recentScans.slice(0, 5)
      ]);
    } else {
      addToast(`Access DENIED: Plan expired for ${result.name}`, 'info');
    }
  };

  const handleTogglePunch = (recordId) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setTrainerAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === recordId) {
          if (rec.status === 'On Duty') {
            addToast(`${rec.trainerName} punched out at ${timeStr}`);
            return { ...rec, status: 'Checked Out', checkOutTime: timeStr };
          } else {
            addToast(`${rec.trainerName} punched in at ${timeStr}`);
            return { ...rec, status: 'On Duty', checkInTime: timeStr, checkOutTime: '--' };
          }
        }
        return rec;
      })
    );
  };

  return (
    <div className="space-y-3 sm:space-y-6 animate-fadeIn pb-12 max-w-7xl mx-auto">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <Scan className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              Access Gate Scanner
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 hidden sm:block">
            Real-time biometric & QR gate access scanner + coach shift tracking.
          </p>
        </div>

        {/* Dual Tab Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveMode('qr')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'qr'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scan className="w-3.5 h-3.5 text-emerald-600" />
            <span>Turnstile QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('staff')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-4 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              activeMode === 'staff'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Coach Shifts</span>
          </button>
        </div>
      </div>

      {activeMode === 'qr' ? (
        /* ================= QR SCANNER INTERFACE ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-6">
          {/* Left 7 Cols: Scanner Viewfinder */}
          <div className="lg:col-span-7 space-y-3">
            <div className="rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm bg-slate-950 text-white space-y-3">
              {/* Top Viewfinder HUD info */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                  <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider">
                    Turnstile Gate 1 Online
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">FPS: 60 • Optical Scan</span>
              </div>

              {/* Viewfinder Area */}
              <div className="relative aspect-video sm:aspect-auto sm:h-64 rounded-xl bg-[#070b12] border border-dashed border-emerald-500/30 flex flex-col items-center justify-center overflow-hidden">
                {/* Laser scan line */}
                {isScanning && (
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-pulse z-20 pointer-events-none" />
                )}

                {/* Viewfinder Target Corners */}
                <div className="w-36 h-36 sm:w-44 sm:h-44 relative flex items-center justify-center">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

                  {/* QR Graphic */}
                  <QrCode className="w-20 h-20 sm:w-24 sm:h-24 text-emerald-400/40 animate-pulse" />
                </div>

                <div className="absolute bottom-2 sm:bottom-3 text-center z-20 px-2">
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-900/90 px-2.5 py-0.5 rounded-full border border-slate-700 block truncate">
                    Hold Member QR Pass to Camera
                  </span>
                </div>
              </div>

              {/* Manual Input & Simulation */}
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Enter Member Name or PASS-ID..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleProcessScan()}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleProcessScan()}
                    className="px-3 sm:px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shrink-0 active:scale-95 cursor-pointer"
                  >
                    Verify
                  </button>
                </div>

                {/* Quick Test Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['PASS-8921 (Aarav)', 'PASS-4412 (Rohan)', 'PASS-7731 (Priya)'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleProcessScan(chip.split(' ')[0])}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 transition-all inline-flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                      <span>{chip}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Scan Result Card & Real-time Logs */}
          <div className="lg:col-span-5 space-y-3">
            {/* Scan Approval Flash Card */}
            {scannedResult ? (
              <div className="rounded-xl sm:rounded-2xl border border-emerald-500/40 p-3.5 sm:p-4 bg-white shadow-sm space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ACCESS GRANTED
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-500">{scannedResult.passId}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0">
                    {scannedResult.avatar}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 truncate">{scannedResult.name}</h2>
                    <div className="text-[11px] font-bold text-emerald-600 truncate">{scannedResult.plan}</div>
                    <div className="text-[10px] text-slate-400 truncate">{scannedResult.email}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Coach</span>
                    <span className="font-bold text-slate-800 text-[11px] truncate block">{scannedResult.trainer}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Streak</span>
                    <span className="font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-500" /> {scannedResult.attendanceStreak} Days
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl sm:rounded-2xl border border-slate-200 p-6 text-center text-slate-400 bg-white shadow-sm flex flex-col items-center justify-center">
                <QrCode className="w-8 h-8 text-slate-300 mb-1.5" />
                <div className="text-xs font-bold text-slate-700">Awaiting Access Badge</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Scan a pass or click a test button to verify</p>
              </div>
            )}

            {/* Live Scan Activity Stream */}
            <div className="rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-4 bg-white shadow-sm space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Recent Gate Activity
              </h3>

              <div className="space-y-1.5">
                {recentScans.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {s.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-[11px] truncate">{s.memberName}</div>
                        <div className="text-[9px] text-slate-400 truncate">{s.plan}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {s.status}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-0.5">{s.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= COACH & STAFF SHIFT ROSTER ================= */
        <div className="space-y-3 sm:space-y-6">
          {/* Quick Punch-In Action Bar */}
          <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Record Coach Floor Arrival / Shift Check-In</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Select Coach</label>
                <select
                  value={selectedTrainerToPunch}
                  onChange={(e) => setSelectedTrainerToPunch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Floor Shift</label>
                <select
                  value={punchShift}
                  onChange={(e) => setPunchShift(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Morning (06:00 AM - 02:00 PM)">Morning (06:00 AM - 02:00 PM)</option>
                  <option value="Evening (02:00 PM - 10:00 PM)">Evening (02:00 PM - 10:00 PM)</option>
                  <option value="Full Day (07:00 AM - 04:00 PM)">Full Day (07:00 AM - 04:00 PM)</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    const t = trainers.find((tr) => tr.id === selectedTrainerToPunch) || trainers[0];
                    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    setTrainerAttendance([
                      {
                        id: `trn-${Date.now()}`,
                        trainerId: t.id,
                        trainerName: t.name,
                        specialty: t.specialty,
                        shift: punchShift,
                        checkInTime: now,
                        checkOutTime: '--',
                        status: 'On Duty'
                      },
                      ...trainerAttendance
                    ]);
                    addToast(`Coach ${t.name} marked On Duty!`);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Punch In Coach</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dual View: Mobile Coach Cards & Desktop Table */}
          <div className="block sm:hidden space-y-2">
            {trainerAttendance.map((rec) => {
              const isOnDuty = rec.status === 'On Duty';
              return (
                <div key={rec.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{rec.trainerName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{rec.specialty}</div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold shrink-0 ${
                        isOnDuty
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isOnDuty ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                      <span>{rec.status}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Shift</span>
                      <span className="font-medium text-slate-700 truncate block">{rec.shift}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Punch In / Out</span>
                      <span className="font-semibold text-emerald-700">{rec.checkInTime} → {rec.checkOutTime}</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleTogglePunch(rec.id)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer active:scale-95 ${
                        isOnDuty
                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {isOnDuty ? 'Punch Out' : 'Punch In'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Coaching Staff Attendance Log</h3>
                <p className="text-[11px] text-slate-500">Shift check-in and checkout logs</p>
              </div>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Active On Floor
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-5">Coach</th>
                    <th className="py-3.5 px-5">Shift</th>
                    <th className="py-3.5 px-5">Punch In</th>
                    <th className="py-3.5 px-5">Punch Out</th>
                    <th className="py-3.5 px-5">Duty Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {trainerAttendance.map((rec) => {
                    const isOnDuty = rec.status === 'On Duty';
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-900">{rec.trainerName}</div>
                          <div className="text-[11px] text-slate-400">{rec.specialty}</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{rec.shift}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 font-bold text-emerald-700">{rec.checkInTime}</td>
                        <td className="py-3.5 px-5 font-bold text-amber-700">{rec.checkOutTime}</td>
                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isOnDuty
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => handleTogglePunch(rec.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                              isOnDuty
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {isOnDuty ? 'Punch Out' : 'Punch In'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
