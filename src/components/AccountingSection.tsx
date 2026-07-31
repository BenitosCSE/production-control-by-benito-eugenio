import React, { useState } from 'react';
import {
  Calculator,
  Calendar as CalendarIcon,
  DollarSign,
  FileText,
  Settings,
  Plus,
  Clock,
  User,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { WorkDayLog, SalarySettings } from '../types';

interface AccountingSectionProps {
  salarySettings: SalarySettings;
  workDayLogs: WorkDayLog[];
  onSaveSalarySettings: (settings: SalarySettings) => Promise<void>;
  onSaveWorkDayLog: (log: WorkDayLog) => Promise<void>;
  onDeleteWorkDayLog: (date: string) => Promise<void>;
  onDownloadTimesheetPDF: (monthYear: string, logs: WorkDayLog[], settings: SalarySettings) => Promise<void>;
}

export const AccountingSection: React.FC<AccountingSectionProps> = ({
  salarySettings,
  workDayLogs,
  onSaveSalarySettings,
  onSaveWorkDayLog,
  onDeleteWorkDayLog,
  onDownloadTimesheetPDF,
}) => {
  // Current selected Year-Month (e.g., 2026-07)
  const [selectedMonthYear, setSelectedMonthYear] = useState('2026-07');

  // Modal Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingSettings, setEditingSettings] = useState<SalarySettings>(salarySettings);

  // Edit Day Log Modal State
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [logForm, setLogForm] = useState<{ hours: number; isWeekend: boolean; note: string }>({
    hours: 8,
    isWeekend: false,
    note: '',
  });

  // Calculate Hourly Rate
  const hourlyRate =
    salarySettings.monthlySalary / (salarySettings.workingDaysInMonth * 8);

  // Filter logs for selected month
  const currentMonthLogs = workDayLogs.filter((log) => log.date.startsWith(selectedMonthYear));

  // Compute breakdown for selected month
  let weekdayHours = 0;
  let weekendHours = 0;

  currentMonthLogs.forEach((log) => {
    const d = new Date(log.date);
    const isWk = log.isWeekend || d.getDay() === 0 || d.getDay() === 6;
    if (isWk) {
      weekendHours += log.hours;
    } else {
      weekdayHours += log.hours;
    }
  });

  const weekdayEarned = weekdayHours * hourlyRate;
  const weekendEarned = weekendHours * hourlyRate * 1.5;
  const totalEarned = weekdayEarned + weekendEarned;

  // Calendar rendering helper
  const yearNum = parseInt(selectedMonthYear.split('-')[0], 10);
  const monthNum = parseInt(selectedMonthYear.split('-')[1], 10); // 1-indexed (1..12)

  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const firstDayOfWeek = (new Date(yearNum, monthNum - 1, 1).getDay() + 6) % 7; // Monday = 0

  // Handle month change
  const handlePrevMonth = () => {
    let y = yearNum;
    let m = monthNum - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    const mStr = m < 10 ? `0${m}` : `${m}`;
    setSelectedMonthYear(`${y}-${mStr}`);
  };

  const handleNextMonth = () => {
    let y = yearNum;
    let m = monthNum + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    const mStr = m < 10 ? `0${m}` : `${m}`;
    setSelectedMonthYear(`${y}-${mStr}`);
  };

  // Open Day Edit Modal
  const handleDayClick = (dateStr: string) => {
    const existing = workDayLogs.find((l) => l.date === dateStr);
    const d = new Date(dateStr);
    const autoWeekend = d.getDay() === 0 || d.getDay() === 6;

    setSelectedDayDate(dateStr);
    if (existing) {
      setLogForm({
        hours: existing.hours,
        isWeekend: existing.isWeekend,
        note: existing.note || '',
      });
    } else {
      setLogForm({
        hours: autoWeekend ? 0 : 8,
        isWeekend: autoWeekend,
        note: '',
      });
    }
  };

  // Save Day Log
  const handleSaveDayLogSubmit = async () => {
    if (!selectedDayDate) return;

    if (logForm.hours === 0) {
      await onDeleteWorkDayLog(selectedDayDate);
    } else {
      await onSaveWorkDayLog({
        date: selectedDayDate,
        hours: logForm.hours,
        isWeekend: logForm.isWeekend,
        note: logForm.note,
      });
    }

    setSelectedDayDate(null);
  };

  // Save Salary Settings Submit
  const handleSaveSettingsSubmit = async () => {
    await onSaveSalarySettings(editingSettings);
    setIsSettingsOpen(false);
  };

  const dateObj = new Date(yearNum, monthNum - 1, 1);
  const monthTitle = dateObj.toLocaleString('uk-UA', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 pb-24">
      {/* Settings Card & Formula Header */}
      <div className="glass-card p-5 border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#ff6b00]" />
              Бухгалтерія та Розрахунок ЗП
            </h2>
            <p className="text-xs text-[#aaaaaa] mt-0.5">
              Працівник: <strong className="text-white">{salarySettings.fullName}</strong> ({salarySettings.position})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingSettings(salarySettings);
                setIsSettingsOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
            >
              <Settings className="w-4 h-4 text-[#ff6b00]" />
              Налаштування ставки
            </button>

            <button
              onClick={() => onDownloadTimesheetPDF(selectedMonthYear, currentMonthLogs, salarySettings)}
              className="px-4 py-2 btn-accent text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <FileText className="w-4 h-4" />
              Подання в бухгалтерію (PDF)
            </button>
          </div>
        </div>

        {/* Formula & Rates Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#aaaaaa]">Місячна ставка</span>
            <div className="text-lg font-black font-mono text-white mt-1">
              {salarySettings.monthlySalary.toLocaleString()} <span className="text-xs text-[#aaaaaa]">грн</span>
            </div>
            <p className="text-[10px] text-[#aaaaaa] mt-0.5 font-mono">Норма: {salarySettings.workingDaysInMonth} днів / міс</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#ff6b00]/10 border border-[#ff6b00]/30">
            <span className="text-[10px] uppercase font-bold text-[#ff6b00]">Годинна ставка (1.0×)</span>
            <div className="text-lg font-black font-mono text-[#ff6b00] mt-1">
              {hourlyRate.toFixed(2)} <span className="text-xs font-normal">грн / год</span>
            </div>
            <p className="text-[10px] text-[#aaaaaa] mt-0.5 font-mono">
              = {salarySettings.monthlySalary} / ({salarySettings.workingDaysInMonth}×8)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#2ecc71]/10 border border-[#2ecc71]/30">
            <span className="text-[10px] uppercase font-bold text-[#2ecc71]">Вихідний тариф (1.5×)</span>
            <div className="text-lg font-black font-mono text-[#2ecc71] mt-1">
              {(hourlyRate * 1.5).toFixed(2)} <span className="text-xs font-normal">грн / год</span>
            </div>
            <p className="text-[10px] text-[#aaaaaa] mt-0.5 font-mono">Субота, неділя, понаднормові</p>
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR CONTROL */}
      <div className="glass-card p-5 border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h3 className="text-base font-bold text-white uppercase tracking-wide capitalize">
            {monthTitle}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#aaaaaa] border-b border-white/10 pb-2">
          <span>Пн</span>
          <span>Вів</span>
          <span>Ср</span>
          <span>Чт</span>
          <span>Пт</span>
          <span className="text-[#ff3b3b]">Сб</span>
          <span className="text-[#ff3b3b]">Нд</span>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-16 rounded-xl bg-transparent" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
            const fullDateStr = `${selectedMonthYear}-${dayStr}`;

            const log = workDayLogs.find((l) => l.date === fullDateStr);
            const d = new Date(fullDateStr);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6 || (log && log.isWeekend);

            return (
              <button
                key={fullDateStr}
                onClick={() => handleDayClick(fullDateStr)}
                className={`h-16 rounded-xl border p-1.5 text-left flex flex-col justify-between transition-all active:scale-95 ${
                  log
                    ? isWeekend
                      ? 'bg-[#ff6b00]/20 border-[#ff6b00]/50 shadow-[0_0_10px_rgba(255,107,0,0.2)]'
                      : 'bg-[#2ecc71]/20 border-[#2ecc71]/40'
                    : isWeekend
                    ? 'bg-white/5 border-white/5 hover:border-[#ff3b3b]/40 text-[#ff3b3b]'
                    : 'bg-white/5 border-white/5 hover:border-white/20 text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold ${isWeekend ? 'text-[#ff3b3b]' : 'text-white'}`}>
                    {dayNum}
                  </span>
                  {log && (
                    <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-[#2ecc71] font-bold">
                      {log.hours}г
                    </span>
                  )}
                </div>

                {log && (
                  <div className="text-[9px] font-mono truncate text-[#aaaaaa]">
                    {isWeekend ? 'Вих (×1.5)' : 'Буд'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MONTHLY SUMMARY CARD */}
      <div className="glass-card p-5 border-[#ff6b00]/30 bg-[#ff6b00]/5 space-y-3">
        <h3 className="text-sm font-bold text-white uppercase border-b border-[#ff6b00]/20 pb-2">
          Підсумок за {monthTitle}:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/5">
            <span className="text-[#aaaaaa] block">Будні години:</span>
            <strong className="text-white font-mono text-base">{weekdayHours} год</strong>
            <p className="text-[11px] font-mono text-[#aaaaaa] mt-0.5">
              = {weekdayEarned.toFixed(2)} грн
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5">
            <span className="text-[#aaaaaa] block">Вихідні / святкові (×1.5):</span>
            <strong className="text-[#ff6b00] font-mono text-base">{weekendHours} год</strong>
            <p className="text-[11px] font-mono text-[#aaaaaa] mt-0.5">
              = {weekendEarned.toFixed(2)} грн
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#ff6b00]/20 border border-[#ff6b00]/40">
            <span className="text-[#aaaaaa] block">Разом до виплати за місяць:</span>
            <strong className="text-[#ff6b00] font-mono text-2xl font-black">
              {totalEarned.toFixed(2)} грн
            </strong>
          </div>
        </div>
      </div>

      {/* Day Log Edit Modal */}
      {selectedDayDate && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-card max-w-xs w-full p-6 relative border-white/20">
            <h3 className="text-base font-bold text-white mb-1">
              Відпрацьовано {selectedDayDate}
            </h3>

            <div className="space-y-3 text-xs mt-4">
              <div>
                <label className="block text-[#aaaaaa] mb-1">Кількість годин *</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={logForm.hours}
                  onChange={(e) => setLogForm({ ...logForm, hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-xl font-bold text-center text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="wkCheck"
                  checked={logForm.isWeekend}
                  onChange={(e) => setLogForm({ ...logForm, isWeekend: e.target.checked })}
                  className="w-4 h-4 accent-[#ff6b00]"
                />
                <label htmlFor="wkCheck" className="text-white font-semibold cursor-pointer">
                  Тариф вихідного дня (×1.5)
                </label>
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Коментар / Вид робіт</label>
                <input
                  type="text"
                  placeholder="напр. Ремонт розкрійного ножа"
                  value={logForm.note}
                  onChange={(e) => setLogForm({ ...logForm, note: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedDayDate(null)}
                className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={handleSaveDayLogSubmit}
                className="px-4 py-2 btn-accent text-xs font-bold"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 relative border-white/20">
            <h3 className="text-base font-bold text-white mb-4">
              Налаштування розрахунку заробітної плати
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#aaaaaa] mb-1">ПІБ працівника</label>
                <input
                  type="text"
                  value={editingSettings.fullName}
                  onChange={(e) => setEditingSettings({ ...editingSettings, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Посада</label>
                <input
                  type="text"
                  value={editingSettings.position}
                  onChange={(e) => setEditingSettings({ ...editingSettings, position: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Місячна ставка (грн)</label>
                  <input
                    type="number"
                    value={editingSettings.monthlySalary}
                    onChange={(e) =>
                      setEditingSettings({ ...editingSettings, monthlySalary: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Робочих днів на місяць</label>
                  <input
                    type="number"
                    value={editingSettings.workingDaysInMonth}
                    onChange={(e) =>
                      setEditingSettings({ ...editingSettings, workingDaysInMonth: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={handleSaveSettingsSubmit}
                className="px-5 py-2 btn-accent text-xs font-bold"
              >
                Зберегти налаштування
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
