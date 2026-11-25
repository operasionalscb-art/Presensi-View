/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { AbsenceAndLateLists, EmployeeListTab } from './components/AbsenceAndLateLists';
import { DisciplineRanking } from './components/DisciplineRanking';
import { InteractiveTrendChart } from './components/InteractiveTrendChart';
import { MonthlyYearlyReports } from './components/MonthlyYearlyReports';
import { DataSourceModal } from './components/DataSourceModal';
import { AddRecordModal } from './components/AddRecordModal';
import { SAMPLE_IMAGE_EMPLOYEES, SAMPLE_IMAGE_DATE } from './data/sampleImageRecords';
import {
  saveDayToFirestore,
  saveMultipleDaysToFirestore,
  deleteDayFromFirestore,
  subscribeDailyRecords,
  fetchAllDailyRecords,
  StoredDayRecord,
} from './services/storageService';
import {
  CheckCircle2,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  PlusCircle,
  Database,
  Trophy,
  Table as TableIcon,
  Sparkles,
} from 'lucide-react';

function getLocalTodayIso(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(EMPTY_EMPLOYEES);
  const [currentDate, setCurrentDate] = useState<string>(() => getLocalTodayIso());
  const hasAutoSelectedLatestRef = useRef<boolean>(false);
  const currentDateRef = useRef<string>(currentDate);
  currentDateRef.current = currentDate;

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

  // View Mode: 'harian' (Daily Dashboard), 'ranking' (Discipline Ranking), or 'rekap' (Monthly & Yearly Aggregations)
  const [viewMode, setViewMode] = useState<'harian' | 'ranking' | 'rekap'>('harian');
  const [employeeListTab, setEmployeeListTab] = useState<EmployeeListTab>('all');
  const [activeMainSubTab, setActiveMainSubTab] = useState<'table' | 'ranking'>('table');

  // Load sample dataset matching user uploaded image format into Firestore
  const handleLoadSampleImageData = async () => {
    try {
      showToast('Menyimpan contoh data format tabel gambar (17 Sept 2026) ke Firebase...');
      await saveDayToFirestore(
        SAMPLE_IMAGE_DATE,
        SAMPLE_IMAGE_EMPLOYEES,
        'Format Tabel Gambar (17 Sept 2026)'
      );
      setCurrentDate(SAMPLE_IMAGE_DATE);
      showToast('Berhasil memuat 13 data presensi sesuai format tabel gambar!');
    } catch (err: any) {
      console.error('Error loading sample image data:', err);
      showToast(`Gagal memuat: ${err.message || 'Coba lagi'}`);
    }
  };

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
        setAllDailyRecords((prev) => {
          // Preserve any optimistic records not yet echoed if snapshot is empty while offline
          const merged = Object.keys(records).length > 0 ? records : prev;
          return merged;
        });
        if (!hasAutoSelectedLatestRef.current) {
          hasAutoSelectedLatestRef.current = true;
          const active = currentDateRef.current;
          const dates = Object.keys(records).sort();
          if (!records[active] && dates.length > 0) {
            setCurrentDate(dates[dates.length - 1]);
          }
        }
        setIsLoadingFirestore(false);
        setLastSyncTime(new Date());
      },
      async (err) => {
        console.error('Firestore subscription error:', err);
        try {
          const fallback = await fetchAllDailyRecords();
          setAllDailyRecords(fallback);
          if (!hasAutoSelectedLatestRef.current) {
            hasAutoSelectedLatestRef.current = true;
            const dates = Object.keys(fallback).sort();
            if (!fallback[currentDateRef.current] && dates.length > 0) {
              setCurrentDate(dates[dates.length - 1]);
            }
          }
        } catch (fetchErr) {
          console.error('Fallback fetch error:', fetchErr);
        } finally {
          setIsLoadingFirestore(false);
        }
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

  // Extract day, month, and year from currentDate (using string splitting to avoid timezone bugs)
  const { activeDay, monthName, year, monthNumber } = useMemo(() => {
    const parts = (currentDate || '').split('-');
    let y = parseInt(parts[0], 10);
    let mNum = parseInt(parts[1], 10);
    let day = parseInt(parts[2], 10);

    if (isNaN(y) || isNaN(mNum) || isNaN(day)) {
      const today = new Date();
      y = today.getFullYear();
      mNum = today.getMonth() + 1;
      day = today.getDate();
    }

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const m = months[mNum - 1] || 'Januari';
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

  const handleSelectDateManual = useCallback((nextDate: string) => {
    hasAutoSelectedLatestRef.current = true;
    setCurrentDate(nextDate);
  }, []);

  // Perform Google Sheets sync + Firestore refresh
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
          const saved = await saveDayToFirestore(currentDate, updatedEmployees, 'Google Sheets Sync');
          setAllDailyRecords((prev) => ({ ...prev, [saved.date]: saved }));
        }
      } else {
        const fresh = await fetchAllDailyRecords();
        if (Object.keys(fresh).length > 0) {
          setAllDailyRecords(fresh);
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
    sheetTab?: string,
    targetDate?: string,
    multiDayRecords?: Record<string, EmployeeRecord[]>
  ) => {
    hasAutoSelectedLatestRef.current = true;
    setSourceType(newType);
    setSourceName(newName);
    setConnectedSpreadsheetId(sheetId);
    setConnectedSheetName(sheetTab);
    setLastSyncTime(new Date());

    if (multiDayRecords && Object.keys(multiDayRecords).length > 1) {
      // MULTI-DAY BATCH SAVE TO FIRESTORE
      const dates = Object.keys(multiDayRecords);
      const batchPayload: Record<string, { employees: EmployeeRecord[]; sourceName?: string }> = {};
      dates.forEach((d) => {
        batchPayload[d] = { employees: multiDayRecords[d], sourceName: newName };
      });
      try {
        const { savedDates, savedRecords } = await saveMultipleDaysToFirestore(batchPayload);
        if (Object.keys(savedRecords).length > 0) {
          setAllDailyRecords((prev) => ({ ...prev, ...savedRecords }));
        }
        const lastDate = savedDates[savedDates.length - 1];
        if (lastDate) setCurrentDate(lastDate);
        showToast(`Berhasil menyimpan ${savedDates.length} hari data presensi ke Firebase!`);
      } catch (err: any) {
        showToast('Gagal menyimpan data multi-hari ke Firebase.');
        throw err;
      }
    } else {
      // SINGLE DAY SAVE
      const dateToSave = targetDate || currentDate;
      try {
        const savedRecord = await saveDayToFirestore(dateToSave, newEmployees, newName);
        setAllDailyRecords((prev) => ({ ...prev, [savedRecord.date]: savedRecord }));
        setCurrentDate(savedRecord.date);
        showToast(`Data presensi tanggal ${savedRecord.date} (${newEmployees.length} karyawan) berhasil disimpan ke Firebase.`);
      } catch (err: any) {
        showToast('Gagal menyimpan data ke Firebase.');
        throw err;
      }
    }
  };

  const handleAddEmployee = async (newRecord: EmployeeRecord) => {
    hasAutoSelectedLatestRef.current = true;
    const updated = [newRecord, ...employees];
    try {
      const savedRecord = await saveDayToFirestore(currentDate, updated, sourceName);
      setAllDailyRecords((prev) => ({ ...prev, [savedRecord.date]: savedRecord }));
      showToast(`Input presensi "${newRecord.name}" berhasil disimpan ke Firebase.`);
    } catch (err: any) {
      showToast('Gagal menyimpan ke Firebase Firestore.');
    }
  };

  const handleDeleteDay = async (dateStr: string) => {
    try {
      await deleteDayFromFirestore(dateStr);
      setAllDailyRecords((prev) => {
        const next = { ...prev };
        delete next[dateStr];
        return next;
      });
      showToast(`Data presensi tanggal ${dateStr} berhasil dihapus dari Firebase.`);
    } catch (err: any) {
      showToast('Gagal menghapus data dari Firebase.');
    }
  };

  const handleSelectDayFromChart = (day: number) => {
    const formatted = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    handleSelectDateManual(formatted);
  };

  const recentStoredDates = useMemo(() => {
    return Object.keys(allDailyRecords).sort().reverse().slice(0, 8);
  }, [allDailyRecords]);

  const existingRecordMeta = useMemo(() => {
    const map: Record<string, { totalEmployees: number; sourceName: string }> = {};
    Object.entries(allDailyRecords).forEach(([d, rec]) => {
      map[d] = {
        totalEmployees: rec.employees?.length || rec.totalEmployees || 0,
        sourceName: rec.sourceName || 'Firebase Firestore',
      };
    });
    return map;
  }, [allDailyRecords]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
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
        onDateChange={handleSelectDateManual}
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
              onClick={() => setViewMode('ranking')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === 'ranking'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Karyawan Terdisiplin (Ranking)</span>
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
            {/* Cumulative Stats: Highlights total on-time present employees, late, and absent with interactive filtering */}
            <CumulativeStats
              employees={employees}
              activeDateText={`${activeDay} ${monthName} ${year}`}
              activeFilter={employeeListTab}
              onSelectFilter={(tab) => {
                setEmployeeListTab(tab);
                setActiveMainSubTab('table');
                const el = document.getElementById('daftar-karyawan-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
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
                    Data dummy telah dihapus. Silakan upload file Excel presensi harian atau gunakan tombol contoh format untuk mencoba format tabel dan ranking secara instan di Firebase.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    onClick={() => setIsSourceModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload File Excel</span>
                  </button>
                  <button
                    onClick={handleLoadSampleImageData}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Muat Contoh Format Gambar (17 Sept 2026)</span>
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Input Manual</span>
                  </button>
                </div>
                {recentStoredDates.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      Arsip File Terakhir Tersimpan di Firebase (klik untuk membuka):
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {recentStoredDates.map((d) => (
                        <button
                          key={d}
                          onClick={() => handleSelectDateManual(d)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-[11px] font-mono transition"
                        >
                          {d} ({allDailyRecords[d]?.sourceName || 'Excel'})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Switcher Bar for Table Format vs Discipline Ranking */}
            {employees.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl shadow-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveMainSubTab('table')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeMainSubTab === 'table'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <TableIcon className="w-4 h-4 text-emerald-500" />
                    <span>Format Tabel Presensi (16 Kolom Sesuai Gambar)</span>
                  </button>
                  <button
                    onClick={() => setActiveMainSubTab('ranking')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeMainSubTab === 'ranking'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    }`}
                  >
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Karyawan Terdisiplin - Ranking</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black">
                      LEADERBOARD
                    </span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 pr-2">
                  Tanggal Presensi:{' '}
                  <strong className="text-slate-700 dark:text-slate-200 font-mono">
                    {activeDay} {monthName} {year}
                  </strong>
                </div>
              </div>
            )}

            {/* Detailed Table according to image format */}
            {employees.length > 0 && activeMainSubTab === 'table' && (
              <AbsenceAndLateLists
                employees={employees}
                activeTab={employeeListTab}
                onTabChange={setEmployeeListTab}
                activeDateText={`${activeDay} ${monthName} ${year}`}
              />
            )}

            {/* Discipline Ranking Component */}
            {employees.length > 0 && activeMainSubTab === 'ranking' && (
              <DisciplineRanking
                currentDayEmployees={employees}
                allDailyRecords={allDailyRecords}
                activeDateText={`${activeDay} ${monthName} ${year}`}
                monthName={monthName}
                year={year}
                monthNumber={monthNumber}
              />
            )}

            {/* Interactive Monthly Trend: Attendance percentage strictly based on real recorded days */}
            <InteractiveTrendChart
              trendData={trendData}
              selectedDay={activeDay}
              onSelectDay={handleSelectDayFromChart}
              monthName={monthName}
              year={year}
            />
          </>
        ) : viewMode === 'ranking' ? (
          /* Dedicated Discipline Ranking View */
          <div className="space-y-5">
            <DisciplineRanking
              currentDayEmployees={employees}
              allDailyRecords={allDailyRecords}
              activeDateText={`${activeDay} ${monthName} ${year}`}
              monthName={monthName}
              year={year}
              monthNumber={monthNumber}
            />
          </div>
        ) : (
          /* Monthly & Yearly Aggregation Reports */
          <MonthlyYearlyReports
            currentYear={year}
            currentMonth={monthNumber}
            records={allDailyRecords}
            onSelectDate={(dateStr) => {
              handleSelectDateManual(dateStr);
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
        currentSelectedDate={currentDate}
        existingRecordDates={existingRecordMeta}
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
