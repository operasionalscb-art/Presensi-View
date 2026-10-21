import React, { useState } from 'react';
import { X, PlusCircle, Check, AlertCircle, Clock, Building, User } from 'lucide-react';
import { EmployeeRecord, NormalizedStatus } from '../types/attendance';
import { normalizeAttendanceStatus, extractLateMinutes } from '../services/dataParser';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (record: EmployeeRecord) => void;
  currentCount: number;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  onAddEmployee,
  currentCount,
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Sekolah');
  const [branch, setBranch] = useState('Pusat');
  const [jobPosition, setJobPosition] = useState('');
  const [jobLevel, setJobLevel] = useState('Staff');
  const [joinDate, setJoinDate] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('Contract');
  const [shift, setShift] = useState('Guru');
  const [scheduleIn, setScheduleIn] = useState('07:00');
  const [scheduleOut, setScheduleOut] = useState('16:00');
  const [checkIn, setCheckIn] = useState('06:50');
  const [checkOut, setCheckOut] = useState('16:00');
  const [statusCode, setStatusCode] = useState<'H' | 'H/LI/NCO' | 'I' | 'S' | 'C' | 'A' | 'SHIFT'>('H');
  const [keterangan, setKeterangan] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStatusChange = (val: 'H' | 'H/LI/NCO' | 'I' | 'S' | 'C' | 'A' | 'SHIFT') => {
    setStatusCode(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama karyawan wajib diisi.');
      return;
    }
    if (!employeeId.trim()) {
      setErrorMsg('Employee ID wajib diisi.');
      return;
    }

    const rawStatus = statusCode === 'SHIFT' ? '' : statusCode;
    let normalizedStatus: NormalizedStatus = normalizeAttendanceStatus(rawStatus, keterangan);
    let lateMinutes = extractLateMinutes(keterangan);

    // Calculate late minutes from times if present
    if (checkIn && scheduleIn) {
      const matchIn = checkIn.match(/(\d{1,2})[:.](\d{2})/);
      const matchSched = scheduleIn.match(/(\d{1,2})[:.](\d{2})/);
      if (matchIn && matchSched) {
        const inMins = parseInt(matchIn[1], 10) * 60 + parseInt(matchIn[2], 10);
        const schedMins = parseInt(matchSched[1], 10) * 60 + parseInt(matchSched[2], 10);
        const diff = inMins - schedMins;
        if (diff > 0) {
          lateMinutes = diff;
          if (normalizedStatus === 'hadir') {
            normalizedStatus = 'telat';
          }
        }
      }
    }

    const finalKet = keterangan.trim() || (lateMinutes && lateMinutes > 0 ? `Telat ${lateMinutes} menit` : normalizedStatus === 'hadir' ? 'Tepat Waktu' : '');

    const newRecord: EmployeeRecord = {
      no: currentCount + 1,
      employeeId: employeeId.trim(),
      name: name.trim(),
      shift: shift.trim() || 'Guru',
      scheduleIn: scheduleIn.trim() || '07:00',
      scheduleOut: scheduleOut.trim() || '16:00',
      checkIn: checkIn.trim() || undefined,
      checkOut: checkOut.trim() || undefined,
      department: department.trim(),
      branch: branch.trim(),
      jobPosition: jobPosition.trim() || 'Staff',
      jobLevel: jobLevel.trim(),
      joinDate: joinDate.trim() || '-',
      employmentStatus: employmentStatus.trim(),
      rawStatus,
      normalizedStatus,
      keterangan: finalKet,
      lateMinutes,
    };

    onAddEmployee(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Input Data Presensi Baru
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Simulasikan update live otomatis pada dashboard & grafik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="18.0432"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Lengkap Karyawan
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Hendra Wijaya"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Departemen
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="Sekolah">Sekolah</option>
                <option value="Asrama">Asrama</option>
                <option value="Keuangan">Keuangan</option>
                <option value="Tata Usaha">Tata Usaha</option>
                <option value="Keamanan">Keamanan</option>
                <option value="IT & Media">IT & Media</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jabatan / Posisi
              </label>
              <input
                type="text"
                value={jobPosition}
                onChange={(e) => setJobPosition(e.target.value)}
                placeholder="Guru Biologi / Staff"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Job Level
              </label>
              <select
                value={jobLevel}
                onChange={(e) => setJobLevel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="Staff">Staff</option>
                <option value="Middle Manager">Middle Manager</option>
                <option value="Top Manager">Top Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status Kerja
              </label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="Contract">Contract</option>
                <option value="Permanent">Permanent</option>
              </select>
            </div>
          </div>

          {/* Shift & Time Details */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Shift
              </label>
              <input
                type="text"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                placeholder="Guru / Pembina"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jadwal Masuk
              </label>
              <input
                type="text"
                value={scheduleIn}
                onChange={(e) => setScheduleIn(e.target.value)}
                placeholder="07:00"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jadwal Keluar
              </label>
              <input
                type="text"
                value={scheduleOut}
                onChange={(e) => setScheduleOut(e.target.value)}
                placeholder="16:00"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Scan Masuk (Check-In)
              </label>
              <input
                type="text"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                placeholder="06:50"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Scan Pulang (Check-Out)
              </label>
              <input
                type="text"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                placeholder="16:00"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none font-mono"
              />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Status Presensi Hari Ini
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('H')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition ${
                  statusCode === 'H'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Hadir (H)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('H/LI/NCO')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition ${
                  statusCode === 'H/LI/NCO'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Telat (H/LI/NCO)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('I')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition ${
                  statusCode === 'I'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Izin (I)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('S')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition ${
                  statusCode === 'S'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Sakit (S)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('C')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition ${
                  statusCode === 'C'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Cuti (C)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('A')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition ${
                  statusCode === 'A'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Alpha (A)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('SHIFT')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border text-center transition ${
                  statusCode === 'SHIFT'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Shift Sore
              </button>
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Keterangan Alasan
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Telat 30 menit, Sakit tipes (surat dokter), Cuti tahunan"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Simpan & Perbarui Dashboard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
