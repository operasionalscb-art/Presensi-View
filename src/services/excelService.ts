import * as XLSX from 'xlsx';
import { parseComprehensiveAttendance, ParsedAttendanceResult } from './dataParser';
import { EmployeeRecord } from '../types/attendance';

export interface ExcelParseResult extends ParsedAttendanceResult {
  sheetNames: string[];
  activeSheet: string;
  employees: EmployeeRecord[]; // Alias for primaryEmployees for backwards compatibility
  rawRows: any[][];
}

export async function parseExcelFile(
  file: File,
  options?: {
    sheetName?: string;
    fallbackDate?: string;
  }
): Promise<ExcelParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error('File excel tidak memiliki sheet.');
  }

  const parseSheet = (name: string) => {
    const sheet = workbook.Sheets[name];
    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd',
    }) as any[][];
    const parsed = parseComprehensiveAttendance(rawRows, {
      fallbackDate: options?.fallbackDate,
      fileName: file.name,
    });
    return { rawRows, parsed };
  };

  let targetSheetName =
    options?.sheetName && sheetNames.includes(options.sheetName)
      ? options.sheetName
      : sheetNames[0];

  let { rawRows, parsed } = parseSheet(targetSheetName);

  // If no sheet was explicitly chosen and the first sheet had 0 employees, scan remaining sheets
  if (!options?.sheetName && parsed.totalEmployees === 0 && parsed.totalDays === 0 && sheetNames.length > 1) {
    for (const candidateSheet of sheetNames.slice(1)) {
      const attempt = parseSheet(candidateSheet);
      if (attempt.parsed.totalEmployees > 0 || attempt.parsed.totalDays > 0) {
        targetSheetName = candidateSheet;
        rawRows = attempt.rawRows;
        parsed = attempt.parsed;
        break;
      }
    }
  }

  return {
    ...parsed,
    sheetNames,
    activeSheet: targetSheetName,
    employees: parsed.primaryEmployees,
    rawRows,
  };
}

export function downloadSampleExcelTemplate() {
  const headerRow1 = [
    'NO',
    'Employee ID',
    'Name',
    'Department',
    'Branch',
    'Job Position',
    'Job Level',
    'Join Date',
    'Employment Status',
    'October',
    'Keterangan',
  ];

  const headerRow2 = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '12',
    '',
  ];

  const sampleData = [
    ['1', '17.1227', 'Siswadi Dinianto', 'Sekolah', 'Pusat', 'WKS Bidang Kurikulum', 'Middle Manager', '2017-12-18', 'Contract', 'H/LI/NCO', 'Telat 30 menit'],
    ['2', '17.0704', 'Ahmad Kamaluddin Afif', 'Sekolah', 'Pusat', 'Kepala Sekolah', 'Top Manager', '2017-07-13', 'Contract', 'H', ''],
    ['3', '17.0703', 'Helmi Nursirwan', 'Asrama', 'Pusat', 'WKS Bidang Keasramaan', 'Middle Manager', '2017-07-07', 'Contract', '', 'Shift sore'],
    ['4', '17.0715', 'Sihabudin', 'Sekolah', 'Pusat', 'Guru IPA', 'Staff', '2017-07-07', 'Contract', 'H/LI/NCO', 'Telat 10 Menit'],
    ['5', '18.0432', 'Muhammad Fat Churrohman', 'Sekolah', 'Pusat', 'Guru Pendidikan Agama Islam', 'Staff', '2018-04-25', 'Contract', 'H', ''],
    ['6', '18.0433', 'Muhammad Ibnu Hardiana', 'Sekolah', 'Pusat', 'Guru Prakarya', 'Staff', '2018-05-28', 'Contract', 'H/LI/NCO', 'telat 11 menit'],
    ['7', '18.0740', 'Muhammad Gilang Permana', 'Sekolah', 'Pusat', 'Guru TIK', 'Staff', '2018-07-09', 'Contract', 'H', ''],
    ['8', '18.0811', 'Dewi Sartika', 'Sekolah', 'Pusat', 'Guru Matematika', 'Staff', '2018-08-15', 'Contract', 'S', 'Sakit tipes (surat dokter)'],
    ['9', '18.0920', 'Budi Santoso', 'Asrama', 'Pusat', 'Staff Keamanan', 'Staff', '2018-09-01', 'Contract', 'I', 'Izin urusan keluarga'],
    ['10', '19.0112', 'Siti Rahma', 'Sekolah', 'Pusat', 'Staff Tata Usaha', 'Staff', '2019-01-10', 'Contract', 'C', 'Cuti tahunan'],
  ];

  const fullData = [headerRow1, headerRow2, ...sampleData];
  const worksheet = XLSX.utils.aoa_to_sheet(fullData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 30 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Presensi Harian');
  XLSX.writeFile(workbook, 'Template_Presensi_Karyawan.xlsx');
}

export function exportMonthlyReportToExcel(report: any) {
  const summaryData = [
    ['REKAPITULASI PRESENSI BULANAN'],
    [`Periode: ${report.monthName} ${report.year}`],
    [`Total Hari Kerja Terdata: ${report.recordedDaysCount} Hari`],
    [`Rata-rata Kehadiran: ${report.avgAttendanceRate}%`],
    [`Total Kasus Terlambat: ${report.totalTelatCases}`],
    [`Total Izin: ${report.totalIzinCases} | Sakit: ${report.totalSakitCases} | Cuti: ${report.totalCutiCases} | Alpha: ${report.totalAlphaCases}`],
    [],
    [
      'ID Karyawan',
      'Nama Karyawan',
      'Departemen',
      'Jabatan',
      'Hari Tercatat',
      'Hadir Tepat Waktu',
      'Terlambat (Kali)',
      'Total Menit Telat',
      'Izin',
      'Sakit',
      'Cuti',
      'Alpha',
      'Tingkat Kehadiran (%)',
    ],
    ...report.employeeSummaries.map((e: any) => [
      e.employeeId,
      e.name,
      e.department,
      e.jobPosition,
      e.totalDays,
      e.totalHadir,
      e.totalTelat,
      e.totalLateMinutes,
      e.totalIzin,
      e.totalSakit,
      e.totalCuti,
      e.totalAlpha,
      `${e.attendanceRate}%`,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Rekap ${report.monthName} ${report.year}`);
  XLSX.writeFile(wb, `Rekap_Presensi_${report.monthName}_${report.year}.xlsx`);
}

export function exportYearlyReportToExcel(report: any) {
  const summaryData = [
    [`REKAPITULASI PRESENSI TAHUNAN ${report.year}`],
    [`Total Hari Tercatat: ${report.recordedDaysCount}`],
    [`Rata-rata Kehadiran Tahunan: ${report.overallRate}%`],
    [`Total Terlambat Setahun: ${report.totalTelatYear}`],
    [`Total Izin: ${report.totalIzinYear} | Sakit: ${report.totalSakitYear} | Cuti: ${report.totalCutiYear} | Alpha: ${report.totalAlphaYear}`],
    [],
    ['Bulan', 'Hari Tercatat', 'Rata-rata Kehadiran (%)', 'Total Kasus Telat', 'Total Absen (I/S/C/A)'],
    ...report.monthlyStats.map((m: any) => [
      m.monthName,
      m.daysCount,
      `${m.avgRate}%`,
      m.totalTelat,
      m.totalAbsen,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Rekap Tahunan ${report.year}`);
  XLSX.writeFile(wb, `Rekap_Presensi_Tahunan_${report.year}.xlsx`);
}
