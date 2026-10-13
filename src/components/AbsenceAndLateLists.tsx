import React, { useState, useMemo } from 'react';
import {
  Clock,
  FileText,
  HeartPulse,
  CalendarCheck,
  ShieldAlert,
  Search,
} from 'lucide-react';
import { EmployeeRecord, NormalizedStatus } from '../types/attendance';

interface AbsenceAndLateListsProps {
  employees: EmployeeRecord[];
}

type TabType = 'all' | 'telat' | 'izin' | 'sakit' | 'cuti';

export const AbsenceAndLateLists: React.FC<AbsenceAndLateListsProps> = ({ employees }) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [search, setSearch] = useState('');

  // Only employees who are late or absent (no on-time names, as instructed)
  const records = useMemo(() => {
    return employees.filter((e) => e.normalizedStatus !== 'hadir');
  }, [employees]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (activeTab !== 'all' && r.normalizedStatus !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.jobPosition.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.keterangan.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, activeTab, search]);

  const counts = {
    all: records.length,
    telat: records.filter((r) => r.normalizedStatus === 'telat').length,
    izin: records.filter((r) => r.normalizedStatus === 'izin').length,
    sakit: records.filter((r) => r.normalizedStatus === 'sakit').length,
    cuti: records.filter((r) => r.normalizedStatus === 'cuti').length,
  };

  const renderBadge = (status: NormalizedStatus, lateMin?: number) => {
    switch (status) {
      case 'telat':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <Clock className="w-3 h-3" />
            <span>Telat {lateMin ? `(${lateMin} mnt)` : ''}</span>
          </span>
        );
      case 'izin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <FileText className="w-3 h-3" />
            <span>Izin</span>
          </span>
        );
      case 'sakit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
            <HeartPulse className="w-3 h-3" />
            <span>Sakit</span>
          </span>
        );
      case 'cuti':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            <CalendarCheck className="w-3 h-3" />
            <span>Cuti</span>
          </span>
        );
      case 'alpha':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
            <ShieldAlert className="w-3 h-3" />
            <span>Alpha</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            Lainnya
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Header with Search */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Daftar Karyawan Telat & Tidak Masuk ({records.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rincian nama dan alasan ketidakhadiran / keterlambatan
          </p>
        </div>

        {/* Simple Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau alasan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50/50 dark:bg-slate-800/20 gap-1 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-2 px-3 font-semibold border-b-2 transition ${
            activeTab === 'all'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Semua ({counts.all})
        </button>
        <button
          onClick={() => setActiveTab('telat')}
          className={`py-2 px-3 font-semibold border-b-2 transition ${
            activeTab === 'telat'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Telat ({counts.telat})
        </button>
        <button
          onClick={() => setActiveTab('izin')}
          className={`py-2 px-3 font-semibold border-b-2 transition ${
            activeTab === 'izin'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Izin ({counts.izin})
        </button>
        <button
          onClick={() => setActiveTab('sakit')}
          className={`py-2 px-3 font-semibold border-b-2 transition ${
            activeTab === 'sakit'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Sakit ({counts.sakit})
        </button>
        <button
          onClick={() => setActiveTab('cuti')}
          className={`py-2 px-3 font-semibold border-b-2 transition ${
            activeTab === 'cuti'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cuti ({counts.cuti})
        </button>
      </div>

      {/* Clean Table */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Tidak ada data pada kategori ini.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Nama Karyawan</th>
                <th className="py-2.5 px-4">Jabatan & Departemen</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Keterangan Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item, idx) => (
                <tr key={`${item.employeeId}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {item.name}
                    <span className="block text-[11px] font-normal text-slate-400 font-mono">
                      ID: {item.employeeId}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    <div>{item.jobPosition}</div>
                    <div className="text-[11px] text-slate-400">{item.department} • {item.branch}</div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {renderBadge(item.normalizedStatus, item.lateMinutes)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    {item.keterangan || <span className="text-slate-400 italic">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
