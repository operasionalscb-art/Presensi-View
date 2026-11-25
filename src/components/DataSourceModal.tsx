import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  Check,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Link as LinkIcon,
  Calendar,
  Layers,
  Users,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  listUserSpreadsheets,
  getSpreadsheetDetails,
  fetchSpreadsheetRange,
  extractSpreadsheetIdFromUrl,
  DriveSpreadsheetFile,
} from '../services/googleSheets';
import { parseComprehensiveAttendance } from '../services/dataParser';
import { parseExcelFile, downloadSampleExcelTemplate, ExcelParseResult } from '../services/excelService';
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
    sheetName?: string,
    targetDate?: string,
    multiDayRecords?: Record<string, EmployeeRecord[]>
  ) => Promise<void>;
  activeSource: {
    type: 'google-sheets' | 'excel' | 'initial';
    name: string;
    spreadsheetId?: string;
    sheetName?: string;
  };
  currentSelectedDate: string;
  existingRecordDates?: Record<string, { totalEmployees: number; sourceName: string }>;
}

export const DataSourceModal: React.FC<DataSourceModalProps> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  onGoogleSignIn,
  onApplyNewData,
  activeSource,
  currentSelectedDate,
  existingRecordDates,
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'excel'>('excel');
  const [sheetUrlOrId, setSheetUrlOrId] = useState(activeSource.spreadsheetId || '');
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedSheetTab, setSelectedSheetTab] = useState(activeSource.sheetName || '');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Excel parsed preview state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ExcelParseResult | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [targetDateInput, setTargetDateInput] = useState<string>(currentSelectedDate);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Fetch Drive spreadsheets when modal opens and user has token
  useEffect(() => {
    if (isOpen && accessToken && activeTab === 'sheets') {
      loadDriveFiles();
    }
  }, [isOpen, accessToken, activeTab]);

  // Reset file preview when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUploadedFile(null);
      setParsedResult(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    } else {
      setTargetDateInput(currentSelectedDate);
    }
  }, [isOpen, currentSelectedDate]);

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
      const parsed = parseComprehensiveAttendance(rawRows, {
        fallbackDate: currentSelectedDate,
        fileName: sheetTitle,
      });

      if (parsed.totalEmployees === 0) {
        throw new Error(
          'Tidak ditemukan baris data karyawan di sheet ini. Pastikan format kolom sesuai (Employee ID, Name, Department, dll).'
        );
      }

      if (parsed.totalDays > 1) {
        await onApplyNewData(
          parsed.primaryEmployees,
          'google-sheets',
          sheetTitle,
          rawId,
          tabName,
          parsed.primaryDate,
          parsed.dailyRecords
        );
        setSuccessMsg(
          `Berhasil menyimpan ${parsed.totalDays} hari data presensi dari Google Sheets ke Firebase!`
        );
      } else {
        await onApplyNewData(
          parsed.primaryEmployees,
          'google-sheets',
          sheetTitle,
          rawId,
          tabName,
          parsed.primaryDate
        );
        setSuccessMsg(
          `Berhasil menyimpan ${parsed.primaryEmployees.length} baris data presensi tanggal ${parsed.primaryDate} ke Firebase!`
        );
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat data dari Google Sheets');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle Excel upload with preview step
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Always clear input value so re-selecting the same file works cleanly
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await parseExcelFile(file, { fallbackDate: currentSelectedDate });
      if (result.totalEmployees === 0 && result.totalDays === 0) {
        throw new Error('Tidak ada data karyawan yang berhasil terbaca dari file Excel ini. Periksa kembali struktur tabel.');
      }
      setUploadedFile(file);
      setUploadedFileName(file.name);
      setParsedResult(result);
      setTargetDateInput(result.primaryDate);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca file Excel.');
      setUploadedFile(null);
      setParsedResult(null);
    }
  };

  // Switch active Excel sheet tab
  const handleSwitchExcelSheet = async (sheetName: string) => {
    if (!uploadedFile) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const result = await parseExcelFile(uploadedFile, {
        sheetName,
        fallbackDate: currentSelectedDate,
      });
      if (result.totalEmployees === 0 && result.totalDays === 0) {
        setErrorMsg(`Sheet "${sheetName}" tidak berisi baris data karyawan.`);
      }
      setParsedResult(result);
      setTargetDateInput(result.primaryDate);
    } catch (err: any) {
      setErrorMsg(err.message || `Gagal membaca sheet "${sheetName}".`);
    }
  };

  // Commit Excel Single Day to Firebase
  const handleConfirmSingleDaySave = async () => {
    if (!parsedResult) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const rawEmps = parsedResult.dailyRecords[targetDateInput] || parsedResult.primaryEmployees;
      const empsToSave = rawEmps.map((emp) => ({ ...emp, date: targetDateInput }));
      await onApplyNewData(
        empsToSave,
        'excel',
        uploadedFileName,
        undefined,
        undefined,
        targetDateInput
      );
      setSuccessMsg(`Data tanggal ${targetDateInput} (${empsToSave.length} karyawan) tersimpan di Firebase.`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan ke Firebase.');
    } finally {
      setIsSaving(false);
    }
  };

  // Commit Excel All Days (Batch) to Firebase
  const handleConfirmMultiDaySave = async () => {
    if (!parsedResult || !parsedResult.dailyRecords) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onApplyNewData(
        parsedResult.primaryEmployees,
        'excel',
        uploadedFileName,
        undefined,
        undefined,
        parsedResult.primaryDate,
        parsedResult.dailyRecords
      );
      setSuccessMsg(`Berhasil menyimpan seluruh ${parsedResult.totalDays} hari data ke Firebase.`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data multi-hari ke Firebase.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Kelola Sumber Data Presensi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simpan presensi harian langsung ke Cloud Firestore Firebase
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
              setActiveTab('excel');
              setErrorMsg(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'excel'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File Excel (.xlsx / .csv)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('sheets');
              setErrorMsg(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'sheets'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Google Sheets (Live Sync)</span>
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

          {activeTab === 'excel' ? (
            <div className="space-y-4">
              {!parsedResult ? (
                <>
                  {/* Excel Drag & Drop Upload */}
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 dark:hover:border-emerald-400 transition bg-slate-50/50 dark:bg-slate-800/30">
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
                      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Klik untuk Pilih File Excel (.xlsx / .csv)
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Mendukung presensi harian tunggal maupun file rekap satu bulan penuh (kolom tanggal 1 s/d 31).
                      </p>
                    </label>
                  </div>

                  {/* Download Template helper */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Belum punya template Excel?
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Unduh template resmi berformat sesuai tabel presensi harian karyawan.
                      </p>
                    </div>
                    <button
                      onClick={downloadSampleExcelTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Template</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Parsed Excel Review & Confirmation Card */
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">
                          {uploadedFileName}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Sheet: {parsedResult.activeSheet}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setParsedResult(null);
                        setErrorMsg(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                    >
                      Ganti File
                    </button>
                  </div>

                  {parsedResult.sheetNames.length > 1 && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Pilih Sheet Excel ({parsedResult.sheetNames.length} tab tersedia):
                      </label>
                      <select
                        value={parsedResult.activeSheet}
                        onChange={(e) => handleSwitchExcelSheet(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      >
                        {parsedResult.sheetNames.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Multi-Day Detected Case */}
                  {parsedResult.totalDays > 1 ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                          <Layers className="w-4 h-4 text-emerald-600" />
                          <span>Format Multi-Hari Terdeteksi: {parsedResult.totalDays} Hari Presensi Ditemukan</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                          File ini mencakup data presensi dari <strong>{parsedResult.detectedDates[0]}</strong> sampai <strong>{parsedResult.detectedDates[parsedResult.detectedDates.length - 1]}</strong> dengan rata-rata {parsedResult.totalEmployees} karyawan per hari.
                        </p>
                      </div>

                      {/* Detected Dates Chips */}
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                          Daftar Tanggal yang Terbaca:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px]">
                          {parsedResult.detectedDates.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
                            >
                              {d} ({parsedResult.dailyRecords[d]?.length || 0} org)
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Primary Batch Save Button */}
                      <button
                        onClick={handleConfirmMultiDaySave}
                        disabled={isSaving}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Menyimpan Seluruh {parsedResult.totalDays} Hari ke Firebase...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Simpan Semua ({parsedResult.totalDays} Hari) ke Firebase</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Single Day Detected Case */
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>
                          Ditemukan <strong>{parsedResult.totalEmployees} Karyawan</strong> dalam data ini.
                        </span>
                      </div>

                      {/* Target Date Picker */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Simpan Sebagai Presensi Tanggal:
                        </label>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          <input
                            type="date"
                            value={targetDateInput}
                            onChange={(e) => setTargetDateInput(e.target.value)}
                            className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none w-full font-medium"
                          />
                        </div>
                        {existingRecordDates?.[targetDateInput] ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 block font-medium">
                            Catatan: Tanggal {targetDateInput} sudah memiliki data ({existingRecordDates[targetDateInput].totalEmployees} org dari "{existingRecordDates[targetDateInput].sourceName}"). Menyimpan akan memperbarui tanggal tersebut.
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Tanggal di atas terdeteksi otomatis dari file, Anda dapat mengubahnya jika diperlukan sebelum disimpan.
                          </span>
                        )}
                      </div>

                      {/* Single Day Save Button */}
                      <button
                        onClick={handleConfirmSingleDaySave}
                        disabled={isSaving || !targetDateInput}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Menyimpan ke Firebase...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Simpan Presensi Tanggal {targetDateInput} ke Firebase</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Google Sheets Tab */
            <div className="space-y-4">
              {!user ? (
                <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
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
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 font-mono"
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
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
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
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
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
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
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
