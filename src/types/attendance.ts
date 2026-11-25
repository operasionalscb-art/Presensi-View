export type AttendanceStatusCode = 'H' | 'H/LI/NCO' | 'I' | 'S' | 'C' | 'A' | 'OFF' | string;

export type NormalizedStatus = 'hadir' | 'telat' | 'izin' | 'sakit' | 'cuti' | 'alpha' | 'shift_khusus';

export interface EmployeeRecord {
  no: number;
  employeeId: string;
  name: string;
  date?: string; // e.g. "2026-09-17"
  shift?: string; // e.g. "Guru", "Pembina", "Staff"
  scheduleIn?: string; // e.g. "07:00"
  scheduleOut?: string; // e.g. "16:00"
  rawStatus: string; // e.g. "H", "H/LI/NCO", "I", "S", "C", "A"
  normalizedStatus: NormalizedStatus;
  checkIn?: string; // e.g. "06:48"
  checkOut?: string; // e.g. "16:03"
  branch: string; // e.g. "Pusat"
  department: string; // e.g. "Sekolah", "Asrama"
  jobPosition: string; // e.g. "WKS Bidang Kurikulum", "Kepala Sekolah"
  jobLevel: string; // e.g. "Middle Manager", "Top Manager", "Staff"
  employmentStatus: string; // e.g. "Contract", "Permanent"
  joinDate: string; // e.g. "2017-12-18"
  keterangan: string; // e.g. "Telat 12 menit", "Tepat Waktu"
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
}

export interface EmployeeDisciplineRank {
  rank: number;
  employeeId: string;
  name: string;
  department: string;
  branch: string;
  jobPosition: string;
  totalPresent: number;
  totalOnTime: number;
  totalLate: number;
  totalLateMinutes: number;
  totalAbsent: number;
  attendanceRate: number; // %
  disciplineScore: number; // 0 - 100
  avgCheckInTime?: string;
  earliestCheckIn?: string;
  badgeLevel: 'gold' | 'silver' | 'bronze' | 'top' | 'standard';
  badgeTitle: string;
  monthlyOnTime?: number;
  monthlyLateMinutes?: number;
  monthlyTotalDays?: number;
  totalDays?: number;
}

export interface DailySummary {
  dateStr: string; // e.g. "12 Oktober 2026"
  dayNumber: number; // e.g. 12
  monthName: string; // e.g. "October"
  year: number; // 2026
  totalEmployees: number;
  totalHadir: number; // Present on time
  totalTelat: number; // Present but late
  totalIzin: number;
  totalSakit: number;
  totalCuti: number;
  totalAlpha: number;
  totalTidakMasuk: number; // izin + sakit + cuti + alpha
  attendanceRate: number; // (hadir + telat) / totalEmployees * 100
  onTimeRate: number; // hadir / totalEmployees * 100
}

export interface DayTrendPoint {
  day: number;
  dateStr: string;
  isWeekend: boolean;
  totalEmployees: number;
  hadir: number;
  telat: number;
  izin: number;
  sakit: number;
  cuti: number;
  alpha: number;
  attendanceRate: number;
}

export interface DepartmentStat {
  department: string;
  total: number;
  hadir: number;
  telat: number;
  tidakMasuk: number;
}
