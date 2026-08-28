import React, { useState, useMemo } from 'react';
import {
  Car,
  DollarSign,
  Fuel,
  Wrench,
  Clock,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  X,
  Sliders,
  Calculator,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react';
import { AutoCompensationSettings, SalarySettings } from '../types';
import {
  DEFAULT_AUTO_SETTINGS,
  calculateAutoTripCompensation,
} from '../lib/autoCalculator';

interface AutoCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoSettings?: AutoCompensationSettings;
  salarySettings: SalarySettings;
  onSaveSettings: (settings: AutoCompensationSettings) => void;
}

export const AutoCompensationModal: React.FC<AutoCompensationModalProps> = ({
  isOpen,
  onClose,
  autoSettings,
  salarySettings,
  onSaveSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'calc' | 'settings'>('calc');

  // Working settings state
  const [settingsForm, setSettingsForm] = useState<AutoCompensationSettings>(() => {
    return autoSettings ? { ...DEFAULT_AUTO_SETTINGS, ...autoSettings } : { ...DEFAULT_AUTO_SETTINGS };
  });

  // Calculator inputs
  const [calcDistance, setCalcDistance] = useState<number>(0.5);
  const [calcDuration, setCalcDuration] = useState<number>(10);
  const [customMonthlySalary, setCustomMonthlySalary] = useState<number>(
    salarySettings.monthlySalary || 30000
  );
  const [customWorkingDays, setCustomWorkingDays] = useState<number>(
    salarySettings.workingDaysInMonth || 21
  );

  // Active tooltip
  const [activeTip, setActiveTip] = useState<string | null>(null);

  // Sync settings when opened
  React.useEffect(() => {
    if (autoSettings) {
      setSettingsForm({ ...DEFAULT_AUTO_SETTINGS, ...autoSettings });
    }
  }, [autoSettings]);

  const activeSalaryConfig: SalarySettings = useMemo(() => {
    return {
      ...salarySettings,
      monthlySalary: customMonthlySalary,
      workingDaysInMonth: customWorkingDays,
    };
  }, [salarySettings, customMonthlySalary, customWorkingDays]);

  const trace = useMemo(() => {
    return calculateAutoTripCompensation(
      calcDistance,
      calcDuration,
      settingsForm,
      activeSalaryConfig
    );
  }, [calcDistance, calcDuration, settingsForm, activeSalaryConfig]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(settingsForm);
    onClose();
  };

  const handleResetToDefaults = () => {
    if (confirm('Скинути всі параметри авто до стандартних нормативних значень?')) {
      setSettingsForm({ ...DEFAULT_AUTO_SETTINGS });
    }
  };

  const fmt = (n: number) => {
    return (Number(n) || 0).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="glass-card max-w-4xl w-full p-5 sm:p-7 relative border-white/20 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff7a24]/20 border border-[#ff7a24]/40 flex items-center justify-center text-[#ff7a24]">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Компенсація за приватне авто
              </h2>
              <p className="text-xs text-[#aaaaaa]">
                Методика розрахунку: час + пальне (холодний пуск) + знос
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#aaaaaa] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-4 p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('calc')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'calc'
                ? 'bg-[#ff7a24] text-white shadow-lg shadow-[#ff7a24]/20'
                : 'text-[#aaaaaa] hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Інтерактивний калькулятор
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'settings'
                ? 'bg-[#ff7a24] text-white shadow-lg shadow-[#ff7a24]/20'
                : 'text-[#aaaaaa] hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Налаштування коефіцієнтів авто
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto mt-4 pr-1 flex-1 space-y-6">
          {activeTab === 'calc' ? (
            <>
              {/* Note about logic */}
              <div className="p-3.5 rounded-xl bg-[#ff7a24]/10 border border-[#ff7a24]/30 text-xs text-[#dddddd] leading-relaxed flex items-start gap-2.5">
                <Info className="w-4 h-4 text-[#ff7a24] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Логіка формули:</strong> Оклад вже покриває базовий робочий час. Тому в Блоці 1 нараховується лише <strong>надбавка понад оклад</strong> за ризик/суміщення <code className="text-[#ffab6b] bg-black/40 px-1 py-0.5 rounded">K_risk - 1</code>. У Блоці 2 окремо прораховується збагачена суміш на прогрів двигуна, а в Блоці 3 — кілометровий еквівалент зносу холодного старту.
                </div>
              </div>

              {/* Input Parameters for This Trip */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] text-[#aaaaaa] font-semibold block mb-1">
                    🛣️ Дистанція поїздки (S_total)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={calcDistance}
                      onChange={(e) => setCalcDistance(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#888888]">км</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#aaaaaa] font-semibold block mb-1">
                    ⏱️ Час на поїздку (T)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={calcDuration}
                      onChange={(e) => setCalcDuration(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#888888]">хв</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#aaaaaa] font-semibold block mb-1">
                    💼 Оклад (W)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="100"
                      value={customMonthlySalary}
                      onChange={(e) => setCustomMonthlySalary(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#888888]">грн</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#aaaaaa] font-semibold block mb-1">
                    📅 Робочих днів (D)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={customWorkingDays}
                      onChange={(e) => setCustomWorkingDays(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-[#888888]">днів</span>
                  </div>
                </div>
              </div>

              {/* 3 Detailed Formula Blocks */}
              <div className="space-y-4">
                {/* BLOCK 1 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#ff7a24] text-black font-bold text-xs flex items-center justify-center">
                        1
                      </span>
                      <h3 className="font-semibold text-white text-sm">Вартість робочого часу (надбавка)</h3>
                    </div>
                    <span className="font-mono text-xs text-[#aaaaaa]">
                      C_time = (W / (D×8×60)) × T × (K_risk − 1)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-[#888888]">Ставка на хвилину:</div>
                      <div className="font-mono font-bold text-white text-sm mt-0.5">
                        {fmt(trace.timeSteps.perMinute)} грн/хв
                      </div>
                      <div className="text-[10px] text-[#666666]">
                        ({fmt(trace.timeSteps.perDay)} грн/день → {fmt(trace.timeSteps.perHour)} грн/год)
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-[#888888]">Штатна вартість часу за {calcDuration} хв:</div>
                      <div className="font-mono text-white text-sm mt-0.5">
                        {fmt(trace.timeSteps.baseForTask)} грн <span className="text-[10px] text-[#888888]">(вже в окладі)</span>
                      </div>
                      <div className="text-[10px] text-[#ffab6b]">
                        Надбавка за ризик (×{settingsForm.kRisk - 1}): <strong>{fmt(trace.cTime)} грн</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#ff7a24]/10 border border-[#ff7a24]/20">
                    <span className="text-xs text-[#cccccc]">Компенсація часу (C_time):</span>
                    <span className="font-mono text-base font-bold text-[#ffab6b]">
                      {fmt(trace.cTime)} грн
                    </span>
                  </div>
                </div>

                {/* BLOCK 2 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#ff7a24] text-black font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <h3 className="font-semibold text-white text-sm">Витрати пального (прогрів + штатний режим)</h3>
                    </div>
                    <span className="font-mono text-xs text-[#aaaaaa]">
                      C_fuel = (N·K_cold/100)·S_cold·P_benz + (N/100)·S_norm·P_norm
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-[#ffab6b] font-semibold">1. Прогрів (непрогрітий двигун):</div>
                      <div className="text-[#aaaaaa] mt-1">
                        Дистанція: <strong>{fmt(trace.fuelSteps.sCold)} км</strong> (ліміт {settingsForm.sColdLimit} км)
                      </div>
                      <div className="text-[#aaaaaa]">
                        Пальне: {fmt(trace.fuelSteps.fuelColdLitres)} л бензину (×{settingsForm.petrolPrice} грн/л)
                      </div>
                      <div className="font-mono font-bold text-white mt-1">
                        Вартість: {fmt(trace.fuelSteps.costCold)} грн
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-[#2ecc71] font-semibold">2. Штатний маршовий режим:</div>
                      <div className="text-[#aaaaaa] mt-1">
                        Дистанція: <strong>{fmt(trace.fuelSteps.sNorm)} км</strong>
                      </div>
                      <div className="text-[#aaaaaa]">
                        Пальне: {fmt(trace.fuelSteps.fuelNormLitres)} л (×{settingsForm.regularFuelPrice} грн/л)
                      </div>
                      <div className="font-mono font-bold text-white mt-1">
                        Вартість: {fmt(trace.fuelSteps.costNorm)} грн
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#ff7a24]/10 border border-[#ff7a24]/20">
                    <span className="text-xs text-[#cccccc]">Компенсація пального (C_fuel):</span>
                    <span className="font-mono text-base font-bold text-[#ffab6b]">
                      {fmt(trace.cFuel)} грн
                    </span>
                  </div>
                </div>

                {/* BLOCK 3 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#ff7a24] text-black font-bold text-xs flex items-center justify-center">
                        3
                      </span>
                      <h3 className="font-semibold text-white text-sm">Амортизація та еквівалентний знос</h3>
                    </div>
                    <span className="font-mono text-xs text-[#aaaaaa]">
                      C_wear = (V / R) × (S_total + S_start)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-[#888888]">Знос авто на 1 км (V / R):</div>
                      <div className="font-mono font-bold text-white text-sm mt-0.5">
                        {fmt(trace.wearSteps.perKm)} грн/км
                      </div>
                      <div className="text-[10px] text-[#666666]">
                        ({settingsForm.carValue.toLocaleString()} грн / {settingsForm.resourceKm.toLocaleString()} км)
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                      <div className="text-[#888888]">Еквівалентна дистанція зносу:</div>
                      <div className="font-mono font-bold text-white text-sm mt-0.5">
                        {fmt(trace.wearSteps.equivalentDistance)} км
                      </div>
                      <div className="text-[10px] text-[#666666]">
                        (Пробіг {calcDistance} км + Знос старту {settingsForm.sStartEquivalent} км)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#ff7a24]/10 border border-[#ff7a24]/20">
                    <span className="text-xs text-[#cccccc]">Компенсація зносу (C_wear):</span>
                    <span className="font-mono text-base font-bold text-[#ffab6b]">
                      {fmt(trace.cWear)} грн
                    </span>
                  </div>
                </div>
              </div>

              {/* Grand Total Summary Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#ff7a24]/20 via-[#1c1c20] to-black border border-[#ff7a24]/40 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#cccccc] pb-2 border-b border-white/10">
                  <span>C_time (час і ризик):</span>
                  <strong className="font-mono text-white">{fmt(trace.cTime)} грн</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-[#cccccc] pb-2 border-b border-white/10">
                  <span>C_fuel (пальне):</span>
                  <strong className="font-mono text-white">{fmt(trace.cFuel)} грн</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-[#cccccc] pb-2 border-b border-white/10">
                  <span>C_wear (амортизація та знос):</span>
                  <strong className="font-mono text-white">{fmt(trace.cWear)} грн</strong>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-sm font-bold text-white uppercase tracking-wider">
                      Разом за поїздку (C_total):
                    </div>
                    <div className="text-[11px] text-[#aaaaaa]">
                      Дистанція: {calcDistance} км • Час: {calcDuration} хв
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono text-[#ff7a24]">
                    {fmt(trace.totalCompensation)} <span className="text-sm text-[#ffab6b]">грн</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Tab 2: Settings Form */
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#aaaaaa]">
                  Вкажіть постійні характеристики авто та ціни на пальне. Вони збережуться і автоматично використовуватимуться в календарі.
                </p>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-[#aaaaaa] hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Скинути до стандарту
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* V */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>🚗 Вартість авто (V)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">V, грн</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={settingsForm.carValue}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, carValue: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">Ринкова або балансова вартість ТЗ</p>
                </div>

                {/* R */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>🔧 Ресурс до капремонту (R)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">R, км</span>
                  </label>
                  <input
                    type="number"
                    step="1000"
                    min="1"
                    value={settingsForm.resourceKm}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, resourceKm: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">Нормативний пробіг до капремонту (V/R = знос/км)</p>
                </div>

                {/* N */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>⛽ Норма витрати пального (N)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">л/100 км</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={settingsForm.fuelConsumptionNorm}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, fuelConsumptionNorm: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">Паспортна витрата у міському циклі</p>
                </div>

                {/* S_start */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>❄️ Еквівалент зносу холодного пуску (S_start)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">км-екв</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={settingsForm.sStartEquivalent}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, sStartEquivalent: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">Знос 1 запуску без прогріву (рекомендовано 10 км)</p>
                </div>

                {/* K_cold */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>📈 Коефіцієнт холодного пуску (K_cold)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">коеф</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    value={settingsForm.kCold}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, kCold: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">Збагачення суміші на перших км (рекомендовано 1.5)</p>
                </div>

                {/* S_cold limit */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>📏 Ліміт прогріву (S_cold)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">км</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={settingsForm.sColdLimit}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, sColdLimit: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">Дистанція, на якій двигун вважається непрогрітим</p>
                </div>

                {/* P_benz */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>⛽ Ціна бензину (P_benz)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">грн / л</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={settingsForm.petrolPrice}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, petrolPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">Для етапу холодного прогріву (ГБО ще не активне)</p>
                </div>

                {/* P_norm */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>🔥 Ціна штатного пального (P_norm)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">грн / л</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={settingsForm.regularFuelPrice}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, regularFuelPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">Штатне пальне для маршового режиму (газ або бензин)</p>
                </div>

                {/* K_risk */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-white flex items-center justify-between">
                    <span>⚠️ Коефіцієнт ризику та суміщення (K_risk)</span>
                    <span className="text-[10px] text-[#ff7a24] font-mono">коеф (1.5 = +50% надбавка)</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    value={settingsForm.kRisk}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, kRisk: parseFloat(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 bg-black/60 border border-white/15 rounded-xl font-mono text-white text-sm focus:border-[#ff7a24] outline-none"
                  />
                  <p className="text-[10px] text-[#888888]">
                    1.5 означає надбавку +50% до вартості робочого часу за суміщення обов'язків водія та ризик
                  </p>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#ff7a24] hover:bg-[#ff7a24]/90 text-xs font-bold text-white shadow-lg shadow-[#ff7a24]/20 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Зберегти налаштування
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
