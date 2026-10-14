import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDocFromServer,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from './firebaseAuth';
import { StoredDayRecord } from './storageService';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection per skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'attendance_days', 'health_check'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status:', error.message);
    }
    return false;
  }
}

// Save a day's attendance record to Firestore collection attendance_days
export async function saveDayRecordToFirestore(record: StoredDayRecord): Promise<void> {
  const path = `attendance_days/${record.date}`;
  try {
    // Sanitize data according to schema
    const cleanEmployees = record.employees.map((e) => ({
      no: e.no || 0,
      employeeId: String(e.employeeId || ''),
      name: String(e.name || ''),
      department: String(e.department || ''),
      branch: String(e.branch || 'Pusat'),
      jobPosition: String(e.jobPosition || ''),
      jobLevel: String(e.jobLevel || 'Staff'),
      joinDate: String(e.joinDate || ''),
      employmentStatus: String(e.employmentStatus || 'Contract'),
      rawStatus: String(e.rawStatus || ''),
      normalizedStatus: String(e.normalizedStatus || 'hadir'),
      keterangan: String(e.keterangan || ''),
      lateMinutes: e.lateMinutes || 0,
    }));

    const docPayload = {
      date: record.date,
      day: record.day,
      month: record.month,
      year: record.year,
      sourceName: record.sourceName || 'Presensi Harian',
      uploadedAt: record.uploadedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      employees: cleanEmployees,
    };

    await setDoc(doc(db, 'attendance_days', record.date), docPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch all attendance days from Firestore
export async function fetchAllDaysFromFirestore(): Promise<Record<string, StoredDayRecord>> {
  const path = 'attendance_days';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const results: Record<string, StoredDayRecord> = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.date && Array.isArray(data.employees)) {
        results[data.date] = {
          date: data.date,
          day: Number(data.day) || new Date(data.date).getDate(),
          month: Number(data.month) || new Date(data.date).getMonth() + 1,
          year: Number(data.year) || new Date(data.date).getFullYear(),
          sourceName: data.sourceName || 'Firestore Cloud',
          uploadedAt: data.uploadedAt || new Date().toISOString(),
          employees: data.employees,
        };
      }
    });

    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return {};
  }
}
