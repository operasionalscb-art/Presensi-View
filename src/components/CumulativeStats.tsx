import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
} from 'lucide-react';
import { EmployeeRecord } from '../types/attendance';

interface CumulativeStatsProps {
  employees: EmployeeRecord[];
  activeDateText: string;
}

export const CumulativeStats: React.FC<CumulativeStatsProps> = ({
  employees,
}) => {
  const total = employees.length;

  const hadirList = employees.filter((e) => e.normalizedStatus === 'hadir');
  const telatList = employees.filter((e) => e.normalizedStatus === 'telat');
  const izinList = employees.filter((e) => e.normalizedStatus === 'izin');
  const sakitList = employees.filter((e) => e.normalizedStatus === 'sakit');
  const cutiList = employees.filter((e) => e.normalizedStatus === 'cuti');
  const alphaList = employees.filter((e) => e.normalizedStatus === 'alpha');

  const totalHadir = hadirList.length;
  const totalTelat = telatList.length;
  const totalTidakMasuk = izinList.length + sakitList.length + cutiList.length + alphaList.length;

  const onTimePercent = total > 0 ? Math.round((totalHadir / total) * 100) : 0;
  const latePercent = total > 0 ? Math.round((totalTelat / total) * 100) : 0;
  const absentPercent = total > 0 ? Math.round((totalTidakMasuk / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Karyawan */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
          <span className="text-xs font-medium">Total Karyawan</span>
          <Users className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {total}
          </span>
          <span className="text-xs text-slate-500">orang</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">Data terdaftar aktif</p>
      </div>

      {/* 2. Hadir Tepat Waktu (Kumulatif, tanpa nama) */}
      <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 mb-2">
          <span className="text-xs font-semibold">Hadir Tepat Waktu</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">
            {totalHadir}
          </span>
          <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">
            ({onTimePercent}%)
          </span>
        </div>
        <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-1.5">
          Kumulatif (nama tidak ditampilkan)
        </p>
      </div>

      {/* 3. Karyawan Telat */}
      <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 mb-2">
          <span className="text-xs font-semibold">Karyawan Telat</span>
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400">
            {totalTelat}
          </span>
          <span className="text-xs font-medium text-amber-800 dark:text-amber-400">
            ({latePercent}%)
          </span>
        </div>
        <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1.5">
          Lihat daftar nama di bawah
        </p>
      </div>

      {/* 4. Tidak Masuk (Izin, Sakit, Cuti, Alpha) */}
      <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 mb-2">
          <span className="text-xs font-semibold">Tidak Masuk</span>
          <UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400">
            {totalTidakMasuk}
          </span>
          <span className="text-xs font-medium text-rose-800 dark:text-rose-400">
            ({absentPercent}%)
          </span>
        </div>
        <p className="text-[11px] text-rose-800 dark:text-rose-400 mt-1.5">
          Izin: {izinList.length} • Sakit: {sakitList.length} • Cuti: {cutiList.length}
        </p>
      </div>
    </div>
  );
};
