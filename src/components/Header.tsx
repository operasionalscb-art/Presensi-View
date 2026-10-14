import React from 'react';
import {
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  PlusCircle,
  Database,
  Radio,
  LogOut,
} from 'lucide-react';
import type { User } from 'firebase/auth';

interface HeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  sourceType: 'google-sheets' | 'excel' | 'initial';
  sourceName: string;
  autoSync: boolean;
  onToggleAutoSync: () => void;
  syncIntervalSec: number;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  onManualRefresh: () => void;
  onOpenSourceModal: () => void;
  onOpenAddModal: () => void;
  user: User | null;
  onGoogleSignIn: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  sourceType,
  sourceName,
  autoSync,
  onToggleAutoSync,
  syncIntervalSec,
  lastSyncTime,
  isSyncing,
  onManualRefresh,
  onOpenSourceModal,
  onOpenAddModal,
  user,
  onGoogleSignIn,
  onLogout,
  isLoggingIn,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <FileSpreadsheet className="w-6 h-6 text-white font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Dashboard Presensi Harian Karyawan
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Firebase Cloud
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitoring keterlambatan, ketidakhadiran, kumulatif hadir & tren bulanan
              </p>
            </div>
          </div>

          {/* Action Tools & Sync Indicator */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <input
                type="date"
                value={currentDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer font-medium"
              />
            </div>

            {/* Source Badge & Connect Button */}
            <button
              onClick={onOpenSourceModal}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-200 transition font-medium"
              title="Ganti sumber data (Google Sheets / Excel)"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[130px] truncate">{sourceName}</span>
            </button>

            {/* Add Input Presensi Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95"
              title="Input data presensi baru untuk disimpan ke Firebase"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Input Baru</span>
            </button>

            {/* Auto-Sync Toggle & Refresh */}
            <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-lg p-0.5">
              <button
                onClick={onToggleAutoSync}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  autoSync
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={autoSync ? `Auto-sync aktif (${syncIntervalSec}s)` : 'Aktifkan auto-sync'}
              >
                <Radio className={`w-3 h-3 ${autoSync ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span>{autoSync ? `${syncIntervalSec}s` : 'Off'}</span>
              </button>
              <button
                onClick={onManualRefresh}
                disabled={isSyncing}
                className="p-1.5 text-slate-400 hover:text-white transition disabled:opacity-50"
                title="Refresh manual data sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            {/* Google Workspace Sign-In */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-[10px] flex items-center justify-center font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[100px] truncate text-slate-200">{user.displayName || user.email}</span>
                <button
                  onClick={onLogout}
                  className="text-slate-400 hover:text-rose-400 p-0.5 transition"
                  title="Keluar dari Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 bg-white text-slate-800 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-medium transition shadow-sm disabled:opacity-60"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Google Sheets'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
