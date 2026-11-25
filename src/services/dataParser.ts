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

export function formatTimeValue(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  if (typeof val === 'number') {
    // If it's a decimal < 1 (Excel fraction of a day)
    if (val >= 0 && val < 1) {
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    // If it's an Excel serial date
    if (val > 30000 && val < 60000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }
  }
  const s = String(val).trim();
  const timeMatch = s.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)(?::[0-5]\d)?\b/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  return s;
}

export function calculateMinutesLate(checkIn?: string, scheduleIn?: string): number {
  if (!checkIn || !scheduleIn) return 0;
  const inStr = formatTimeValue(checkIn);
  const schedStr = formatTimeValue(scheduleIn);
  const mIn = inStr.match(/^(\d{1,2}):(\d{2})$/);
  const mSched = schedStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!mIn || !mSched) return 0;
  const inMins = parseInt(mIn[1], 10) * 60 + parseInt(mIn[2], 10);
  const schedMins = parseInt(mSched[1], 10) * 60 + parseInt(mSched[2], 10);
  const diff = inMins - schedMins;
  return diff > 0 ? diff : 0;
}

export function calculateEarlyLeaveMinutes(checkOut?: string, scheduleOut?: string): number {
  if (!checkOut || !scheduleOut) return 0;
  const outStr = formatTimeValue(checkOut);
  const schedStr = formatTimeValue(scheduleOut);
  const mOut = outStr.match(/^(\d{1,2}):(\d{2})$/);
  const mSched = schedStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!mOut || !mSched) return 0;
  const outMins = parseInt(mOut[1], 10) * 60 + parseInt(mOut[2], 10);
  const schedMins = parseInt(mSched[1], 10) * 60 + parseInt(mSched[2], 10);
  const diff = schedMins - outMins;
  return diff > 0 ? diff : 0;
}

const MONTH_PATTERNS: Array<{ pattern: RegExp; month: number }> = [
  { pattern: /(?:^|[^a-z])(januari|january|jan)(?:$|[^a-z])/i, month: 1 },
  { pattern: /(?:^|[^a-z])(februari|february|feb)(?:$|[^a-z])/i, month: 2 },
  { pattern: /(?:^|[^a-z])(maret|march|mar)(?:$|[^a-z])/i, month: 3 },
  { pattern: /(?:^|[^a-z])(april|apr)(?:$|[^a-z])/i, month: 4 },
  { pattern: /(?:^|[^a-z])(mei|may)(?:$|[^a-z])/i, month: 5 },
  { pattern: /(?:^|[^a-z])(juni|june|jun)(?:$|[^a-z])/i, month: 6 },
  { pattern: /(?:^|[^a-z])(juli|july|jul)(?:$|[^a-z])/i, month: 7 },
  { pattern: /(?:^|[^a-z])(agustus|august|agt|ags|aug)(?:$|[^a-z])/i, month: 8 },
  { pattern: /(?:^|[^a-z])(september|sept|sep)(?:$|[^a-z])/i, month: 9 },
  { pattern: /(?:^|[^a-z])(oktober|october|okt|oct)(?:$|[^a-z])/i, month: 10 },
  { pattern: /(?:^|[^a-z])(november|nov)(?:$|[^a-z])/i, month: 11 },
  { pattern: /(?:^|[^a-z])(desember|december|des|dec)(?:$|[^a-z])/i, month: 12 },
];

const INDO_MONTHS: Record<string, number> = {
  januari: 1, jan: 1, january: 1,
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

function findMonthInText(text: string): number | null {
  if (!text) return null;
  for (const { pattern, month } of MONTH_PATTERNS) {
    if (pattern.test(text)) {
      return month;
    }
  }
  return null;
}

function getLocalTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Attempt to extract a date string "YYYY-MM-DD" from any value (string, Excel serial number, Date)
 */
export function parseDateToIso(value: any, referenceYear?: number, referenceMonth?: number): string | null {
  if (value === null || value === undefined || value === '') return null;

  // If already Date instance (add 12h buffer when near UTC midnight to avoid negative-UTC date shifts)
  if (value instanceof Date && !isNaN(value.getTime())) {
    const isNearUtcMidnight =
      (value.getUTCHours() === 23 && value.getUTCMinutes() >= 50) ||
      (value.getUTCHours() === 0 && value.getUTCMinutes() <= 10);
    if (isNearUtcMidnight) {
      const shifted = new Date(value.getTime() + 12 * 3600 * 1000);
      return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
    }
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If Excel serial number (around 40000 - 60000)
  if (typeof value === 'number' && value > 35000 && value < 60000) {
    const excelEpoch = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(excelEpoch.getTime())) {
      const y = excelEpoch.getUTCFullYear();
      const m = String(excelEpoch.getUTCMonth() + 1).padStart(2, '0');
      const d = String(excelEpoch.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(value).trim();
  // Strip common file extension if parsing a filename
  const cleanStr = str.replace(/\.(xlsx|xls|csv)$/i, '').trim();

  // Match ISO YYYY-MM-DD (supports -, /, ., _)
  const isoMatch = cleanStr.match(/(?:^|[^0-9])(20\d\d)[-/._](0?[1-9]|1[0-2])[-/._](0?[1-9]|[12]\d|3[01])(?:$|[^0-9])/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Match DD/MM/YYYY or MM/DD/YYYY (supports -, /, ., _)
  const slash4Match = cleanStr.match(/(?:^|[^0-9])(0?[1-9]|[12]\d|3[01])[-/._](0?[1-9]|[12]\d|3[01])[-/._](20\d\d)(?:$|[^0-9])/);
  if (slash4Match) {
    const p1 = parseInt(slash4Match[1], 10);
    const p2 = parseInt(slash4Match[2], 10);
    const y = slash4Match[3];
    if (p2 <= 12 && p1 <= 31 && !(p1 <= 12 && p2 > 12)) {
      // Standard DD/MM/YYYY
      return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    if (p1 <= 12 && p2 > 12 && p2 <= 31) {
      // US MM/DD/YYYY
      return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
  }

  // Match 2-digit year DD/MM/YY or MM/DD/YY (e.g. SheetJS raw:false "11/24/26" or "24/11/26")
  const slash2Match = cleanStr.match(/(?:^|[^0-9])(0?[1-9]|[12]\d|3[01])[-/._](0?[1-9]|[12]\d|3[01])[-/._](\d{2})(?:$|[^0-9])/);
  if (slash2Match) {
    const p1 = parseInt(slash2Match[1], 10);
    const p2 = parseInt(slash2Match[2], 10);
    const y = `20${slash2Match[3]}`;
    if (p1 <= 12 && p2 > 12 && p2 <= 31) {
      // US MM/DD/YY
      return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
    }
    if (p2 <= 12 && p1 > 12 && p1 <= 31) {
      // ID DD/MM/YY
      return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    if (p1 <= 12 && p2 <= 12) {
      // Ambiguous: prefer referenceMonth if it matches one of them, else DD/MM/YY
      if (referenceMonth && p1 === referenceMonth && p2 !== referenceMonth) {
        return `${y}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      }
      return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
  }

  // Match text like "12 Oktober 2026", "12 Oct 2026", "24Nov2026", "24_Nov"
  const textDateMatch = cleanStr.match(/(?:^|[^0-9])(0?[1-9]|[12]\d|3[01])[\s\-_.]*([a-zA-Z]{3,12})(?:[\s\-_.]*(20\d\d))?(?:$|[^a-zA-Z0-9])/);
  if (textDateMatch) {
    const d = textDateMatch[1].padStart(2, '0');
    const monthKey = textDateMatch[2].toLowerCase();
    const mNum = INDO_MONTHS[monthKey];
    if (mNum) {
      const y = textDateMatch[3] ? textDateMatch[3] : String(referenceYear || new Date().getFullYear());
      return `${y}-${String(mNum).padStart(2, '0')}-${d}`;
    }
  }

  // If just a single day number "12" and we have reference year and month
  if (referenceYear && referenceMonth && /^(?:0?[1-9]|[12]\d|3[01])$/.test(cleanStr)) {
    const d = parseInt(cleanStr, 10);
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
 * Scan top metadata rows (above employee data rows) and filename to detect Year and Month.
 * Uses word-boundary matching so employee names (e.g. "Sumarni") never falsely match month names ("mar").
 */
function scanSheetMetadata(
  headerOnlyRows: any[][],
  fileName?: string,
  fallbackDate?: string
): { year: number; month: number } {
  const now = new Date();
  let detectedYear = now.getFullYear();
  let detectedMonth = now.getMonth() + 1;

  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
    const [fy, fm] = fallbackDate.split('-').map((n) => parseInt(n, 10));
    if (fy >= 2000 && fy <= 2100 && fm >= 1 && fm <= 12) {
      detectedYear = fy;
      detectedMonth = fm;
    }
  }

  const headerText = headerOnlyRows
    .map((r) => (Array.isArray(r) ? r.map((c) => String(c || '')).join(' ') : ''))
    .join(' ');
  const fileText = (fileName || '').replace(/\.(xlsx|xls|csv)$/i, '');
  const combinedPool = `${fileText} ${headerText}`;

  // Search for year (2020 - 2035)
  const yMatch = combinedPool.match(/\b(202[0-9]|203[0-5])\b/);
  if (yMatch) {
    detectedYear = parseInt(yMatch[1], 10);
  }

  // Prioritize explicit month in filename first, then header/title rows
  const fileMonth = findMonthInText(fileText);
  if (fileMonth) {
    detectedMonth = fileMonth;
  } else {
    const headerMonth = findMonthInText(headerText);
    if (headerMonth) {
      detectedMonth = headerMonth;
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
      primaryDate: options?.fallbackDate || getLocalTodayIso(),
      primaryEmployees: [],
    };
  }

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
  const rawNextRow = rows[bestHeaderIndex + 1] ? rows[bestHeaderIndex + 1].map((c) => String(c || '').trim()) : [];

  // Only treat next row as a subheader if it does not look like an employee record (e.g. name & id empty, or day numbers)
  let hasSubHeader = false;
  if (rawNextRow.length > 0) {
    const firstNonEmpty = rawNextRow.filter(Boolean);
    const looksLikeDayRow = firstNonEmpty.length > 0 && firstNonEmpty.every((v) => /^\d{1,2}$/.test(v) || findMonthInText(v) !== null);
    if (looksLikeDayRow) {
      hasSubHeader = true;
    }
  }
  const subHeaderRow = hasSubHeader ? rawNextRow : [];

  // Determine metadata only from title + header rows (NEVER employee rows)
  const metaRowsLimit = hasSubHeader ? bestHeaderIndex + 2 : bestHeaderIndex + 1;
  const meta = scanSheetMetadata(rows.slice(0, metaRowsLimit), options?.fileName, options?.fallbackDate);
  const activeYear = options?.defaultYear || meta.year;
  const activeMonth = options?.defaultMonth || meta.month;

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
  let colShift = -1;
  let colScheduleIn = -1;
  let colScheduleOut = -1;
  let colCheckIn = -1;
  let colCheckOut = -1;

  // Single attendance column candidate
  let colSingleAttendance = -1;

  // Multi-day matrix candidates: array of { colIndex: number, dateStr: string, dayNumber: number }
  const matrixDayColumns: { colIndex: number; dateStr: string; dayNumber: number }[] = [];

  headerRow.forEach((col, idx) => {
    const lower = col.toLowerCase().trim();
    const subCol = subHeaderRow[idx] ? subHeaderRow[idx].toLowerCase().trim() : '';

    let isKnownMetaCol = false;

    if (lower === 'no' || lower === 'no.' || lower === 'nomor') {
      colNo = idx;
      isKnownMetaCol = true;
    } else if (
      lower.includes('employee id') ||
      lower === 'employee' ||
      lower === 'nik' ||
      lower.includes('id karyawan') ||
      lower.includes('id pegawai') ||
      lower === 'nip' ||
      lower === 'id'
    ) {
      colId = idx;
      isKnownMetaCol = true;
    } else if (
      lower.includes('full name') ||
      lower === 'name' ||
      lower === 'nama' ||
      lower === 'nama lengkap' ||
      lower === 'nama karyawan' ||
      lower === 'employee name' ||
      (lower.includes('nama') && !lower.includes('sekolah') && !lower.includes('perusahaan'))
    ) {
      colName = idx;
      isKnownMetaCol = true;
    } else if (
      lower.includes('department') ||
      lower.includes('departemen') ||
      lower.includes('organ') ||
      lower.includes('divisi') ||
      lower.includes('bagian')
    ) {
      colDept = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('branch') || lower.includes('cabang') || lower.includes('lokasi')) {
      colBranch = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('job position') || lower.includes('jabatan') || lower.includes('posisi') || lower.includes('position')) {
      colPosition = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('job level') || lower.includes('level')) {
      colLevel = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('join date') || lower.includes('tgl masuk') || lower.includes('tanggal masuk')) {
      colJoinDate = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('employment status') || lower.includes('employm') || lower.includes('status kerja') || lower.includes('status pegawai')) {
      colStatusEmp = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('keterangan') || lower.includes('alasan') || lower.includes('notes') || lower.includes('catatan') || lower === 'ket') {
      colKeterangan = idx;
      isKnownMetaCol = true;
    } else if (lower === 'tanggal' || lower === 'tgl' || lower.includes('date') || lower === 'tgl presensi') {
      colRowDate = idx;
      isKnownMetaCol = true;
    } else if (lower === 'shift' || lower.includes('shift')) {
      colShift = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('schedule in') || lower.includes('jadwal masuk') || lower.includes('jam masuk')) {
      colScheduleIn = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('schedule out') || lower.includes('jadwal pulang') || lower.includes('jadwal keluar') || lower.includes('jam keluar')) {
      colScheduleOut = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('check in') || lower.includes('scan masuk') || lower.includes('check in.') || lower === 'in') {
      colCheckIn = idx;
      isKnownMetaCol = true;
    } else if (lower.includes('check out') || lower.includes('scan pulang') || lower.includes('scan keluar') || lower.includes('check ou') || lower === 'out') {
      colCheckOut = idx;
      isKnownMetaCol = true;
    } else if (
      lower.includes('attendan') ||
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

    // Check for Day Number in Matrix (either in headerRow or subHeaderRow), NEVER from metadata columns like NO/ID
    if (!isKnownMetaCol) {
      const possibleDayStr = /^\d{1,2}$/.test(col) ? col : (/^\d{1,2}$/.test(subCol) ? subCol : '');
      if (possibleDayStr) {
        const dNum = parseInt(possibleDayStr, 10);
        if (dNum >= 1 && dNum <= 31) {
          const colMonth = findMonthInText(col) || activeMonth;
          const dStr = `${activeYear}-${String(colMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
          matrixDayColumns.push({ colIndex: idx, dateStr: dStr, dayNumber: dNum });
        }
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
  if (rawNextRow.length > 0) {
    const subName = rawNextRow[colName] || '';
    const subId = rawNextRow[colId] || '';
    if (hasSubHeader || (!subName && !subId)) {
      dataStartIndex = bestHeaderIndex + 2;
    }
  }

  // Scan single date candidate from header/subheader (combining Month header + Day subheader when present)
  let detectedSingleDate: string | null = null;
  if (colSingleAttendance !== -1) {
    const headerMonth = findMonthInText(headerRow[colSingleAttendance] || '');
    detectedSingleDate = parseDateToIso(headerRow[colSingleAttendance], activeYear, headerMonth || activeMonth);
    if (!detectedSingleDate && subHeaderRow[colSingleAttendance]) {
      detectedSingleDate = parseDateToIso(subHeaderRow[colSingleAttendance], activeYear, headerMonth || activeMonth);
    }
  }
  if (!detectedSingleDate && matrixDayColumns.length === 1) {
    detectedSingleDate = matrixDayColumns[0].dateStr;
  }
  if (!detectedSingleDate) {
    const skipCols = new Set([colNo, colId, colName, colDept, colBranch, colPosition, colLevel, colJoinDate, colStatusEmp]);
    // Scan title rows and non-metadata header/subheader cells for explicit date
    for (let r = 0; r < dataStartIndex; r++) {
      const rowCells = rows[r] || [];
      for (let c = 0; c < rowCells.length; c++) {
        if (r >= bestHeaderIndex && skipCols.has(c)) continue;
        const headerCtxMonth = findMonthInText(headerRow[c] || '') || activeMonth;
        const parsed = parseDateToIso(rowCells[c], activeYear, headerCtxMonth);
        if (parsed) {
          detectedSingleDate = parsed;
          break;
        }
      }
      if (detectedSingleDate) break;
    }
  }

  // If still not found, check filename (full date first, then standalone day number e.g. "24.xlsx" or "Presensi 24.xlsx")
  if (!detectedSingleDate && options?.fileName) {
    detectedSingleDate = parseDateToIso(options.fileName, activeYear, activeMonth);
    if (!detectedSingleDate) {
      const cleanName = options.fileName.replace(/\.(xlsx|xls|csv)$/i, '').trim();
      const dayOnlyMatch = cleanName.match(/(?:^|[^0-9])(0?[1-9]|[12]\d|3[01])(?:$|[^0-9])/);
      if (dayOnlyMatch) {
        const dNum = parseInt(dayOnlyMatch[1], 10);
        detectedSingleDate = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      }
    }
  }

  // Fallback to active date
  const fallbackDate = detectedSingleDate || options?.fallbackDate || getLocalTodayIso();

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
        const rawId = String(row[colId] || '').trim();

        if ((!name || name === '-') && (!rawId || rawId === '-')) continue;
        if (!name && /^\d+$/.test(rawId)) continue;
        const id = rawId || `EMP-${dayEmployees.length + 1}`;
        if (name.toLowerCase().startsWith('total') || id.toLowerCase().startsWith('total')) continue;
        if (name.toLowerCase().startsWith('ringkasan') || name.toLowerCase().startsWith('rekap')) continue;

        const rawStatus = String(row[colIndex] || '').trim();
        // If whole column is blank, we'll check if it has entries
        const keterangan = colKeterangan !== -1 ? String(row[colKeterangan] || '').trim() : '';

        const normalizedStatus = normalizeAttendanceStatus(rawStatus, keterangan);
        const lateMinutes = extractLateMinutes(keterangan);

        const shift = colShift !== -1 ? String(row[colShift] || '').trim() : undefined;
        const scheduleIn = colScheduleIn !== -1 ? formatTimeValue(row[colScheduleIn]) : undefined;
        const scheduleOut = colScheduleOut !== -1 ? formatTimeValue(row[colScheduleOut]) : undefined;
        const checkIn = colCheckIn !== -1 ? formatTimeValue(row[colCheckIn]) : undefined;
        const checkOut = colCheckOut !== -1 ? formatTimeValue(row[colCheckOut]) : undefined;

        dayEmployees.push({
          no: dayEmployees.length + 1,
          employeeId: id || `EMP-${dayEmployees.length + 1}`,
          name: name || id,
          date: dateStr,
          shift,
          scheduleIn,
          scheduleOut,
          checkIn,
          checkOut,
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
      const shift = colShift !== -1 ? String(row[colShift] || '').trim() : undefined;
      const scheduleIn = colScheduleIn !== -1 ? formatTimeValue(row[colScheduleIn]) : undefined;
      const scheduleOut = colScheduleOut !== -1 ? formatTimeValue(row[colScheduleOut]) : undefined;
      const checkIn = colCheckIn !== -1 ? formatTimeValue(row[colCheckIn]) : undefined;
      const checkOut = colCheckOut !== -1 ? formatTimeValue(row[colCheckOut]) : undefined;
      const lateFromTime = calculateMinutesLate(checkIn, scheduleIn);
      const parsedLate = extractLateMinutes(keterangan);
      const lateMinutes = lateFromTime > 0 ? lateFromTime : parsedLate;
      const earlyLeaveMinutes = calculateEarlyLeaveMinutes(checkOut, scheduleOut);

      let normalizedStatus = normalizeAttendanceStatus(rawStatus, keterangan);
      if (normalizedStatus === 'hadir' && lateMinutes && lateMinutes > 0) {
        normalizedStatus = 'telat';
      }
      let finalKeterangan = keterangan;
      if (!finalKeterangan) {
        if (lateMinutes && lateMinutes > 0) {
          finalKeterangan = `Telat ${lateMinutes} menit`;
        } else if (normalizedStatus === 'hadir') {
          finalKeterangan = 'Tepat Waktu';
        }
      }

      if (!dailyRecords[dateStr]) {
        dailyRecords[dateStr] = [];
      }

      dailyRecords[dateStr].push({
        no: dailyRecords[dateStr].length + 1,
        employeeId: id || `EMP-${dailyRecords[dateStr].length + 1}`,
        name: name || id,
        date: dateStr,
        shift,
        scheduleIn,
        scheduleOut,
        checkIn,
        checkOut,
        department: colDept !== -1 ? String(row[colDept] || 'Umum').trim() : 'Umum',
        branch: colBranch !== -1 ? String(row[colBranch] || 'Pusat').trim() : 'Pusat',
        jobPosition: colPosition !== -1 ? String(row[colPosition] || 'Staff').trim() : 'Staff',
        jobLevel: colLevel !== -1 ? String(row[colLevel] || 'Staff').trim() : 'Staff',
        joinDate: colJoinDate !== -1 ? String(row[colJoinDate] || '-').trim() : '-',
        employmentStatus: colStatusEmp !== -1 ? String(row[colStatusEmp] || 'Contract').trim() : 'Contract',
        rawStatus,
        normalizedStatus,
        keterangan: finalKeterangan,
        lateMinutes,
        earlyLeaveMinutes: earlyLeaveMinutes > 0 ? earlyLeaveMinutes : undefined,
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
          idx !== colKeterangan &&
          idx !== colShift &&
          idx !== colScheduleIn &&
          idx !== colScheduleOut &&
          idx !== colCheckIn &&
          idx !== colCheckOut
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
    colKeterangan = kIdx !== -1 ? kIdx : -1;
  }

  const singleDayEmployees: EmployeeRecord[] = [];

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const name = String(row[colName] || '').trim();
    const id = String(row[colId] || '').trim();

    if ((!name || name === '-') && (!id || id === '-')) continue;
    if (!name && /^\d+$/.test(id)) continue; // Skip pre-numbered blank template rows
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
    const shift = colShift !== -1 ? String(row[colShift] || '').trim() : undefined;
    const scheduleIn = colScheduleIn !== -1 ? formatTimeValue(row[colScheduleIn]) : undefined;
    const scheduleOut = colScheduleOut !== -1 ? formatTimeValue(row[colScheduleOut]) : undefined;
    const checkIn = colCheckIn !== -1 ? formatTimeValue(row[colCheckIn]) : undefined;
    const checkOut = colCheckOut !== -1 ? formatTimeValue(row[colCheckOut]) : undefined;
    const rowDate = colRowDate !== -1 ? (parseDateToIso(row[colRowDate], activeYear, activeMonth) || String(row[colRowDate] || '').trim()) : undefined;

    const lateFromTime = calculateMinutesLate(checkIn, scheduleIn);
    const parsedLate = extractLateMinutes(keterangan);
    const lateMinutes = lateFromTime > 0 ? lateFromTime : parsedLate;
    const earlyLeaveMinutes = calculateEarlyLeaveMinutes(checkOut, scheduleOut);

    let normalizedStatus = normalizeAttendanceStatus(rawStatus, keterangan);
    if (normalizedStatus === 'hadir' && lateMinutes && lateMinutes > 0) {
      normalizedStatus = 'telat';
    }
    let finalKeterangan = keterangan;
    if (!finalKeterangan) {
      if (lateMinutes && lateMinutes > 0) {
        finalKeterangan = `Telat ${lateMinutes} menit`;
      } else if (normalizedStatus === 'hadir') {
        finalKeterangan = 'Tepat Waktu';
      }
    }

    singleDayEmployees.push({
      no,
      employeeId: id || `EMP-${singleDayEmployees.length + 1}`,
      name: name || id,
      date: rowDate || fallbackDate,
      shift,
      scheduleIn,
      scheduleOut,
      checkIn,
      checkOut,
      department,
      branch,
      jobPosition,
      jobLevel,
      joinDate,
      employmentStatus,
      rawStatus,
      normalizedStatus,
      keterangan: finalKeterangan,
      lateMinutes,
      earlyLeaveMinutes: earlyLeaveMinutes > 0 ? earlyLeaveMinutes : undefined,
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
