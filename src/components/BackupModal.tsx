import React, { useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { AppSettings } from '../types';

interface BackupModalProps {
  settings: AppSettings;
  onClose: () => void;
  onExportBackup: () => Promise<void>;
  onImportBackup: (file: File) => Promise<boolean>;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  settings,
  onClose,
  onExportBackup,
  onImportBackup,
}) => {
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm('УВАГА: Відновлення з резервної копії замінить поточні дані! Продовжити?')) {
        const ok = await onImportBackup(file);
        if (ok) {
          setSuccessMsg('Дані успішно відновлено з резервної копії!');
          setErrorMsg('');
        } else {
          setErrorMsg('Помилка при читанні файлу резервної копії.');
          setSuccessMsg('');
        }
      }
    }
  };

  const handleExport = async () => {
    await onExportBackup();
    setSuccessMsg('Резервну копію .json успішно збережено у ваші завантаження!');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-6 relative border-white/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-white font-bold text-lg mb-1">
          <Database className="w-6 h-6 text-[#2ecc71]" />
          Резервне копіювання даних (Backup)
        </div>
        <p className="text-xs text-[#aaaaaa] mb-5 leading-relaxed">
          Всі дані вашого швейного виробництва зберігаються <strong className="text-white">локально у браузері (IndexedDB)</strong> без сервера та хмари.
        </p>

        {/* Backup Warning Banner */}
        <div className="p-3.5 mb-5 rounded-2xl bg-[#ffb020]/10 border border-[#ffb020]/30 text-xs text-[#ffb020] space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Рекомендація щодо збереження даних:
          </div>
          <p className="text-[11px] text-[#aaaaaa] leading-relaxed">
            Рекомендуємо експортувати резервну копію раз на тиждень або при зміні смартфона/пристрою, щоб запобігти втраті даних при очищенні кешу.
          </p>
          {settings.lastBackupDate && (
            <p className="text-[10px] font-mono text-[#ffb020] pt-1 border-t border-[#ffb020]/20">
              Останній backup: {settings.lastBackupDate}
            </p>
          )}
        </div>

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#2ecc71]/20 border border-[#2ecc71]/40 text-xs text-[#2ecc71] font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#ff3b3b]/20 border border-[#ff3b3b]/40 text-xs text-[#ff3b3b] font-bold">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="w-full py-3 px-4 btn-accent flex items-center justify-center gap-2 text-xs font-bold shadow-lg"
          >
            <Download className="w-4 h-4" />
            Експортувати резервну копію (.json)
          </button>

          {/* Import Button */}
          <label className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[#ff6b00]" />
            Імпортувати з резервної копії (.json)
            <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-center text-xs text-[#aaaaaa] hover:text-white"
        >
          Закрити
        </button>
      </div>
    </div>
  );
};
