import { EmployeeRecord, NormalizedStatus } from '../types/attendance';
import { saveMultipleDaysToFirestore, clearAllDailyRecordsFromFirestore } from './storageService';

export interface SimulationPersona {
  employeeId: string;
  name: string;
  department: string;
  branch: string;
  jobPosition: string;
  jobLevel: string;
  employmentStatus: string;
  joinDate: string;
  shift: string;
  scheduleIn: string;
  scheduleOut: string;
  behavior: 'champion' | 'runner_up' | 'diligent' | 'occasional_late' | 'sick_leave' | 'frequent_late' | 'chronic_late_alpha';
  description: string;
}

export const SIMULATION_PERSONAS: SimulationPersona[] = [
  {
    employeeId: 'EMP-001',
    name: 'Ahmad Hidayat, M.Pd',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Matematika Senior',
    jobLevel: 'Senior Teacher',
    employmentStatus: 'Permanent',
    joinDate: '2016-07-15',
    shift: 'Guru Pagi',
    scheduleIn: '07:00',
    scheduleOut: '15:30',
    behavior: 'champion',
    description: 'Juara 1: Selalu hadir 20-35 menit lebih awal (06:25-06:40), 100% tepat waktu, 0 menit telat.',
  },
  {
    employeeId: 'EMP-002',
    name: 'Siti Nurhaliza, S.Pd',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Bahasa Indonesia',
    jobLevel: 'Teacher',
    employmentStatus: 'Permanent',
    joinDate: '2018-01-10',
    shift: 'Guru Pagi',
    scheduleIn: '07:00',
    scheduleOut: '15:30',
    behavior: 'runner_up',
    description: 'Juara 2: Konsisten hadir 12-18 menit lebih awal (06:42-06:48), 100% tepat waktu, 0 menit telat.',
  },
  {
    employeeId: 'EMP-003',
    name: 'Dewi Lestari, S.Pd',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'WKS Bidang Kurikulum',
    jobLevel: 'Middle Manager',
    employmentStatus: 'Permanent',
    joinDate: '2017-08-01',
    shift: 'Manajemen',
    scheduleIn: '07:00',
    scheduleOut: '16:00',
    behavior: 'diligent',
    description: 'Juara 3: Sangat disiplin, hadir rutin 06:48-06:55, 100% tepat waktu, konsistensi tinggi.',
  },
  {
    employeeId: 'EMP-004',
    name: 'Budi Santoso, S.Kom',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Kepala Lab Komputer',
    jobLevel: 'Staff',
    employmentStatus: 'Permanent',
    joinDate: '2019-03-20',
    shift: 'Staff',
    scheduleIn: '07:00',
    scheduleOut: '15:30',
    behavior: 'occasional_late',
    description: 'Disiplin Baik: 9 hari tepat waktu (06:45), 1 hari terlambat 7 menit karena hujan lebat.',
  },
  {
    employeeId: 'EMP-005',
    name: 'Hendra Wijaya, S.Pd',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Fisika',
    jobLevel: 'Teacher',
    employmentStatus: 'Contract',
    joinDate: '2021-02-15',
    shift: 'Guru Pagi',
    scheduleIn: '07:00',
    scheduleOut: '15:30',
    behavior: 'occasional_late',
    description: 'Disiplin Baik: 8 hari tepat waktu, 2 hari terlambat ringan (8 mnt & 12 mnt).',
  },
  {
    employeeId: 'EMP-006',
    name: 'Rina Marlina, S.E',
    department: 'Keuangan',
    branch: 'Pusat',
    jobPosition: 'Staff Keuangan & Kasir',
    jobLevel: 'Staff',
    employmentStatus: 'Permanent',
    joinDate: '2018-09-01',
    shift: 'Staff Kantor',
    scheduleIn: '07:30',
    scheduleOut: '16:00',
    behavior: 'sick_leave',
    description: 'Sangat Tertib: 9 hari on-time (07:15), 1 hari Izin Sakit resmi dengan surat dokter.',
  },
  {
    employeeId: 'EMP-007',
    name: 'Maya Anggraini, S.I.Pust',
    department: 'Perpustakaan',
    branch: 'Pusat',
    jobPosition: 'Kepala Perpustakaan',
    jobLevel: 'Staff',
    employmentStatus: 'Permanent',
    joinDate: '2020-01-15',
    shift: 'Staff',
    scheduleIn: '07:00',
    scheduleOut: '15:30',
    behavior: 'diligent',
    description: 'Disiplin Baik: 9 hari tepat waktu, 1 hari Cuti tahunan terencana.',
  },
  {
    employeeId: 'EMP-008',
    name: 'Wahyu Hidayat, S.Pd',
    department: 'Sekolah',
    branch: 'Pusat',
    jobPosition: 'Guru Olahraga',
    jobLevel: 'Teacher',
    employmentStatus: 'Contract',
    joinDate: '2022-07-01',
    shift: 'Guru Pagi',
    scheduleIn: '07:00',
    scheduleOut: '15:30',
    behavior: 'occasional_late',
    description: 'Cukup: 8 hari tepat waktu, 1 hari izin dinas, 1 hari terlambat 10 menit.',
  },
  {
    employeeId: 'EMP-009',
    name: 'Fajar Ramadhan',
    department: 'Asrama',
    branch: 'Pusat',
    jobPosition: 'Pembina Asrama Putra',
    jobLevel: 'Staff Asrama',
    employmentStatus: 'Contract',
    joinDate: '2021-08-10',
    shift: 'Shift Asrama',
    scheduleIn: '07:00',
    scheduleOut: '16:00',
    behavior: 'frequent_late',
    description: 'Sering Telat: 6 hari tepat waktu, 4 hari terlambat 15-25 menit karena shift malam.',
  },
  {
    employeeId: 'EMP-010',
    name: 'Rizky Pratama, A.Md',
    department: 'IT Support',
    branch: 'Pusat',
    jobPosition: 'Teknisi Jaringan & Komputer',
    jobLevel: 'Staff',
    employmentStatus: 'Contract',
    joinDate: '2022-03-01',
    shift: 'Staff Kantor',
    scheduleIn: '07:00',
    scheduleOut: '16:00',
    behavior: 'frequent_late',
    description: 'Perlu Ditingkatkan: 5 hari tepat waktu, 5 hari terlambat antara 15-40 menit.',
  },
  {
    employeeId: 'EMP-011',
    name: 'Kevin Sanjaya',
    department: 'Tata Usaha',
    branch: 'Pusat',
    jobPosition: 'Staff Administrasi',
    jobLevel: 'Staff',
    employmentStatus: 'Contract',
    joinDate: '2023-01-10',
    shift: 'Staff TU',
    scheduleIn: '07:00',
    scheduleOut: '16:00',
    behavior: 'chronic_late_alpha',
    description: 'Indisipliner: 4 hari tepat waktu, 4 hari terlambat parah (35-55 mnt), 2 hari Alpha (mangkir).',
  },
  {
    employeeId: 'EMP-012',
    name: 'Bambang Suryo, M.M',
    department: 'Manajemen',
    branch: 'Pusat',
    jobPosition: 'Kepala Sekolah',
    jobLevel: 'Top Manager',
    employmentStatus: 'Permanent',
    joinDate: '2015-01-05',
    shift: 'Manajemen',
    scheduleIn: '07:00',
    scheduleOut: '16:30',
    behavior: 'champion',
    description: 'Teladan Manajemen: Selalu hadir pukul 06:30-06:40, 100% tepat waktu, 0 menit telat.',
  },
  {
    employeeId: 'EMP-013',
    name: 'Agus Setiawan',
    department: 'Keamanan',
    branch: 'Pusat',
    jobPosition: 'Petugas Keamanan (Security)',
    jobLevel: 'Staff',
    employmentStatus: 'Permanent',
    joinDate: '2017-05-12',
    shift: 'Security Pagi',
    scheduleIn: '06:30',
    scheduleOut: '15:00',
    behavior: 'champion',
    description: 'Sangat Pagi: Standby pukul 06:05-06:15 sebelum gerbang dibuka, 100% tepat waktu.',
  },
];

// 10 Working Days in October 2026 (Mon-Fri Week 1 and Week 2)
export const SIMULATION_DATES = [
  '2026-10-05', // Senin
  '2026-10-06', // Selasa
  '2026-10-07', // Rabu
  '2026-10-08', // Kamis
  '2026-10-09', // Jumat
  '2026-10-12', // Senin
  '2026-10-13', // Selasa
  '2026-10-14', // Rabu
  '2026-10-15', // Kamis
  '2026-10-16', // Jumat
];

/**
 * Generate simulated multi-day attendance records with realistic variations
 */
export function generateSimulatedRecords(
  dates: string[] = SIMULATION_DATES
): Record<string, { employees: EmployeeRecord[]; sourceName: string }> {
  const result: Record<string, { employees: EmployeeRecord[]; sourceName: string }> = {};

  dates.forEach((dateStr, dayIndex) => {
    const employees: EmployeeRecord[] = SIMULATION_PERSONAS.map((persona, pIndex) => {
      let rawStatus = 'H';
      let normalizedStatus: NormalizedStatus = 'hadir';
      let checkIn = '';
      let checkOut = '16:05';
      let lateMinutes = 0;
      let keterangan = 'Tepat Waktu';

      // Behavior profiles
      switch (persona.behavior) {
        case 'champion': {
          // Very early check-in (20-35 mins before 07:00)
          // 06:25 to 06:40
          const minOffset = 25 + ((dayIndex * 3 + pIndex) % 15); // 25 to 39
          const arrivalMin = 60 - minOffset;
          const hh = '06';
          const mm = String(arrivalMin).padStart(2, '0');
          checkIn = `${hh}:${mm}`;
          keterangan = `Hadir Lebih Awal (${minOffset} mnt sebelum jadwal)`;
          break;
        }

        case 'runner_up': {
          // 12-18 mins early (06:42 - 06:48)
          const minOffset = 12 + ((dayIndex * 2 + pIndex) % 7);
          const arrivalMin = 60 - minOffset;
          checkIn = `06:${String(arrivalMin).padStart(2, '0')}`;
          keterangan = `Hadir Tepat Waktu (${minOffset} mnt awal)`;
          break;
        }

        case 'diligent': {
          // 5-12 mins early
          if (persona.employeeId === 'EMP-007' && dayIndex === 4) {
            // Cuti on Friday of week 1
            rawStatus = 'C';
            normalizedStatus = 'cuti';
            checkIn = '';
            checkOut = '';
            keterangan = 'Cuti Tahunan Terencana';
          } else {
            const minOffset = 5 + ((dayIndex * 3) % 8);
            const arrivalMin = 60 - minOffset;
            checkIn = `06:${String(arrivalMin).padStart(2, '0')}`;
            keterangan = 'Tepat Waktu';
          }
          break;
        }

        case 'sick_leave': {
          // 9 days on time, 1 day Sakit on day 3 (Wednesday)
          if (dayIndex === 2) {
            rawStatus = 'S';
            normalizedStatus = 'sakit';
            checkIn = '';
            checkOut = '';
            keterangan = 'Izin Sakit (Surat Dokter Terlampir)';
          } else {
            const minOffset = 10 + ((dayIndex * 2) % 6);
            checkIn = `07:${String(30 - minOffset).padStart(2, '0')}`;
            keterangan = 'Tepat Waktu';
          }
          break;
        }

        case 'occasional_late': {
          // 1 or 2 days late
          if (persona.employeeId === 'EMP-004' && dayIndex === 3) {
            // 7 mins late on day 4
            rawStatus = 'H/LI/NCO';
            normalizedStatus = 'telat';
            lateMinutes = 7;
            checkIn = '07:07';
            keterangan = 'Terlambat 7 Menit (Hujan Lebat)';
          } else if (persona.employeeId === 'EMP-005' && (dayIndex === 1 || dayIndex === 6)) {
            // 8 and 12 mins late
            const lMins = dayIndex === 1 ? 8 : 12;
            rawStatus = 'H/LI/NCO';
            normalizedStatus = 'telat';
            lateMinutes = lMins;
            checkIn = `07:${String(lMins).padStart(2, '0')}`;
            keterangan = `Terlambat ${lMins} Menit`;
          } else if (persona.employeeId === 'EMP-008' && dayIndex === 5) {
            // Day 6 (Monday): 10 mins late
            rawStatus = 'H/LI/NCO';
            normalizedStatus = 'telat';
            lateMinutes = 10;
            checkIn = '07:10';
            keterangan = 'Terlambat 10 Menit';
          } else if (persona.employeeId === 'EMP-008' && dayIndex === 8) {
            // Day 9: Izin Dinas
            rawStatus = 'I';
            normalizedStatus = 'izin';
            checkIn = '';
            checkOut = '';
            keterangan = 'Izin Dinas Luar (Dispora)';
          } else {
            checkIn = '06:52';
            keterangan = 'Tepat Waktu';
          }
          break;
        }

        case 'frequent_late': {
          if (persona.employeeId === 'EMP-009') {
            // 4 late days: day 1, 3, 6, 8
            if ([0, 2, 5, 7].includes(dayIndex)) {
              const lMins = 15 + ((dayIndex * 5) % 12); // 15 to 25 mins
              rawStatus = 'H/LI/NCO';
              normalizedStatus = 'telat';
              lateMinutes = lMins;
              checkIn = `07:${String(lMins).padStart(2, '0')}`;
              keterangan = `Terlambat ${lMins} Menit (Shift Malam Asrama)`;
            } else {
              checkIn = '06:55';
              keterangan = 'Tepat Waktu';
            }
          } else {
            // EMP-010 IT Support: 5 late days: day 0, 2, 4, 6, 8
            if (dayIndex % 2 === 0) {
              const lMins = 18 + ((dayIndex * 6) % 25); // 18 to 42 mins
              rawStatus = 'H/LI/NCO';
              normalizedStatus = 'telat';
              lateMinutes = lMins;
              checkIn = `07:${String(lMins).padStart(2, '0')}`;
              keterangan = `Terlambat ${lMins} Menit`;
            } else {
              checkIn = '06:56';
              keterangan = 'Tepat Waktu';
            }
          }
          break;
        }

        case 'chronic_late_alpha': {
          // Kevin Sanjaya: 2 Alphas (day 4 & day 9), 4 severe late (day 0, 2, 6, 7), 4 on-time
          if (dayIndex === 4 || dayIndex === 9) {
            // Alpha
            rawStatus = 'A';
            normalizedStatus = 'alpha';
            checkIn = '';
            checkOut = '';
            keterangan = 'Alpha (Mangkir Tanpa Pemberitahuan)';
          } else if ([0, 2, 6, 7].includes(dayIndex)) {
            const lMins = 35 + ((dayIndex * 7) % 25); // 35 to 55 mins late
            rawStatus = 'H/LI/NCO';
            normalizedStatus = 'telat';
            lateMinutes = lMins;
            checkIn = `07:${String(lMins).padStart(2, '0')}`;
            keterangan = `Terlambat Berat ${lMins} Menit`;
          } else {
            checkIn = '06:58';
            keterangan = 'Tepat Waktu';
          }
          break;
        }
      }

      return {
        no: pIndex + 1,
        employeeId: persona.employeeId,
        name: persona.name,
        date: dateStr,
        shift: persona.shift,
        scheduleIn: persona.scheduleIn,
        scheduleOut: persona.scheduleOut,
        rawStatus,
        normalizedStatus,
        checkIn,
        checkOut: checkIn ? checkOut : '',
        branch: persona.branch,
        department: persona.department,
        jobPosition: persona.jobPosition,
        jobLevel: persona.jobLevel,
        employmentStatus: persona.employmentStatus,
        joinDate: persona.joinDate,
        keterangan,
        lateMinutes,
        earlyLeaveMinutes: 0,
      };
    });

    result[dateStr] = {
      employees,
      sourceName: `Simulasi Presensi 10 Hari (Hari ke-${dayIndex + 1})`,
    };
  });

  return result;
}

/**
 * Execute simulation and push all records directly to Cloud Firestore
 */
export async function executeAttendanceSimulation(
  datesCount: 5 | 10 = 10
): Promise<{ success: boolean; savedDates: string[]; totalRecords: number }> {
  const dates = SIMULATION_DATES.slice(0, datesCount);
  const records = generateSimulatedRecords(dates);
  const { savedDates } = await saveMultipleDaysToFirestore(records);

  const totalEmployeesPerDay = SIMULATION_PERSONAS.length;
  const totalRecords = savedDates.length * totalEmployeesPerDay;

  return {
    success: savedDates.length > 0,
    savedDates,
    totalRecords,
  };
}

/**
 * Reset all simulation data from Firestore
 */
export async function resetSimulationData(): Promise<number> {
  return await clearAllDailyRecordsFromFirestore();
}
