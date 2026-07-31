import React from 'react';
import { CheckCircle2, Wrench, Clock, AlertTriangle, ChevronRight, Package, ArrowUpRight } from 'lucide-react';
import { EquipmentItem, WarehouseItem, MaintenancePlan } from '../types';

interface HomeSectionProps {
  equipment: EquipmentItem[];
  warehouse: WarehouseItem[];
  onNavigateToEquipment: (statusFilter?: string) => void;
  onNavigateToWarehouse: () => void;
  onCompleteMaintenance: (equipmentId: string, planId: string) => Promise<void>;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  equipment,
  warehouse,
  onNavigateToEquipment,
  onNavigateToWarehouse,
  onCompleteMaintenance,
}) => {
  // Counts
  const inWorkCount = equipment.filter((e) => e.status === 'in_work').length;
  const inRepairCount = equipment.filter((e) => e.status === 'repair').length;
  const awaitingPartsCount = equipment.filter((e) => e.status === 'awaiting_parts').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const next7DaysDate = new Date();
  next7DaysDate.setDate(next7DaysDate.getDate() + 7);
  const next7DaysStr = next7DaysDate.toISOString().split('T')[0];

  // Collect all maintenance plans
  const maintenanceDueList: { equipment: EquipmentItem; plan: MaintenancePlan; isOverdue: boolean }[] = [];

  equipment.forEach((eq) => {
    eq.maintenancePlans.forEach((plan) => {
      const isOverdue = plan.nextDueDate <= todayStr;
      const isDueSoon = plan.nextDueDate > todayStr && plan.nextDueDate <= next7DaysStr;

      if (isOverdue || isDueSoon || plan.status === 'due' || plan.status === 'overdue') {
        maintenanceDueList.push({
          equipment: eq,
          plan,
          isOverdue,
        });
      }
    });
  });

  const maintenanceDueCount = maintenanceDueList.length;

  // Low stock warehouse items
  const lowStockItems = warehouse.filter((item) => item.currentStock <= item.minStockThreshold);

  return (
    <div className="space-y-6 pb-24">
      {/* 4.1 Stats Grid (2x2 on mobile, 4x1 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        {/* В роботі */}
        <button
          onClick={() => onNavigateToEquipment('in_work')}
          className="p-2.5 sm:p-4 glass-card glass-card-hover text-left flex flex-col justify-between group border-l-4 border-l-[#2ecc71]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#aaaaaa] group-hover:text-white transition-colors truncate">
              В роботі
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-[#2ecc71]/10 text-[#2ecc71] flex items-center justify-center border border-[#2ecc71]/20 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-4xl font-mono font-bold text-[#2ecc71]">
                {inWorkCount < 10 ? `0${inWorkCount}` : inWorkCount}
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#aaaaaa] uppercase tracking-wider font-semibold">од.</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#2ecc71] font-bold uppercase tracking-wider flex items-center gap-0.5">
              Активні <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* На ремонті */}
        <button
          onClick={() => onNavigateToEquipment('repair')}
          className="p-2.5 sm:p-4 glass-card glass-card-hover text-left flex flex-col justify-between group border-l-4 border-l-[#ff3b3b]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#aaaaaa] group-hover:text-white transition-colors truncate">
              На ремонті
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-[#ff3b3b]/10 text-[#ff3b3b] flex items-center justify-center border border-[#ff3b3b]/20 flex-shrink-0">
              <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-4xl font-mono font-bold text-[#ff3b3b]">
                {inRepairCount < 10 ? `0${inRepairCount}` : inRepairCount}
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#aaaaaa] uppercase tracking-wider font-semibold">сервіс</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#ff3b3b] font-bold uppercase tracking-wider flex items-center gap-0.5">
              Увага <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Чекають запчастин */}
        <button
          onClick={() => onNavigateToEquipment('awaiting_parts')}
          className="p-2.5 sm:p-4 glass-card glass-card-hover text-left flex flex-col justify-between group border-l-4 border-l-[#ffb020]"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#aaaaaa] group-hover:text-white transition-colors truncate">
              Очікують деталей
            </span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-[#ffb020]/10 text-[#ffb020] flex items-center justify-center border border-[#ffb020]/20 flex-shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-4xl font-mono font-bold text-[#ffb020]">
                {awaitingPartsCount < 10 ? `0${awaitingPartsCount}` : awaitingPartsCount}
              </span>
              <span className="text-[9px] sm:text-[10px] text-[#aaaaaa] uppercase tracking-wider font-semibold">деталі</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#ffb020] font-bold uppercase tracking-wider flex items-center gap-0.5">
              Замовл. <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Чекають регламенту */}
        <button
          onClick={() => onNavigateToEquipment('maintenance')}
          className="p-4 glass-card glass-card-hover text-left flex flex-col justify-between group border-l-4 border-l-[#ff6b00]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#aaaaaa] group-hover:text-white transition-colors">
              План регламенту
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#ff6b00]/10 text-[#ff6b00] flex items-center justify-center border border-[#ff6b00]/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-mono font-bold text-[#ff6b00]">
                {maintenanceDueCount < 10 ? `0${maintenanceDueCount}` : maintenanceDueCount}
              </span>
              <span className="text-[10px] text-[#aaaaaa] uppercase tracking-wider font-semibold">тиждень</span>
            </div>
            <span className="text-[10px] text-[#ff6b00] font-bold uppercase tracking-wider flex items-center gap-0.5">
              ТО <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </div>

      {/* 4.2 Block: Найближчі регламентні роботи */}
      <div className="glass-card p-5 border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#ff6b00]" />
            <h2 className="text-base font-bold text-white">Найближчі регламентні роботи (7 днів)</h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#aaaaaa]">
            Всього: {maintenanceDueList.length}
          </span>
        </div>

        {maintenanceDueList.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#aaaaaa] bg-white/5 rounded-2xl border border-dashed border-white/10">
            Всі регламентні роботи виконано. Немає запланованих ТО на найближчі 7 днів.
          </div>
        ) : (
          <div className="space-y-3">
            {maintenanceDueList.map(({ equipment: eq, plan, isOverdue }) => (
              <div
                key={plan.id}
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                  isOverdue
                    ? 'bg-[#ff3b3b]/10 border-[#ff3b3b]/40 shadow-[0_0_12px_rgba(255,59,59,0.15)]'
                    : 'bg-white/5 border-white/10 hover:border-[#ff6b00]/30'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-white">{eq.nomenclatureName}</span>
                    <span className="text-xs text-[#2ecc71] font-semibold">({eq.classification || eq.subcategory})</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-[#aaaaaa]">
                      {eq.nomenclatureNumber}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff3b3b] text-white">
                        ПРОСТРОЧЕНО
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#aaaaaa] mt-1 font-medium">{plan.workType}</p>
                  <p className="text-[11px] font-mono text-[#aaaaaa] mt-0.5">
                    Запланована дата: <strong className={isOverdue ? 'text-[#ff3b3b]' : 'text-[#ff6b00]'}>{plan.nextDueDate}</strong> ({eq.division})
                  </p>
                </div>

                <button
                  onClick={() => onCompleteMaintenance(eq.id, plan.id)}
                  className="px-3 py-1.5 rounded-xl bg-[#2ecc71]/20 hover:bg-[#2ecc71]/30 border border-[#2ecc71]/40 text-xs font-semibold text-[#2ecc71] flex items-center gap-1.5 transition-all self-end sm:self-center shrink-0 active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Виконано
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4.3 Block: Склад — низькі залишки */}
      <div className="glass-card p-5 border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#ffb020]" />
            <h2 className="text-base font-bold text-white">Склад — низькі залишки матеріалів</h2>
          </div>
          <button
            onClick={onNavigateToWarehouse}
            className="text-xs font-semibold text-[#ff6b00] hover:underline flex items-center gap-0.5"
          >
            Увесь склад <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {lowStockItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#aaaaaa] bg-white/5 rounded-2xl border border-dashed border-white/10">
            Залишки всіх матеріалів на складі в нормі.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {lowStockItems.map((item) => {
              const isZero = item.currentStock === 0;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                    isZero
                      ? 'bg-[#ff3b3b]/10 border-[#ff3b3b]/40 shadow-[0_0_12px_rgba(255,59,59,0.15)]'
                      : 'bg-[#ffb020]/10 border-[#ffb020]/30'
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug">{item.name}</h4>
                    <p className="text-[11px] text-[#aaaaaa] mt-0.5">
                      Категорія: <span className="text-white">{item.category}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono font-bold text-white">
                        Залишок: <strong className={isZero ? 'text-[#ff3b3b]' : 'text-[#ffb020]'}>{item.currentStock} {item.unit}</strong>
                      </span>
                      <span className="text-[10px] text-[#aaaaaa] font-mono">
                        (Мін. поріг: {item.minStockThreshold} {item.unit})
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase shrink-0 ${
                      isZero
                        ? 'bg-[#ff3b3b] text-white border-transparent'
                        : 'bg-[#ffb020]/20 text-[#ffb020] border-[#ffb020]/40'
                    }`}
                  >
                    {isZero ? 'КРИТИЧНО' : 'МАЛО'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
