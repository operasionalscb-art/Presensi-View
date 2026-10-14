/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  testConnection,
} from './services/firebaseAuth';
import {
  fetchSpreadsheetRange,
} from './services/googleSheets';
import { parseRowsToEmployees } from './services/dataParser';
import { calculateRealMonthlyTrend, EMPTY_EMPLOYEES } from './data/initialData';
import { EmployeeRecord, DayTrendPoint } from './types/attendance';
import { Header } from './components/Header';
import { CumulativeStats } from './components/CumulativeStats';
import { AbsenceAndLateLists } from './components/AbsenceAndLateLists';
import { InteractiveTrendChart } from './components/InteractiveTrendChart';
import { MonthlyYearlyReports } from './components/MonthlyYearlyReports';
import { DataSourceModal } from './components/DataSourceModal';
import { AddRecordModal } from './components/AddRecordModal';
import {
  saveDayToFirestore,
  deleteDayFromFirestore,
  subscribeDailyRecords,
  StoredDayRecord,
} from './services/storageService';
import {
  CheckCircle2,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  PlusCircle,
  Database,
  CloudCheck,
} from 'lucide-react';

export default function App() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(EMPTY_EMPLOYEES);
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [sourceType, setSourceType] = useState<'google-sheets' | 'excel' | 'initial'>('excel');
  const [sourceName, setSourceName] = useState<string>('Firebase Firestore');
  const [connectedSpreadsheetId, setConnectedSpreadsheetId] = useState<string | undefined>();
  const [connectedSheetName, setConnectedSheetName] = useState<string | undefined>();

  // Firestore real-time stored records dictionary
  const [allDailyRecords, setAllDailyRecords] = useState<Record<string, StoredDayRecord>>({});
  const [isLoadingFirestore, setIsLoadingFirestore] = useState<boolean>(true);

  // Auto-sync
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [syncIntervalSec, setSyncIntervalSec] = useState<number>(15);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // View Mode: 'harian' (Daily Dashboard) or 'rekap' (Monthly & Yearly Aggregations from Daily Archives)
  const [viewMode, setViewMode] = useState<'harian' | 'rekap'>('harian');

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Initialize Auth & Firestore
  useEffect(() => {
    testConnection();

    const unsubscribeAuth = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    // Subscribe to real-time daily records from Cloud Firestore
    const unsubscribeFirestore = subscribeDailyRecords(
      (records) => {
        setAllDailyRecords(records);
        setIsLoadingFirestore(false);
        setLastSyncTime(new Date());
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setIsLoadingFirestore(false);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, []);

  // Update displayed employees whenever currentDate or allDailyRecords changes
  useEffect(() => {
    if (allDailyRecords[currentDate]) {
      setEmployees(allDailyRecords[currentDate].employees || []);
      setSourceName(allDailyRecords[currentDate].sourceName || 'Firebase Firestore');
    } else {
      setEmployees([]);
      setSourceName('Belum ada data untuk tanggal ini');
    }
  }, [currentDate, allDailyRecords]);

  // Extract day, month, and year from currentDate
  const { activeDay, monthName, year, monthNumber } = useMemo(() => {
    const d = new Date(currentDate);
    const day = isNaN(d.getDate()) ? 1 : d.getDate();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mNum = isNaN(d.getMonth()) ? 10 : d.getMonth() + 1;
    const m = months[mNum - 1];
    const y = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
    return { activeDay: day, monthName: m, year: y, monthNumber: mNum };
  }, [currentDate]);

  // Generate real monthly trend strictly from genuine records in Firestore
  const trendData: DayTrendPoint[] = useMemo(() => {
    return calculateRealMonthlyTrend(allDailyRecords, year, monthNumber);
  }, [allDailyRecords, year, monthNumber]);

  // Google sign in handler
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        showToast(`Berhasil masuk sebagai ${res.user.displayName || res.user.email}`);
        setIsSourceModalOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal masuk dengan Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showToast('Telah keluar dari akun Google.');
  };

  // Perform Google Sheets sync if connected
  const performSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      if (sourceType === 'google-sheets' && connectedSpreadsheetId && accessToken) {
        const rawRows = await fetchSpreadsheetRange(
          connectedSpreadsheetId,
          connectedSheetName || 'Sheet1',
          accessToken
        );
        const updatedEmployees = parseRowsToEmployees(rawRows);
        if (updatedEmployees.length > 0) {
          await saveDayToFirestore(currentDate, updatedEmployees, 'Google Sheets Sync');
        }
      }
      setLastSyncTime(new Date());
    } catch (error: any) {
      console.warn('Sync warning:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, sourceType, connectedSpreadsheetId, connectedSheetName, accessToken, currentDate]);

  // Periodic Auto-Sync Timer
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      performSync();
    }, syncIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [autoSync, syncIntervalSec, performSync]);

  const handleApplyNewData = async (
    newEmployees: EmployeeRecord[],
    newType: 'google-sheets' | 'excel' | 'initial',
    newName: string,
    sheetId?: string,
    sheetTab?: string
  ) => {
    setSourceType(newType);
    setSourceName(newName);
    setConnectedSpreadsheetId(sheetId);
    setConnectedSheetName(sheetTab);
    setLastSyncTime(new Date());

    // Save directly to Firebase Firestore
    try {
      await saveDayToFirestore(currentDate, newEmployees, newName);
      showToast(`Data presensi tanggal ${currentDate} berhasil disimpan ke Firebase (${newEmployees.length} karyawan).`);
    } catch (err: any) {
      showToast('Gagal menyimpan ke Firebase Firestore.');
    }
  };

  const handleAddEmployee = async (newRecord: EmployeeRecord) => {
    const updated = [newRecord, ...employees];
    try {
      await saveDayToFirestore(currentDate, updated, sourceName);
      showToast(`Input presensi "${newRecord.name}" berhasil disimpan ke Firebase.`);
    } catch (err: any) {
      showToast('Gagal menyimpan ke Firebase Firestore.');
    }
  };

  const handleDeleteDay = async (dateStr: string) => {
    try {
      await deleteDayFromFirestore(dateStr);
      showToast(`Data presensi tanggal ${dateStr} berhasil dihapus dari Firebase.`);
    } catch (err: any) {
      showToast('Gagal menghapus data dari Firebase.');
    }
  };

  const handleSelectDayFromChart = (day: number) => {
    const formatted = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setCurrentDate(formatted);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        sourceType={sourceType}
        sourceName={sourceName}
        autoSync={autoSync}
        onToggleAutoSync={() => setAutoSync(!autoSync)}
        syncIntervalSec={syncIntervalSec}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onManualRefresh={performSync}
        onOpenSourceModal={() => setIsSourceModalOpen(true)}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        user={user}
        onGoogleSignIn={handleGoogleSignIn}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
      />

      {/* View Switcher Bar & Firebase Backend Status */}
      <div className="bg-slate-900/90 text-slate-300 border-b border-slate-800 text-xs py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-lg border border-slate-700/80">
            <button
              onClick={() => setViewMode('harian')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'harian'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Presensi Harian</span>
            </button>
            <button
              onClick={() => setViewMode('rekap')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'rekap'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Rekap Bulanan & Tahunan</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              Database Cloud:{' '}
              <strong className="text-emerald-400">Firebase Firestore Aktif</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              Arsip Tersimpan:{' '}
              <strong className="text-slate-200">{Object.keys(allDailyRecords).length} Hari</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {viewMode === 'harian' ? (
          <>
            {/* Cumulative Stats: Highlights total on-time present employees cumulatively without individual names */}
            <CumulativeStats
              employees={employees}
              activeDateText={`${activeDay} ${monthName} ${year}`}
            />

            {/* Empty State Banner if no records on selected date */}
            {employees.length === 0 && !isLoadingFirestore && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Belum Ada Data Presensi Tanggal {activeDay} {monthName} {year}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Data dummy telah dihapus. Silakan upload file Excel presensi harian atau tambahkan data karyawan untuk menyimpan ke Firebase.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={() => setIsSourceModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload File Excel</span>
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Input Manual</span>
                  </button>
                </div>
              </div>
            )}

            {/* Detailed Breakdown: Specifically lists names, job positions, and reasons for late arrivals and absences */}
            {employees.length > 0 && <AbsenceAndLateLists employees={employees} />}

            {/* Interactive Monthly Trend: Attendance percentage strictly based on real recorded days */}
            <InteractiveTrendChart
              trendData={trendData}
              selectedDay={activeDay}
              onSelectDay={handleSelectDayFromChart}
              monthName={monthName}
              year={year}
            />
          </>
        ) : (
          /* Monthly & Yearly Aggregation Reports */
          <MonthlyYearlyReports
            currentYear={year}
            currentMonth={monthNumber}
            records={allDailyRecords}
            onSelectDate={(dateStr) => {
              setCurrentDate(dateStr);
              setViewMode('harian');
              showToast(`Membuka data presensi tanggal ${dateStr}`);
            }}
            onDeleteDate={handleDeleteDay}
            onGoToDailyUpload={() => {
              setViewMode('harian');
              setIsSourceModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Modals */}
      <DataSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        user={user}
        accessToken={accessToken}
        onGoogleSignIn={handleGoogleSignIn}
        onApplyNewData={handleApplyNewData}
        activeSource={{
          type: sourceType,
          name: sourceName,
          spreadsheetId: connectedSpreadsheetId,
          sheetName: connectedSheetName,
        }}
      />

      <AddRecordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddEmployee={handleAddEmployee}
        currentCount={employees.length}
      />
    </div>
  );
}
