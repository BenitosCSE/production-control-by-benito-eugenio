import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  History,
  ClipboardList,
  FileText,
  Trash2,
  X,
  CheckCircle2,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  Download
} from 'lucide-react';
import { WarehouseItem, WarehouseCategory, StockMovement, InventoryCheckItem, InventoryAct, EquipmentItem } from '../types';

interface WarehouseSectionProps {
  warehouse: WarehouseItem[];
  equipment?: EquipmentItem[];
  onSaveWarehouseItem: (item: WarehouseItem) => Promise<void>;
  onDeleteWarehouseItem: (id: string) => Promise<void>;
  onSaveInventoryAct: (act: InventoryAct) => Promise<void>;
  onDownloadInventoryActPDF: (act: InventoryAct) => Promise<void>;
  onDownloadReceiptsReportPDF?: (warehouse: WarehouseItem[]) => Promise<void>;
  onDownloadIssuancesReportPDF?: (warehouse: WarehouseItem[]) => Promise<void>;
  onDownloadFullMovementsReportPDF?: (warehouse: WarehouseItem[]) => Promise<void>;
}

export const WarehouseSection: React.FC<WarehouseSectionProps> = ({
  warehouse,
  equipment = [],
  onSaveWarehouseItem,
  onDeleteWarehouseItem,
  onSaveInventoryAct,
  onDownloadInventoryActPDF,
  onDownloadReceiptsReportPDF,
  onDownloadIssuancesReportPDF,
  onDownloadFullMovementsReportPDF,
}) => {
  // Top level view mode: catalog (cards) vs journal (timeline table)
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'journal'>('catalog');

  // Search & Detailed Dropdown Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [nameFilter, setNameFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [specsFilter, setSpecsFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [journalFilterType, setJournalFilterType] = useState<'all' | 'receipt' | 'expense'>('all');

  // Dynamic filter lists from actual warehouse items
  const availableNames = React.useMemo(() => {
    const set = new Set<string>();
    warehouse.forEach((item) => {
      if (item.name) set.add(item.name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [warehouse]);

  const availableBrands = React.useMemo(() => {
    const set = new Set<string>();
    warehouse.forEach((item) => {
      if (item.brand) set.add(item.brand.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [warehouse]);

  const availableSpecs = React.useMemo(() => {
    const set = new Set<string>();
    warehouse.forEach((item) => {
      if (item.specs) set.add(item.specs.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [warehouse]);

  const availableSuppliers = React.useMemo(() => {
    const set = new Set<string>();
    warehouse.forEach((item) => {
      if (item.supplier) set.add(item.supplier.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [warehouse]);

  const hasActiveFilters =
    searchTerm !== '' ||
    nameFilter !== 'all' ||
    categoryFilter !== 'all' ||
    brandFilter !== 'all' ||
    specsFilter !== 'all' ||
    supplierFilter !== 'all';

  const resetAllFilters = () => {
    setSearchTerm('');
    setNameFilter('all');
    setCategoryFilter('all');
    setBrandFilter('all');
    setSpecsFilter('all');
    setSupplierFilter('all');
  };

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<WarehouseItem>>({});
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<WarehouseItem | null>(null);
  const [adjustType, setAdjustType] = useState<'receipt' | 'expense'>('receipt');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustDate, setAdjustDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Issuance Target state (for equipment or division binding)
  const [issueTargetType, setIssueTargetType] = useState<'equipment' | 'division' | 'general'>('equipment');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('Цех №1 (Трикотаж)');

  const [historyItem, setHistoryItem] = useState<WarehouseItem | null>(null);
  const [selectedWarehouseItem, setSelectedWarehouseItem] = useState<WarehouseItem | null>(null);

  const getStatusDot = (isZero: boolean, isLow: boolean) => {
    if (isZero) {
      return (
        <span className="relative flex h-2.5 w-2.5" title="Немає на складі">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3b3b] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff3b3b]"></span>
        </span>
      );
    }
    if (isLow) {
      return (
        <span className="inline-flex rounded-full h-2.5 w-2.5 bg-[#ffb020]" title="Мало (нижче мін. порогу)"></span>
      );
    }
    return (
      <span className="inline-flex rounded-full h-2.5 w-2.5 bg-[#2ecc71]" title="Норма"></span>
    );
  };

  // Inventory Check Mode state
  const [isInventoryMode, setIsInventoryMode] = useState(false);
  const [inventoryCounts, setInventoryCounts] = useState<{ [itemId: string]: number }>({});
  const [inventoryNotes, setInventoryNotes] = useState<{ [itemId: string]: string }>({});

  // Filtered Warehouse Items
  const filteredItems = warehouse.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      (item.brand && item.brand.toLowerCase().includes(term)) ||
      (item.specs && item.specs.toLowerCase().includes(term)) ||
      (item.purpose && item.purpose.toLowerCase().includes(term)) ||
      (item.supplier && item.supplier.toLowerCase().includes(term)) ||
      (item.classification && item.classification.toLowerCase().includes(term));

    const matchesName = nameFilter === 'all' || item.name === nameFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesBrand = brandFilter === 'all' || (item.brand && item.brand.toLowerCase() === brandFilter.toLowerCase());
    const matchesSpecs = specsFilter === 'all' || (item.specs && item.specs.toLowerCase() === specsFilter.toLowerCase());
    const matchesSupplier = supplierFilter === 'all' || (item.supplier && item.supplier.toLowerCase() === supplierFilter.toLowerCase());

    return matchesSearch && matchesName && matchesCategory && matchesBrand && matchesSpecs && matchesSupplier;
  });

  // Collect all stock movements for the Journal view
  const allMovementsList = React.useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      itemName: string;
      category: string;
      unit: string;
      type: string;
      quantity: number;
      note: string;
      equipmentId?: string;
      equipmentName?: string;
      division?: string;
      warehouseItemId: string;
    }> = [];

    warehouse.forEach((wh) => {
      wh.movements.forEach((mov) => {
        list.push({
          id: mov.id,
          date: mov.date,
          itemName: wh.name,
          category: wh.category,
          unit: wh.unit,
          type: mov.type,
          quantity: mov.quantity,
          note: mov.note || '',
          equipmentId: mov.equipmentId,
          equipmentName: mov.equipmentName,
          division: mov.division,
          warehouseItemId: wh.id,
        });
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [warehouse]);

  // Filtered movements for journal view
  const filteredJournalMovements = allMovementsList.filter((mov) => {
    const matchesSearch =
      mov.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mov.equipmentName && mov.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || mov.category === categoryFilter;

    let matchesType = true;
    if (journalFilterType === 'receipt') {
      matchesType = mov.type === 'receipt' || mov.quantity > 0;
    } else if (journalFilterType === 'expense') {
      matchesType = mov.type === 'expense' || mov.type === 'repair_deduction' || mov.quantity < 0;
    }

    return matchesSearch && matchesCategory && matchesType;
  });

  // Calculate journal totals
  const journalStats = React.useMemo(() => {
    let receiptsCount = 0;
    let receiptsUnits = 0;
    let issuancesCount = 0;
    let issuancesUnits = 0;

    allMovementsList.forEach((m) => {
      if (m.quantity > 0 || m.type === 'receipt') {
        receiptsCount += 1;
        receiptsUnits += Math.abs(m.quantity);
      } else {
        issuancesCount += 1;
        issuancesUnits += Math.abs(m.quantity);
      }
    });

    return { receiptsCount, receiptsUnits, issuancesCount, issuancesUnits };
  }, [allMovementsList]);

  // Start Inventory Check Mode
  const handleStartInventory = () => {
    const initialCounts: { [itemId: string]: number } = {};
    warehouse.forEach((item) => {
      initialCounts[item.id] = item.currentStock;
    });
    setInventoryCounts(initialCounts);
    setIsInventoryMode(true);
  };

  // Submit Inventory Check Mode
  const handleFinishInventory = async () => {
    const checkItems: InventoryCheckItem[] = warehouse.map((item) => {
      const actual = inventoryCounts[item.id] ?? item.currentStock;
      const diff = actual - item.currentStock;
      return {
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        accountingStock: item.currentStock,
        actualStock: actual,
        difference: diff,
        note: inventoryNotes[item.id] || '',
      };
    });

    const act: InventoryAct = {
      id: `act-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      responsiblePerson: 'Беніто Євгеній (Інженер)',
      items: checkItems,
    };

    // Update actual stock in warehouse database
    for (const item of checkItems) {
      if (item.difference !== 0) {
        const target = warehouse.find((w) => w.id === item.itemId);
        if (target) {
          const newMovement: StockMovement = {
            id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            warehouseItemId: target.id,
            date: new Date().toISOString().split('T')[0],
            type: 'inventory_adjustment',
            quantity: item.difference,
            note: `Коригування за актом інвентаризації від ${act.date}`,
          };
          const updated: WarehouseItem = {
            ...target,
            currentStock: item.actualStock,
            movements: [newMovement, ...target.movements],
          };
          await onSaveWarehouseItem(updated);
        }
      }
    }

    await onSaveInventoryAct(act);
    await onDownloadInventoryActPDF(act);
    setIsInventoryMode(false);
  };

  // Save New / Edit Warehouse Item
  const handleSaveItemSubmit = async () => {
    if (!editingItem.name) {
      alert('Вкажіть найменування матеріалу');
      return;
    }

    const isNew = !editingItem.id;
    const initialStockVal = Number(editingItem.currentStock) || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const arrivalDateVal = editingItem.arrivalDate || todayStr;

    const initialMovements = editingItem.movements || [];
    if (isNew && initialStockVal > 0 && initialMovements.length === 0) {
      initialMovements.push({
        id: `mov-init-${Date.now()}`,
        warehouseItemId: `wh-${Date.now()}`,
        date: arrivalDateVal,
        type: 'receipt',
        quantity: initialStockVal,
        note: `Оприходування при створенні позиції від ${arrivalDateVal}`,
      });
    }

    const itemToSave: WarehouseItem = {
      id: editingItem.id || `wh-${Date.now()}`,
      name: editingItem.name,
      category: editingItem.category || 'Запчастини',
      brand: editingItem.brand || '',
      specs: editingItem.specs || '',
      purpose: editingItem.purpose || '',
      unit: editingItem.unit || 'шт',
      itemsPerPack: editingItem.unit === 'уп' ? (Number(editingItem.itemsPerPack) || undefined) : undefined,
      currentStock: initialStockVal,
      minStockThreshold: Number(editingItem.minStockThreshold) || 1,
      supplier: editingItem.supplier || '',
      purchasePrice: Number(editingItem.purchasePrice) || 0,
      arrivalDate: arrivalDateVal,
      movements: initialMovements,
    };

    await onSaveWarehouseItem(itemToSave);
    setIsAddEditModalOpen(false);
    setEditingItem({});
  };

  // Helper to open adjustment modal
  const openAdjustmentModal = (item: WarehouseItem, type: 'receipt' | 'expense') => {
    setSelectedWarehouseItem(null);
    setAdjustItem(item);
    setAdjustType(type);
    setAdjustQty(1);
    setAdjustNote('');
    setAdjustDate(new Date().toISOString().split('T')[0]);

    if (type === 'expense') {
      if (item.category === 'Голки' || item.category === 'Запчастини' || item.category === 'Витратники') {
        setIssueTargetType('equipment');
      } else {
        setIssueTargetType('division');
      }
      if (equipment && equipment.length > 0) {
        setSelectedEquipmentId(equipment[0].id);
        setSelectedDivision(equipment[0].division || 'Цех №1 (Трикотаж)');
      } else {
        setSelectedDivision('Цех №1 (Трикотаж)');
      }
    }
    setIsAdjustmentModalOpen(true);
  };

  // Stock Adjustment Submit
  const handleAdjustmentSubmit = async () => {
    if (!adjustItem) return;
    if (adjustQty <= 0) {
      alert('Вкажіть кількість більше 0');
      return;
    }

    const change = adjustType === 'receipt' ? adjustQty : -adjustQty;
    const newStock = adjustItem.currentStock + change;

    if (newStock < 0) {
      alert('Залишок не може бути меншим за 0!');
      return;
    }

    let targetDivision: string | undefined = undefined;
    let targetEquipmentId: string | undefined = undefined;
    let targetEquipmentName: string | undefined = undefined;

    if (adjustType === 'expense') {
      if (issueTargetType === 'equipment' && selectedEquipmentId) {
        const eq = equipment.find((e) => e.id === selectedEquipmentId);
        if (eq) {
          targetEquipmentId = eq.id;
          targetEquipmentName = `${eq.nomenclatureName} [${eq.nomenclatureNumber}]`;
          targetDivision = eq.division;
        }
      } else if (issueTargetType === 'division') {
        targetDivision = selectedDivision;
      }
    }

    let noteText = adjustNote.trim();
    if (!noteText) {
      if (adjustType === 'receipt') {
        noteText = 'Зарахування на склад';
      } else {
        if (targetEquipmentName) {
          noteText = `Видача на машинку ${targetEquipmentName}`;
        } else if (targetDivision) {
          noteText = `Видача на підрозділ ${targetDivision}`;
        } else {
          noteText = 'Загальне списання зі складу';
        }
      }
    }

    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      warehouseItemId: adjustItem.id,
      date: adjustDate || new Date().toISOString().split('T')[0],
      type: adjustType,
      quantity: change,
      note: noteText,
      division: targetDivision,
      equipmentId: targetEquipmentId,
      equipmentName: targetEquipmentName,
    };

    const updatedItem: WarehouseItem = {
      ...adjustItem,
      currentStock: newStock,
      movements: [movement, ...adjustItem.movements],
    };

    await onSaveWarehouseItem(updatedItem);
    setIsAdjustmentModalOpen(false);
    setAdjustItem(null);
    setAdjustNote('');
    setAdjustQty(1);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top View Mode Switcher (Каталог залишків vs Журнал руху та приходів) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'catalog'
                ? 'bg-[#ff6b00] text-white shadow-lg'
                : 'text-[#aaaaaa] hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            Каталог матеріалів та залишків ({warehouse.length})
          </button>
          <button
            onClick={() => setActiveSubTab('journal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'journal'
                ? 'bg-[#ff6b00] text-white shadow-lg'
                : 'text-[#aaaaaa] hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            Журнал руху та приходів ({allMovementsList.length})
          </button>
        </div>

        {/* Action Buttons for quick PDF reports */}
        <div className="flex items-center gap-2">
          {onDownloadReceiptsReportPDF && (
            <button
              onClick={() => onDownloadReceiptsReportPDF(warehouse)}
              className="px-3 py-1.5 bg-[#2ecc71]/20 hover:bg-[#2ecc71]/30 text-[#2ecc71] border border-[#2ecc71]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Звіт з Приходів
            </button>
          )}
          {onDownloadIssuancesReportPDF && (
            <button
              onClick={() => onDownloadIssuancesReportPDF(warehouse)}
              className="px-3 py-1.5 bg-[#ff3b3b]/20 hover:bg-[#ff3b3b]/30 text-[#ff3b3b] border border-[#ff3b3b]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" /> Звіт з Видач
            </button>
          )}
        </div>
      </div>

      {/* Top Header Controls */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaaaaa]" />
            <input
              type="text"
              placeholder="Пошук матеріалів, голок, запчастин, накладних, обладнання..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white placeholder-[#aaaaaa] focus:outline-none focus:border-[#ff6b00]"
            />
          </div>

          {/* Buttons: Add Item & Inventory Mode */}
          <div className="flex items-center gap-2">
            {!isInventoryMode ? (
              <button
                onClick={handleStartInventory}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all active:scale-95"
              >
                <ClipboardList className="w-4 h-4 text-[#ffb020]" />
                <span className="hidden sm:inline">Режим Інвентаризації</span>
              </button>
            ) : (
              <button
                onClick={handleFinishInventory}
                className="px-3.5 py-2.5 bg-[#2ecc71] hover:bg-[#2ecc71]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                Сформувати Акт
              </button>
            )}

            <button
              onClick={() => {
                setEditingItem({});
                setIsConfirmingDelete(false);
                setIsAddEditModalOpen(true);
              }}
              className="px-4 py-2.5 btn-accent text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Додати позицію
            </button>
          </div>
        </div>

        {/* Dropdown Filters Toolbar */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {/* 1. Назва */}
            <div>
              <label className="block text-[10px] text-[#ff6b00] font-bold uppercase tracking-wider mb-1">1. Назва</label>
              <select
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1a1a1e] border focus:outline-none transition-colors cursor-pointer ${
                  nameFilter !== 'all' ? 'border-[#ff6b00] text-white bg-[#ff6b00]/15' : 'border-white/15 text-[#cccccc] hover:border-white/30'
                }`}
              >
                <option value="all" className="bg-[#1e1e24] text-white">Всі назви ({availableNames.length})</option>
                {availableNames.map((name) => (
                  <option key={name} value={name} className="bg-[#1e1e24] text-white">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Фірма / Виробник */}
            <div>
              <label className="block text-[10px] text-[#00f0ff] font-bold uppercase tracking-wider mb-1">2. Виробник</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1a1a1e] border focus:outline-none transition-colors cursor-pointer ${
                  brandFilter !== 'all' ? 'border-[#00f0ff] text-white bg-[#00f0ff]/15' : 'border-white/15 text-[#cccccc] hover:border-white/30'
                }`}
              >
                <option value="all" className="bg-[#1e1e24] text-white">Всі бренди ({availableBrands.length})</option>
                {availableBrands.map((b) => (
                  <option key={b} value={b} className="bg-[#1e1e24] text-white">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Категорія */}
            <div>
              <label className="block text-[10px] text-[#ffb020] font-bold uppercase tracking-wider mb-1">3. Категорія</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1a1a1e] border focus:outline-none transition-colors cursor-pointer ${
                  categoryFilter !== 'all' ? 'border-[#ffb020] text-white bg-[#ffb020]/15' : 'border-white/15 text-[#cccccc] hover:border-white/30'
                }`}
              >
                <option value="all" className="bg-[#1e1e24] text-white">Всі категорії</option>
                {['Запчастини', 'Витратники', 'Голки', 'Мастило', 'Інше'].map((cat) => (
                  <option key={cat} value={cat} className="bg-[#1e1e24] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Технічна характеристика / Калібр */}
            <div>
              <label className="block text-[10px] text-white/80 font-bold uppercase tracking-wider mb-1">4. Калібр / Тех.дані</label>
              <select
                value={specsFilter}
                onChange={(e) => setSpecsFilter(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1a1a1e] border focus:outline-none transition-colors cursor-pointer ${
                  specsFilter !== 'all' ? 'border-white text-white bg-white/15' : 'border-white/15 text-[#cccccc] hover:border-white/30'
                }`}
              >
                <option value="all" className="bg-[#1e1e24] text-white">Всі калібри ({availableSpecs.length})</option>
                {availableSpecs.map((spec) => (
                  <option key={spec} value={spec} className="bg-[#1e1e24] text-white">
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Постачальник */}
            <div>
              <label className="block text-[10px] text-[#2ecc71] font-bold uppercase tracking-wider mb-1">5. Постачальник</label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1a1a1e] border focus:outline-none transition-colors cursor-pointer ${
                  supplierFilter !== 'all' ? 'border-[#2ecc71] text-white bg-[#2ecc71]/15' : 'border-white/15 text-[#cccccc] hover:border-white/30'
                }`}
              >
                <option value="all" className="bg-[#1e1e24] text-white">Всі постачальники ({availableSuppliers.length})</option>
                {availableSuppliers.map((sup) => (
                  <option key={sup} value={sup} className="bg-[#1e1e24] text-white">
                    {sup}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters Bar & Count / Journal Filters */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888888]">
                Знайдено: <strong className="text-white font-bold">{filteredItems.length}</strong> із {warehouse.length}
              </span>

              {hasActiveFilters && (
                <button
                  onClick={resetAllFilters}
                  className="px-2.5 py-1 rounded-lg bg-[#ff3b3b]/15 hover:bg-[#ff3b3b]/25 border border-[#ff3b3b]/30 text-[11px] font-bold text-[#ff3b3b] transition-all flex items-center gap-1 active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  Скинути всі фільтри
                </button>
              )}
            </div>

            {activeSubTab === 'journal' && (
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                <button
                  onClick={() => setJournalFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    journalFilterType === 'all' ? 'bg-white/20 text-white' : 'text-[#aaaaaa] hover:text-white'
                  }`}
                >
                  Всі операції
                </button>
                <button
                  onClick={() => setJournalFilterType('receipt')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    journalFilterType === 'receipt' ? 'bg-[#2ecc71] text-white' : 'text-[#aaaaaa] hover:text-white'
                  }`}
                >
                  📥 Приходи
                </button>
                <button
                  onClick={() => setJournalFilterType('expense')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    journalFilterType === 'expense' ? 'bg-[#ff3b3b] text-white' : 'text-[#aaaaaa] hover:text-white'
                  }`}
                >
                  📤 Видачі
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JOURNAL VIEW MODE (ЖУРНАЛ РУХУ ТА ПРИХОДІВ) */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="glass-card p-3.5 border-l-4 border-l-[#2ecc71]">
              <div className="text-[#aaaaaa] text-[11px]">Загалом Приходів</div>
              <div className="text-lg font-bold text-[#2ecc71] mt-0.5 flex items-center gap-1">
                <ArrowDownRight className="w-5 h-5" />
                +{journalStats.receiptsUnits} од
              </div>
              <div className="text-[10px] text-[#aaaaaa] mt-1">
                Зафіксовано {journalStats.receiptsCount} операцій закупівлі
              </div>
            </div>

            <div className="glass-card p-3.5 border-l-4 border-l-[#ff3b3b]">
              <div className="text-[#aaaaaa] text-[11px]">Загалом Видано / Списано</div>
              <div className="text-lg font-bold text-[#ff3b3b] mt-0.5 flex items-center gap-1">
                <ArrowUpRight className="w-5 h-5" />
                -{journalStats.issuancesUnits} од
              </div>
              <div className="text-[10px] text-[#aaaaaa] mt-1">
                Зафіксовано {journalStats.issuancesCount} видач на машинки/цехи
              </div>
            </div>

            <div className="glass-card p-3.5 border-l-4 border-l-[#ff6b00]">
              <div className="text-[#aaaaaa] text-[11px]">Всього Позицій на Складі</div>
              <div className="text-lg font-bold text-white mt-0.5">{warehouse.length} шт</div>
              <div className="text-[10px] text-[#aaaaaa] mt-1">Активний асортимент матеріалів</div>
            </div>

            <div className="glass-card p-3.5 flex flex-col justify-between">
              <div className="text-[#aaaaaa] text-[11px]">Експорт Звіту Руху</div>
              {onDownloadFullMovementsReportPDF && (
                <button
                  onClick={() => onDownloadFullMovementsReportPDF(warehouse)}
                  className="w-full mt-2 py-2 btn-accent text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> PDF Журнал
                </button>
              )}
            </div>
          </div>

          {/* Timeline Table of Movements */}
          <div className="glass-card p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#ff6b00]" />
                Журнал операцій за датами
              </h3>
              <span className="text-xs text-[#aaaaaa]">
                Знайдено {filteredJournalMovements.length} записів
              </span>
            </div>

            {filteredJournalMovements.length === 0 ? (
              <div className="p-8 text-center text-[#aaaaaa] text-xs">
                Записів руху за вказаними фільтрами не знайдено.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[#aaaaaa] font-semibold">
                    <th className="py-2.5 px-3">Дата</th>
                    <th className="py-2.5 px-3">Найменування матеріалу</th>
                    <th className="py-2.5 px-3">Тип операції</th>
                    <th className="py-2.5 px-3 text-center">Кількість</th>
                    <th className="py-2.5 px-3">Підстава / Призначення / Обладнання</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {filteredJournalMovements.map((mov) => {
                    const isPlus = mov.quantity > 0 || mov.type === 'receipt';
                    return (
                      <tr key={mov.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#aaaaaa] text-[11px] whitespace-nowrap">
                          {mov.date}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{mov.itemName}</div>
                          <div className="text-[10px] text-[#aaaaaa]">Категорія: {mov.category}</div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {isPlus ? (
                            <span className="px-2.5 py-1 rounded-lg bg-[#2ecc71]/20 border border-[#2ecc71]/30 text-[#2ecc71] font-bold text-[10px] inline-flex items-center gap-1">
                              <ArrowDownRight className="w-3 h-3" /> Прихід
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-[#ff3b3b]/20 border border-[#ff3b3b]/30 text-[#ff3b3b] font-bold text-[10px] inline-flex items-center gap-1">
                              <ArrowUpRight className="w-3 h-3" /> Видача
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-sm whitespace-nowrap">
                          <span className={isPlus ? 'text-[#2ecc71]' : 'text-[#ff3b3b]'}>
                            {isPlus ? `+${mov.quantity}` : mov.quantity} {mov.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-white">{mov.note}</div>
                          {(mov.equipmentName || mov.division) && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {mov.equipmentName && (
                                <span className="px-2 py-0.5 rounded bg-[#ff6b00]/20 border border-[#ff6b00]/30 text-[#ff6b00] text-[10px] font-bold">
                                  ⚙️ {mov.equipmentName}
                                </span>
                              )}
                              {mov.division && (
                                <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[#aaaaaa] text-[10px]">
                                  🏢 {mov.division}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CATALOG VIEW MODE (Стандартний список залишків) */}
      {activeSubTab === 'catalog' && (
        <>
          {/* INVENTORY CHECK MODE INTERACTIVE TABLE */}
      {isInventoryMode && (
        <div className="glass-card p-5 border-[#ffb020]/40 bg-[#ffb020]/5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ffb020]/20 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#ffb020]" />
                Режим проведення інвентаризації складу
              </h3>
              <p className="text-xs text-[#aaaaaa] mt-0.5">
                Введіть фактичну кількість матеріалів на поточну дату. Система автоматично вирахує розбіжності та згенерує офіційний Акт.
              </p>
            </div>
            <button
              onClick={() => setIsInventoryMode(false)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white"
            >
              Скасувати
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[#aaaaaa] font-semibold">
                  <th className="py-2.5 px-3">Найменування</th>
                  <th className="py-2.5 px-3">Категорія</th>
                  <th className="py-2.5 px-3 text-center">За обліком</th>
                  <th className="py-2.5 px-3 text-center">Фактично</th>
                  <th className="py-2.5 px-3 text-center">Розбіжність</th>
                  <th className="py-2.5 px-3">Примітка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {warehouse.map((item) => {
                  const actual = inventoryCounts[item.id] ?? item.currentStock;
                  const diff = actual - item.currentStock;

                  return (
                    <tr key={item.id} className="hover:bg-white/5">
                      <td className="py-2.5 px-3 font-bold text-white">{item.name}</td>
                      <td className="py-2.5 px-3 text-[#aaaaaa]">{item.category}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-white">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={actual}
                          onChange={(e) =>
                            setInventoryCounts({
                              ...inventoryCounts,
                              [item.id]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-center font-mono font-bold text-white focus:outline-none focus:border-[#ff6b00]"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {diff === 0 ? (
                          <span className="text-[#aaaaaa]">0</span>
                        ) : diff > 0 ? (
                          <span className="text-[#2ecc71]">+{diff}</span>
                        ) : (
                          <span className="text-[#ff3b3b]">{diff}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="примітка..."
                          value={inventoryNotes[item.id] || ''}
                          onChange={(e) =>
                            setInventoryNotes({
                              ...inventoryNotes,
                              [item.id]: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full p-8 sm:p-12 text-center text-xs text-[#aaaaaa] glass-card border-dashed">
            Позиції матеріалів не знайдені.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isZero = item.currentStock === 0;
            const isLow = item.currentStock <= item.minStockThreshold;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedWarehouseItem(item)}
                className={`glass-card glass-card-hover p-3.5 sm:p-4 cursor-pointer relative flex flex-col justify-between border transition-all h-full group ${
                  isZero
                    ? 'border-[#ff3b3b]/40 shadow-[0_0_12px_rgba(255,59,59,0.1)]'
                    : isLow
                    ? 'border-[#ffb020]/30'
                    : 'border-white/10 hover:border-[#ff6b00]/30'
                }`}
              >
                <div className="space-y-2">
                  {/* Шапка: Помаранчевий (Назва) + Блакитний (Фірма) + Сірий (Специфікація) в ОДНОМУ рядку + Кружечок статусу */}
                  <div className="flex items-start justify-between gap-2">
                    {/* Ліворуч: Компактний блок із тегами на одному рівні */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* 1. Помаранчевий блок з назвою матеріалу */}
                      <span className="px-2.5 py-1 rounded-lg bg-[#ff6b00]/20 border border-[#ff6b00]/40 text-[#ff6b00] text-xs font-bold leading-tight inline-flex items-center">
                        {item.name}
                      </span>

                      {/* 2. Синьо-блакитний блок із позначкою фірми */}
                      {item.brand && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setBrandFilter(item.brand || 'all');
                          }}
                          title="Натисніть для фільтрації за цією фірмою"
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#00f0ff]/15 hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30 text-[#00f0ff] text-[11px] font-semibold transition-colors shrink-0"
                        >
                          {item.brand}
                        </div>
                      )}

                      {/* 3. Сірий блок - Технічна характеристика (напр. DBx1 №90) */}
                      {item.specs && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchTerm(item.specs || '');
                          }}
                          title="Натисніть для фільтрації за цим калібром/характеристикою"
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 text-[11px] font-mono transition-colors shrink-0"
                        >
                          {item.specs}
                        </div>
                      )}
                    </div>

                    {/* Правий верхній кут: кружечок кольору статусу */}
                    <div className="flex items-center pl-1 flex-shrink-0 pt-1">
                      {getStatusDot(isZero, isLow)}
                    </div>
                  </div>

                  {/* 4. Лагідно-зелений блок напівпрозорий (призначення / сумісність) під ними */}
                  {(item.purpose || item.category) && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.purpose) setSearchTerm(item.purpose);
                      }}
                      title="Натисніть для фільтрації за цим призначенням"
                      className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#2ecc71]/15 hover:bg-[#2ecc71]/25 border border-[#2ecc71]/30 text-[#2ecc71] text-xs font-medium leading-snug transition-colors w-full"
                    >
                      {item.purpose || item.category}
                    </div>
                  )}
                </div>

                {/* Снизу под ним — количество */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col gap-1 text-xs">
                  {item.unit === 'уп' && item.itemsPerPack && item.itemsPerPack > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-[#aaaaaa]">
                        <span>Залишок:</span>
                        <span className={`font-mono font-bold ${isZero ? 'text-[#ff3b3b]' : isLow ? 'text-[#ffb020]' : 'text-white'}`}>
                          {item.currentStock} {item.currentStock === 1 ? 'упаковка' : item.currentStock >= 2 && item.currentStock <= 4 ? 'упаковки' : 'упаковок'} по {item.itemsPerPack} штук
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[#aaaaaa] font-medium">Разом:</span>
                        <span className={`font-mono font-bold text-sm ${isZero ? 'text-[#ff3b3b]' : isLow ? 'text-[#ffb020]' : 'text-[#2ecc71]'}`}>
                          {item.currentStock * item.itemsPerPack} штук
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[#aaaaaa]">Кількість:</span>
                      <span className={`font-mono font-bold text-sm ${isZero ? 'text-[#ff3b3b]' : isLow ? 'text-[#ffb020]' : 'text-white'}`}>
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* Add / Edit Warehouse Item Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-lg w-full p-6 relative border-white/20 my-auto max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingItem.id ? 'Редагування позиції матеріалу' : 'Додавання нової позиції на склад'}
            </h3>

            <div className="space-y-3.5 text-xs">
              {/* 1. Найменування матеріалу */}
              <div>
                <label className="block text-[#aaaaaa] mb-1 font-medium">1. Найменування матеріалу / запчастини *</label>
                <input
                  type="text"
                  list="preset-names-list"
                  placeholder="напр. Голки, ніж, лапка, петлевик..."
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                />
                <datalist id="preset-names-list">
                  <option value="Голки" />
                  <option value="Петлювач" />
                  <option value="Ніж" />
                  <option value="Підошва" />
                  <option value="Олія" />
                  <option value="Шпуля" />
                  <option value="Човник" />
                  <option value="Ремінь" />
                  <option value="Пластина голкова" />
                  <option value="Рейка просування" />
                  <option value="Лапка" />
                  <option value="Нитка" />
                </datalist>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Голки', 'Петлювач', 'Ніж', 'Підошва', 'Олія', 'Шпуля', 'Човник', 'Лапка'].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, name: n })}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-[#ff6b00]/20 border border-white/10 text-[11px] text-[#aaaaaa] hover:text-white transition-colors"
                    >
                      + {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Фірма & Категорія */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">2. Фірма / Виробник</label>
                  <input
                    type="text"
                    list="preset-brands-list"
                    placeholder="напр. GROZ-BECKERT, SCHMETZ, Siruba..."
                    value={editingItem.brand || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                  <datalist id="preset-brands-list">
                    <option value="SCHMETZ" />
                    <option value="GROZ-BECKERT" />
                    <option value="ORGAN" />
                    <option value="Siruba" />
                    <option value="Juki" />
                    <option value="Brother" />
                    <option value="Jack" />
                    <option value="Eastman" />
                    <option value="Silter" />
                    <option value="SHELL" />
                    <option value="Typical" />
                    <option value="Zoje" />
                  </datalist>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['SCHMETZ', 'GROZ-BECKERT', 'Siruba', 'Juki', 'Jack', 'Silter'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, brand: b })}
                        className="px-2 py-0.5 rounded-md bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 border border-[#00f0ff]/20 text-[10px] text-[#00f0ff] transition-colors"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">Категорія</label>
                  <select
                    value={editingItem.category || 'Запчастини'}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value as WarehouseCategory })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="Запчастини" className="bg-[#111]">Запчастини</option>
                    <option value="Витратники" className="bg-[#111]">Витратники</option>
                    <option value="Голки" className="bg-[#111]">Голки</option>
                    <option value="Мастило" className="bg-[#111]">Мастило</option>
                    <option value="Інше" className="bg-[#111]">Інше</option>
                  </select>
                </div>
              </div>

              {/* 3. Технічні характеристики & Призначення */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">3. Технічна характеристика (Сірий блок)</label>
                  <input
                    type="text"
                    list="preset-specs-list"
                    placeholder="напр. DBx1 №90 або B-27 №80"
                    value={editingItem.specs || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, specs: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                  <datalist id="preset-specs-list">
                    <option value="DBx1 №90" />
                    <option value="B-27 №80" />
                    <option value="DPx5 №100" />
                    <option value="DCx27 №90" />
                    <option value="747K верхній" />
                    <option value="STB-200 тефлонова" />
                    <option value="Catenex 22 (вазелінове)" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">4. Призначення (Зелений блок)</label>
                  <input
                    type="text"
                    list="preset-purposes-list"
                    placeholder="напр. для прямострочної одноголкової машини"
                    value={editingItem.purpose || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, purpose: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                  <datalist id="preset-purposes-list">
                    <option value="для прямострочної одноголкової машини" />
                    <option value="для 4-ниткового оверлока" />
                    <option value="для 5-ниткового оверлока" />
                    <option value="для мастила картерів швейних машин" />
                    <option value="для розкрійного ножа Blue Streak" />
                    <option value="для праски з парогенератором" />
                  </datalist>
                </div>
              </div>

              {/* 5. Одиниця виміру */}
              <div>
                <label className="block text-[#aaaaaa] mb-1 font-medium">5. Одиниця виміру</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['шт', 'уп', 'л', 'кг', 'г', 'компл'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, unit: u })}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                        editingItem.unit === u
                          ? 'bg-[#ff6b00] border-[#ff6b00] text-white font-bold'
                          : 'bg-white/5 border-white/10 text-[#aaaaaa] hover:text-white'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="або вкажіть вручну (напр. шт, уп)"
                  value={editingItem.unit || 'шт'}
                  onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              {/* Штуки в упаковці (якщо уп) */}
              {editingItem.unit === 'уп' && (
                <div className="p-3 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/30 space-y-1">
                  <label className="block text-[#ff6b00] font-bold text-xs">Кількість штук в упаковці (шт/уп)</label>
                  <input
                    type="number"
                    placeholder="напр. 10 або 100"
                    value={editingItem.itemsPerPack ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, itemsPerPack: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-black/40 border border-[#ff6b00]/40 rounded-lg text-white font-mono"
                  />
                  <p className="text-[10px] text-[#aaaaaa]">Дозволяє бачити інформацію про вміст упаковки при обліку.</p>
                </div>
              )}

              {/* 6. Початкова кількість & Поріг */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">Початкова кількість ({editingItem.unit || 'шт'})</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editingItem.currentStock ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, currentStock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">6. Поріг (мін. залишок) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editingItem.minStockThreshold ?? 1}
                    onChange={(e) => setEditingItem({ ...editingItem, minStockThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white"
                  />
                </div>
              </div>

              {/* 7. Постачальник, 8. Ціна & 9. Дата приходу */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">7. Постачальник</label>
                  <input
                    type="text"
                    list="preset-suppliers-list"
                    placeholder="напр. Текстиль-Сервіс"
                    value={editingItem.supplier || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                  />
                  <datalist id="preset-suppliers-list">
                    <option value="Швейпром Київ" />
                    <option value="Текстиль-Сервіс" />
                    <option value="ШвейСпецМаш" />
                    <option value="ВельтПласт" />
                    <option value="Світ Швейного Обладнання" />
                  </datalist>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Швейпром Київ', 'Текстиль-Сервіс', 'ШвейСпецМаш'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, supplier: s })}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-[#aaaaaa] hover:text-white transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">8. Ціна видаткової накладної (грн)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={editingItem.purchasePrice ?? 0}
                    onChange={(e) => setEditingItem({ ...editingItem, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1 font-medium">9. Дата приходу / оприходування</label>
                <input
                  type="date"
                  value={editingItem.arrivalDate || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setEditingItem({ ...editingItem, arrivalDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              {editingItem.id ? (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ff3b3b] font-semibold">Видалити?</span>
                    <button
                      onClick={async () => {
                        setIsConfirmingDelete(false);
                        const idToDelete = editingItem.id!;
                        setIsAddEditModalOpen(false);
                        await onDeleteWarehouseItem(idToDelete);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#ff3b3b] hover:bg-[#ff3b3b]/80 text-white text-xs font-bold transition-colors"
                    >
                      Так, видалити
                    </button>
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                    >
                      Скасувати
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-3 py-2 rounded-xl bg-[#ff3b3b]/10 hover:bg-[#ff3b3b]/20 text-[#ff3b3b] text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Видалити
                  </button>
                )
              ) : <div />}

              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
                >
                  Скасувати
                </button>
                <button
                  onClick={handleSaveItemSubmit}
                  className="px-5 py-2 btn-accent text-xs font-bold"
                >
                  Зберегти
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal (+Прихід / -Витрата) */}
      {isAdjustmentModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 relative border-white/20">
            <h3 className="text-base font-bold text-white mb-1">
              {adjustType === 'receipt' ? 'Оформлення Приходу' : 'Оформлення Видачі / Списання'}
            </h3>
            <p className="text-xs text-[#ff6b00] font-bold mb-4">{adjustItem.name}</p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#aaaaaa] mb-1 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#ff6b00]" /> Дата операції *
                </label>
                <input
                  type="date"
                  value={adjustDate}
                  onChange={(e) => setAdjustDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#ff6b00]"
                />
              </div>

              {adjustType === 'expense' && (
                <div>
                  <label className="block text-[#aaaaaa] mb-1.5 font-medium">Призначення видачі матеріалу *</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 border border-white/10 rounded-xl mb-3 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setIssueTargetType('equipment')}
                      className={`py-1.5 px-1 rounded-lg font-bold transition-all text-center ${
                        issueTargetType === 'equipment'
                          ? 'bg-[#ff6b00] text-white shadow-md'
                          : 'text-[#aaaaaa] hover:text-white'
                      }`}
                    >
                      ⚙️ На машинку
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssueTargetType('division')}
                      className={`py-1.5 px-1 rounded-lg font-bold transition-all text-center ${
                        issueTargetType === 'division'
                          ? 'bg-[#ff6b00] text-white shadow-md'
                          : 'text-[#aaaaaa] hover:text-white'
                      }`}
                    >
                      🏢 На підрозділ
                    </button>
                    <button
                      type="button"
                      onClick={() => setIssueTargetType('general')}
                      className={`py-1.5 px-1 rounded-lg font-bold transition-all text-center ${
                        issueTargetType === 'general'
                          ? 'bg-[#ff6b00] text-white shadow-md'
                          : 'text-[#aaaaaa] hover:text-white'
                      }`}
                    >
                      📦 Загальне
                    </button>
                  </div>

                  {issueTargetType === 'equipment' && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <label className="block text-[#aaaaaa] text-[11px]">Оберіть конкретне обладнання *</label>
                      <select
                        value={selectedEquipmentId}
                        onChange={(e) => {
                          const eqId = e.target.value;
                          setSelectedEquipmentId(eqId);
                          const eq = equipment.find((item) => item.id === eqId);
                          if (eq) setSelectedDivision(eq.division);
                        }}
                        className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-[#ff6b00]"
                      >
                        {equipment && equipment.length > 0 ? (
                          equipment.map((eq) => (
                            <option key={eq.id} value={eq.id} className="bg-[#111] text-white">
                              {eq.nomenclatureName} ({eq.classification || eq.subcategory}) — [{eq.nomenclatureNumber}] | {eq.division}
                            </option>
                          ))
                        ) : (
                          <option value="" className="bg-[#111]">Немає зареєстрованого обладнання</option>
                        )}
                      </select>
                    </div>
                  )}

                  {issueTargetType === 'division' && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
                      <label className="block text-[#aaaaaa] text-[11px]">Оберіть підрозділ / цех *</label>
                      <select
                        value={selectedDivision}
                        onChange={(e) => setSelectedDivision(e.target.value)}
                        className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-[#ff6b00]"
                      >
                        <option value="Цех №1 (Трикотаж)" className="bg-[#111]">Цех №1 (Трикотаж)</option>
                        <option value="Цех №2 (Верхній одяг)" className="bg-[#111]">Цех №2 (Верхній одяг)</option>
                        <option value="Розкрійний цех" className="bg-[#111]">Розкрійний цех</option>
                        <option value="Дільниця ВТО" className="bg-[#111]">Дільниця ВТО</option>
                        <option value="Склад" className="bg-[#111]">Склад</option>
                        <option value="Адміністрація" className="bg-[#111]">Адміністрація</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[#aaaaaa] mb-1">
                  Кількість ({adjustItem.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={adjustQty || ''}
                  onChange={(e) => setAdjustQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-lg font-bold text-white text-center focus:outline-none focus:border-[#ff6b00]"
                />
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                  <span className="text-[10px] text-[#aaaaaa] mr-1">Швидкий вибір:</span>
                  {[0.1, 0.25, 0.5, 1, 2, 5, 10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAdjustQty(val)}
                      className={`px-2 py-0.5 rounded-lg border text-[11px] font-mono transition-colors ${
                        adjustQty === val
                          ? 'bg-[#ff6b00] border-[#ff6b00] text-white font-bold'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Коментар / Примітка</label>
                <input
                  type="text"
                  placeholder={
                    adjustType === 'expense'
                      ? 'напр. Заміна голки після зламу / Планова видача'
                      : 'напр. Закупівля по накладній №12'
                  }
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={handleAdjustmentSubmit}
                className={`px-5 py-2 font-bold text-xs rounded-xl text-white transition-all active:scale-95 ${
                  adjustType === 'receipt' ? 'bg-[#2ecc71] hover:bg-[#2ecc71]/90' : 'bg-[#ff3b3b] hover:bg-[#ff3b3b]/90'
                }`}
              >
                {adjustType === 'receipt' ? 'Зарахувати' : 'Видати / Списати'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Movement History Modal */}
      {historyItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 relative max-h-[80vh] overflow-y-auto border-white/20">
            <button
              onClick={() => setHistoryItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Історія руху матеріалу</h3>
            <p className="text-xs text-[#ff6b00] font-bold mb-4">{historyItem.name}</p>

            {historyItem.movements.length === 0 ? (
              <p className="text-xs text-[#aaaaaa] p-6 text-center bg-white/5 rounded-xl">
                Рух товару ще не зафіксовано.
              </p>
            ) : (
              <div className="space-y-2.5">
                {historyItem.movements.map((mov) => {
                  const isPlus = mov.quantity > 0;
                  return (
                    <div key={mov.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[#aaaaaa] text-[11px]">{mov.date}</span>
                        <span className={`font-mono font-bold text-sm ${isPlus ? 'text-[#2ecc71]' : 'text-[#ff3b3b]'}`}>
                          {isPlus ? `+${mov.quantity}` : mov.quantity} {historyItem.unit}
                        </span>
                      </div>
                      <span className="text-white font-medium">{mov.note}</span>
                      {(mov.equipmentName || mov.division) && (
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {mov.equipmentName && (
                            <span className="px-2 py-0.5 rounded bg-[#ff6b00]/20 border border-[#ff6b00]/30 text-[#ff6b00] text-[10px] font-bold">
                              ⚙️ {mov.equipmentName}
                            </span>
                          )}
                          {mov.division && (
                            <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[#aaaaaa] text-[10px] font-medium">
                              🏢 {mov.division}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Detail / Passport Modal for Warehouse Item */}
      {selectedWarehouseItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="glass-card max-w-2xl w-full p-5 sm:p-7 relative max-h-[90vh] overflow-y-auto my-auto border-white/20 space-y-5">
            <button
              onClick={() => setSelectedWarehouseItem(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="pb-4 border-b border-white/10 pr-10 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-lg bg-[#ff6b00]/20 border border-[#ff6b00]/40 text-[#ff6b00] text-sm font-bold">
                  {selectedWarehouseItem.name}
                </span>
                {getStatusDot(selectedWarehouseItem.currentStock === 0, selectedWarehouseItem.currentStock <= selectedWarehouseItem.minStockThreshold)}
                <span className="text-xs font-bold text-[#aaaaaa]">
                  {selectedWarehouseItem.currentStock === 0 ? 'Немає на складі' : selectedWarehouseItem.currentStock <= selectedWarehouseItem.minStockThreshold ? 'Малий залишок' : 'Норма'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {selectedWarehouseItem.brand && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#00f0ff]/15 border border-[#00f0ff]/30 text-[#00f0ff] font-semibold">
                    {selectedWarehouseItem.brand}
                  </span>
                )}
                {selectedWarehouseItem.specs && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/15 text-white/90 font-mono">
                    {selectedWarehouseItem.specs}
                  </span>
                )}
                {selectedWarehouseItem.purpose && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#2ecc71]/15 border border-[#2ecc71]/30 text-[#2ecc71] font-medium">
                    {selectedWarehouseItem.purpose}
                  </span>
                )}
              </div>
            </div>

            {/* Spec Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div>
                <span className="text-[#aaaaaa] block">Фірма / Виробник:</span>
                <strong className="text-white">{selectedWarehouseItem.brand || 'Не вказано'}</strong>
              </div>
              <div>
                <span className="text-[#aaaaaa] block">Категорія:</span>
                <strong className="text-[#2ecc71]">{selectedWarehouseItem.category}</strong>
              </div>
              <div>
                <span className="text-[#aaaaaa] block">Постачальник:</span>
                <strong className="text-white">{selectedWarehouseItem.supplier || 'Не вказано'}</strong>
              </div>
              <div>
                <span className="text-[#aaaaaa] block">Поточний залишок:</span>
                <strong className="text-white font-mono text-sm">{selectedWarehouseItem.currentStock} {selectedWarehouseItem.unit}</strong>
              </div>
              {selectedWarehouseItem.unit === 'уп' && selectedWarehouseItem.itemsPerPack ? (
                <div>
                  <span className="text-[#aaaaaa] block">Загальна кількість:</span>
                  <strong className="text-[#2ecc71] font-mono text-sm">{selectedWarehouseItem.currentStock * selectedWarehouseItem.itemsPerPack} шт</strong>
                </div>
              ) : null}
              <div>
                <span className="text-[#aaaaaa] block">Мінімальний поріг:</span>
                <strong className="text-white font-mono">{selectedWarehouseItem.minStockThreshold} {selectedWarehouseItem.unit}</strong>
              </div>
              <div>
                <span className="text-[#aaaaaa] block">Дата оприходування:</span>
                <strong className="text-white font-mono">{selectedWarehouseItem.arrivalDate || '—'}</strong>
              </div>
              {selectedWarehouseItem.itemsPerPack ? (
                <div>
                  <span className="text-[#aaaaaa] block">В упаковці:</span>
                  <strong className="text-white font-mono">{selectedWarehouseItem.itemsPerPack} шт/уп</strong>
                </div>
              ) : null}
              {selectedWarehouseItem.purchasePrice ? (
                <div>
                  <span className="text-[#aaaaaa] block">Ціна видаткової накладної:</span>
                  <strong className="text-white font-mono">{selectedWarehouseItem.purchasePrice} грн</strong>
                </div>
              ) : null}
            </div>

            {/* Movements History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#ff6b00]" />
                Історія руху цієї позиції ({selectedWarehouseItem.movements.length})
              </h4>

              {selectedWarehouseItem.movements.length === 0 ? (
                <p className="text-xs text-[#aaaaaa] p-4 text-center bg-white/5 rounded-xl">
                  Операцій руху по цій позиції ще не зафіксовано.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedWarehouseItem.movements.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((mov) => {
                    const isPlus = mov.quantity > 0 || mov.type === 'receipt';
                    return (
                      <div key={mov.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono text-[#aaaaaa] text-[11px] block">{mov.date}</span>
                          <span className="text-white font-medium">{mov.note}</span>
                        </div>
                        <span className={`font-mono font-bold text-sm ${isPlus ? 'text-[#2ecc71]' : 'text-[#ff3b3b]'}`}>
                          {isPlus ? `+${mov.quantity}` : mov.quantity} {selectedWarehouseItem.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openAdjustmentModal(selectedWarehouseItem, 'receipt');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#2ecc71]/20 border border-[#2ecc71]/40 text-[#2ecc71] hover:bg-[#2ecc71]/30 text-xs font-bold flex items-center gap-1"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> +Прихід
                </button>
                <button
                  onClick={() => {
                    openAdjustmentModal(selectedWarehouseItem, 'expense');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#ff3b3b]/20 border border-[#ff3b3b]/40 text-[#ff3b3b] hover:bg-[#ff3b3b]/30 text-xs font-bold flex items-center gap-1"
                >
                  <TrendingDown className="w-3.5 h-3.5" /> -Видача
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingItem(selectedWarehouseItem);
                    setIsConfirmingDelete(false);
                    setIsAddEditModalOpen(true);
                    setSelectedWarehouseItem(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white"
                >
                  Редагувати
                </button>
                <button
                  onClick={() => setSelectedWarehouseItem(null)}
                  className="px-4 py-2 btn-accent text-xs font-bold"
                >
                  Закрити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
