import React from 'react';
import {
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  PlusCircle,
  Database,
  Radio,
  LogOut,
  Cloud,
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
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
          {/* Logo & Title (Cerah & Bersih) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                  Dashboard Presensi Harian Karyawan
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Cloud Firebase
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitoring presensi, keterlambatan & olahan data bulanan/tahunan
              </p>
            </div>
          </div>

          {/* Action Tools & Sync Indicator */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <input
                type="date"
                value={currentDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-slate-800 outline-none text-xs cursor-pointer font-medium"
              />
            </div>

            {/* Source Badge & Connect Button */}
            <button
              onClick={onOpenSourceModal}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 transition font-medium"
              title="Ganti sumber data (Google Sheets / Excel / Firebase)"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="max-w-[130px] truncate">{sourceName}</span>
            </button>

            {/* Add Input Presensi Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-95"
              title="Input data presensi baru untuk uji coba update otomatis"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Input Baru</span>
            </button>

            {/* Auto-Sync Toggle & Refresh */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={onToggleAutoSync}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  autoSync
                    ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title={autoSync ? `Auto-sync aktif (${syncIntervalSec}s)` : 'Aktifkan auto-sync'}
              >
                <Radio className={`w-3 h-3 ${autoSync ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
                <span>{autoSync ? `${syncIntervalSec}s` : 'Off'}</span>
              </button>
              <button
                onClick={onManualRefresh}
                disabled={isSyncing}
                className="p-1.5 text-slate-500 hover:text-slate-800 transition disabled:opacity-50"
                title="Refresh manual data sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

            {/* Google / Firebase Sign-In Profile */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[100px] truncate text-slate-800 font-medium">
                  {user.displayName || user.email}
                </span>
                <button
                  onClick={onLogout}
                  className="text-slate-400 hover:text-rose-600 p-0.5 transition"
                  title="Keluar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleSignIn}
                disabled={isLoggingIn}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-60"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-500" />
                <span>{isLoggingIn ? 'Masuk...' : 'Login Cloud'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
