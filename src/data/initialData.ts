import { EmployeeRecord, DayTrendPoint } from '../types/attendance';
import { StoredDayRecord } from '../services/storageService';

// No dummy data - real dataset begins empty until user uploads or inputs real records
export const EMPTY_EMPLOYEES: EmployeeRecord[] = [];

// Calculate real monthly trend strictly from genuine records in Firestore
export function calculateRealMonthlyTrend(
  allRecords: Record<string, StoredDayRecord>,
  year: number,
  month: number
): DayTrendPoint[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const points: DayTrendPoint[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const record = allRecords[dateStr];
    if (!record || !record.employees || record.employees.length === 0) {
      points.push({
        day,
        dateStr: `${day} ${month}/${year}${isWeekend ? ' (Libur)' : ''}`,
        isWeekend,
        totalEmployees: 0,
        hadir: 0,
        telat: 0,
        izin: 0,
        sakit: 0,
        cuti: 0,
        alpha: 0,
        attendanceRate: 0,
      });
      continue;
    }

    const emps = record.employees;
    const total = emps.length;
    const hadir = emps.filter((e) => e.normalizedStatus === 'hadir').length;
    const telat = emps.filter((e) => e.normalizedStatus === 'telat').length;
    const izin = emps.filter((e) => e.normalizedStatus === 'izin').length;
    const sakit = emps.filter((e) => e.normalizedStatus === 'sakit').length;
    const cuti = emps.filter((e) => e.normalizedStatus === 'cuti').length;
    const alpha = emps.filter((e) => e.normalizedStatus === 'alpha').length;

    const rate = total > 0 ? Math.round(((hadir + telat) / total) * 1000) / 10 : 0;

    points.push({
      day,
      dateStr: `${day} ${month}/${year}${isWeekend ? ' (Libur)' : ''}`,
      isWeekend,
      totalEmployees: total,
      hadir,
      telat,
      izin,
      sakit,
      cuti,
      alpha,
      attendanceRate: rate,
    });
  }

  return points;
}
