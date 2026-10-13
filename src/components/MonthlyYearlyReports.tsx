import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  AlertTriangle,
  Award,
  BarChart2,
  Database,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import {
  calculateMonthlyReport,
  calculateYearlyReport,
  getStoredDatesList,
  MonthReport,
  YearReport,
} from '../services/storageService';
import { exportMonthlyReportToExcel, exportYearlyReportToExcel } from '../services/excelService';

interface MonthlyYearlyReportsProps {
  currentYear: number;
  currentMonth: number;
  onSelectDate: (dateStr: string) => void;
}

export const MonthlyYearlyReports: React.FC<MonthlyYearlyReportsProps> = ({
  currentYear,
  currentMonth,
  onSelectDate,
}) => {
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const monthlyReport: MonthReport = calculateMonthlyReport(selectedYear, selectedMonth);
  const yearlyReport: YearReport = calculateYearlyReport(selectedYear);
  const storedDates = getStoredDatesList();

  const months = [
    { num: 1, name: 'Januari' },
    { num: 2, name: 'Februari' },
    { num: 3, name: 'Maret' },
    { num: 4, name: 'April' },
    { num: 5, name: 'Mei' },
    { num: 6, name: 'Juni' },
    { num: 7, name: 'Juli' },
    { num: 8, name: 'Agustus' },
    { num: 9, name: 'September' },
    { num: 10, name: 'Oktober' },
    { num: 11, name: 'November' },
    { num: 12, name: 'Desember' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controller Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Sub Tab Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 rounded-md transition ${
                reportType === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Rekap Bulanan
            </button>
            <button
              onClick={() => setReportType('yearly')}
              className={`px-3 py-1.5 rounded-md transition ${
                reportType === 'yearly'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Rekap Tahunan
            </button>
          </div>

          {/* Month / Year Selectors */}
          {reportType === 'monthly' ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none"
            >
              {months.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name} {selectedYear}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none font-semibold"
            >
              <option value={2026}>Tahun 2026</option>
              <option value={2025}>Tahun 2025</option>
            </select>
          )}
        </div>

        {/* Export Button */}
        <button
          onClick={() => {
            if (reportType === 'monthly') {
              exportMonthlyReportToExcel(monthlyReport);
            } else {
              exportYearlyReportToExcel(yearlyReport);
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export {reportType === 'monthly' ? 'Rekap Bulanan' : 'Rekap Tahunan'} (.xlsx)</span>
        </button>
      </div>

      {reportType === 'monthly' ? (
        <div className="space-y-4">
          {/* Monthly KPI Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-xs text-slate-500">Hari Kerja Terdata</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {monthlyReport.recordedDaysCount} Hari
              </div>
              <span className="text-[11px] text-slate-400">Tersimpan dari upload harian</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-xs text-slate-500">Rata-rata Kehadiran</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {monthlyReport.avgAttendanceRate}%
              </div>
              <span className="text-[11px] text-slate-400">Total sebulan</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-xs text-slate-500">Total Kasus Telat</span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {monthlyReport.totalTelatCases} Kali
              </div>
              <span className="text-[11px] text-slate-400">Akumulasi semua karyawan</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-xs text-slate-500">Total Absen (I/S/C/A)</span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                {monthlyReport.totalIzinCases +
                  monthlyReport.totalSakitCases +
                  monthlyReport.totalCutiCases +
                  monthlyReport.totalAlphaCases}{' '}
                Hari
              </div>
              <span className="text-[11px] text-slate-400">
                Izin: {monthlyReport.totalIzinCases} • Sakit: {monthlyReport.totalSakitCases} • Cuti: {monthlyReport.totalCutiCases}
              </span>
            </div>
          </div>

          {/* Top Frequent Late Employees (Akumulasi Keterlambatan) */}
          {monthlyReport.topLateEmployees.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Peringkat Keterlambatan Karyawan Bulan Ini
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  {monthlyReport.topLateEmployees.length} karyawan pernah telat
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {monthlyReport.topLateEmployees.slice(0, 6).map((emp, idx) => (
                  <div
                    key={emp.employeeId}
                    className="p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>{emp.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {emp.jobPosition} • {emp.department}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-700 dark:text-amber-300 font-bold">
                        {emp.totalTelat}x Telat
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {emp.totalLateMinutes} mnt total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Monthly Employee Accumulation Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Rekapitulasi Akumulasi Per Karyawan ({monthlyReport.monthName} {monthlyReport.year})
              </h4>
              <span className="text-[11px] text-slate-400">
                Total {monthlyReport.employeeSummaries.length} karyawan terdata
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Nama & ID Karyawan</th>
                    <th className="py-2.5 px-3">Departemen</th>
                    <th className="py-2.5 px-3 text-center">Hari Kerja</th>
                    <th className="py-2.5 px-3 text-center">Hadir Tepat</th>
                    <th className="py-2.5 px-3 text-center">Telat</th>
                    <th className="py-2.5 px-3 text-center">Izin</th>
                    <th className="py-2.5 px-3 text-center">Sakit</th>
                    <th className="py-2.5 px-3 text-center">Cuti</th>
                    <th className="py-2.5 px-3 text-center">Alpha</th>
                    <th className="py-2.5 px-4 text-center">Tingkat Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {monthlyReport.employeeSummaries.map((emp) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {emp.name}
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {emp.employeeId} • {emp.jobPosition}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {emp.department}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono font-medium">
                        {emp.totalDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {emp.totalHadir}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {emp.totalTelat > 0 ? (
                          <span className="text-amber-600 font-bold">{emp.totalTelat}x</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {emp.totalIzin > 0 ? (
                          <span className="text-blue-600 font-semibold">{emp.totalIzin}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {emp.totalSakit > 0 ? (
                          <span className="text-rose-600 font-semibold">{emp.totalSakit}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {emp.totalCuti > 0 ? (
                          <span className="text-purple-600 font-semibold">{emp.totalCuti}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {emp.totalAlpha > 0 ? (
                          <span className="text-red-600 font-bold">{emp.totalAlpha}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {emp.attendanceRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Yearly Report */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-xs text-slate-500">Rata-rata Tahunan</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {yearlyReport.overallRate}%
              </div>
              <span className="text-[11px] text-slate-400">Kehadiran tahun {yearlyReport.year}</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-xs text-slate-500">Total Keterlambatan</span>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {yearlyReport.totalTelatYear} Kasus
              </div>
              <span className="text-[11px] text-slate-400">Sepanjang tahun</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-xs text-slate-500">Cuti Terpakai</span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {yearlyReport.totalCutiYear} Hari
              </div>
              <span className="text-[11px] text-slate-400">Total akumulasi cuti</span>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs">
              <span className="text-xs text-slate-500">Izin & Sakit</span>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {yearlyReport.totalIzinYear + yearlyReport.totalSakitYear} Hari
              </div>
              <span className="text-[11px] text-slate-400">
                Izin: {yearlyReport.totalIzinYear} • Sakit: {yearlyReport.totalSakitYear}
              </span>
            </div>
          </div>

          {/* 12-Month Performance Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">
              Tren Kehadiran Per Bulan ({yearlyReport.year})
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {yearlyReport.monthlyStats.map((m) => (
                <div
                  key={m.month}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200">{m.monthName}</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {m.avgRate}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>Telat: {m.totalTelat}</span>
                    <span>Absen: {m.totalAbsen}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Arsip Tanggal Tersimpan */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Arsip Data Harian Tersimpan ({storedDates.length} Tanggal)
            </h4>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            Otomatis disimpan di penyimpanan lokal setiap kali upload
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Setiap file Excel yang diunggah harian otomatis disimpan ke database browser dan diakumulasikan ke olahan data bulanan dan tahunan. Klik tanggal untuk membuka rincian harian:
        </p>

        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {storedDates.map((dateStr) => (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              title="Buka data harian tanggal ini"
            >
              {dateStr}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
