import React, { useState, useMemo } from 'react';
import {
  Clock,
  FileText,
  HeartPulse,
  CalendarCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Users,
  Briefcase,
} from 'lucide-react';
import { EmployeeRecord, NormalizedStatus } from '../types/attendance';

export type EmployeeListTab = 'all' | 'hadir' | 'telat' | 'izin' | 'sakit' | 'cuti' | 'alpha';

interface AbsenceAndLateListsProps {
  employees: EmployeeRecord[];
  activeTab?: EmployeeListTab;
  onTabChange?: (tab: EmployeeListTab) => void;
}

export const AbsenceAndLateLists: React.FC<AbsenceAndLateListsProps> = ({
  employees,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<EmployeeListTab>('all');
  const [search, setSearch] = useState('');

  const currentTab = controlledTab !== undefined ? controlledTab : internalTab;

  const handleTabClick = (tab: EmployeeListTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const counts = useMemo(() => {
    return {
      all: employees.length,
      hadir: employees.filter((r) => r.normalizedStatus === 'hadir').length,
      telat: employees.filter((r) => r.normalizedStatus === 'telat').length,
      izin: employees.filter((r) => r.normalizedStatus === 'izin').length,
      sakit: employees.filter((r) => r.normalizedStatus === 'sakit').length,
      cuti: employees.filter((r) => r.normalizedStatus === 'cuti').length,
      alpha: employees.filter((r) => r.normalizedStatus === 'alpha').length,
    };
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((r) => {
      if (currentTab !== 'all' && r.normalizedStatus !== currentTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q) ||
          r.jobPosition.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q) ||
          r.keterangan.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, currentTab, search]);

  const renderBadge = (status: NormalizedStatus, lateMin?: number) => {
    switch (status) {
      case 'hadir':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Hadir Tepat Waktu</span>
          </span>
        );
      case 'telat':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Telat {lateMin ? `(${lateMin} mnt)` : ''}</span>
          </span>
        );
      case 'izin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            <span>Izin</span>
          </span>
        );
      case 'sakit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
            <span>Sakit</span>
          </span>
        );
      case 'cuti':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
            <CalendarCheck className="w-3.5 h-3.5 text-purple-500" />
            <span>Cuti</span>
          </span>
        );
      case 'alpha':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Alpha</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Lainnya
          </span>
        );
    }
  };

  return (
    <div id="daftar-karyawan-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Header with Title and Search */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Daftar Presensi Karyawan ({filtered.length} dari {employees.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rincian kehadiran tepat waktu, keterlambatan, serta izin/sakit/cuti
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, NIK, jabatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50/50 dark:bg-slate-800/20 gap-1.5 overflow-x-auto text-xs py-1">
        {/* Tab Semua */}
        <button
          onClick={() => handleTabClick('all')}
          className={`py-1.5 px-3 font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Semua ({counts.all})</span>
        </button>

        {/* Tab Hadir Tepat Waktu */}
        <button
          onClick={() => handleTabClick('hadir')}
          className={`py-1.5 px-3 font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'hadir'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Hadir Tepat Waktu ({counts.hadir})</span>
        </button>

        {/* Tab Telat */}
        <button
          onClick={() => handleTabClick('telat')}
          className={`py-1.5 px-3 font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'telat'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Telat ({counts.telat})</span>
        </button>

        {/* Tab Izin */}
        <button
          onClick={() => handleTabClick('izin')}
          className={`py-1.5 px-3 font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'izin'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Izin ({counts.izin})</span>
        </button>

        {/* Tab Sakit */}
        <button
          onClick={() => handleTabClick('sakit')}
          className={`py-1.5 px-3 font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'sakit'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5" />
          <span>Sakit ({counts.sakit})</span>
        </button>

        {/* Tab Cuti */}
        <button
          onClick={() => handleTabClick('cuti')}
          className={`py-1.5 px-3 font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'cuti'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Cuti ({counts.cuti})</span>
        </button>

        {/* Tab Alpha if any */}
        {counts.alpha > 0 && (
          <button
            onClick={() => handleTabClick('alpha')}
            className={`py-1.5 px-3 font-semibold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
              currentTab === 'alpha'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Alpha ({counts.alpha})</span>
          </button>
        )}
      </div>

      {/* Clean Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5" />
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Tidak ada data pada kategori ini.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Gunakan tab filter lain atau ubah kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">No</th>
                <th className="py-2.5 px-4">Nama Karyawan</th>
                <th className="py-2.5 px-4">Jabatan & Departemen</th>
                <th className="py-2.5 px-4">Status Presensi</th>
                <th className="py-2.5 px-4">Keterangan / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item, idx) => (
                <tr
                  key={`${item.employeeId}-${idx}`}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-2.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>{item.name}</span>
                    </div>
                    <span className="block text-[11px] font-normal text-slate-400 font-mono">
                      ID: {item.employeeId}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{item.jobPosition}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 pl-4.5">
                      {item.department}{item.branch ? ` • ${item.branch}` : ''}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    {renderBadge(item.normalizedStatus, item.lateMinutes)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    {item.keterangan ? (
                      <span>{item.keterangan}</span>
                    ) : item.normalizedStatus === 'hadir' ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Tepat Waktu
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">-</span>
                    )}
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
