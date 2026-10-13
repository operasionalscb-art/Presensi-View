import { EmployeeRecord, DayTrendPoint } from '../types/attendance';

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [
  {
    no: 1,
    employeeId: '17.1227',
    name: 'Siswadi Dinianto',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'WKS Bidang Kurikulum',
    jobLevel: 'Middle Manager',
    joinDate: '2017-12-18',
    employmentStatus: 'Contract',
    rawStatus: 'H/LI/NCO',
    normalizedStatus: 'telat',
    keterangan: 'Telat 30 menit',
    lateMinutes: 30,
  },
  {
    no: 2,
    employeeId: '17.0704',
    name: 'Ahmad Kamaluddin Afif',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Kepala Sekolah',
    jobLevel: 'Top Manager',
    joinDate: '2017-07-13',
    employmentStatus: 'Contract',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 3,
    employeeId: '17.0703',
    name: 'Helmi Nursirwan',
    department: 'Asrama',
    branch: 'Pusat',
    jobPosition: 'WKS Bidang Keasramaan',
    jobLevel: 'Middle Manager',
    joinDate: '2017-07-07',
    employmentStatus: 'Contract',
    rawStatus: '',
    normalizedStatus: 'shift_khusus',
    keterangan: 'Shift sore',
  },
  {
    no: 4,
    employeeId: '17.0715',
    name: 'Sihabudin',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru IPA',
    jobLevel: 'Staff',
    joinDate: '2017-07-07',
    employmentStatus: 'Contract',
    rawStatus: 'H/LI/NCO',
    normalizedStatus: 'telat',
    keterangan: 'Telat 10 Menit',
    lateMinutes: 10,
  },
  {
    no: 5,
    employeeId: '18.0432',
    name: 'Muhammad Fat Churrohman',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Pendidikan Agama Islam',
    jobLevel: 'Staff',
    joinDate: '2018-04-25',
    employmentStatus: 'Contract',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 6,
    employeeId: '18.0433',
    name: 'Muhammad Ibnu Hardiana',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Prakarya',
    jobLevel: 'Staff',
    joinDate: '2018-05-28',
    employmentStatus: 'Contract',
    rawStatus: 'H/LI/NCO',
    normalizedStatus: 'telat',
    keterangan: 'telat 11 menit',
    lateMinutes: 11,
  },
  {
    no: 7,
    employeeId: '18.0740',
    name: 'Muhammad Gilang Permana',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru TIK',
    jobLevel: 'Staff',
    joinDate: '2018-07-09',
    employmentStatus: 'Contract',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 8,
    employeeId: '18.0912',
    name: 'Dewi Sartika Rahmawati',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Matematika',
    jobLevel: 'Staff',
    joinDate: '2018-09-01',
    employmentStatus: 'Contract',
    rawStatus: 'S',
    normalizedStatus: 'sakit',
    keterangan: 'Sakit tifus (Surat dokter terlampir, istirahat 3 hari)',
  },
  {
    no: 9,
    employeeId: '19.0210',
    name: 'Bambang Tri Atmojo',
    department: 'Asrama',
    branch: 'Pusat',
    jobPosition: 'Pembina Asrama Putra',
    jobLevel: 'Staff',
    joinDate: '2019-02-15',
    employmentStatus: 'Permanent',
    rawStatus: 'I',
    normalizedStatus: 'izin',
    keterangan: 'Izin urusan keluarga mendesak di luar kota',
  },
  {
    no: 10,
    employeeId: '19.0514',
    name: 'Nur Aisyah Khairunnisa',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Bahasa Inggris',
    jobLevel: 'Staff',
    joinDate: '2019-05-20',
    employmentStatus: 'Contract',
    rawStatus: 'C',
    normalizedStatus: 'cuti',
    keterangan: 'Cuti tahunan (Hari ke-2 dari 3)',
  },
  {
    no: 11,
    employeeId: '20.0105',
    name: 'Rizki Aditya Pratama',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Penjaskes',
    jobLevel: 'Staff',
    joinDate: '2020-01-08',
    employmentStatus: 'Contract',
    rawStatus: 'H/LI/NCO',
    normalizedStatus: 'telat',
    keterangan: 'Telat 25 menit (kendaraan mogok)',
    lateMinutes: 25,
  },
  {
    no: 12,
    employeeId: '20.0319',
    name: 'Endang Purwanti',
    department: 'Keuangan',
    branch: 'Pusat',
    jobPosition: 'Staff Administrasi Keuangan',
    jobLevel: 'Staff',
    joinDate: '2020-03-12',
    employmentStatus: 'Permanent',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 13,
    employeeId: '20.0822',
    name: 'Faisal Basri',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Laboran Fisika',
    jobLevel: 'Staff',
    joinDate: '2020-08-18',
    employmentStatus: 'Contract',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 14,
    employeeId: '21.0203',
    name: 'Wahyu Hidayat',
    department: 'Asrama',
    branch: 'Pusat',
    jobPosition: 'Staff Kebersihan',
    jobLevel: 'Staff',
    joinDate: '2021-02-01',
    employmentStatus: 'Contract',
    rawStatus: 'A',
    normalizedStatus: 'alpha',
    keterangan: 'Tanpa konfirmasi / tidak dapat dihubungi',
  },
  {
    no: 15,
    employeeId: '21.0611',
    name: 'Siti Maryam',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Bimbingan Konseling',
    jobLevel: 'Staff',
    joinDate: '2021-06-15',
    employmentStatus: 'Permanent',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 16,
    employeeId: '22.0118',
    name: 'Dedi Kurniawan',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Bahasa Indonesia',
    jobLevel: 'Staff',
    joinDate: '2022-01-20',
    employmentStatus: 'Contract',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 17,
    employeeId: '22.0904',
    name: 'Lestari Handayani',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Pustakawan',
    jobLevel: 'Staff',
    joinDate: '2022-09-05',
    employmentStatus: 'Contract',
    rawStatus: 'S',
    normalizedStatus: 'sakit',
    keterangan: 'Sakit migrain parah & vertigo',
  },
  {
    no: 18,
    employeeId: '23.0415',
    name: 'Agus Setiawan',
    department: 'Keamanan',
    branch: 'Pusat',
    jobPosition: 'Danru Sekuriti',
    jobLevel: 'Staff',
    joinDate: '2023-04-10',
    employmentStatus: 'Contract',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 19,
    employeeId: '23.0720',
    name: 'Rina Oktaviani',
    department: 'Tata Usaha',
    branch: 'Pusat',
    jobPosition: 'Staff Arsip & Surat',
    jobLevel: 'Staff',
    joinDate: '2023-07-15',
    employmentStatus: 'Contract',
    rawStatus: 'H',
    normalizedStatus: 'hadir',
    keterangan: '',
  },
  {
    no: 20,
    employeeId: '24.0110',
    name: 'Tri Wulandari',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Seni Budaya',
    jobLevel: 'Staff',
    joinDate: '2024-01-10',
    employmentStatus: 'Contract',
    rawStatus: 'H/LI/NCO',
    normalizedStatus: 'telat',
    keterangan: 'Telat 15 menit (hujan deras di jalan)',
    lateMinutes: 15,
  },
];

// Generate October monthly attendance trend data (days 1 to 31)
export function generateOctoberTrend(currentEmployees: EmployeeRecord[], currentDay: number = 12): DayTrendPoint[] {
  const total = currentEmployees.length;
  const days: DayTrendPoint[] = [];

  // Current day exact stats
  const curHadir = currentEmployees.filter((e) => e.normalizedStatus === 'hadir').length;
  const curTelat = currentEmployees.filter((e) => e.normalizedStatus === 'telat').length;
  const curIzin = currentEmployees.filter((e) => e.normalizedStatus === 'izin').length;
  const curSakit = currentEmployees.filter((e) => e.normalizedStatus === 'sakit').length;
  const curCuti = currentEmployees.filter((e) => e.normalizedStatus === 'cuti').length;
  const curAlpha = currentEmployees.filter((e) => e.normalizedStatus === 'alpha').length;

  for (let day = 1; day <= 31; day++) {
    // In October 2026: Oct 1 is Thursday.
    // Days 3, 4, 10, 11, 17, 18, 24, 25, 31 are weekends (Saturday/Sunday)
    const dayOfWeek = (day + 3) % 7; // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (day === currentDay) {
      days.push({
        day,
        dateStr: `${day} Okt 2026`,
        isWeekend,
        totalEmployees: total,
        hadir: curHadir,
        telat: curTelat,
        izin: curIzin,
        sakit: curSakit,
        cuti: curCuti,
        alpha: curAlpha,
        attendanceRate: Math.round(((curHadir + curTelat) / total) * 1000) / 10,
      });
      continue;
    }

    if (isWeekend) {
      days.push({
        day,
        dateStr: `${day} Okt 2026 (Libur)`,
        isWeekend: true,
        totalEmployees: total,
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

    // Seed realistic variations based on day number
    const pseudoRand = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    const r = pseudoRand(day);
    // Telat between 1 and 5
    const telat = Math.floor(1 + r * 4.5);
    // Sakit between 0 and 2
    const sakit = Math.floor(pseudoRand(day * 2) * 2.2);
    // Izin between 0 and 2
    const izin = Math.floor(pseudoRand(day * 3) * 2.1);
    // Cuti between 0 and 2
    const cuti = Math.floor(pseudoRand(day * 4) * 1.8);
    // Alpha between 0 and 1
    const alpha = pseudoRand(day * 5) > 0.75 ? 1 : 0;

    const tidakMasuk = sakit + izin + cuti + alpha;
    const hadir = Math.max(0, total - telat - tidakMasuk);
    const attendanceRate = Math.round(((hadir + telat) / total) * 1000) / 10;

    days.push({
      day,
      dateStr: `${day} Okt 2026`,
      isWeekend: false,
      totalEmployees: total,
      hadir,
      telat,
      izin,
      sakit,
      cuti,
      alpha,
      attendanceRate,
    });
  }

  return days;
}
