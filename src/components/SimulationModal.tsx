import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Users,
  AlertTriangle,
  Award,
  Clock,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import {
  SIMULATION_PERSONAS,
  SIMULATION_DATES,
  executeAttendanceSimulation,
  resetSimulationData,
} from '../services/simulationService';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onDateSelect?: (dateStr: string) => void;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onDateSelect,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<5 | 10>(10);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleRunSimulation = async () => {
    setIsRunning(true);
    try {
      const res = await executeAttendanceSimulation(selectedDuration);
      if (res.success) {
        onSuccess(
          `Simulasi berhasil! Berhasil membuat ${res.savedDates.length} hari arsip presensi (${res.totalRecords} data kehadiran) di Firebase Firestore.`
        );
        if (onDateSelect && res.savedDates.length > 0) {
          // Switch to first date of simulation
          onDateSelect(res.savedDates[0]);
        }
        onClose();
      } else {
        onSuccess('Simulasi gagal dijalankan. Coba periksa koneksi Firestore.');
      }
    } catch (err: any) {
      onSuccess(`Gagal simulasi: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetData = async () => {
    setIsRunning(true);
    try {
      const count = await resetSimulationData();
      onSuccess(`Seluruh arsip presensi (${count} dokumen tanggal) berhasil dibersihkan dari Firebase.`);
      setShowConfirmReset(false);
      onClose();
    } catch (err: any) {
      onSuccess(`Gagal reset: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-linear-to-r from-amber-500/10 via-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Simulasi Data Presensi Multi-Hari
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Uji Algoritma Ranking
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate dataset kehadiran presensi multi-hari ke Firebase Firestore untuk memverifikasi akurasi ranking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-600 dark:text-slate-300">
          {/* Duration Selector */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-900 dark:text-white block">
              Pilih Durasi Simulasi Presensi:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedDuration(10)}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedDuration === 10
                    ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">10 Hari Kerja (Rekomendasi)</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  2 minggu penuh (5 - 16 Okt 2026), 130 catatan presensi. Ideal untuk melihat konsistensi juara disiplin vs keterlambatan akumulatif.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDuration(5)}
                className={`p-3 rounded-xl border text-left transition ${
                  selectedDuration === 5
                    ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">5 Hari Kerja (1 Minggu)</span>
                  <Calendar className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  1 minggu kerja (5 - 9 Okt 2026), 65 catatan presensi. Simulasi cepat untuk evaluasi mingguan.
                </p>
              </button>
            </div>
          </div>

          {/* Persona Profiles Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                13 Karakter & Profil Karyawan Yang Disimulasikan:
              </span>
              <span className="text-[11px] text-slate-400">Sesuai konteks sekolah / yayasan</span>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
              {SIMULATION_PERSONAS.map((p, idx) => (
                <div key={p.employeeId} className="p-2.5 flex items-start justify-between gap-3 text-[11px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[10px]">#{idx + 1}</span>
                      <strong className="text-slate-900 dark:text-white">{p.name}</strong>
                      <span className="text-slate-500">({p.jobPosition})</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">
                      {p.description}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.behavior === 'champion'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                        : p.behavior === 'runner_up' || p.behavior === 'diligent'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                        : p.behavior === 'sick_leave'
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                        : p.behavior === 'occasional_late'
                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                        : p.behavior === 'frequent_late'
                        ? 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300'
                        : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {p.behavior === 'champion'
                      ? 'Juara #1 Pagi'
                      : p.behavior === 'runner_up'
                      ? 'Juara #2'
                      : p.behavior === 'diligent'
                      ? 'Disiplin Tinggi'
                      : p.behavior === 'sick_leave'
                      ? 'Sakit Berizin'
                      : p.behavior === 'occasional_late'
                      ? 'Telat Ringan 1x'
                      : p.behavior === 'frequent_late'
                      ? 'Sering Telat'
                      : 'Indisipliner & Alpha'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation Box */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-900 dark:text-emerald-200">
              <span className="font-semibold block mb-0.5">Langsung Tersimpan di Cloud Firestore</span>
              Hasil simulasi langsung masuk ke database real-time Firebase. Anda dapat berpindah tab antara <strong>Presensi Harian</strong> (memilih tanggal 5 s/d 16 Oktober 2026), <strong>Karyawan Terdisiplin</strong> (skop Harian vs Bulanan), serta <strong>Rekap Bulanan</strong>.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            {!showConfirmReset ? (
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                disabled={isRunning}
                className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Bersihkan / Kosongkan Data Database</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-rose-600 font-bold">Hapus semua arsip?</span>
                <button
                  type="button"
                  onClick={handleResetData}
                  disabled={isRunning}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                >
                  Ya, Hapus Semua
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px]"
                >
                  Batal
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isRunning}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses Simulasi...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Jalankan Simulasi ({selectedDuration} Hari)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
