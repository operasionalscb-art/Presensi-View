export type AttendanceStatusCode = 'H' | 'H/LI/NCO' | 'I' | 'S' | 'C' | 'A' | 'OFF' | string;

export type NormalizedStatus = 'hadir' | 'telat' | 'izin' | 'sakit' | 'cuti' | 'alpha' | 'shift_khusus';

export interface EmployeeRecord {
  no: number;
  employeeId: string;
  name: string;
  department: string;
  branch: string;
  jobPosition: string;
  jobLevel: string;
  joinDate: string;
  employmentStatus: string;
  rawStatus: string; // e.g. "H", "H/LI/NCO", "I", "S", "C"
  normalizedStatus: NormalizedStatus;
  keterangan: string; // e.g. "Telat 30 menit", "Shift sore", "Demam tinggi"
  lateMinutes?: number;
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
