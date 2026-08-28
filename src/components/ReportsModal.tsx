import React from 'react';
import { FileText, Download, Wrench, Package, Calculator, ClipboardList, X, ArrowDownRight, ArrowUpRight, History } from 'lucide-react';
import { EquipmentItem, WarehouseItem, WorkDayLog, SalarySettings, InventoryAct } from '../types';

interface ReportsModalProps {
  equipment: EquipmentItem[];
  warehouse: WarehouseItem[];
  workDayLogs: WorkDayLog[];
  salarySettings: SalarySettings;
  inventoryActs: InventoryAct[];
  onClose: () => void;
  onDownloadEquipmentStatsPDF: (equipment: EquipmentItem[]) => Promise<void>;
  onDownloadWarehouseReportPDF: (warehouse: WarehouseItem[]) => Promise<void>;
  onDownloadReceiptsReportPDF: (warehouse: WarehouseItem[], dateFrom?: string, dateTo?: string) => Promise<void>;
  onDownloadIssuancesReportPDF: (warehouse: WarehouseItem[], dateFrom?: string, dateTo?: string) => Promise<void>;
  onDownloadFullMovementsReportPDF: (warehouse: WarehouseItem[], dateFrom?: string, dateTo?: string) => Promise<void>;
  onDownloadTimesheetPDF: (monthYear: string, logs: WorkDayLog[], settings: SalarySettings) => Promise<void>;
  onDownloadInventoryActPDF: (act: InventoryAct) => Promise<void>;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  equipment,
  warehouse,
  workDayLogs,
  salarySettings,
  inventoryActs,
  onClose,
  onDownloadEquipmentStatsPDF,
  onDownloadWarehouseReportPDF,
  onDownloadReceiptsReportPDF,
  onDownloadIssuancesReportPDF,
  onDownloadFullMovementsReportPDF,
  onDownloadTimesheetPDF,
  onDownloadInventoryActPDF,
}) => {
  const currentMonthYear = '2026-07';
  const currentLogs = workDayLogs.filter((l) => l.date.startsWith(currentMonthYear));

  const [dateFrom, setDateFrom] = React.useState('2026-07-01');
  const [dateTo, setDateTo] = React.useState(new Date().toISOString().split('T')[0]);

  const setPreset = (preset: 'today' | 'week' | 'currentMonth' | 'prevMonth' | 'allTime') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (preset === 'currentMonth') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setDateFrom(`${year}-${month}-01`);
      setDateTo(todayStr);
    } else if (preset === 'prevMonth') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, d.getMonth() + 1, 0).getDate();
      setDateFrom(`${year}-${month}-01`);
      setDateTo(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'allTime') {
      setDateFrom('2020-01-01');
      setDateTo(todayStr);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-card max-w-lg w-full p-6 relative border-white/20 my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-white font-bold text-lg mb-1">
          <FileText className="w-6 h-6 text-[#ff6b00]" />
          Генерація та експорт звітів (PDF)
        </div>
        <p className="text-xs text-[#aaaaaa] mb-4">
          Офіційні звітні документи з деталізацією за датами, специфікаціями та підписами
        </p>

        {/* Date Filter Block for Movement Reports */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] text-[#ff6b00] font-bold uppercase tracking-wider">
              📅 Період формування звітів (з — по):
            </label>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setPreset('today')}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#ff6b00]/30 text-[10px] text-white font-medium border border-white/10 transition-colors"
            >
              Сьогодні
            </button>
            <button
              type="button"
              onClick={() => setPreset('week')}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#ff6b00]/30 text-[10px] text-white font-medium border border-white/10 transition-colors"
            >
              Тиждень
            </button>
            <button
              type="button"
              onClick={() => setPreset('currentMonth')}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#ff6b00]/30 text-[10px] text-white font-medium border border-white/10 transition-colors"
            >
              Поточний місяць
            </button>
            <button
              type="button"
              onClick={() => setPreset('prevMonth')}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#ff6b00]/30 text-[10px] text-white font-medium border border-white/10 transition-colors"
            >
              Минулий місяць
            </button>
            <button
              type="button"
              onClick={() => setPreset('allTime')}
              className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-[#ff6b00]/30 text-[10px] text-white font-medium border border-white/10 transition-colors"
            >
              Весь час
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div>
              <span className="text-[10px] text-[#aaaaaa] block mb-0.5">Дата з:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#111] border border-white/15 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff6b00]"
              />
            </div>
            <div>
              <span className="text-[10px] text-[#aaaaaa] block mb-0.5">Дата по:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#111] border border-white/15 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff6b00]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
          {/* Report: Stock Receipts (Приходи) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4 text-[#2ecc71]" />
                Звіт з приходу матеріалів та голок (Приходи)
              </h4>
              <p className="text-[11px] text-[#aaaaaa] mt-0.5">
                Реєстр усіх надходжень за вказаний період із датами та специфікаціями
              </p>
            </div>
            <button
              onClick={() => onDownloadReceiptsReportPDF(warehouse, dateFrom, dateTo)}
              className="px-3 py-2 bg-[#2ecc71] hover:bg-[#2ecc71]/90 text-white rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1 shadow-lg active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Report: Stock Issuances (Видачі) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-[#ff3b3b]" />
                Звіт з видачі та витрат зі складу (Видачі)
              </h4>
              <p className="text-[11px] text-[#aaaaaa] mt-0.5">
                Видачі на конкретні машинки/підрозділи за обраний період
              </p>
            </div>
            <button
              onClick={() => onDownloadIssuancesReportPDF(warehouse, dateFrom, dateTo)}
              className="px-3 py-2 bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1 shadow-lg active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Report: Full Movements Journal */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#ff6b00]" />
                Повний журнал руху складу
              </h4>
              <p className="text-[11px] text-[#aaaaaa] mt-0.5">
                Повний хронологічний список усіх приходів та списань за період
              </p>
            </div>
            <button
              onClick={() => onDownloadFullMovementsReportPDF(warehouse, dateFrom, dateTo)}
              className="px-3 py-2 btn-accent text-[11px] font-bold shrink-0 flex items-center gap-1 shadow-lg active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Report: Warehouse Inventory State */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#2ecc71]" />
                Звіт про стан та залишки складу
              </h4>
              <p className="text-[11px] text-[#aaaaaa] mt-0.5">
                Поточні залишки, мінімальні пороги та оціночна вартість
              </p>
            </div>
            <button
              onClick={() => onDownloadWarehouseReportPDF(warehouse)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Report: Equipment Maintenance Stats */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-[#ff6b00]" />
                Звіт з обслуговування та стану техніки
              </h4>
              <p className="text-[11px] text-[#aaaaaa] mt-0.5">
                Статистика ремонтів, завантаженість та витрати по кожній машині
              </p>
            </div>
            <button
              onClick={() => onDownloadEquipmentStatsPDF(equipment)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Report: Monthly Timesheet (Подання годин) */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-[#ffb020]" />
                Подання про відпраційовані години (Липень 2026)
              </h4>
              <p className="text-[11px] text-[#aaaaaa] mt-0.5">
                Щомісячний табель обліку робочого часу для бухгалтерії
              </p>
            </div>
            <button
              onClick={() => onDownloadTimesheetPDF(currentMonthYear, currentLogs, salarySettings)}
              className="px-3 py-2 bg-[#ffb020] hover:bg-[#ffb020]/90 text-black rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1 shadow-lg"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {/* Report: Recent Inventory Act */}
          {inventoryActs.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-white" />
                  Акт інвентаризації від {inventoryActs[inventoryActs.length - 1].date}
                </h4>
                <p className="text-[11px] text-[#aaaaaa] mt-0.5">
                  Останній сформований акт розбіжностей складських залишків
                </p>
              </div>
              <button
                onClick={() => onDownloadInventoryActPDF(inventoryActs[inventoryActs.length - 1])}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[11px] font-bold shrink-0 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2 text-center text-xs text-[#aaaaaa] hover:text-white"
        >
          Закрити
        </button>
      </div>
    </div>
  );
};

