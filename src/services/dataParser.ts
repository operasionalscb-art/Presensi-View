import { EmployeeRecord, NormalizedStatus } from '../types/attendance';

export function normalizeAttendanceStatus(rawStatus: string, keterangan: string): NormalizedStatus {
  const s = (rawStatus || '').toUpperCase().trim();
  const k = (keterangan || '').toLowerCase().trim();

  // Shift / Dinas / Off check
  if (k.includes('shift') || k.includes('dinas') || k.includes('tugas luar') || s === 'OFF') {
    return 'shift_khusus';
  }

  // Late check
  if (s.includes('LI') || s.includes('NCO') || s.includes('TELAT') || k.includes('telat') || k.includes('menit')) {
    return 'telat';
  }

  // Sakit
  if (s === 'S' || s.startsWith('SAKIT') || k.includes('sakit') || k.includes('dokter') || k.includes('rawat')) {
    return 'sakit';
  }

  // Izin
  if (s === 'I' || s.startsWith('IZIN') || k.includes('izin') || k.includes('keperluan')) {
    return 'izin';
  }

  // Cuti
  if (s === 'C' || s.startsWith('CUTI') || k.includes('cuti') || k.includes('tahunan')) {
    return 'cuti';
  }

  // Hadir tepat waktu
  if (s === 'H' || s === 'HADIR' || s === 'PRESENT' || s === 'MASUK') {
    return 'hadir';
  }

  // Alpha / Tanpa keterangan
  if (s === 'A' || s === 'ALPHA' || s === 'ALPA' || s === 'TK') {
    return 'alpha';
  }

  if (!s && !k) {
    return 'alpha';
  }

  return 'hadir';
}

export function extractLateMinutes(keterangan: string): number | undefined {
  if (!keterangan) return undefined;
  const match = keterangan.match(/(\d+)\s*menit/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

export function parseRowsToEmployees(rows: any[][]): EmployeeRecord[] {
  if (!rows || rows.length === 0) return [];

  // Find header row containing Employee ID or Name
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const rowStr = rows[i].map((cell) => String(cell || '').toLowerCase()).join(' ');
    if (rowStr.includes('employee id') || rowStr.includes('nama') || rowStr.includes('name')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headerRow = rows[headerRowIndex].map((c) => String(c || '').trim());
  const subHeaderRow = rows[headerRowIndex + 1] ? rows[headerRowIndex + 1].map((c) => String(c || '').trim()) : [];

  // Locate column indexes
  let colNo = -1;
  let colId = -1;
  let colName = -1;
  let colDept = -1;
  let colBranch = -1;
  let colPosition = -1;
  let colLevel = -1;
  let colJoinDate = -1;
  let colStatusEmp = -1;
  let colAttendance = -1;
  let colKeterangan = -1;

  headerRow.forEach((col, idx) => {
    const lower = col.toLowerCase();
    if (lower === 'no' || lower === 'no.') colNo = idx;
    else if (lower.includes('employee id') || lower.includes('nik') || lower.includes('id karyawan')) colId = idx;
    else if (lower === 'name' || lower === 'nama' || lower === 'nama lengkap') colName = idx;
    else if (lower.includes('department') || lower.includes('departemen')) colDept = idx;
    else if (lower.includes('branch') || lower.includes('cabang')) colBranch = idx;
    else if (lower.includes('job position') || lower.includes('jabatan') || lower.includes('posisi')) colPosition = idx;
    else if (lower.includes('job level') || lower.includes('level')) colLevel = idx;
    else if (lower.includes('join date') || lower.includes('tgl masuk') || lower.includes('tanggal masuk')) colJoinDate = idx;
    else if (lower.includes('employment status') || lower.includes('status kerja')) colStatusEmp = idx;
    else if (lower.includes('keterangan') || lower.includes('alasan') || lower.includes('notes')) colKeterangan = idx;
  });

  // Fallbacks if columns not strictly labeled by name:
  // Typical structure from user's image:
  // 0: NO, 1: Employee ID, 2: Name, 3: Department, 4: Branch, 5: Job Position, 6: Job Level, 7: Join Date, 8: Employment Status, 9: Date (October/12), 10: Keterangan
  if (colId === -1) colId = 1;
  if (colName === -1) colName = 2;
  if (colDept === -1) colDept = 3;
  if (colBranch === -1) colBranch = 4;
  if (colPosition === -1) colPosition = 5;
  if (colLevel === -1) colLevel = 6;
  if (colJoinDate === -1) colJoinDate = 7;
  if (colStatusEmp === -1) colStatusEmp = 8;
  if (colAttendance === -1) colAttendance = 9;
  if (colKeterangan === -1) {
    colKeterangan = headerRow.findIndex((c) => c.toLowerCase().includes('keterangan'));
    if (colKeterangan === -1) colKeterangan = 10;
  }

  // Determine starting row for data (skip header & subheader if subheader has numbers like '12')
  let dataStartIndex = headerRowIndex + 1;
  if (subHeaderRow.length > 0) {
    const subHeaderSample = subHeaderRow.join(' ');
    // If subheader has day numbers like 1, 2, 12 or empty cells under columns
    if (subHeaderRow[colName] === '' || subHeaderRow[colId] === '' || /^\d+$/.test(subHeaderRow[colAttendance] || '')) {
      dataStartIndex = headerRowIndex + 2;
    }
  }

  const employees: EmployeeRecord[] = [];

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const name = String(row[colName] || '').trim();
    const id = String(row[colId] || '').trim();

    // Skip empty lines or summary rows
    if (!name && !id) continue;
    if (name.toLowerCase().startsWith('total') || id.toLowerCase().startsWith('total')) continue;

    const rawNo = parseInt(String(row[colNo] || ''), 10);
    const no = isNaN(rawNo) ? employees.length + 1 : rawNo;
    const department = String(row[colDept] || 'Umum').trim();
    const branch = String(row[colBranch] || 'Pusat').trim();
    const jobPosition = String(row[colPosition] || 'Staff').trim();
    const jobLevel = String(row[colLevel] || 'Staff').trim();
    const joinDate = String(row[colJoinDate] || '-').trim();
    const employmentStatus = String(row[colStatusEmp] || 'Contract').trim();
    const rawStatus = String(row[colAttendance] || '').trim();
    const keterangan = String(row[colKeterangan] || '').trim();

    const normalizedStatus = normalizeAttendanceStatus(rawStatus, keterangan);
    const lateMinutes = extractLateMinutes(keterangan);

    employees.push({
      no,
      employeeId: id,
      name,
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

  return employees;
}
