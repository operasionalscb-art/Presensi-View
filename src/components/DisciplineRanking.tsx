import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Download,
  Flame,
  Star,
  Users,
  Briefcase,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { EmployeeRecord, EmployeeDisciplineRank } from '../types/attendance';
import { StoredDayRecord } from '../services/storageService';
import * as XLSX from 'xlsx';

interface DisciplineRankingProps {
  currentDayEmployees: EmployeeRecord[];
  allDailyRecords: Record<string, StoredDayRecord>;
  activeDateText: string;
  monthName: string;
  year: number;
  monthNumber: number;
}

export type RankingScope = 'harian' | 'bulanan' | 'semua';

export const DisciplineRanking: React.FC<DisciplineRankingProps> = ({
  currentDayEmployees,
  allDailyRecords,
  activeDateText,
  monthName,
  year,
  monthNumber,
}) => {
  const [scope, setScope] = useState<RankingScope>('harian');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Convert time string "HH:MM" to minutes from midnight
  const timeToMinutes = (timeStr?: string): number => {
    if (!timeStr || timeStr === '-') return 9999;
    const m = timeStr.match(/(\d{1,2})[:.](\d{2})/);
    if (!m) return 9999;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };

  // Format minutes from midnight to "HH:MM"
  const minutesToTime = (mins: number): string => {
    if (mins >= 9999 || mins < 0) return '-';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Compute monthly historical track record for tie-breaking when daily checkIn times are not recorded
  const monthlyTrackRecord = useMemo(() => {
    const recordMap: Record<string, { onTime: number; lateMins: number; totalDays: number; lateCount: number }> = {};
    Object.entries(allDailyRecords).forEach(([dateStr, rec]) => {
      if (!rec.employees) return;
      const parts = dateStr.split('-');
      const y = rec.year || parseInt(parts[0], 10);
      const m = rec.month || parseInt(parts[1], 10);
      if (y === year && m === monthNumber) {
        rec.employees.forEach((e) => {
          const key = e.employeeId || e.name;
          if (!recordMap[key]) {
            recordMap[key] = { onTime: 0, lateMins: 0, totalDays: 0, lateCount: 0 };
          }
          recordMap[key].totalDays += 1;
          if (e.normalizedStatus === 'hadir') {
            recordMap[key].onTime += 1;
          } else if (e.normalizedStatus === 'telat') {
            recordMap[key].lateCount += 1;
            recordMap[key].lateMins += e.lateMinutes || 0;
          }
        });
      }
    });
    return recordMap;
  }, [allDailyRecords, year, monthNumber]);

  // Compute ranking based on selected scope
  const rankedList: EmployeeDisciplineRank[] = useMemo(() => {
    if (scope === 'harian') {
      // DAILY RANKING: From current active date records
      if (!currentDayEmployees || currentDayEmployees.length === 0) return [];

      const hasRealCheckInTimes = currentDayEmployees.some(
        (e) => e.checkIn && e.checkIn !== '-' && e.checkIn.trim() !== ''
      );

      const list = currentDayEmployees.map((emp) => {
        const isHadir = emp.normalizedStatus === 'hadir';
        const isTelat = emp.normalizedStatus === 'telat';
        const lateMins = emp.lateMinutes || 0;
        const checkInMins = timeToMinutes(emp.checkIn);

        // Daily discipline score:
        let score = 0;
        if (isHadir) {
          score = 100;
        } else if (isTelat) {
          score = Math.max(15, Math.round(100 - lateMins * 1.5));
        } else if (emp.normalizedStatus === 'cuti') {
          score = 70;
        } else if (emp.normalizedStatus === 'sakit') {
          score = 65;
        } else if (emp.normalizedStatus === 'izin') {
          score = 50;
        } else {
          score = 0;
        }

        const track = monthlyTrackRecord[emp.employeeId || emp.name] || {
          onTime: isHadir ? 1 : 0,
          lateMins,
          totalDays: 1,
          lateCount: isTelat ? 1 : 0,
        };

        return {
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department || 'Umum',
          branch: emp.branch || 'Pusat',
          jobPosition: emp.jobPosition || 'Staff',
          totalPresent: isHadir || isTelat ? 1 : 0,
          totalOnTime: isHadir ? 1 : 0,
          totalLate: isTelat ? 1 : 0,
          totalLateMinutes: lateMins,
          totalAbsent: isHadir || isTelat ? 0 : 1,
          attendanceRate: isHadir || isTelat ? 100 : 0,
          disciplineScore: score,
          avgCheckInTime: emp.checkIn && emp.checkIn !== '-' ? emp.checkIn : '-',
          earliestCheckIn: emp.checkIn && emp.checkIn !== '-' ? emp.checkIn : '-',
          badgeLevel: 'standard' as const,
          badgeTitle: 'Peserta',
          _checkInMins: checkInMins,
          _histOnTime: track.onTime,
          _histLateMins: track.lateMins,
          _histTotalDays: track.totalDays,
        };
      });

      // Sort order for Daily:
      // 1. Highest score first
      // 2. If both 100% (hadir):
      //    a. If real check-in timestamps exist: earliest check-in first
      //    b. If check-in timestamps not present: tie-break by highest cumulative on-time days this month, then lowest late minutes
      // 3. If both late: lowest late minutes first, then cumulative monthly track record
      list.sort((a, b) => {
        if (b.disciplineScore !== a.disciplineScore) {
          return b.disciplineScore - a.disciplineScore;
        }
        if (a.disciplineScore === 100 && b.disciplineScore === 100) {
          if (hasRealCheckInTimes && a._checkInMins !== b._checkInMins) {
            return a._checkInMins - b._checkInMins;
          }
          if (b._histOnTime !== a._histOnTime) {
            return b._histOnTime - a._histOnTime;
          }
          if (a._histLateMins !== b._histLateMins) {
            return a._histLateMins - b._histLateMins;
          }
          if (b._histTotalDays !== a._histTotalDays) {
            return b._histTotalDays - a._histTotalDays;
          }
        }
        if (a.totalLateMinutes !== b.totalLateMinutes) {
          return a.totalLateMinutes - b.totalLateMinutes;
        }
        if (b._histOnTime !== a._histOnTime) {
          return b._histOnTime - a._histOnTime;
        }
        return a.name.localeCompare(b.name);
      });

      return list.map((item, idx) => {
        const rank = idx + 1;
        let badgeLevel: 'gold' | 'silver' | 'bronze' | 'top' | 'standard' = 'standard';
        let badgeTitle = 'Hadir';

        if (rank === 1 && item.disciplineScore === 100) {
          badgeLevel = 'gold';
          badgeTitle = hasRealCheckInTimes ? 'Terdisiplin #1 (Paling Pagi)' : 'Terdisiplin #1 (Paling Konsisten)';
        } else if (rank === 2 && item.disciplineScore === 100) {
          badgeLevel = 'silver';
          badgeTitle = 'Terdisiplin #2';
        } else if (rank === 3 && item.disciplineScore === 100) {
          badgeLevel = 'bronze';
          badgeTitle = 'Terdisiplin #3';
        } else if (item.disciplineScore >= 95) {
          badgeLevel = 'top';
          badgeTitle = 'Sangat Tepat Waktu';
        } else if (item.disciplineScore >= 70) {
          badgeLevel = 'standard';
          badgeTitle = 'Disiplin';
        } else if (item.disciplineScore > 0) {
          badgeLevel = 'standard';
          badgeTitle = 'Perlu Ditingkatkan';
        } else {
          badgeLevel = 'standard';
          badgeTitle = 'Tidak Hadir';
        }

        return {
          rank,
          employeeId: item.employeeId,
          name: item.name,
          department: item.department,
          branch: item.branch,
          jobPosition: item.jobPosition,
          totalPresent: item.totalPresent,
          totalOnTime: item.totalOnTime,
          totalLate: item.totalLate,
          totalLateMinutes: item.totalLateMinutes,
          totalAbsent: item.totalAbsent,
          attendanceRate: item.attendanceRate,
          disciplineScore: item.disciplineScore,
          avgCheckInTime: item.avgCheckInTime,
          earliestCheckIn: item.earliestCheckIn,
          badgeLevel,
          badgeTitle,
          monthlyOnTime: item._histOnTime,
          monthlyLateMinutes: item._histLateMins,
          monthlyTotalDays: item._histTotalDays,
          totalDays: 1,
        };
      });
    }

    // MONTHLY OR ALL-TIME AGGREGATION FROM FIRESTORE ARCHIVES
    const recordsToProcess: Record<string, EmployeeRecord[]> = {};

    Object.entries(allDailyRecords).forEach(([dateStr, record]) => {
      if (!record.employees || record.employees.length === 0) return;

      if (scope === 'bulanan') {
        const parts = dateStr.split('-');
        const y = record.year || (parts[0] ? parseInt(parts[0], 10) : 0);
        const m = record.month || (parts[1] ? parseInt(parts[1], 10) : 0);
        if (y === year && m === monthNumber) {
          recordsToProcess[dateStr] = record.employees;
        }
      } else {
        // 'semua' (All archives)
        recordsToProcess[dateStr] = record.employees;
      }
    });

    // If no records in chosen month, fallback to currentDayEmployees if matches month
    if (Object.keys(recordsToProcess).length === 0 && currentDayEmployees.length > 0) {
      recordsToProcess['current'] = currentDayEmployees;
    }

    // Aggregate by employeeId or name
    interface AggEmp {
      employeeId: string;
      name: string;
      department: string;
      branch: string;
      jobPosition: string;
      totalDays: number;
      totalOnTime: number;
      totalLate: number;
      totalLateMinutes: number;
      totalAlpha: number;
      totalIzin: number;
      totalSakit: number;
      totalCuti: number;
      checkInMinsList: number[];
    }

    const aggMap: Record<string, AggEmp> = {};

    Object.values(recordsToProcess).forEach((empList) => {
      empList.forEach((emp) => {
        const key = emp.employeeId || emp.name;
        if (!aggMap[key]) {
          aggMap[key] = {
            employeeId: emp.employeeId,
            name: emp.name,
            department: emp.department || 'Umum',
            branch: emp.branch || 'Pusat',
            jobPosition: emp.jobPosition || 'Staff',
            totalDays: 0,
            totalOnTime: 0,
            totalLate: 0,
            totalLateMinutes: 0,
            totalAlpha: 0,
            totalIzin: 0,
            totalSakit: 0,
            totalCuti: 0,
            checkInMinsList: [],
          };
        }

        const a = aggMap[key];
        a.totalDays += 1;

        if (emp.normalizedStatus === 'hadir') {
          a.totalOnTime += 1;
        } else if (emp.normalizedStatus === 'telat') {
          a.totalLate += 1;
          a.totalLateMinutes += emp.lateMinutes || 0;
        } else if (emp.normalizedStatus === 'alpha') {
          a.totalAlpha += 1;
        } else if (emp.normalizedStatus === 'izin') {
          a.totalIzin += 1;
        } else if (emp.normalizedStatus === 'sakit') {
          a.totalSakit += 1;
        } else if (emp.normalizedStatus === 'cuti') {
          a.totalCuti += 1;
        }

        if (emp.checkIn && emp.checkIn !== '-') {
          const mins = timeToMinutes(emp.checkIn);
          if (mins < 9999) {
            a.checkInMinsList.push(mins);
          }
        }
      });
    });

    const list = Object.values(aggMap).map((agg) => {
      const totalPresent = agg.totalOnTime + agg.totalLate;
      const totalAbsent = agg.totalAlpha + agg.totalIzin + agg.totalSakit + agg.totalCuti;
      const attendanceRate = agg.totalDays > 0 ? Math.round((totalPresent / agg.totalDays) * 100) : 0;
      const onTimeRate = agg.totalDays > 0 ? (agg.totalOnTime / agg.totalDays) * 100 : 0;

      // Mathematically balanced discipline formula:
      // Base: onTimeRate (0 - 100)
      // Late frequency penalty (max 20)
      const lateFreqPenalty = (agg.totalLate / agg.totalDays) * 20;
      // Late duration penalty (max 15)
      const lateMinPenalty = Math.min(15, Math.round(agg.totalLateMinutes / 15));
      // Unexcused absence penalty (max 25)
      const alphaPenalty = (agg.totalAlpha / agg.totalDays) * 25;

      const rawScore = onTimeRate - lateFreqPenalty - lateMinPenalty - alphaPenalty;
      const disciplineScore = Math.max(0, Math.min(100, Math.round(rawScore)));

      // Average check-in time
      const avgCheckInMins =
        agg.checkInMinsList.length > 0
          ? Math.round(agg.checkInMinsList.reduce((acc, v) => acc + v, 0) / agg.checkInMinsList.length)
          : 9999;

      const earliestMins =
        agg.checkInMinsList.length > 0 ? Math.min(...agg.checkInMinsList) : 9999;

      return {
        employeeId: agg.employeeId,
        name: agg.name,
        department: agg.department,
        branch: agg.branch,
        jobPosition: agg.jobPosition,
        totalPresent,
        totalOnTime: agg.totalOnTime,
        totalLate: agg.totalLate,
        totalLateMinutes: agg.totalLateMinutes,
        totalAbsent,
        attendanceRate,
        disciplineScore,
        avgCheckInTime: minutesToTime(avgCheckInMins),
        earliestCheckIn: minutesToTime(earliestMins),
        badgeLevel: 'standard' as const,
        badgeTitle: '',
        _avgMins: avgCheckInMins,
        totalDays: agg.totalDays,
      };
    });

    // Sort order for discipline leaderboard:
    // 1. Highest discipline score
    // 2. Highest on-time count (consistency / volume)
    // 3. Lowest late minutes
    // 4. Lowest late count
    // 5. Highest total recorded days
    list.sort((a, b) => {
      if (b.disciplineScore !== a.disciplineScore) {
        return b.disciplineScore - a.disciplineScore;
      }
      if (b.totalOnTime !== a.totalOnTime) {
        return b.totalOnTime - a.totalOnTime;
      }
      if (a.totalLateMinutes !== b.totalLateMinutes) {
        return a.totalLateMinutes - b.totalLateMinutes;
      }
      if (a.totalLate !== b.totalLate) {
        return a.totalLate - b.totalLate;
      }
      if (b.totalDays !== a.totalDays) {
        return b.totalDays - a.totalDays;
      }
      return a._avgMins - b._avgMins;
    });

    return list.map((item, idx) => {
      const rank = idx + 1;
      let badgeLevel: 'gold' | 'silver' | 'bronze' | 'top' | 'standard' = 'standard';
      let badgeTitle = 'Teladan';

      if (rank === 1 && item.disciplineScore >= 80) {
        badgeLevel = 'gold';
        badgeTitle = 'Juara 1 Terdisiplin 🏆';
      } else if (rank === 2 && item.disciplineScore >= 75) {
        badgeLevel = 'silver';
        badgeTitle = 'Juara 2 Terdisiplin 🥈';
      } else if (rank === 3 && item.disciplineScore >= 70) {
        badgeLevel = 'bronze';
        badgeTitle = 'Juara 3 Terdisiplin 🥉';
      } else if (item.disciplineScore >= 80) {
        badgeLevel = 'top';
        badgeTitle = 'Sangat Disiplin ⭐';
      } else if (item.disciplineScore >= 65) {
        badgeLevel = 'standard';
        badgeTitle = 'Disiplin Baik 👍';
      } else if (item.disciplineScore >= 50) {
        badgeLevel = 'standard';
        badgeTitle = 'Cukup Disiplin';
      } else {
        badgeLevel = 'standard';
        badgeTitle = 'Perlu Ditingkatkan ⚠️';
      }

      return {
        rank,
        employeeId: item.employeeId,
        name: item.name,
        department: item.department,
        branch: item.branch,
        jobPosition: item.jobPosition,
        totalPresent: item.totalPresent,
        totalOnTime: item.totalOnTime,
        totalLate: item.totalLate,
        totalLateMinutes: item.totalLateMinutes,
        totalAbsent: item.totalAbsent,
        attendanceRate: item.attendanceRate,
        disciplineScore: item.disciplineScore,
        avgCheckInTime: item.avgCheckInTime,
        earliestCheckIn: item.earliestCheckIn,
        totalDays: item.totalDays,
        badgeLevel,
        badgeTitle,
      };
    });
  }, [currentDayEmployees, allDailyRecords, scope, year, monthNumber, monthlyTrackRecord]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    rankedList.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [rankedList]);

  // Filtered ranking list
  const filteredRankings = useMemo(() => {
    return rankedList.filter((item) => {
      if (selectedDept !== 'all' && item.department !== selectedDept) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.employeeId.toLowerCase().includes(q) ||
          item.jobPosition.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rankedList, selectedDept, search]);

  // Top 3 Podium
  const top1 = filteredRankings[0];
  const top2 = filteredRankings[1];
  const top3 = filteredRankings[2];

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredRankings.map((r) => ({
      'Peringkat': r.rank,
      'NIK / Employee ID': r.employeeId,
      'Nama Karyawan': r.name,
      'Jabatan': r.jobPosition,
      'Departemen': r.department,
      'Cabang': r.branch,
      'Skor Disiplin (%)': r.disciplineScore,
      'Predikat': r.badgeTitle,
      'Total Hari Terdata': r.totalDays || 1,
      'Total Hadir Tepat Waktu': r.totalOnTime,
      'Total Telat (Hari)': r.totalLate,
      'Total Menit Terlambat': r.totalLateMinutes,
      'Total Tidak Masuk (Hari)': r.totalAbsent,
      'Tingkat Kehadiran (%)': `${r.attendanceRate}%`,
      'Jam Scan Masuk': r.avgCheckInTime,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking Kedisiplinan');
    XLSX.writeFile(wb, `Ranking_Karyawan_Terdisiplin_${scope}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-amber-500/10 via-emerald-500/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Peringkat Karyawan Terdisiplin
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Flame className="w-3 h-3 text-amber-500" />
                  Top Leaderboard
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Apresiasi ketepatan waktu presensi, kedatangan terawal, dan konsistensi kehadiran karyawan
              </p>
            </div>
          </div>

          {/* Action & Export */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={filteredRankings.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Scope, Department, Search */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Scope Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setScope('harian')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                scope === 'harian'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Hari Ini ({activeDateText})</span>
            </button>
            <button
              onClick={() => setScope('bulanan')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                scope === 'bulanan'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Bulan Ini ({monthName} {year})</span>
            </button>
            <button
              onClick={() => setScope('semua')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition ${
                scope === 'semua'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-500" />
              <span>Semua Arsip</span>
            </button>
          </div>

          {/* Department Filter & Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {departments.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-slate-200 outline-none text-xs"
                >
                  <option value="all">Semua Departemen</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari karyawan, NIK..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {filteredRankings.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-6 h-6" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Belum ada data presensi untuk dihitung peringkatnya
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
            Upload file presensi Excel harian atau simpan data ke Firebase untuk menampilkan ranking karyawan terdisiplin.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-6">
          {/* Top 3 Champion Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Rank 2 (Silver) */}
            {top2 ? (
              <div className="order-2 md:order-1 bg-linear-to-b from-slate-100 to-white dark:from-slate-800/80 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl p-4.5 relative shadow-xs flex flex-col justify-between">
                <div className="absolute -top-3 left-4 bg-linear-to-r from-slate-400 to-slate-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                  <Medal className="w-3 h-3" />
                  <span>PERINGKAT #2</span>
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-sm ring-2 ring-slate-300">
                      {top2.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {top2.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {top2.employeeId}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{top2.jobPosition}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pl-5 truncate">
                    {top2.department} • {top2.branch}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Skor Disiplin</span>
                    <span className="text-base font-extrabold text-slate-700 dark:text-slate-200">
                      {top2.disciplineScore}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {scope === 'harian'
                        ? top2.avgCheckInTime !== '-'
                          ? 'Scan Masuk'
                          : 'Rekor Bulan Ini'
                        : 'Ketepatan Waktu'}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                      {scope === 'harian' ? (
                        top2.avgCheckInTime !== '-' ? (
                          <>
                            <Clock className="w-3 h-3" />
                            {top2.avgCheckInTime} WIB
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            {top2.monthlyOnTime ?? top2.totalOnTime} Hari Tepat
                          </>
                        )
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          {top2.totalOnTime} Hari ({top2.totalLate > 0 ? `${top2.totalLate}x telat` : '0 telat'})
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Rank 1 (Gold) */}
            {top1 ? (
              <div className="order-1 md:order-2 bg-linear-to-b from-amber-500/15 via-amber-50/50 to-white dark:from-amber-950/40 dark:via-slate-800/90 dark:to-slate-900 border-2 border-amber-400 dark:border-amber-500/60 rounded-2xl p-5 relative shadow-lg shadow-amber-500/10 flex flex-col justify-between scale-102">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-amber-500 to-yellow-500 text-white px-3.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/30">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>JUARA 1 TERDISIPLIN 👑</span>
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3.5">
                    <div className="w-13 h-13 rounded-full bg-linear-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black flex items-center justify-center text-lg ring-4 ring-amber-300/50 shadow-md">
                      {top1.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white line-clamp-1">
                        {top1.name}
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-mono font-medium">
                        ID: {top1.employeeId}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3.5 text-xs text-slate-700 dark:text-slate-200 font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{top1.jobPosition}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 truncate">
                    {top1.department} • {top1.branch}
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block uppercase tracking-wider">
                      Skor Disiplin
                    </span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-300">
                      {top1.disciplineScore}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {scope === 'harian'
                        ? top1.avgCheckInTime !== '-'
                          ? 'Jam Masuk'
                          : 'Rekor Bulan Ini'
                        : 'Ketepatan Waktu'}
                    </span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                      {scope === 'harian' ? (
                        top1.avgCheckInTime !== '-' ? (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            {top1.avgCheckInTime} WIB
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            {top1.monthlyOnTime ?? top1.totalOnTime} Hari Tepat
                          </>
                        )
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          {top1.totalOnTime} Hari ({top1.totalLate > 0 ? `${top1.totalLate}x telat` : '0 telat'})
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Rank 3 (Bronze) */}
            {top3 ? (
              <div className="order-3 bg-linear-to-b from-amber-900/5 to-white dark:from-slate-800/80 dark:to-slate-900 border-2 border-amber-600/30 dark:border-amber-700/40 rounded-2xl p-4.5 relative shadow-xs flex flex-col justify-between">
                <div className="absolute -top-3 left-4 bg-linear-to-r from-amber-700 to-amber-800 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs">
                  <Award className="w-3 h-3" />
                  <span>PERINGKAT #3</span>
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center text-sm ring-2 ring-amber-300">
                      {top3.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {top3.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {top3.employeeId}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{top3.jobPosition}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pl-5 truncate">
                    {top3.department} • {top3.branch}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Skor Disiplin</span>
                    <span className="text-base font-extrabold text-slate-700 dark:text-slate-200">
                      {top3.disciplineScore}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {scope === 'harian'
                        ? top3.avgCheckInTime !== '-'
                          ? 'Scan Masuk'
                          : 'Rekor Bulan Ini'
                        : 'Ketepatan Waktu'}
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                      {scope === 'harian' ? (
                        top3.avgCheckInTime !== '-' ? (
                          <>
                            <Clock className="w-3 h-3" />
                            {top3.avgCheckInTime} WIB
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            {top3.monthlyOnTime ?? top3.totalOnTime} Hari Tepat
                          </>
                        )
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          {top3.totalOnTime} Hari ({top3.totalLate > 0 ? `${top3.totalLate}x telat` : '0 telat'})
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Full Leaderboard Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Tabel Seluruh Peringkat Kedisiplinan ({filteredRankings.length} Karyawan)
              </span>
              <span className="text-[11px] text-slate-500">
                Diurutkan berdasarkan skor disiplin & jam check-in terawal
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 w-14 text-center">Rank</th>
                    <th className="py-2.5 px-3">Nama Karyawan</th>
                    <th className="py-2.5 px-3">Jabatan & Departemen</th>
                    <th className="py-2.5 px-3 text-center">
                      {scope === 'harian' ? 'Status / Scan' : 'Hari Terdata'}
                    </th>
                    <th className="py-2.5 px-3 text-center">Tepat Waktu</th>
                    <th className="py-2.5 px-3 text-center">Telat (Mnt)</th>
                    <th className="py-2.5 px-3">Skor Kedisiplinan</th>
                    <th className="py-2.5 px-3">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRankings.map((item) => {
                    const isTop1 = item.rank === 1;
                    const isTop2 = item.rank === 2;
                    const isTop3 = item.rank === 3;

                    return (
                      <tr
                        key={item.employeeId}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                          isTop1
                            ? 'bg-amber-50/30 dark:bg-amber-950/15'
                            : isTop2
                            ? 'bg-slate-50/40 dark:bg-slate-800/20'
                            : isTop3
                            ? 'bg-amber-900/5 dark:bg-amber-950/10'
                            : ''
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-2.5 px-3 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-linear-to-br from-amber-400 to-yellow-500 text-slate-950 font-black text-xs shadow-xs">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-linear-to-br from-slate-300 to-slate-400 text-slate-900 font-black text-xs shadow-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-linear-to-br from-amber-600 to-amber-700 text-white font-black text-xs shadow-xs">
                              3
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 font-semibold text-[11px]">
                              #{item.rank}
                            </span>
                          )}
                        </td>

                        {/* Employee Name & ID */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            {isTop1 && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            <span>{item.name}</span>
                          </div>
                          <span className="block text-[11px] font-normal text-slate-400 font-mono">
                            NIK: {item.employeeId}
                          </span>
                        </td>

                        {/* Job Position & Dept */}
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.jobPosition}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 pl-4">
                            {item.department} • {item.branch}
                          </div>
                        </td>

                        {/* Check In Time / Attendance */}
                        <td className="py-2.5 px-3 text-center">
                          {item.avgCheckInTime !== '-' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md text-[11px] font-mono">
                              <Clock className="w-3 h-3" />
                              {item.avgCheckInTime}
                            </span>
                          ) : scope === 'harian' ? (
                            item.disciplineScore === 100 ? (
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Tepat Waktu
                              </span>
                            ) : item.totalLate > 0 ? (
                              <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md text-[11px]">
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                Telat {item.totalLateMinutes}m
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                              {item.totalDays || 0} Hari Terdata
                            </span>
                          )}
                        </td>

                        {/* On-Time Days */}
                        <td className="py-2.5 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                          {scope === 'harian' ? (
                            item.totalOnTime > 0 ? (
                              <CheckCircle2 className="w-4 h-4 mx-auto text-emerald-500" />
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )
                          ) : (
                            `${item.totalOnTime} Hari`
                          )}
                        </td>

                        {/* Late Minutes */}
                        <td className="py-2.5 px-3 text-center">
                          {item.totalLateMinutes > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">
                              {item.totalLateMinutes} mnt
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold text-[11px]">0 mnt</span>
                          )}
                        </td>

                        {/* Discipline Score Progress */}
                        <td className="py-2.5 px-3 min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                            <span
                              className={
                                item.disciplineScore >= 90
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : item.disciplineScore >= 70
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {item.disciplineScore}%
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              Hadir: {item.attendanceRate}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                item.disciplineScore >= 90
                                  ? 'bg-emerald-500'
                                  : item.disciplineScore >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${item.disciplineScore}%` }}
                            />
                          </div>
                        </td>

                        {/* Badge / Predikat */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {item.badgeLevel === 'gold' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700">
                              <Trophy className="w-3 h-3 text-amber-600" />
                              {item.badgeTitle}
                            </span>
                          ) : item.badgeLevel === 'silver' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-slate-200">
                              <Medal className="w-3 h-3 text-slate-500" />
                              {item.badgeTitle}
                            </span>
                          ) : item.badgeLevel === 'bronze' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-400 dark:bg-amber-950/40 dark:text-amber-300">
                              <Award className="w-3 h-3 text-amber-600" />
                              {item.badgeTitle}
                            </span>
                          ) : item.badgeLevel === 'top' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <Star className="w-3 h-3 text-emerald-500" />
                              {item.badgeTitle}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.badgeTitle || 'Peserta Presensi'}
                            </span>
                          )}
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
