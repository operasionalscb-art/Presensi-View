import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  FolderOpen,
  Link as LinkIcon,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  listUserSpreadsheets,
  getSpreadsheetDetails,
  fetchSpreadsheetRange,
  extractSpreadsheetIdFromUrl,
  DriveSpreadsheetFile,
} from '../services/googleSheets';
import { parseRowsToEmployees } from '../services/dataParser';
import { parseExcelFile, downloadSampleExcelTemplate } from '../services/excelService';
import { EmployeeRecord } from '../types/attendance';

interface DataSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  onGoogleSignIn: () => void;
  onApplyNewData: (
    employees: EmployeeRecord[],
    sourceType: 'google-sheets' | 'excel' | 'initial',
    sourceName: string,
    spreadsheetId?: string,
    sheetName?: string
  ) => void;
  activeSource: {
    type: 'google-sheets' | 'excel' | 'initial';
    name: string;
    spreadsheetId?: string;
    sheetName?: string;
  };
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  onGoogleSignIn,
  onApplyNewData,
  activeSource,
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'excel'>('sheets');
  const [sheetUrlOrId, setSheetUrlOrId] = useState(activeSource.spreadsheetId || '');
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedSheetTab, setSelectedSheetTab] = useState(activeSource.sheetName || '');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch Drive spreadsheets when modal opens and user has token
  useEffect(() => {
    if (isOpen && accessToken && activeTab === 'sheets') {
      loadDriveFiles();
    }
  }, [isOpen, accessToken, activeTab]);

  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    setErrorMsg(null);
    try {
      const files = await listUserSpreadsheets(accessToken);
      setDriveFiles(files);
    } catch (err: any) {
      console.warn('Could not list drive files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSelectFile = async (fileId: string) => {
    setSheetUrlOrId(fileId);
    if (!accessToken) return;
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const { title, sheets } = await getSpreadsheetDetails(fileId, accessToken);
      setAvailableTabs(sheets);
      setSelectedSheetTab(sheets[0] || 'Sheet1');
      setSuccessMsg(`Spreadsheet "${title}" terdeteksi (${sheets.length} sheet)`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memeriksa tab spreadsheet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectSheet = async () => {
    const rawId = extractSpreadsheetIdFromUrl(sheetUrlOrId);
    if (!rawId) {
      setErrorMsg('Masukkan URL atau ID Spreadsheet Google yang valid.');
      return;
    }

    if (!accessToken) {
      setErrorMsg('Silakan login dengan Google terlebih dahulu.');
      return;
    }

    setIsConnecting(true);
    setErrorMsg(null);
    try {
      // Fetch details first if tabs not loaded yet
      let tabName = selectedSheetTab;
      let sheetTitle = 'Google Spreadsheet';

      const details = await getSpreadsheetDetails(rawId, accessToken);
      sheetTitle = details.title;
      setAvailableTabs(details.sheets);

      if (!tabName) {
        tabName = details.sheets[0] || 'Sheet1';
        setSelectedSheetTab(tabName);
      }

      // Fetch rows
      const rawRows = await fetchSpreadsheetRange(rawId, tabName, accessToken);
      const employees = parseRowsToEmployees(rawRows);

      if (employees.length === 0) {
        throw new Error(
          'Tidak ditemukan baris data karyawan di sheet ini. Pastikan format kolom sesuai (Employee ID, Name, Department, dll).'
        );
      }

      onApplyNewData(employees, 'google-sheets', sheetTitle, rawId, tabName);
      setSuccessMsg(`Berhasil menghubungkan ${employees.length} baris data dari Google Sheets!`);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data dari Google Sheets');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Excel upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    try {
      const result = await parseExcelFile(file);
      if (result.employees.length === 0) {
        throw new Error('Tidak ada data karyawan yang terbaca dari file Excel ini.');
      }
      onApplyNewData(result.employees, 'excel', file.name);
      setSuccessMsg(`Berhasil mengimpor ${result.employees.length} baris data dari "${file.name}"!`);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca file Excel.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kelola Sumber Data Presensi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih Google Sheets dengan auto-update atau upload file Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 bg-slate-50/40 dark:bg-slate-800/30">
          <button
            onClick={() => {
              setActiveTab('sheets');
              setErrorMsg(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'sheets'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Google Sheets (Live Sync)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('excel');
              setErrorMsg(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'excel'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File Excel (.xlsx)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'sheets' ? (
            <div className="space-y-4">
              {!user ? (
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 mx-auto flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Sambungkan dengan Akun Google Anda
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      Diperlukan izin Google Drive dan Google Sheets untuk membaca spreadsheet presensi dan memperbarui data secara live.
                    </p>
                  </div>
                  <button
                    onClick={onGoogleSignIn}
                    className="inline-flex items-center gap-2 bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition"
                  >
                    <span>Masuk dengan Google</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      URL Spreadsheet atau ID Google Sheets
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0X.../edit"
                        value={sheetUrlOrId}
                        onChange={(e) => setSheetUrlOrId(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 font-mono"
                      />
                      <button
                        onClick={() => handleSelectFile(extractSpreadsheetIdFromUrl(sheetUrlOrId))}
                        disabled={isConnecting || !sheetUrlOrId}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                      >
                        Periksa
                      </button>
                    </div>
                  </div>

                  {availableTabs.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Pilih Sheet Tab
                      </label>
                      <select
                        value={selectedSheetTab}
                        onChange={(e) => setSelectedSheetTab(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      >
                        {availableTabs.map((tab) => (
                          <option key={tab} value={tab}>
                            {tab}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Drive Files Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Atau Pilih File Spreadsheet dari Google Drive
                      </span>
                      <button
                        onClick={loadDriveFiles}
                        disabled={isLoadingFiles}
                        className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                        <span>Refresh List</span>
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                      {driveFiles.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          {isLoadingFiles ? 'Memuat file Drive...' : 'Tidak ada spreadsheet ditemukan atau masukkan URL manual di atas.'}
                        </div>
                      ) : (
                        driveFiles.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => handleSelectFile(file.id)}
                            className={`w-full p-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                              sheetUrlOrId === file.id
                                ? 'bg-teal-50/70 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('id-ID') : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleConnectSheet}
                      disabled={isConnecting || !sheetUrlOrId}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menghubungkan & Membaca Data...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Hubungkan & Sinkronkan Sekarang</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Excel Drag & Drop Upload */}
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-teal-500 dark:hover:border-teal-400 transition bg-slate-50/50 dark:bg-slate-800/30">
                <input
                  type="file"
                  id="excel-file-input"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="excel-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Klik untuk Pilih File Excel (.xlsx / .csv)
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Mendukung format file persis seperti pada gambar (kolom NO, Employee ID, Name, Department, Branch, Job Position, Job Level, Join Date, Employment Status, Tanggal, Keterangan).
                  </p>
                </label>
              </div>

              {/* Download Template helper */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Belum punya file Excel?
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Unduh template resmi berformat sesuai tabel pada gambar.
                  </p>
                </div>
                <button
                  onClick={downloadSampleExcelTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Sumber aktif:{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
              {activeSource.name}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
