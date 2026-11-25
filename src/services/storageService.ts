import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebaseAuth';
import { EmployeeRecord } from '../types/attendance';

export interface StoredDayRecord {
  date: string; // "YYYY-MM-DD"
  day: number;
  month: number; // 1 - 12
  year: number;
  sourceName: string;
  uploadedAt: string;
  updatedAt?: string;
  totalEmployees: number;
  employees: EmployeeRecord[];
}

export interface EmployeeAccumulation {
  employeeId: string;
  name: string;
  department: string;
  jobPosition: string;
  totalDays: number;
  totalHadir: number;
  totalTelat: number;
  totalLateMinutes: number;
  totalIzin: number;
  totalSakit: number;
  totalCuti: number;
  totalAlpha: number;
  attendanceRate: number;
}

export interface MonthReport {
  year: number;
  month: number;
  monthName: string;
  recordedDaysCount: number;
  totalEmployeesTracked: number;
  avgAttendanceRate: number;
  totalTelatCases: number;
  totalIzinCases: number;
  totalSakitCases: number;
  totalCutiCases: number;
  totalAlphaCases: number;
  topLateEmployees: EmployeeAccumulation[];
  employeeSummaries: EmployeeAccumulation[];
}

export interface YearReport {
  year: number;
  recordedDaysCount: number;
  monthlyStats: {
    month: number;
    monthName: string;
    daysCount: number;
    avgRate: number;
    totalTelat: number;
    totalAbsen: number;
  }[];
  overallRate: number;
  totalTelatYear: number;
  totalIzinYear: number;
  totalSakitYear: number;
  totalCutiYear: number;
  totalAlphaYear: number;
  topFrequentAbsenceEmployees: EmployeeAccumulation[];
}

const COLLECTION_NAME = 'daily_records';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function buildDayRecordPayload(
  dateStr: string,
  employees: EmployeeRecord[],
  sourceName: string = 'Upload Excel'
): StoredDayRecord {
  const cleanDate = String(dateStr || '').trim();
  const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Format tanggal tidak valid ("${dateStr}"). Gunakan format YYYY-MM-DD.`);
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Tanggal di luar jangkauan yang valid ("${cleanDate}").`);
  }

  if (employees.length > 1000) {
    throw new Error(`Jumlah baris karyawan (${employees.length}) melebihi batas maksimal 1000 baris per hari.`);
  }

  const nowIso = new Date().toISOString();

  return {
    date: cleanDate,
    day,
    month,
    year,
    sourceName: String(sourceName || 'Upload Excel').slice(0, 200),
    uploadedAt: nowIso,
    updatedAt: nowIso,
    totalEmployees: employees.length,
    employees: employees.map((e, index) => ({
      no: Number(e.no) || index + 1,
      employeeId: String(e.employeeId || `EMP-${index + 1}`).trim().slice(0, 64),
      name: String(e.name || e.employeeId || `Karyawan ${index + 1}`).trim().slice(0, 150),
      date: cleanDate,
      shift: String(e.shift || 'Guru').trim(),
      scheduleIn: String(e.scheduleIn || '07:00').trim(),
      scheduleOut: String(e.scheduleOut || '16:00').trim(),
      checkIn: String(e.checkIn || '').trim(),
      checkOut: String(e.checkOut || '').trim(),
      department: String(e.department || 'Umum').trim().slice(0, 100),
      branch: String(e.branch || 'Pusat').trim().slice(0, 100),
      jobPosition: String(e.jobPosition || 'Staff').trim().slice(0, 100),
      jobLevel: String(e.jobLevel || 'Staff').trim().slice(0, 100),
      joinDate: String(e.joinDate || '-').trim().slice(0, 50),
      employmentStatus: String(e.employmentStatus || 'Contract').trim().slice(0, 50),
      rawStatus: String(e.rawStatus || '').trim().slice(0, 50),
      normalizedStatus: e.normalizedStatus || 'hadir',
      keterangan: String(e.keterangan || '').trim().slice(0, 500),
      lateMinutes: typeof e.lateMinutes === 'number' && !isNaN(e.lateMinutes) ? e.lateMinutes : 0,
      earlyLeaveMinutes:
        typeof e.earlyLeaveMinutes === 'number' && !isNaN(e.earlyLeaveMinutes) ? e.earlyLeaveMinutes : 0,
    })),
  };
}

function normalizeDocSnapshot(docId: string, rawData: any): StoredDayRecord | null {
  if (!rawData || !Array.isArray(rawData.employees)) return null;
  const dateKey = String(rawData.date || docId || '').trim();
  if (!dateKey) return null;

  const parts = dateKey.split('-');
  const year = Number(rawData.year) || (parts[0] ? parseInt(parts[0], 10) : 2026);
  const month = Number(rawData.month) || (parts[1] ? parseInt(parts[1], 10) : 1);
  const day = Number(rawData.day) || (parts[2] ? parseInt(parts[2], 10) : 1);

  return {
    ...rawData,
    date: dateKey,
    year,
    month,
    day,
    sourceName: rawData.sourceName || 'Firebase Firestore',
    uploadedAt: rawData.uploadedAt || new Date().toISOString(),
    totalEmployees: Number(rawData.totalEmployees) || rawData.employees.length,
    employees: rawData.employees,
  };
}

/**
 * Save or overwrite a daily attendance record in Cloud Firestore
 */
export async function saveDayToFirestore(
  dateStr: string,
  employees: EmployeeRecord[],
  sourceName: string = 'Upload Excel'
): Promise<StoredDayRecord> {
  const recordPayload = buildDayRecordPayload(dateStr, employees, sourceName);
  const docPath = `${COLLECTION_NAME}/${recordPayload.date}`;
  try {
    await setDoc(doc(db, COLLECTION_NAME, recordPayload.date), recordPayload);
    return recordPayload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

/**
 * Save multiple daily attendance records to Cloud Firestore atomically in batches
 */
export async function saveMultipleDaysToFirestore(
  records: Record<string, { employees: EmployeeRecord[]; sourceName?: string }>
): Promise<{ savedDates: string[]; savedRecords: Record<string, StoredDayRecord> }> {
  const dates = Object.keys(records).sort();
  const savedDates: string[] = [];
  const savedRecords: Record<string, StoredDayRecord> = {};

  const payloads: StoredDayRecord[] = [];
  for (const dateStr of dates) {
    const entry = records[dateStr];
    if (entry && entry.employees && entry.employees.length > 0) {
      const payload = buildDayRecordPayload(dateStr, entry.employees, entry.sourceName || 'Upload Excel');
      payloads.push(payload);
    }
  }

  if (payloads.length === 0) {
    return { savedDates, savedRecords };
  }

  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
      const chunk = payloads.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const payload of chunk) {
        batch.set(doc(db, COLLECTION_NAME, payload.date), payload);
      }
      await batch.commit();
      for (const payload of chunk) {
        savedDates.push(payload.date);
        savedRecords[payload.date] = payload;
      }
    }
    return { savedDates, savedRecords };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    throw error;
  }
}

/**
 * Delete a daily record from Firestore
 */
export async function deleteDayFromFirestore(dateStr: string): Promise<void> {
  const docPath = `${COLLECTION_NAME}/${dateStr}`;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, dateStr));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Clear all daily attendance records from Firestore (useful for resetting or cleaning simulation)
 */
export async function clearAllDailyRecordsFromFirestore(): Promise<number> {
  const collectionRef = collection(db, COLLECTION_NAME);
  try {
    const snapshot = await getDocs(collectionRef);
    let count = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
      count++;
    }
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
    return 0;
  }
}

/**
 * Real-time listener for all daily attendance archives in Firestore
 */
export function subscribeDailyRecords(
  onUpdate: (records: Record<string, StoredDayRecord>) => void,
  onError?: (err: Error) => void
): () => void {
  const collectionRef = collection(db, COLLECTION_NAME);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const recordsMap: Record<string, StoredDayRecord> = {};
      snapshot.forEach((docSnap) => {
        const normalized = normalizeDocSnapshot(docSnap.id, docSnap.data());
        if (normalized) {
          recordsMap[normalized.date] = normalized;
        }
      });
      onUpdate(recordsMap);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
    }
  );
}

/**
 * Fetch all records once from Firestore
 */
export async function fetchAllDailyRecords(): Promise<Record<string, StoredDayRecord>> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const recordsMap: Record<string, StoredDayRecord> = {};
    querySnapshot.forEach((docSnap) => {
      const normalized = normalizeDocSnapshot(docSnap.id, docSnap.data());
      if (normalized) {
        recordsMap[normalized.date] = normalized;
      }
    });
    return recordsMap;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return {};
  }
}

// Calculate Monthly Summary from genuine stored Firestore records
export function calculateMonthlyReport(
  history: Record<string, StoredDayRecord>,
  year: number,
  month: number
): MonthReport {
  const dayRecords = Object.values(history).filter(
    (item) => item.year === year && item.month === month && item.employees && item.employees.length > 0
  );

  const empMap = new Map<string, EmployeeAccumulation>();

  let totalTelatCases = 0;
  let totalIzinCases = 0;
  let totalSakitCases = 0;
  let totalCutiCases = 0;
  let totalAlphaCases = 0;
  let sumAttendanceRates = 0;

  dayRecords.forEach((record) => {
    let dayHadir = 0;
    let dayTelat = 0;

    record.employees.forEach((emp) => {
      let acc = empMap.get(emp.employeeId);
      if (!acc) {
        acc = {
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          jobPosition: emp.jobPosition,
          totalDays: 0,
          totalHadir: 0,
          totalTelat: 0,
          totalLateMinutes: 0,
          totalIzin: 0,
          totalSakit: 0,
          totalCuti: 0,
          totalAlpha: 0,
          attendanceRate: 0,
        };
        empMap.set(emp.employeeId, acc);
      }

      acc.totalDays += 1;
      if (emp.normalizedStatus === 'hadir') {
        acc.totalHadir += 1;
        dayHadir += 1;
      } else if (emp.normalizedStatus === 'telat') {
        acc.totalTelat += 1;
        acc.totalLateMinutes += emp.lateMinutes || 0;
        totalTelatCases += 1;
        dayTelat += 1;
      } else if (emp.normalizedStatus === 'izin') {
        acc.totalIzin += 1;
        totalIzinCases += 1;
      } else if (emp.normalizedStatus === 'sakit') {
        acc.totalSakit += 1;
        totalSakitCases += 1;
      } else if (emp.normalizedStatus === 'cuti') {
        acc.totalCuti += 1;
        totalCutiCases += 1;
      } else if (emp.normalizedStatus === 'alpha') {
        acc.totalAlpha += 1;
        totalAlphaCases += 1;
      }
    });

    const totalEmpsInDay = record.employees.length;
    if (totalEmpsInDay > 0) {
      sumAttendanceRates += ((dayHadir + dayTelat) / totalEmpsInDay) * 100;
    }
  });

  const empSummaries: EmployeeAccumulation[] = Array.from(empMap.values()).map((emp) => {
    const rate = emp.totalDays > 0 ? Math.round(((emp.totalHadir + emp.totalTelat) / emp.totalDays) * 1000) / 10 : 0;
    return { ...emp, attendanceRate: rate };
  });

  const avgAttendanceRate =
    dayRecords.length > 0 ? Math.round((sumAttendanceRates / dayRecords.length) * 10) / 10 : 0;

  const topLateEmployees = [...empSummaries]
    .filter((e) => e.totalTelat > 0)
    .sort((a, b) => b.totalTelat - a.totalTelat || b.totalLateMinutes - a.totalLateMinutes);

  return {
    year,
    month,
    monthName: MONTH_NAMES[month - 1] || `Bulan ${month}`,
    recordedDaysCount: dayRecords.length,
    totalEmployeesTracked: empSummaries.length,
    avgAttendanceRate,
    totalTelatCases,
    totalIzinCases,
    totalSakitCases,
    totalCutiCases,
    totalAlphaCases,
    topLateEmployees,
    employeeSummaries: empSummaries.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// Calculate Yearly Summary from genuine stored Firestore records
export function calculateYearlyReport(
  history: Record<string, StoredDayRecord>,
  year: number
): YearReport {
  const yearRecords = Object.values(history).filter(
    (item) => item.year === year && item.employees && item.employees.length > 0
  );

  const monthlyStats = [];
  let totalTelatYear = 0;
  let totalIzinYear = 0;
  let totalSakitYear = 0;
  let totalCutiYear = 0;
  let totalAlphaYear = 0;
  let sumRates = 0;
  let activeMonthCount = 0;

  for (let m = 1; m <= 12; m++) {
    const mRecords = yearRecords.filter((r) => r.month === m);
    if (mRecords.length === 0) {
      monthlyStats.push({
        month: m,
        monthName: MONTH_NAMES[m - 1],
        daysCount: 0,
        avgRate: 0,
        totalTelat: 0,
        totalAbsen: 0,
      });
      continue;
    }

    let mHadir = 0;
    let mTelat = 0;
    let mAbsen = 0;
    let mTotalEmps = 0;

    mRecords.forEach((r) => {
      r.employees.forEach((e) => {
        mTotalEmps += 1;
        if (e.normalizedStatus === 'hadir') mHadir += 1;
        else if (e.normalizedStatus === 'telat') {
          mTelat += 1;
          totalTelatYear += 1;
        } else if (e.normalizedStatus === 'izin') {
          mAbsen += 1;
          totalIzinYear += 1;
        } else if (e.normalizedStatus === 'sakit') {
          mAbsen += 1;
          totalSakitYear += 1;
        } else if (e.normalizedStatus === 'cuti') {
          mAbsen += 1;
          totalCutiYear += 1;
        } else if (e.normalizedStatus === 'alpha') {
          mAbsen += 1;
          totalAlphaYear += 1;
        }
      });
    });

    const avgRate = mTotalEmps > 0 ? Math.round(((mHadir + mTelat) / mTotalEmps) * 1000) / 10 : 0;
    sumRates += avgRate;
    activeMonthCount += 1;

    monthlyStats.push({
      month: m,
      monthName: MONTH_NAMES[m - 1],
      daysCount: mRecords.length,
      avgRate,
      totalTelat: mTelat,
      totalAbsen: mAbsen,
    });
  }

  // Employee overall aggregation
  const empMap = new Map<string, EmployeeAccumulation>();
  yearRecords.forEach((r) => {
    r.employees.forEach((emp) => {
      let acc = empMap.get(emp.employeeId);
      if (!acc) {
        acc = {
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          jobPosition: emp.jobPosition,
          totalDays: 0,
          totalHadir: 0,
          totalTelat: 0,
          totalLateMinutes: 0,
          totalIzin: 0,
          totalSakit: 0,
          totalCuti: 0,
          totalAlpha: 0,
          attendanceRate: 0,
        };
        empMap.set(emp.employeeId, acc);
      }
      acc.totalDays += 1;
      if (emp.normalizedStatus === 'hadir') acc.totalHadir += 1;
      else if (emp.normalizedStatus === 'telat') {
        acc.totalTelat += 1;
        acc.totalLateMinutes += emp.lateMinutes || 0;
      } else if (emp.normalizedStatus === 'izin') acc.totalIzin += 1;
      else if (emp.normalizedStatus === 'sakit') acc.totalSakit += 1;
      else if (emp.normalizedStatus === 'cuti') acc.totalCuti += 1;
      else if (emp.normalizedStatus === 'alpha') acc.totalAlpha += 1;
    });
  });

  const empSummaries = Array.from(empMap.values()).map((emp) => ({
    ...emp,
    attendanceRate: emp.totalDays > 0 ? Math.round(((emp.totalHadir + emp.totalTelat) / emp.totalDays) * 1000) / 10 : 0,
  }));

  const topFrequentAbsenceEmployees = empSummaries
    .filter((e) => e.totalIzin + e.totalSakit + e.totalCuti + e.totalAlpha > 0)
    .sort((a, b) => (b.totalIzin + b.totalSakit + b.totalCuti + b.totalAlpha) - (a.totalIzin + a.totalSakit + a.totalCuti + a.totalAlpha));

  const overallRate = activeMonthCount > 0 ? Math.round((sumRates / activeMonthCount) * 10) / 10 : 0;

  return {
    year,
    recordedDaysCount: yearRecords.length,
    monthlyStats,
    overallRate,
    totalTelatYear,
    totalIzinYear,
    totalSakitYear,
    totalCutiYear,
    totalAlphaYear,
    topFrequentAbsenceEmployees,
  };
}
