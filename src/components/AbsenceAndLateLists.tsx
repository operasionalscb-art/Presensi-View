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
  Building2,
  Calendar,
  Download,
  Filter,
  ArrowUpDown,
  Table as TableIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { EmployeeRecord, NormalizedStatus } from '../types/attendance';
import * as XLSX from 'xlsx';

export type EmployeeListTab = 'all' | 'hadir' | 'telat' | 'izin' | 'sakit' | 'cuti' | 'alpha';

interface AbsenceAndLateListsProps {
  employees: EmployeeRecord[];
  activeTab?: EmployeeListTab;
  onTabChange?: (tab: EmployeeListTab) => void;
  activeDateText?: string;
}

export const AbsenceAndLateLists: React.FC<AbsenceAndLateListsProps> = ({
  employees,
  activeTab: controlledTab,
  onTabChange,
  activeDateText,
}) => {
  const [internalTab, setInternalTab] = useState<EmployeeListTab>('all');
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [denseView, setDenseView] = useState<boolean>(false);

  const currentTab = controlledTab !== undefined ? controlledTab : internalTab;

  const handleTabClick = (tab: EmployeeListTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
    setCurrentPage(1);
  };

  // Unique branches and departments
  const { branches, departments } = useMemo(() => {
    const bSet = new Set<string>();
    const dSet = new Set<string>();
    employees.forEach((e) => {
      if (e.branch) bSet.add(e.branch);
      if (e.department) dSet.add(e.department);
    });
    return {
      branches: Array.from(bSet).sort(),
      departments: Array.from(dSet).sort(),
    };
  }, [employees]);

  // Status counts
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

  // Filtered & Sorted Records
  const filteredAndSorted = useMemo(() => {
    let list = employees.filter((r) => {
      if (currentTab !== 'all' && r.normalizedStatus !== currentTab) return false;
      if (selectedBranch !== 'all' && r.branch !== selectedBranch) return false;
      if (selectedDept !== 'all' && r.department !== selectedDept) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q) ||
          r.jobPosition.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q) ||
          (r.shift && r.shift.toLowerCase().includes(q)) ||
          r.keterangan.toLowerCase().includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      let valA: any = a[sortField as keyof EmployeeRecord] ?? '';
      let valB: any = b[sortField as keyof EmployeeRecord] ?? '';

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [employees, currentTab, selectedBranch, selectedDept, search, sortField, sortDirection]);

  // Paginated list
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderBadge = (status: NormalizedStatus, lateMin?: number, rawCode?: string) => {
    switch (status) {
      case 'hadir':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Hadir {rawCode ? `(${rawCode})` : ''}</span>
          </span>
        );
      case 'telat':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Telat {lateMin ? `(${lateMin} mnt)` : ''}</span>
          </span>
        );
      case 'izin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
            <FileText className="w-3 h-3 text-sky-500" />
            <span>Izin</span>
          </span>
        );
      case 'sakit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
            <HeartPulse className="w-3 h-3 text-rose-500" />
            <span>Sakit</span>
          </span>
        );
      case 'cuti':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
            <CalendarCheck className="w-3 h-3 text-purple-500" />
            <span>Cuti</span>
          </span>
        );
      case 'alpha':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
            <ShieldAlert className="w-3 h-3 text-red-500" />
            <span>Alpha</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {rawCode || 'Lainnya'}
          </span>
        );
    }
  };

  // Export Table to Excel
  const handleExportExcel = () => {
    const exportRows = filteredAndSorted.map((e, idx) => ({
      'No': idx + 1,
      'Employee ID': e.employeeId,
      'Full Name': e.name,
      'Date': e.date || activeDateText || '-',
      'Shift': e.shift || '-',
      'Schedule In': e.scheduleIn || '07:00',
      'Schedule Out': e.scheduleOut || '16:00',
      'Attendance Code': e.rawStatus || (e.normalizedStatus === 'hadir' ? 'H' : e.normalizedStatus.toUpperCase()),
      'Check In': e.checkIn || '-',
      'Check Out': e.checkOut || '-',
      'Branch': e.branch || 'Pusat',
      'Organization': e.department || 'Sekolah',
      'Job Position': e.jobPosition || 'Staff',
      'Job Level': e.jobLevel || 'Staff',
      'Employment Status': e.employmentStatus || 'Contract',
      'Join Date': e.joinDate || '-',
      'Terlambat (Menit)': e.lateMinutes || 0,
      'Keterangan': e.keterangan || (e.normalizedStatus === 'hadir' ? 'Tepat Waktu' : '-'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presensi Karyawan');
    XLSX.writeFile(wb, `Presensi_Karyawan_${currentTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div id="daftar-karyawan-section" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Header with Title and Search */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Tabel Presensi Harian Karyawan ({filteredAndSorted.length} dari {employees.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Format tabel lengkap sesuai standar: Shift, Jadwal Masuk/Keluar, Scan Check-In/Out, Organisasi, dan Keterangan
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDenseView((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{denseView ? 'Tampilan Lengkap' : 'Tampilan Kompak'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={filteredAndSorted.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar: Branches, Depts, Search */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {branches.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                <Building2 className="w-3 h-3 text-slate-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs"
                >
                  <option value="all">Semua Cabang</option>
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {departments.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                <Briefcase className="w-3 h-3 text-slate-400" />
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs"
                >
                  <option value="all">Semua Organisasi / Dept</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NIK, jabatan, cabang..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50/60 dark:bg-slate-800/20 gap-1.5 overflow-x-auto text-xs py-1.5">
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

      {/* Main Table Matching User Image Columns */}
      {filteredAndSorted.length === 0 ? (
        <div className="py-14 text-center text-xs text-slate-400">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5" />
          </div>
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Tidak ada data presensi pada kategori/filter ini.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Gunakan tab filter lain atau reset kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] tracking-wide uppercase">
              <tr>
                <th className="py-3 px-3 text-center w-12 border-r border-slate-200/60 dark:border-slate-800">
                  <button onClick={() => handleSort('no')} className="flex items-center gap-1 mx-auto hover:text-emerald-600">
                    <span>No</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                  <button onClick={() => handleSort('employeeId')} className="flex items-center gap-1 hover:text-emerald-600">
                    <span>Employee ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800 min-w-[180px]">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-emerald-600">
                    <span>Full Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                {!denseView && (
                  <th className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                    Date*
                  </th>
                )}
                {!denseView && (
                  <th className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                    Shift
                  </th>
                )}
                <th className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap bg-slate-100/50 dark:bg-slate-800/40">
                  Schedule In
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap bg-slate-100/50 dark:bg-slate-800/40">
                  Schedule Out
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap text-center">
                  Attendan / Status
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap bg-emerald-50/40 dark:bg-emerald-950/20">
                  <button onClick={() => handleSort('checkIn')} className="flex items-center gap-1 mx-auto hover:text-emerald-600">
                    <span>Check In</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap bg-emerald-50/40 dark:bg-emerald-950/20">
                  Check Out
                </th>
                <th className="py-3 px-3 text-center border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                  <button onClick={() => handleSort('lateMinutes')} className="flex items-center gap-1 mx-auto hover:text-emerald-600">
                    <span>Terlambat</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                  Branch
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                  Organizat / Dept
                </th>
                <th className="py-3 px-3.5 border-r border-slate-200/60 dark:border-slate-800 min-w-[150px]">
                  Job Position
                </th>
                {!denseView && (
                  <th className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                    Job Level
                  </th>
                )}
                {!denseView && (
                  <th className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                    Employm
                  </th>
                )}
                {!denseView && (
                  <th className="py-3 px-3 border-r border-slate-200/60 dark:border-slate-800 whitespace-nowrap">
                    Join Date
                  </th>
                )}
                <th className="py-3 px-3.5 whitespace-nowrap">
                  Keterangan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedList.map((item, idx) => {
                const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                const isLate = item.normalizedStatus === 'telat';
                const isOnTime = item.normalizedStatus === 'hadir';

                return (
                  <tr
                    key={`${item.employeeId}-${idx}`}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isLate
                        ? 'bg-amber-50/20 dark:bg-amber-950/10'
                        : ''
                    }`}
                  >
                    {/* No */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px] border-r border-slate-100 dark:border-slate-800/60">
                      {globalIdx}
                    </td>

                    {/* Employee ID */}
                    <td className="py-2.5 px-3.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                      {item.employeeId}
                    </td>

                    {/* Full Name */}
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <span>{item.name}</span>
                      </div>
                    </td>

                    {/* Date */}
                    {!denseView && (
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                        {item.date || '-'}
                      </td>
                    )}

                    {/* Shift */}
                    {!denseView && (
                      <td className="py-2.5 px-3 text-center font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px]">
                          {item.shift || 'Guru'}
                        </span>
                      </td>
                    )}

                    {/* Schedule In */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                      {item.scheduleIn || '07:00'}
                    </td>

                    {/* Schedule Out */}
                    <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                      {item.scheduleOut || '16:00'}
                    </td>

                    {/* Attendance Code / Status Badge */}
                    <td className="py-2.5 px-3.5 text-center border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                      {renderBadge(item.normalizedStatus, item.lateMinutes, item.rawStatus)}
                    </td>

                    {/* Check In (Scan Masuk) */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                      {item.checkIn ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                            isLate
                              ? 'text-amber-700 bg-amber-100/70 dark:text-amber-300 dark:bg-amber-950/60'
                              : isOnTime
                              ? 'text-emerald-700 bg-emerald-100/70 dark:text-emerald-300 dark:bg-emerald-950/60'
                              : 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {item.checkIn}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>

                    {/* Check Out (Scan Pulang) */}
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-[11px]">
                      {item.checkOut || '-'}
                    </td>

                    {/* Terlambat (Late Minutes) */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                      {item.lateMinutes && item.lateMinutes > 0 ? (
                        <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded text-[11px]">
                          {item.lateMinutes} mnt
                        </span>
                      ) : isOnTime ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          0 mnt
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>

                    {/* Branch */}
                    <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                      {item.branch || 'Pusat'}
                    </td>

                    {/* Organization / Dept */}
                    <td className="py-2.5 px-3.5 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                      {item.department || 'Sekolah'}
                    </td>

                    {/* Job Position */}
                    <td className="py-2.5 px-3.5 text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-800/60">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-medium">{item.jobPosition}</span>
                      </div>
                    </td>

                    {/* Job Level */}
                    {!denseView && (
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-[11px]">
                        {item.jobLevel || 'Staff'}
                      </td>
                    )}

                    {/* Employment Status */}
                    {!denseView && (
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold">
                          {item.employmentStatus || 'Contract'}
                        </span>
                      </td>
                    )}

                    {/* Join Date */}
                    {!denseView && (
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 border-r border-slate-100 dark:border-slate-800/60 whitespace-nowrap">
                        {item.joinDate || '-'}
                      </td>
                    )}

                    {/* Keterangan */}
                    <td className="py-2.5 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.keterangan ? (
                        <span>{item.keterangan}</span>
                      ) : isOnTime ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Tepat Waktu
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredAndSorted.length > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Menampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value={20}>20 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
              <option value={500}>Semua</option>
            </select>
            <span>dari {filteredAndSorted.length} baris data</span>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Sebelumnya
              </button>
              <span className="px-2 py-1 font-semibold text-slate-700 dark:text-slate-300">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 transition"
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
