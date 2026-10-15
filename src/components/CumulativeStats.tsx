import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  ArrowRight,
} from 'lucide-react';
import { EmployeeRecord } from '../types/attendance';
import { EmployeeListTab } from './AbsenceAndLateLists';

interface CumulativeStatsProps {
  employees: EmployeeRecord[];
  activeDateText: string;
  activeFilter?: EmployeeListTab;
  onSelectFilter?: (filter: EmployeeListTab) => void;
}

export const CumulativeStats: React.FC<CumulativeStatsProps> = ({
  employees,
  activeFilter,
  onSelectFilter,
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
      <button
        type="button"
        onClick={() => onSelectFilter?.('all')}
        className={`text-left bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs transition-all hover:shadow-md cursor-pointer ${
          activeFilter === 'all'
            ? 'border-slate-800 dark:border-slate-200 ring-2 ring-slate-400/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-2">
          <span className="text-xs font-semibold">Total Karyawan</span>
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {total}
          </span>
          <span className="text-xs text-slate-500">orang</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
          <span>Semua karyawan</span>
          <ArrowRight className="w-3 h-3 opacity-60" />
        </div>
      </button>

      {/* 2. Hadir Tepat Waktu */}
      <button
        type="button"
        onClick={() => onSelectFilter?.('hadir')}
        className={`text-left bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs transition-all hover:shadow-md cursor-pointer ${
          activeFilter === 'hadir'
            ? 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
            : 'border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-400 dark:hover:border-emerald-700'
        }`}
      >
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-2">
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Hadir Tepat Waktu</span>
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalHadir}
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
            {onTimePercent}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-2">
          <span>Lihat daftar hadir ({totalHadir})</span>
          <ArrowRight className="w-3 h-3 opacity-80" />
        </div>
      </button>

      {/* 3. Karyawan Telat */}
      <button
        type="button"
        onClick={() => onSelectFilter?.('telat')}
        className={`text-left bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs transition-all hover:shadow-md cursor-pointer ${
          activeFilter === 'telat'
            ? 'border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
            : 'border-amber-200 dark:border-amber-800/80 hover:border-amber-400 dark:hover:border-amber-700'
        }`}
      >
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-2">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Karyawan Telat</span>
          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {totalTelat}
          </span>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
            {latePercent}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-2">
          <span>Lihat daftar telat ({totalTelat})</span>
          <ArrowRight className="w-3 h-3 opacity-80" />
        </div>
      </button>

      {/* 4. Tidak Masuk (Izin, Sakit, Cuti, Alpha) */}
      <button
        type="button"
        onClick={() => onSelectFilter?.('izin')}
        className={`text-left bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs transition-all hover:shadow-md cursor-pointer ${
          activeFilter === 'izin' || activeFilter === 'sakit' || activeFilter === 'cuti' || activeFilter === 'alpha'
            ? 'border-rose-500 dark:border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
            : 'border-rose-200 dark:border-rose-800/80 hover:border-rose-400 dark:hover:border-rose-700'
        }`}
      >
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-2">
          <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">Tidak Masuk</span>
          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <UserX className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400">
            {totalTidakMasuk}
          </span>
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
            {absentPercent}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
          <span>I:{izinList.length} • S:{sakitList.length} • C:{cutiList.length}</span>
          <ArrowRight className="w-3 h-3 opacity-60" />
        </div>
      </button>
    </div>
  );
};
