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
  getAccessToken,
} from './services/firebaseAuth';
import {
  fetchSpreadsheetRange,
} from './services/googleSheets';
import { parseRowsToEmployees } from './services/dataParser';
import { INITIAL_EMPLOYEES, generateOctoberTrend } from './data/initialData';
import { EmployeeRecord, DayTrendPoint } from './types/attendance';
import { Header } from './components/Header';
import { CumulativeStats } from './components/CumulativeStats';
import { AbsenceAndLateLists } from './components/AbsenceAndLateLists';
import { InteractiveTrendChart } from './components/InteractiveTrendChart';
import { MonthlyYearlyReports } from './components/MonthlyYearlyReports';
import { DataSourceModal } from './components/DataSourceModal';
import { AddRecordModal } from './components/AddRecordModal';
import {
  saveDayHistory,
  getHistoryForDate,
} from './services/storageService';
import {
  CheckCircle2,
  Calendar,
  BarChart3,
  Database,
} from 'lucide-react';

export default function App() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>(INITIAL_EMPLOYEES);
  const [currentDate, setCurrentDate] = useState<string>('2026-10-12');
  const [sourceType, setSourceType] = useState<'google-sheets' | 'excel' | 'initial'>('initial');
  const [sourceName, setSourceName] = useState<string>('Data Presensi (Format Gambar)');
  const [connectedSpreadsheetId, setConnectedSpreadsheetId] = useState<string | undefined>();
  const [connectedSheetName, setConnectedSheetName] = useState<string | undefined>();

  // Auto-sync
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [syncIntervalSec, setSyncIntervalSec] = useState<number>(15);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Extract day and month from currentDate
  const { activeDay, monthName, year } = useMemo(() => {
    const d = new Date(currentDate);
    const day = isNaN(d.getDate()) ? 12 : d.getDate();
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const m = isNaN(d.getMonth()) ? 'October' : months[d.getMonth()];
    const y = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
    return { activeDay: day, monthName: m, year: y };
  }, [currentDate]);

  // Generate dynamic monthly trend based on current employee records
  const trendData: DayTrendPoint[] = useMemo(() => {
    return generateOctoberTrend(employees, activeDay);
  }, [employees, activeDay]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

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

  // Perform sync
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
          setEmployees(updatedEmployees);
        }
      }
      setLastSyncTime(new Date());
    } catch (error: any) {
      console.warn('Sync warning:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, sourceType, connectedSpreadsheetId, connectedSheetName, accessToken]);

  // Periodic Auto-Sync Timer
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      performSync();
    }, syncIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [autoSync, syncIntervalSec, performSync]);

  // View Mode: 'harian' (Daily Dashboard) or 'rekap' (Monthly & Yearly Aggregations from Daily Archives)
  const [viewMode, setViewMode] = useState<'harian' | 'rekap'>('harian');

  // Load existing data for date on mount or date change
  useEffect(() => {
    const stored = getHistoryForDate(currentDate);
    if (stored && stored.length > 0) {
      setEmployees(stored);
    } else {
      // Save current date's initial dataset into archive
      saveDayHistory(currentDate, employees, sourceName);
    }
  }, [currentDate]);

  const handleApplyNewData = (
    newEmployees: EmployeeRecord[],
    newType: 'google-sheets' | 'excel' | 'initial',
    newName: string,
    sheetId?: string,
    sheetTab?: string
  ) => {
    setEmployees(newEmployees);
    setSourceType(newType);
    setSourceName(newName);
    setConnectedSpreadsheetId(sheetId);
    setConnectedSheetName(sheetTab);
    setLastSyncTime(new Date());

    // Automatically persist to daily history archive so it enriches monthly & yearly reports!
    saveDayHistory(currentDate, newEmployees, newName);

    showToast(`Data presensi berhasil diperbarui & disimpan ke arsip (${newEmployees.length} karyawan).`);
  };

  const handleAddEmployee = (newRecord: EmployeeRecord) => {
    const updated = [newRecord, ...employees];
    setEmployees(updated);
    setLastSyncTime(new Date());

    // Automatically persist to daily history archive
    saveDayHistory(currentDate, updated, sourceName);

    showToast(`Input presensi baru untuk "${newRecord.name}" berhasil ditambahkan & disimpan ke arsip.`);
  };

  const handleSelectDayFromChart = (day: number) => {
    const formatted = `2026-10-${String(day).padStart(2, '0')}`;
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

      {/* View Switcher Bar & Storage Status */}
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
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${autoSync ? 'bg-emerald-400 opacity-75' : 'bg-slate-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${autoSync ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
            </span>
            <span>
              Arsip Excel Otomatis:{' '}
              <strong className="text-emerald-400">Aktif & Tersimpan Permanen</strong>
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

            {/* Detailed Breakdown: Specifically lists names, job positions, and reasons for late arrivals and absences */}
            <AbsenceAndLateLists employees={employees} />

            {/* Interactive Monthly Trend: Attendance percentage, stacked bar distribution, and late arrival frequency */}
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
            currentMonth={new Date(currentDate).getMonth() + 1 || 10}
            onSelectDate={(dateStr) => {
              setCurrentDate(dateStr);
              setViewMode('harian');
              showToast(`Membuka data harian tanggal ${dateStr}`);
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
