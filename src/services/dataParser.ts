import { EmployeeRecord, NormalizedStatus } from '../types/attendance';

export function normalizeAttendanceStatus(rawStatus: string, keterangan: string): NormalizedStatus {
  const s = (rawStatus || '').toUpperCase().trim();
  const k = (keterangan || '').toLowerCase().trim();

  // Shift / Dinas / Off check
  if (k.includes('shift') || k.includes('dinas') || k.includes('tugas luar') || s === 'OFF') {
    return 'shift_khusus';
  }

  // Late check
  if (
    s.includes('LI') ||
    s.includes('NCO') ||
    s.includes('TELAT') ||
    s.includes('LATE') ||
    k.includes('telat') ||
    k.includes('terlambat') ||
    k.includes('menit')
  ) {
    return 'telat';
  }

  // Sakit
  if (s === 'S' || s.startsWith('SAKIT') || s === 'SICK' || k.includes('sakit') || k.includes('dokter') || k.includes('rawat')) {
    return 'sakit';
  }

  // Izin
  if (s === 'I' || s.startsWith('IZIN') || s.startsWith('IJIN') || s === 'PERMIT' || k.includes('izin') || k.includes('ijin') || k.includes('keperluan')) {
    return 'izin';
  }

  // Cuti
  if (s === 'C' || s.startsWith('CUTI') || s === 'LEAVE' || k.includes('cuti') || k.includes('tahunan')) {
    return 'cuti';
  }

  // Hadir tepat waktu
  if (
    s === 'H' ||
    s === 'HADIR' ||
    s === 'PRESENT' ||
    s === 'MASUK' ||
    s === 'ONTIME' ||
    s === 'V' ||
    s === '1' ||
    s === 'TRUE'
  ) {
    return 'hadir';
  }

  // Alpha / Tanpa keterangan
  if (s === 'A' || s === 'ALPHA' || s === 'ALPA' || s === 'TK' || s === 'ABSENT' || s === 'X' || s === '0') {
    return 'alpha';
  }

  // If status is empty
  if (!s && !k) {
    return 'alpha';
  }

  // If status has any positive indicator
  if (s.length > 0 && !['A', 'ALPHA', 'ALPA', 'TK'].includes(s)) {
    return 'hadir';
  }

  return 'alpha';
}

export function extractLateMinutes(keterangan: string): number | undefined {
  if (!keterangan) return undefined;
  const match = keterangan.match(/(\d+)\s*(?:menit|mnt|m)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

const INDO_MONTHS: Record<string, number> = {
  januari: 1, januari2024: 1, jan: 1, january: 1,
  februari: 2, feb: 2, february: 2,
  maret: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  agustus: 8, agt: 8, ags: 8, aug: 8, august: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nov: 11,
  desember: 12, des: 12, dec: 12, december: 12,
};

/**
 * Attempt to extract a date string "YYYY-MM-DD" from any value (string, Excel serial number, Date)
 */
export function parseDateToIso(value: any, referenceYear?: number, referenceMonth?: number): string | null {
  if (value === null || value === undefined || value === '') return null;

  // If already Date instance
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If Excel serial number (around 40000 - 60000)
  if (typeof value === 'number' && value > 35000 && value < 60000) {
    const excelEpoch = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(excelEpoch.getTime())) {
      const y = excelEpoch.getFullYear();
      const m = String(excelEpoch.getMonth() + 1).padStart(2, '0');
      const d = String(excelEpoch.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(value).trim();

  // Match ISO YYYY-MM-DD
  const isoMatch = str.match(/\b(20\d\d)[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/\b(0?[1-9]|[12]\d|3[01])[-/](0?[1-9]|1[0-2])[-/](20\d\d)\b/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Match text like "12 Oktober 2026" or "12 Oct 2026"
  const textDateMatch = str.match(/\b(0?[1-9]|[12]\d|3[01])\s+([a-zA-Z]+)(?:\s+(20\d\d))?\b/);
  if (textDateMatch) {
    const d = textDateMatch[1].padStart(2, '0');
    const monthKey = textDateMatch[2].toLowerCase();
    const mNum = INDO_MONTHS[monthKey];
    if (mNum) {
      const y = textDateMatch[3] ? textDateMatch[3] : String(referenceYear || 2026);
      return `${y}-${String(mNum).padStart(2, '0')}-${d}`;
    }
  }

  // If just a single day number "12" and we have reference year and month
  if (referenceYear && referenceMonth && /^(?:0?[1-9]|[12]\d|3[01])$/.test(str)) {
    const d = parseInt(str, 10);
    return `${referenceYear}-${String(referenceMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return null;
}

export interface ParsedAttendanceResult {
  mode: 'single-day' | 'multi-day' | 'row-log';
  dailyRecords: Record<string, EmployeeRecord[]>;
  detectedDates: string[];
  totalEmployees: number;
  totalDays: number;
  primaryDate: string;
  primaryEmployees: EmployeeRecord[];
}

/**
 * Scan top rows of spreadsheet to detect overall document metadata like Month and Year
 */
function scanSheetMetadata(rows: any[][], fileName?: string): { year: number; month: number } {
  let detectedYear = 2026;
  let detectedMonth = 10; // Default October

  const searchPool = [
    ...(fileName ? [fileName] : []),
    ...rows.slice(0, 10).map((r) => r.map((c) => String(c || '')).join(' ')),
  ].join(' ').toLowerCase();

  // Search for year (2020 - 2035)
  const yMatch = searchPool.match(/\b(202[0-9]|203[0-5])\b/);
  if (yMatch) {
    detectedYear = parseInt(yMatch[1], 10);
  }

  // Search for month name
  for (const [name, num] of Object.entries(INDO_MONTHS)) {
    if (searchPool.includes(name)) {
      detectedMonth = num;
      break;
    }
  }

  return { year: detectedYear, month: detectedMonth };
}

/**
 * Comprehensive attendance parser supporting:
 * 1. Single day daily attendance sheets
 * 2. Multi-day matrix spreadsheets (where columns 1..31 are days of the month)
 * 3. Row-by-row log attendance tables (where each row has a "Tanggal" column)
 */
export function parseComprehensiveAttendance(
  rows: any[][],
  options?: {
    defaultYear?: number;
    defaultMonth?: number;
    fallbackDate?: string;
    fileName?: string;
  }
): ParsedAttendanceResult {
  if (!rows || rows.length === 0) {
    return {
      mode: 'single-day',
      dailyRecords: {},
      detectedDates: [],
      totalEmployees: 0,
      totalDays: 0,
      primaryDate: options?.fallbackDate || new Date().toISOString().split('T')[0],
      primaryEmployees: [],
    };
  }

  const meta = scanSheetMetadata(rows, options?.fileName);
  const activeYear = options?.defaultYear || meta.year;
  const activeMonth = options?.defaultMonth || meta.month;

  // 1. Locate the true Table Header Row by score (avoiding false hits on title/metadata rows)
  let bestHeaderIndex = 0;
  let highestScore = -1;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    let score = 0;

    row.forEach((cell) => {
      const text = String(cell || '').toLowerCase().trim();
      if (!text) return;

      if (text === 'nama' || text === 'name' || text === 'nama lengkap' || text === 'nama karyawan' || text === 'employee name') score += 4;
      else if (text.includes('nama') || text.includes('name')) score += 2;

      if (text === 'nik' || text === 'nip' || text === 'employee id' || text === 'id karyawan' || text === 'id') score += 4;
      else if (text.includes('nik') || text.includes('employee id')) score += 2;

      if (text === 'no' || text === 'no.' || text === 'nomor') score += 2;
      if (text.includes('depart') || text.includes('divisi') || text.includes('bagian') || text.includes('unit')) score += 2;
      if (text.includes('jabatan') || text.includes('posisi') || text.includes('position')) score += 2;
      if (text.includes('presensi') || text.includes('kehadiran') || text.includes('status') || text.includes('absensi')) score += 3;
      if (text.includes('keterangan') || text.includes('alasan') || text.includes('notes') || text.includes('catatan')) score += 2;
      if (text.includes('tanggal') || text.includes('tgl') || text.includes('date')) score += 3;
      if (text.includes('cabang') || text.includes('branch')) score += 1;
      if (text.includes('join date') || text.includes('tgl masuk')) score += 1;
    });

    if (score > highestScore) {
      highestScore = score;
      bestHeaderIndex = i;
    }
  }

  const headerRow = rows[bestHeaderIndex].map((c) => String(c || '').trim());
  const subHeaderRow = rows[bestHeaderIndex + 1] ? rows[bestHeaderIndex + 1].map((c) => String(c || '').trim()) : [];

  // Column identification
  let colNo = -1;
  let colId = -1;
  let colName = -1;
  let colDept = -1;
  let colBranch = -1;
  let colPosition = -1;
  let colLevel = -1;
  let colJoinDate = -1;
  let colStatusEmp = -1;
  let colKeterangan = -1;
  let colRowDate = -1;

  // Single attendance column candidate
  let colSingleAttendance = -1;

  // Multi-day matrix candidates: array of { colIndex: number, dateStr: string, dayNumber: number }
  const matrixDayColumns: { colIndex: number; dateStr: string; dayNumber: number }[] = [];

  headerRow.forEach((col, idx) => {
    const lower = col.toLowerCase();
    const subCol = subHeaderRow[idx] ? subHeaderRow[idx].toLowerCase() : '';

    if (lower === 'no' || lower === 'no.' || lower === 'nomor') {
      colNo = idx;
    } else if (
      lower.includes('employee id') ||
      lower === 'nik' ||
      lower.includes('id karyawan') ||
      lower.includes('id pegawai') ||
      lower === 'nip' ||
      lower === 'id'
    ) {
      colId = idx;
    } else if (
      lower === 'name' ||
      lower === 'nama' ||
      lower === 'nama lengkap' ||
      lower === 'nama karyawan' ||
      lower === 'employee name' ||
      (lower.includes('nama') && !lower.includes('sekolah') && !lower.includes('perusahaan'))
    ) {
      colName = idx;
    } else if (lower.includes('department') || lower.includes('departemen') || lower.includes('divisi') || lower.includes('bagian')) {
      colDept = idx;
    } else if (lower.includes('branch') || lower.includes('cabang') || lower.includes('lokasi')) {
      colBranch = idx;
    } else if (lower.includes('job position') || lower.includes('jabatan') || lower.includes('posisi') || lower.includes('position')) {
      colPosition = idx;
    } else if (lower.includes('job level') || lower.includes('level')) {
      colLevel = idx;
    } else if (lower.includes('join date') || lower.includes('tgl masuk') || lower.includes('tanggal masuk')) {
      colJoinDate = idx;
    } else if (lower.includes('employment status') || lower.includes('status kerja') || lower.includes('status pegawai')) {
      colStatusEmp = idx;
    } else if (lower.includes('keterangan') || lower.includes('alasan') || lower.includes('notes') || lower.includes('catatan') || lower === 'ket') {
      colKeterangan = idx;
    } else if (lower === 'tanggal' || lower === 'tgl' || lower === 'date' || lower === 'tgl presensi') {
      colRowDate = idx;
    } else if (
      lower === 'status' ||
      lower === 'presensi' ||
      lower === 'kehadiran' ||
      lower === 'status kehadiran' ||
      lower === 'status presensi' ||
      lower === 'absen' ||
      lower === 'absensi' ||
      lower === 'attendance'
    ) {
      colSingleAttendance = idx;
    }

    // Check for Day Number in Matrix (either in headerRow or subHeaderRow)
    // E.g. column has '1', '2', '3' ... '31' or dates
    const possibleDayStr = /^\d{1,2}$/.test(col) ? col : (/^\d{1,2}$/.test(subCol) ? subCol : '');
    if (possibleDayStr) {
      const dNum = parseInt(possibleDayStr, 10);
      if (dNum >= 1 && dNum <= 31) {
        const dStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
        matrixDayColumns.push({ colIndex: idx, dateStr: dStr, dayNumber: dNum });
      }
    }
  });

  // Fallbacks if columns are not named explicitly
  if (colId === -1 && colNo !== -1 && colName !== -1) {
    colId = colNo === 0 && colName > 1 ? 1 : colNo;
  }
  if (colName === -1) {
    colName = colId === 1 ? 2 : 1;
  }
  if (colId === -1) {
    colId = colName === 1 ? 0 : 1;
  }

  // Determine starting row for employee data
  let dataStartIndex = bestHeaderIndex + 1;
  if (subHeaderRow.length > 0) {
    // If subheader has day numbers or empty cells for name/id
    const subName = subHeaderRow[colName] || '';
    const subId = subHeaderRow[colId] || '';
    if (!subName || !subId || /^\d+$/.test(subHeaderRow[matrixDayColumns[0]?.colIndex || -1] || '')) {
      dataStartIndex = bestHeaderIndex + 2;
    }
  }

  // Scan single date candidate from header/subheader
  let detectedSingleDate: string | null = null;
  if (colSingleAttendance !== -1) {
    detectedSingleDate = parseDateToIso(headerRow[colSingleAttendance], activeYear, activeMonth);
  }
  if (!detectedSingleDate) {
    // Scan all cells in header rows for explicit date
    for (let r = 0; r < dataStartIndex; r++) {
      for (const cell of rows[r] || []) {
        const parsed = parseDateToIso(cell, activeYear, activeMonth);
        if (parsed) {
          detectedSingleDate = parsed;
          break;
        }
      }
      if (detectedSingleDate) break;
    }
  }

  // If still not found, check filename
  if (!detectedSingleDate && options?.fileName) {
    detectedSingleDate = parseDateToIso(options.fileName, activeYear, activeMonth);
  }

  // Fallback to active date
  const fallbackDate = detectedSingleDate || options?.fallbackDate || new Date().toISOString().split('T')[0];

  // Determine parsing Mode:
  // Mode A: Multi-day Matrix (if 2 or more day columns detected, like 1..31)
  // Mode B: Row-by-Row Log (if colRowDate is present and has date values)
  // Mode C: Single Day
  const dailyRecords: Record<string, EmployeeRecord[]> = {};

  if (matrixDayColumns.length >= 2) {
    // MODE A: MULTI-DAY MATRIX
    matrixDayColumns.forEach(({ colIndex, dateStr }) => {
      const dayEmployees: EmployeeRecord[] = [];

      for (let i = dataStartIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const name = String(row[colName] || '').trim();
        const id = String(row[colId] || `EMP-${dayEmployees.length + 1}`).trim();

        if (!name && !id) continue;
        if (name.toLowerCase().startsWith('total') || id.toLowerCase().startsWith('total')) continue;
        if (name.toLowerCase().startsWith('ringkasan') || name.toLowerCase().startsWith('rekap')) continue;

        const rawStatus = String(row[colIndex] || '').trim();
        // If whole column is blank, we'll check if it has entries
        const keterangan = colKeterangan !== -1 ? String(row[colKeterangan] || '').trim() : '';

        const normalizedStatus = normalizeAttendanceStatus(rawStatus, keterangan);
        const lateMinutes = extractLateMinutes(keterangan);

        dayEmployees.push({
          no: dayEmployees.length + 1,
          employeeId: id || `EMP-${dayEmployees.length + 1}`,
          name: name || id,
          department: colDept !== -1 ? String(row[colDept] || 'Umum').trim() : 'Umum',
          branch: colBranch !== -1 ? String(row[colBranch] || 'Pusat').trim() : 'Pusat',
          jobPosition: colPosition !== -1 ? String(row[colPosition] || 'Staff').trim() : 'Staff',
          jobLevel: colLevel !== -1 ? String(row[colLevel] || 'Staff').trim() : 'Staff',
          joinDate: colJoinDate !== -1 ? String(row[colJoinDate] || '-').trim() : '-',
          employmentStatus: colStatusEmp !== -1 ? String(row[colStatusEmp] || 'Contract').trim() : 'Contract',
          rawStatus,
          normalizedStatus,
          keterangan,
          lateMinutes,
        });
      }

      // Only save if at least one employee had attendance data recorded in this column
      const hasAnyAttendance = dayEmployees.some(
        (e) => e.rawStatus !== '' || e.keterangan !== '' || e.normalizedStatus !== 'alpha'
      );

      if (hasAnyAttendance && dayEmployees.length > 0) {
        dailyRecords[dateStr] = dayEmployees;
      }
    });

    const detectedDates = Object.keys(dailyRecords).sort();
    const primaryDate = detectedDates[detectedDates.length - 1] || fallbackDate;
    const primaryEmployees = dailyRecords[primaryDate] || [];

    return {
      mode: 'multi-day',
      dailyRecords,
      detectedDates,
      totalEmployees: primaryEmployees.length,
      totalDays: detectedDates.length,
      primaryDate,
      primaryEmployees,
    };
  }

  // Check if Mode B (Row-Log):
  let isRowLog = false;
  if (colRowDate !== -1) {
    for (let i = dataStartIndex; i < Math.min(rows.length, dataStartIndex + 5); i++) {
      if (parseDateToIso(rows[i]?.[colRowDate], activeYear, activeMonth)) {
        isRowLog = true;
        break;
      }
    }
  }

  if (isRowLog && colRowDate !== -1) {
    // MODE B: ROW-BY-ROW LOG
    for (let i = dataStartIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const dateStr = parseDateToIso(row[colRowDate], activeYear, activeMonth) || fallbackDate;
      const name = String(row[colName] || '').trim();
      const id = String(row[colId] || '').trim();

      if (!name && !id) continue;
      if (name.toLowerCase().startsWith('total') || id.toLowerCase().startsWith('total')) continue;

      const rawStatus = colSingleAttendance !== -1 ? String(row[colSingleAttendance] || '').trim() : '';
      const keterangan = colKeterangan !== -1 ? String(row[colKeterangan] || '').trim() : '';
      const normalizedStatus = normalizeAttendanceStatus(rawStatus, keterangan);
      const lateMinutes = extractLateMinutes(keterangan);

      if (!dailyRecords[dateStr]) {
        dailyRecords[dateStr] = [];
      }

      dailyRecords[dateStr].push({
        no: dailyRecords[dateStr].length + 1,
        employeeId: id || `EMP-${dailyRecords[dateStr].length + 1}`,
        name: name || id,
        department: colDept !== -1 ? String(row[colDept] || 'Umum').trim() : 'Umum',
        branch: colBranch !== -1 ? String(row[colBranch] || 'Pusat').trim() : 'Pusat',
        jobPosition: colPosition !== -1 ? String(row[colPosition] || 'Staff').trim() : 'Staff',
        jobLevel: colLevel !== -1 ? String(row[colLevel] || 'Staff').trim() : 'Staff',
        joinDate: colJoinDate !== -1 ? String(row[colJoinDate] || '-').trim() : '-',
        employmentStatus: colStatusEmp !== -1 ? String(row[colStatusEmp] || 'Contract').trim() : 'Contract',
        rawStatus,
        normalizedStatus,
        keterangan,
        lateMinutes,
      });
    }

    const detectedDates = Object.keys(dailyRecords).sort();
    const primaryDate = detectedDates[detectedDates.length - 1] || fallbackDate;
    const primaryEmployees = dailyRecords[primaryDate] || [];

    return {
      mode: 'row-log',
      dailyRecords,
      detectedDates,
      totalEmployees: primaryEmployees.length,
      totalDays: detectedDates.length,
      primaryDate,
      primaryEmployees,
    };
  }

  // MODE C: SINGLE DAY ATTENDANCE
  // Identify attendance column if still not set
  if (colSingleAttendance === -1) {
    if (matrixDayColumns.length === 1) {
      colSingleAttendance = matrixDayColumns[0].colIndex;
    } else {
      // Find candidate column that is not name, id, dept, branch, position, etc.
      for (let idx = 0; idx < headerRow.length; idx++) {
        if (
          idx !== colNo &&
          idx !== colId &&
          idx !== colName &&
          idx !== colDept &&
          idx !== colBranch &&
          idx !== colPosition &&
          idx !== colLevel &&
          idx !== colJoinDate &&
          idx !== colStatusEmp &&
          idx !== colKeterangan
        ) {
          colSingleAttendance = idx;
          break;
        }
      }
      if (colSingleAttendance === -1) colSingleAttendance = 9;
    }
  }

  if (colKeterangan === -1) {
    const kIdx = headerRow.findIndex((c) => c.toLowerCase().includes('keterangan') || c.toLowerCase().includes('alasan'));
    colKeterangan = kIdx !== -1 ? kIdx : colSingleAttendance + 1;
  }

  const singleDayEmployees: EmployeeRecord[] = [];

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const name = String(row[colName] || '').trim();
    const id = String(row[colId] || '').trim();

    if (!name && !id) continue;
    if (name.toLowerCase().startsWith('total') || id.toLowerCase().startsWith('total')) continue;
    if (name.toLowerCase().startsWith('ringkasan') || name.toLowerCase().startsWith('rekap')) continue;

    const rawNo = parseInt(String(row[colNo] || ''), 10);
    const no = isNaN(rawNo) ? singleDayEmployees.length + 1 : rawNo;
    const department = colDept !== -1 ? String(row[colDept] || 'Umum').trim() : 'Umum';
    const branch = colBranch !== -1 ? String(row[colBranch] || 'Pusat').trim() : 'Pusat';
    const jobPosition = colPosition !== -1 ? String(row[colPosition] || 'Staff').trim() : 'Staff';
    const jobLevel = colLevel !== -1 ? String(row[colLevel] || 'Staff').trim() : 'Staff';
    const joinDate = colJoinDate !== -1 ? String(row[colJoinDate] || '-').trim() : '-';
    const employmentStatus = colStatusEmp !== -1 ? String(row[colStatusEmp] || 'Contract').trim() : 'Contract';
    const rawStatus = colSingleAttendance !== -1 ? String(row[colSingleAttendance] || '').trim() : '';
    const keterangan = colKeterangan !== -1 ? String(row[colKeterangan] || '').trim() : '';

    const normalizedStatus = normalizeAttendanceStatus(rawStatus, keterangan);
    const lateMinutes = extractLateMinutes(keterangan);

    singleDayEmployees.push({
      no,
      employeeId: id || `EMP-${singleDayEmployees.length + 1}`,
      name: name || id,
      department,
      branch,
      jobPosition,
      jobLevel,
      joinDate,
      employmentStatus,
      rawStatus,
      normalizedStatus,
      keterangan,
      lateMinutes,
    });
  }

  dailyRecords[fallbackDate] = singleDayEmployees;

  return {
    mode: 'single-day',
    dailyRecords,
    detectedDates: [fallbackDate],
    totalEmployees: singleDayEmployees.length,
    totalDays: 1,
    primaryDate: fallbackDate,
    primaryEmployees: singleDayEmployees,
  };
}

/**
 * Backwards compatible helper
 */
export function parseRowsToEmployees(rows: any[][]): EmployeeRecord[] {
  const result = parseComprehensiveAttendance(rows);
  return result.primaryEmployees;
}
