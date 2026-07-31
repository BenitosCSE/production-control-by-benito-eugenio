import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  QrCode,
  Scan,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Camera,
  Trash2,
  FileText,
  X,
  Calendar,
  User,
  Building,
  Tag,
  Package
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { EquipmentItem, EquipmentStatus, EquipmentCategory, RepairRecord, MaintenancePlan, WarehouseItem } from '../types';

interface EquipmentSectionProps {
  equipment: EquipmentItem[];
  warehouse: WarehouseItem[];
  initialStatusFilter?: string;
  onSaveEquipment: (item: EquipmentItem) => Promise<void>;
  onDeleteEquipment: (id: string) => Promise<void>;
  onDeductWarehouseStock: (
    itemId: string,
    quantity: number,
    note: string,
    equipmentId?: string,
    division?: string,
    equipmentName?: string
  ) => Promise<void>;
  onDownloadRepairPDF: (equipment: EquipmentItem, repair?: RepairRecord) => Promise<void>;
}

export const EquipmentSection: React.FC<EquipmentSectionProps> = ({
  equipment,
  warehouse,
  initialStatusFilter,
  onSaveEquipment,
  onDeleteEquipment,
  onDeductWarehouseStock,
  onDownloadRepairPDF,
}) => {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');

  // Modals state
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Partial<EquipmentItem>>({});
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isAddRepairModalOpen, setIsAddRepairModalOpen] = useState(false);
  const [isAddMaintenanceModalOpen, setIsAddMaintenanceModalOpen] = useState(false);

  // Quick Issue Needles/Parts state
  const [isQuickIssueModalOpen, setIsQuickIssueModalOpen] = useState(false);
  const [issueWarehouseItemId, setIssueWarehouseItemId] = useState<string>('');
  const [issueQty, setIssueQty] = useState<number>(1);
  const [issueNote, setIssueNote] = useState<string>('Видача голок/матеріалу на машинку');

  // New Repair form state
  const [repairForm, setRepairForm] = useState<{
    faultDescription: string;
    workDone: string;
    performerType: 'self' | 'external';
    performerName: string;
    usedParts: { warehouseItemId: string; itemName: string; quantity: number; unitPrice: number }[];
    costWork: number;
    photoBefore?: string;
    photoAfter?: string;
  }>({
    faultDescription: '',
    workDone: '',
    performerType: 'self',
    performerName: 'Євгеній (Майстер)',
    usedParts: [],
    costWork: 0,
  });

  // Selected part for repair picker
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState(1);

  // New Maintenance Plan form
  const [mPlanForm, setMPlanForm] = useState<{
    workType: string;
    frequencyType: 'days' | 'months' | 'hours';
    frequencyValue: number;
    nextDueDate: string;
  }>({
    workType: 'Профілактичне змащення та очищення',
    frequencyType: 'days',
    frequencyValue: 30,
    nextDueDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // QR Code Camera Scanner initialization
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isQrScannerOpen) {
      scanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.id) {
              const matched = equipment.find((e) => e.id === data.id);
              if (matched) {
                setSelectedEquipment(matched);
                setIsQrScannerOpen(false);
                if (scanner) scanner.clear();
                return;
              }
            }
          } catch (e) {
            // Raw text match
            const matched = equipment.find(
              (e) => e.nomenclatureNumber === decodedText || e.serialNumber === decodedText
            );
            if (matched) {
              setSelectedEquipment(matched);
              setIsQrScannerOpen(false);
              if (scanner) scanner.clear();
              return;
            }
          }
          alert(`Скановано QR: ${decodedText}`);
        },
        () => {}
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isQrScannerOpen, equipment]);

  // Unique list of brands for filter
  const brands = React.useMemo(() => {
    const set = new Set<string>();
    equipment.forEach((item) => {
      const b = item.brand || item.nomenclatureName.split(' ')[0];
      if (b) set.add(b);
    });
    return Array.from(set).sort();
  }, [equipment]);

  // Unique list of models for filter
  const models = React.useMemo(() => {
    const set = new Set<string>();
    equipment.forEach((item) => {
      const itemBrand = item.brand || item.nomenclatureName.split(' ')[0];
      if (brandFilter === 'all' || itemBrand === brandFilter) {
        const m = item.model || item.nomenclatureName.split(' ').slice(1).join(' ');
        if (m) set.add(m);
      }
    });
    return Array.from(set).sort();
  }, [equipment, brandFilter]);

  // Filtered Equipment List
  const filteredEquipment = equipment.filter((item) => {
    const itemBrand = item.brand || item.nomenclatureName.split(' ')[0] || '';
    const itemModel = item.model || item.nomenclatureName.split(' ').slice(1).join(' ') || '';

    const matchesSearch =
      item.nomenclatureName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemBrand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.classification && item.classification.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.nomenclatureNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.responsiblePerson.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesBrand = brandFilter === 'all' || itemBrand === brandFilter;
    const matchesModel = modelFilter === 'all' || itemModel === modelFilter;
    const matchesDivision = divisionFilter === 'all' || item.division === divisionFilter;

    let matchesStatus = true;
    if (statusFilter === 'maintenance') {
      const todayStr = new Date().toISOString().split('T')[0];
      matchesStatus = item.maintenancePlans.some((p) => p.nextDueDate <= todayStr || p.status === 'due' || p.status === 'overdue');
    } else if (statusFilter !== 'all') {
      matchesStatus = item.status === statusFilter;
    }

    return matchesSearch && matchesCategory && matchesBrand && matchesModel && matchesDivision && matchesStatus;
  });

  // Unique list of divisions for filter
  const divisions = Array.from(new Set(equipment.map((e) => e.division)));

  // Status Badge Colors
  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'in_work':
        return <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/30 flex-shrink-0 whitespace-nowrap">В роботі</span>;
      case 'repair':
        return <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold bg-[#ff3b3b]/20 text-[#ff3b3b] border border-[#ff3b3b]/30 flex-shrink-0 whitespace-nowrap">На ремонті</span>;
      case 'awaiting_parts':
        return <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold bg-[#ffb020]/20 text-[#ffb020] border border-[#ffb020]/30 flex-shrink-0 whitespace-nowrap">Очікує деталей</span>;
      case 'warehouse':
        return <span className="px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold bg-white/10 text-[#aaaaaa] border border-white/20 flex-shrink-0 whitespace-nowrap">На складі</span>;
    }
  };

  // Status Dot Indicator for compressed card view
  const getStatusDot = (status: EquipmentStatus) => {
    switch (status) {
      case 'in_work':
        return <span title="В роботі" className="w-3 h-3 rounded-full bg-[#2ecc71] shadow-[0_0_8px_rgba(46,204,113,0.7)] flex-shrink-0 inline-block" />;
      case 'repair':
        return <span title="На ремонті" className="w-3 h-3 rounded-full bg-[#ff3b3b] shadow-[0_0_8px_rgba(255,59,59,0.7)] flex-shrink-0 inline-block" />;
      case 'awaiting_parts':
        return <span title="Очікує деталей" className="w-3 h-3 rounded-full bg-[#ffb020] shadow-[0_0_8px_rgba(255,176,32,0.7)] flex-shrink-0 inline-block" />;
      case 'warehouse':
        return <span title="На складі" className="w-3 h-3 rounded-full bg-[#aaaaaa] border border-white/20 flex-shrink-0 inline-block" />;
    }
  };

  // Image Upload helper
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          callback(reader.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save new equipment or edited equipment
  const handleSaveEquipmentSubmit = async () => {
    const brandVal = (editingEquipment.brand || (editingEquipment.nomenclatureName ? editingEquipment.nomenclatureName.split(' ')[0] : '')).trim();
    const modelVal = (editingEquipment.model || (editingEquipment.nomenclatureName ? editingEquipment.nomenclatureName.split(' ').slice(1).join(' ') : '')).trim();
    const fullNomenclature = `${brandVal} ${modelVal}`.trim() || editingEquipment.nomenclatureName || 'Обладнання';

    if (!brandVal) {
      alert('Будь ласка, вкажіть марку (бренд) машини!');
      return;
    }
    if (!modelVal) {
      alert('Будь ласка, вкажіть модель машини!');
      return;
    }
    if (!editingEquipment.nomenclatureNumber) {
      alert('Будь ласка, вкажіть номенклатурний номер!');
      return;
    }

    const itemToSave: EquipmentItem = {
      id: editingEquipment.id || `eq-${Date.now()}`,
      brand: brandVal,
      model: modelVal,
      nomenclatureName: fullNomenclature,
      classification: editingEquipment.classification || editingEquipment.subcategory || 'Обладнання',
      serialNumber: editingEquipment.serialNumber || 'Б/Н',
      nomenclatureNumber: editingEquipment.nomenclatureNumber,
      category: editingEquipment.category || 'Швейна машина',
      subcategory: editingEquipment.subcategory || editingEquipment.classification || 'Основна',
      division: editingEquipment.division || 'Цех №1',
      responsiblePerson: editingEquipment.responsiblePerson || 'Беніто Євгеній',
      status: editingEquipment.status || 'in_work',
      commissioningDate: editingEquipment.commissioningDate || new Date().toISOString().split('T')[0],
      photos: editingEquipment.photos || [],
      repairs: editingEquipment.repairs || [],
      maintenancePlans: editingEquipment.maintenancePlans || [],
      notes: editingEquipment.notes || '',
    };

    await onSaveEquipment(itemToSave);
    setIsAddEditModalOpen(false);
    setEditingEquipment({});
    if (selectedEquipment && selectedEquipment.id === itemToSave.id) {
      setSelectedEquipment(itemToSave);
    }
  };

  // Add Part to repair list
  const handleAddPartToRepair = () => {
    if (!selectedPartId) return;
    const whItem = warehouse.find((w) => w.id === selectedPartId);
    if (!whItem) return;

    if (partQty > whItem.currentStock) {
      alert(`Недостатньо на складі! Доступно тільки ${whItem.currentStock} ${whItem.unit}`);
      return;
    }

    setRepairForm((prev) => ({
      ...prev,
      usedParts: [
        ...prev.usedParts,
        {
          warehouseItemId: whItem.id,
          itemName: whItem.name,
          quantity: partQty,
          unitPrice: whItem.purchasePrice || 0,
        },
      ],
    }));

    setSelectedPartId('');
    setPartQty(1);
  };

  // Submit New Repair
  const handleAddRepairSubmit = async () => {
    if (!selectedEquipment) return;
    if (!repairForm.faultDescription || !repairForm.workDone) {
      alert('Будь ласка, заповніть опис несправності та виконаних робіт');
      return;
    }

    const costParts = repairForm.usedParts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
    const totalCost = costParts + Number(repairForm.costWork);

    const newRepair: RepairRecord = {
      id: `rep-${Date.now()}`,
      equipmentId: selectedEquipment.id,
      date: new Date().toISOString().split('T')[0],
      faultDescription: repairForm.faultDescription,
      workDone: repairForm.workDone,
      performerType: repairForm.performerType,
      performerName: repairForm.performerName,
      usedParts: repairForm.usedParts,
      costParts,
      costWork: Number(repairForm.costWork),
      totalCost,
      photoBefore: repairForm.photoBefore,
      photoAfter: repairForm.photoAfter,
    };

    // Deduct parts from warehouse with machine link
    for (const part of repairForm.usedParts) {
      await onDeductWarehouseStock(
        part.warehouseItemId,
        part.quantity,
        `Списання на ремонт обладнання ${selectedEquipment.nomenclatureName} [${selectedEquipment.nomenclatureNumber}]`,
        selectedEquipment.id,
        selectedEquipment.division,
        `${selectedEquipment.nomenclatureName} [${selectedEquipment.nomenclatureNumber}]`
      );
    }

    const updatedEquipment: EquipmentItem = {
      ...selectedEquipment,
      repairs: [newRepair, ...selectedEquipment.repairs],
      status: 'in_work', // Status resets to working after repair
    };

    await onSaveEquipment(updatedEquipment);
    setSelectedEquipment(updatedEquipment);
    setIsAddRepairModalOpen(false);

    // Reset repair form
    setRepairForm({
      faultDescription: '',
      workDone: '',
      performerType: 'self',
      performerName: 'Євгеній (Майстер)',
      usedParts: [],
      costWork: 0,
    });
  };

  // Add Maintenance Plan Submit
  const handleAddMaintenanceSubmit = async () => {
    if (!selectedEquipment) return;

    const newPlan: MaintenancePlan = {
      id: `mp-${Date.now()}`,
      equipmentId: selectedEquipment.id,
      workType: mPlanForm.workType,
      frequencyType: mPlanForm.frequencyType,
      frequencyValue: mPlanForm.frequencyValue,
      lastDoneDate: new Date().toISOString().split('T')[0],
      nextDueDate: mPlanForm.nextDueDate,
      status: 'pending',
    };

    const updatedEquipment: EquipmentItem = {
      ...selectedEquipment,
      maintenancePlans: [...selectedEquipment.maintenancePlans, newPlan],
    };

    await onSaveEquipment(updatedEquipment);
    setSelectedEquipment(updatedEquipment);
    setIsAddMaintenanceModalOpen(false);
  };

  // Open Quick Issue Modal for Machine
  const openQuickIssueModal = () => {
    if (!selectedEquipment) return;
    // Prefer items in category 'Голки'
    const needleItem = warehouse.find((w) => w.category === 'Голки' && w.currentStock > 0) || warehouse[0];
    setIssueWarehouseItemId(needleItem ? needleItem.id : '');
    setIssueQty(1);
    setIssueNote(`Видача голок/матеріалу на ${selectedEquipment.nomenclatureName}`);
    setIsQuickIssueModalOpen(true);
  };

  // Quick Issue Submit
  const handleQuickIssueSubmit = async () => {
    if (!selectedEquipment || !issueWarehouseItemId) {
      alert('Будь ласка, оберіть позицію для видачі зі складу');
      return;
    }
    const targetWh = warehouse.find((w) => w.id === issueWarehouseItemId);
    if (!targetWh) return;

    if (issueQty <= 0) {
      alert('Будь ласка, вкажіть кількість більше 0');
      return;
    }

    if (targetWh.currentStock < issueQty) {
      alert(`Недостатньо залишку на складі! Наявний залишок: ${targetWh.currentStock} ${targetWh.unit}`);
      return;
    }

    await onDeductWarehouseStock(
      issueWarehouseItemId,
      issueQty,
      issueNote || `Видача на ${selectedEquipment.nomenclatureName}`,
      selectedEquipment.id,
      selectedEquipment.division,
      `${selectedEquipment.nomenclatureName} [${selectedEquipment.nomenclatureNumber}]`
    );

    setIsQuickIssueModalOpen(false);
    setIssueQty(1);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header Controls: Search & Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaaaaa]" />
            <input
              type="text"
              placeholder="Пошук за назвою, серійним або номенклатурним номером..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white placeholder-[#aaaaaa] focus:outline-none focus:border-[#ff6b00]"
            />
          </div>

          {/* Action Buttons: Add Equipment & Camera Scan QR */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsQrScannerOpen(true)}
              className="px-3 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Scan className="w-4 h-4 text-[#ff6b00]" />
              <span className="hidden sm:inline">Сканувати QR</span>
            </button>

            <button
              onClick={() => {
                setEditingEquipment({});
                setIsAddEditModalOpen(true);
              }}
              className="px-4 py-2.5 btn-accent text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Додати техніку
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-white/10">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#ff6b00]"
          >
            <option value="all" className="bg-[#111]">Всі категорії</option>
            <option value="Швейна машина" className="bg-[#111]">Швейна машина</option>
            <option value="Розкрійне обладнання" className="bg-[#111]">Розкрійне обладнання</option>
            <option value="Волого-теплова обробка" className="bg-[#111]">Волого-теплова обробка</option>
            <option value="Спеціальне обладнання" className="bg-[#111]">Спеціальне обладнання</option>
            <option value="Вспоміжне обладнання" className="bg-[#111]">Вспоміжне обладнання</option>
          </select>

          {/* Brand Filter */}
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setModelFilter('all');
            }}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#ff6b00]"
          >
            <option value="all" className="bg-[#111]">Всі марки (бренди)</option>
            {brands.map((b) => (
              <option key={b} value={b} className="bg-[#111]">
                {b}
              </option>
            ))}
          </select>

          {/* Model Filter */}
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#ff6b00]"
          >
            <option value="all" className="bg-[#111]">Всі моделі</option>
            {models.map((m) => (
              <option key={m} value={m} className="bg-[#111]">
                {m}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#ff6b00]"
          >
            <option value="all" className="bg-[#111]">Всі статуси</option>
            <option value="in_work" className="bg-[#111]">В роботі</option>
            <option value="repair" className="bg-[#111]">На ремонті</option>
            <option value="awaiting_parts" className="bg-[#111]">Чекають запчастин</option>
            <option value="maintenance" className="bg-[#111]">Потребують ТО</option>
            <option value="warehouse" className="bg-[#111]">На складі</option>
          </select>

          {/* Division Filter */}
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-[#ff6b00]"
          >
            <option value="all" className="bg-[#111]">Всі підрозділи</option>
            {divisions.map((d) => (
              <option key={d} value={d} className="bg-[#111]">
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Equipment List Grid Header with View Switcher */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="text-xs text-[#aaaaaa]">
          Знайдено: <strong className="text-white font-mono">{filteredEquipment.length}</strong> од.
        </div>
      </div>

      {/* Equipment List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full p-8 sm:p-12 text-center text-xs text-[#aaaaaa] glass-card border-dashed">
            Обладнання не знайдено за заданими фільтрами.
          </div>
        ) : (
          filteredEquipment.map((item) => {
            const brandName = item.brand || item.nomenclatureName.split(' ')[0] || 'Обладнання';
            const modelName = item.model || item.nomenclatureName.split(' ').slice(1).join(' ') || '-';
            const categoryName = item.classification || item.category || item.subcategory || 'Техніка';

            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedEquipment(item);
                  setIsConfirmingDelete(false);
                }}
                className="glass-card glass-card-hover p-3.5 sm:p-4 cursor-pointer relative flex flex-col justify-between group h-full"
              >
                <div>
                  {/* Верхня строка (Шапка карточки) */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {/* Слева: оранжевая плашка с брендом */}
                      <span className="px-2 py-0.5 rounded bg-[#ff6b00]/20 border border-[#ff6b00]/40 text-[#ff6b00] text-[11px] sm:text-xs font-bold truncate">
                        {brandName}
                      </span>
                      {/* Справа: Сине-голубая плашка с моделью */}
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-400 text-[11px] sm:text-xs font-bold truncate">
                        {modelName}
                      </span>
                    </div>

                    {/* Правый верхний угол: кружочек цвета статуса */}
                    <div className="flex items-center pl-1 flex-shrink-0">
                      {getStatusDot(item.status)}
                    </div>
                  </div>

                  {/* Снизу зеленый шрифт: категория техники */}
                  <p className="text-xs text-[#2ecc71] font-semibold mt-1 mb-2 leading-tight">
                    {categoryName}
                  </p>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 my-2 text-xs text-[#aaaaaa] font-medium border-t border-white/5 pt-2">
                    <div className="truncate">
                      Інв. №: <span className="font-mono text-white font-semibold">{item.nomenclatureNumber}</span>
                    </div>
                    <div className="truncate">
                      Цех: <span className="text-white">{item.division}</span>
                    </div>
                    <div className="col-span-2 truncate">
                      Серійний: <span className="font-mono text-white">{item.serialNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#aaaaaa] pt-1.5 mt-auto border-t border-white/5">
                  <span className="font-mono text-[11px]">
                    Ремонтів: <strong className="text-white">{item.repairs.length}</strong>
                  </span>
                  <span className="text-[#ff6b00] font-semibold flex items-center gap-0.5 text-xs group-hover:translate-x-0.5 transition-transform">
                    Паспорт <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Camera QR Code Scanner Modal */}
      {isQrScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-5 text-center relative border-[#ff6b00]/40">
            <button
              onClick={() => setIsQrScannerOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center justify-center gap-2">
              <Scan className="w-5 h-5 text-[#ff6b00]" /> Сканування QR-коду техніки
            </h3>
            <p className="text-xs text-[#aaaaaa] mb-4">
              Наведіть камеру смартфона або планшета на QR-код на обладнанні
            </p>

            <div id="qr-reader" className="w-full rounded-2xl overflow-hidden border border-white/20 bg-black mb-4"></div>

            <button
              onClick={() => setIsQrScannerOpen(false)}
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold text-white"
            >
              Закрити сканер
            </button>
          </div>
        </div>
      )}

      {/* Equipment Passport Modal */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="glass-card max-w-3xl w-full p-5 sm:p-7 relative max-h-[90vh] overflow-y-auto my-auto border-white/20">
            {/* Close Button */}
            <button
              onClick={() => setSelectedEquipment(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Passport Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-[#ff6b00] px-2.5 py-0.5 rounded bg-[#ff6b00]/20 border border-[#ff6b00]/30">
                    {selectedEquipment.nomenclatureNumber}
                  </span>
                  {getStatusBadge(selectedEquipment.status)}
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">
                    <span className="text-[#aaaaaa] text-xs font-normal uppercase tracking-wider block">Обладнання:</span>
                    {selectedEquipment.nomenclatureName}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-[#ff6b00]/20 border border-[#ff6b00]/30 text-[#ff6b00] font-bold">
                      Марка: {selectedEquipment.brand || selectedEquipment.nomenclatureName.split(' ')[0]}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-white font-bold">
                      Модель: {selectedEquipment.model || selectedEquipment.nomenclatureName.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                  <p className="text-sm text-[#2ecc71] font-semibold pt-1">
                    <span className="text-[#aaaaaa] text-xs font-normal uppercase tracking-wider block">Класифікація обладнання:</span>
                    {selectedEquipment.classification || selectedEquipment.subcategory}
                  </p>
                  <p className="text-xs text-[#aaaaaa] pt-0.5">
                    Категорія: <strong className="text-white">{selectedEquipment.category}</strong>
                  </p>
                </div>
              </div>

              {/* QR Code Tag */}
              {selectedEquipment.qrCodeUrl && (
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl shrink-0 border border-white/20 shadow-lg">
                  <img src={selectedEquipment.qrCodeUrl} alt="QR Code" className="w-20 h-20" />
                  <div className="text-black text-left font-mono">
                    <p className="text-[10px] font-bold uppercase text-gray-500">QR-Паспорт</p>
                    <p className="text-xs font-bold text-black">{selectedEquipment.nomenclatureNumber}</p>
                    <a
                      href={selectedEquipment.qrCodeUrl}
                      download={`QR_${selectedEquipment.nomenclatureNumber}.png`}
                      className="inline-flex items-center gap-1 text-[10px] text-[#ff6b00] font-bold mt-1 hover:underline"
                    >
                      <Download className="w-3 h-3" /> Завантажити
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Specifications Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div>
                <span className="text-[#aaaaaa] block">Серійний номер:</span>
                <strong className="text-white font-mono">{selectedEquipment.serialNumber}</strong>
              </div>
              <div>
                <span className="text-[#aaaaaa] block">Підрозділ / Цех:</span>
                <strong className="text-white">{selectedEquipment.division}</strong>
              </div>
              <div>
                <span className="text-[#aaaaaa] block">Відповідальна особа:</span>
                <strong className="text-white">{selectedEquipment.responsiblePerson}</strong>
              </div>
              <div>
                <span className="text-[#aaaaaa] block">Введення в експлуатацію:</span>
                <strong className="text-white font-mono">{selectedEquipment.commissioningDate}</strong>
              </div>
            </div>

            {selectedEquipment.notes && (
              <div className="p-3 mb-5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#aaaaaa]">
                <strong className="text-white">Примітки:</strong> {selectedEquipment.notes}
              </div>
            )}

            {/* REPAIR HISTORY SECTION */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#ff6b00]" />
                  Історія ремонтів та обслуговування ({selectedEquipment.repairs.length})
                </h3>
                <button
                  onClick={() => setIsAddRepairModalOpen(true)}
                  className="px-3 py-1.5 btn-accent text-xs font-bold flex items-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Зафіксувати ремонт
                </button>
              </div>

              {selectedEquipment.repairs.length === 0 ? (
                <p className="text-xs text-[#aaaaaa] p-4 text-center bg-white/5 rounded-xl">
                  Ремонтів та несправностей не зафіксовано.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedEquipment.repairs.map((rep) => (
                    <div key={rep.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[#ff6b00] font-bold">{rep.date}</span>
                        <span className="text-[#aaaaaa]">
                          Виконавець: <strong className="text-white">{rep.performerName}</strong>
                        </span>
                        <button
                          onClick={() => onDownloadRepairPDF(selectedEquipment, rep)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-[#ff6b00]/20 text-[#ff6b00] text-[11px] font-semibold flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Акт (PDF)
                        </button>
                      </div>

                      <p className="text-xs font-bold text-white">Несправність: {rep.faultDescription}</p>
                      <p className="text-xs text-[#aaaaaa]">Виконані роботи: {rep.workDone}</p>

                      {rep.usedParts && rep.usedParts.length > 0 && (
                        <div className="text-[11px] text-[#aaaaaa] pt-1">
                          Списані запчастини:{' '}
                          <span className="text-white">
                            {rep.usedParts.map((p) => `${p.itemName} (${p.quantity}шт)`).join(', ')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5 font-mono">
                        <span>Запчастини: {rep.costParts} грн | Робота: {rep.costWork} грн</span>
                        <strong className="text-[#ff6b00] text-sm">Всього: {rep.totalCost} грн</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MAINTENANCE PLANNING SECTION */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#ffb020]" />
                  Заплановані регламентні роботи ({selectedEquipment.maintenancePlans.length})
                </h3>
                <button
                  onClick={() => setIsAddMaintenanceModalOpen(true)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Запланувати ТО
                </button>
              </div>

              {selectedEquipment.maintenancePlans.length === 0 ? (
                <p className="text-xs text-[#aaaaaa] p-4 text-center bg-white/5 rounded-xl">
                  Регламентні роботи не налаштовані.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedEquipment.maintenancePlans.map((mp) => (
                    <div key={mp.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-white block">{mp.workType}</strong>
                        <span className="text-[#aaaaaa] text-[11px]">
                          Періодичність: кожні {mp.frequencyValue} {mp.frequencyType === 'days' ? 'днів' : mp.frequencyType === 'months' ? 'місяців' : 'годин'}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[#aaaaaa] block">Наступне ТО:</span>
                        <strong className="text-[#ff6b00] text-sm">{mp.nextDueDate}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ISSUED NEEDLES & WAREHOUSE ITEMS FOR THIS MACHINE */}
            {(() => {
              const machineIssuedMovements = warehouse.flatMap((wh) =>
                wh.movements
                  .filter(
                    (m) =>
                      m.equipmentId === selectedEquipment.id ||
                      (m.note && m.note.includes(selectedEquipment.nomenclatureNumber))
                  )
                  .map((m) => ({
                    ...m,
                    itemName: wh.name,
                    category: wh.category,
                    unit: wh.unit,
                  }))
              ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#2ecc71]" />
                      Видані голки та матеріали зі складу ({machineIssuedMovements.length})
                    </h3>
                    <button
                      onClick={openQuickIssueModal}
                      className="px-3 py-1.5 bg-[#2ecc71]/20 hover:bg-[#2ecc71]/30 border border-[#2ecc71]/40 text-xs font-bold text-[#2ecc71] rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Видати голки / матеріали
                    </button>
                  </div>

                  {machineIssuedMovements.length === 0 ? (
                    <p className="text-xs text-[#aaaaaa] p-4 text-center bg-white/5 rounded-xl">
                      Видач голок та матеріалів зі складу не зафіксовано.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {machineIssuedMovements.map((mov) => (
                        <div
                          key={mov.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-white">{mov.itemName}</strong>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#aaaaaa]">
                                {mov.category}
                              </span>
                            </div>
                            <span className="text-[#aaaaaa] text-[11px] block mt-0.5">{mov.note}</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[#ff6b00] font-bold text-sm block">
                              {Math.abs(mov.quantity)} {mov.unit}
                            </span>
                            <span className="text-[#aaaaaa] text-[10px]">{mov.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              {isConfirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#ff3b3b] font-semibold">Видалити?</span>
                  <button
                    onClick={async () => {
                      setIsConfirmingDelete(false);
                      const idToDelete = selectedEquipment.id;
                      setSelectedEquipment(null);
                      await onDeleteEquipment(idToDelete);
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
                  className="px-3 py-2 rounded-xl bg-[#ff3b3b]/10 hover:bg-[#ff3b3b]/20 border border-[#ff3b3b]/30 text-xs font-semibold text-[#ff3b3b] flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Видалити
                </button>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDownloadRepairPDF(selectedEquipment)}
                  className="px-3.5 py-2 rounded-xl bg-[#ff6b00]/20 hover:bg-[#ff6b00]/30 border border-[#ff6b00]/40 text-xs font-bold text-[#ff6b00] flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-4 h-4" /> Зведений Акт / Паспорт (PDF)
                </button>
                <button
                  onClick={() => {
                    setEditingEquipment(selectedEquipment);
                    setIsAddEditModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white"
                >
                  Редагувати
                </button>
                <button
                  onClick={() => setSelectedEquipment(null)}
                  className="px-4 py-2 btn-accent text-xs font-bold"
                >
                  Закрити
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Equipment Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-xl w-full p-6 relative my-auto border-white/20">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingEquipment.id ? 'Редагування техніки' : 'Додавання нового обладнання'}
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">Марка обладнання (Виробник/Бренд) *</label>
                  <input
                    type="text"
                    placeholder="напр. JUKI, SIRUBA, JACK, TYPICAL"
                    list="brand-list-suggestions"
                    value={editingEquipment.brand ?? (editingEquipment.nomenclatureName ? editingEquipment.nomenclatureName.split(' ')[0] : '')}
                    onChange={(e) => {
                      const brandVal = e.target.value;
                      const modelVal = editingEquipment.model ?? (editingEquipment.nomenclatureName ? editingEquipment.nomenclatureName.split(' ').slice(1).join(' ') : '');
                      setEditingEquipment({
                        ...editingEquipment,
                        brand: brandVal,
                        model: modelVal,
                        nomenclatureName: `${brandVal} ${modelVal}`.trim()
                      });
                    }}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                  <datalist id="brand-list-suggestions">
                    <option value="JACK" />
                    <option value="SIRUBA" />
                    <option value="JUKI" />
                    <option value="BRUCE" />
                    <option value="TYPICAL" />
                    <option value="BROTHER" />
                    <option value="ZOJE" />
                    <option value="TYPE SPECIAL" />
                    <option value="SILTER" />
                    <option value="EASTMAN" />
                    <option value="KANSAI" />
                    <option value="PEGASUS" />
                    <option value="YAMATO" />
                    <option value="DÜRKOPP ADLER" />
                    <option value="PFAFF" />
                    <option value="BAOYU" />
                    <option value="GEMSY" />
                    <option value="MAQI" />
                    <option value="MAIER" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-[#aaaaaa] mb-1 font-medium">Модель машини *</label>
                  <input
                    type="text"
                    placeholder="напр. Jack A4B, Siruba 747K"
                    list="model-list-suggestions"
                    value={editingEquipment.model ?? (editingEquipment.nomenclatureName ? editingEquipment.nomenclatureName.split(' ').slice(1).join(' ') : '')}
                    onChange={(e) => {
                      const modelVal = e.target.value;
                      const brandVal = editingEquipment.brand ?? (editingEquipment.nomenclatureName ? editingEquipment.nomenclatureName.split(' ')[0] : '');
                      setEditingEquipment({
                        ...editingEquipment,
                        brand: brandVal,
                        model: modelVal,
                        nomenclatureName: `${brandVal} ${modelVal}`.trim()
                      });
                    }}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                  <datalist id="model-list-suggestions">
                    <option value="Jack F4" />
                    <option value="Jack F5" />
                    <option value="Jack A2" />
                    <option value="Jack A2B" />
                    <option value="Jack A4" />
                    <option value="Jack A4B" />
                    <option value="Jack A4E" />
                    <option value="Jack A4S" />
                    <option value="Jack A5" />
                    <option value="Jack A5E" />
                    <option value="Jack A6F" />
                    <option value="Jack A7" />
                    <option value="Jack A8" />
                    <option value="Jack C3" />
                    <option value="Jack C4" />
                    <option value="Jack C5" />
                    <option value="Jack E4S" />
                    <option value="Jack E5S" />
                    <option value="Jack JK-T1900BS" />
                    <option value="Jack JK-T1377E" />
                    <option value="Jack JK-T1790S" />
                    <option value="Jack JK-T781E" />
                    <option value="Jack JK-T9270D" />
                    <option value="Jack JK-609" />
                    <option value="Jack JK-8009" />
                    <option value="Jack JK-8569" />
                    <option value="Siruba 747K" />
                    <option value="Siruba F007K" />
                    <option value="Juki DDL-8700" />
                    <option value="Juki MO-6814S" />
                    <option value="Juki LBH-1790S" />
                    <option value="Bruce R4" />
                    <option value="Bruce B5" />
                    <option value="Silter SPR/MN 2035" />
                    <option value="Silter Super Mini 2002" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1 font-medium">Класифікація (тип машини) *</label>
                <input
                  type="text"
                  placeholder="напр. Прямострочна машина 1-голкова"
                  list="classification-list-suggestions"
                  value={editingEquipment.classification || ''}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, classification: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                />
                <datalist id="classification-list-suggestions">
                  <option value="Прямострочна машина (1-голка)" />
                  <option value="Оверлок 3-нитковий" />
                  <option value="Оверлок 4-нитковий" />
                  <option value="Оверлок 5-нитковий" />
                  <option value="Розпошивальна машина (плоскошовка)" />
                  <option value="Двоголкова машина" />
                  <option value="Гудзикова машина" />
                  <option value="Петельна машина" />
                  <option value="Закріплювальна машина" />
                  <option value="Поясна машина (багатоголкова)" />
                  <option value="Бейкорізна машина" />
                  <option value="Парогенератор з праскою" />
                  <option value="Прасувальний стіл з відсмоктуванням" />
                  <option value="Дублювальний прес" />
                  <option value="Дисковий розкрійний ніж" />
                  <option value="Шабельний розкрійний ніж" />
                  <option value="Стрічкова розкрійна машина" />
                  <option value="Спеціальний автомат" />
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Номенклатурний номер *</label>
                  <input
                    type="text"
                    placeholder="напр. ШМ-005"
                    value={editingEquipment.nomenclatureNumber || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, nomenclatureNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Серійний номер</label>
                  <input
                    type="text"
                    placeholder="напр. JK-99212"
                    value={editingEquipment.serialNumber || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Категорія</label>
                  <select
                    value={editingEquipment.category || 'Швейна машина'}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, category: e.target.value as EquipmentCategory })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="Швейна машина" className="bg-[#111]">Швейна машина</option>
                    <option value="Розкрійне обладнання" className="bg-[#111]">Розкрійне обладнання</option>
                    <option value="Волого-теплова обробка" className="bg-[#111]">Волого-теплова обробка</option>
                    <option value="Спеціальне обладнання" className="bg-[#111]">Спеціальне обладнання</option>
                    <option value="Вспоміжне обладнання" className="bg-[#111]">Вспоміжне обладнання</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Підкатегорія</label>
                  <input
                    type="text"
                    placeholder="напр. Оверлок, Прямострочка"
                    list="subcategory-list-suggestions"
                    value={editingEquipment.subcategory || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, subcategory: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                  <datalist id="subcategory-list-suggestions">
                    <option value="Прямострочка" />
                    <option value="Оверлок" />
                    <option value="Распошивалка" />
                    <option value="Гудзиковий автомат" />
                    <option value="Петельний автомат" />
                    <option value="Закріпочний автомат" />
                    <option value="Бейкорізка" />
                    <option value="Парогенератор" />
                    <option value="Прасувальний стіл" />
                    <option value="Розкрійний ніж" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Цех / Підрозділ</label>
                  <input
                    type="text"
                    placeholder="напр. Бригада №1"
                    list="division-list-suggestions"
                    value={editingEquipment.division || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, division: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                  <datalist id="division-list-suggestions">
                    <option value="Бригада №1" />
                    <option value="Бригада №2" />
                    <option value="Бригада №3" />
                    <option value="Розкрійна бригада" />
                    <option value="Лабораторія" />
                    <option value="Прасувальна бригада" />
                    <option value="Спецобладнання" />
                    <option value="Ремонтна майстерня" />
                    <option value="Склад" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Відповідальна особа</label>
                  <input
                    type="text"
                    placeholder="напр. Беніто Євгеній"
                    value={editingEquipment.responsiblePerson || ''}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, responsiblePerson: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Статус</label>
                  <select
                    value={editingEquipment.status || 'in_work'}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, status: e.target.value as EquipmentStatus })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                  >
                    <option value="in_work" className="bg-[#111]">В роботі</option>
                    <option value="repair" className="bg-[#111]">На ремонті</option>
                    <option value="awaiting_parts" className="bg-[#111]">Чекає запчастин</option>
                    <option value="warehouse" className="bg-[#111]">На складі</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Дата введення в експлуатацію</label>
                  <input
                    type="date"
                    value={editingEquipment.commissioningDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, commissioningDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-[#ff6b00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Примітки</label>
                <textarea
                  rows={2}
                  placeholder="Особливості налаштування, додаткове приладдя..."
                  value={editingEquipment.notes || ''}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={handleSaveEquipmentSubmit}
                className="px-5 py-2 btn-accent text-xs font-bold"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Repair Modal */}
      {isAddRepairModalOpen && selectedEquipment && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-lg w-full p-6 relative my-auto border-white/20">
            <h3 className="text-base font-bold text-white mb-1">Фіксація ремонту обладнання</h3>
            <p className="text-xs text-[#ff6b00] font-mono mb-4">{selectedEquipment.nomenclatureName} ({selectedEquipment.nomenclatureNumber})</p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#aaaaaa] mb-1">Опис несправності *</label>
                <textarea
                  rows={2}
                  placeholder="Що зламалося або які прояви поломки..."
                  value={repairForm.faultDescription}
                  onChange={(e) => setRepairForm({ ...repairForm, faultDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                />
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Виконані роботи *</label>
                <textarea
                  rows={2}
                  placeholder="Детальний опис налагоджувальних та ремонтних робіт..."
                  value={repairForm.workDone}
                  onChange={(e) => setRepairForm({ ...repairForm, workDone: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Хто виконував</label>
                  <select
                    value={repairForm.performerType}
                    onChange={(e) =>
                      setRepairForm({ ...repairForm, performerType: e.target.value as 'self' | 'external' })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="self" className="bg-[#111]">Власні сили (Майстер)</option>
                    <option value="external" className="bg-[#111]">Стороння служба</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Назва / ПІБ майстра</label>
                  <input
                    type="text"
                    value={repairForm.performerName}
                    onChange={(e) => setRepairForm({ ...repairForm, performerName: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Spare Parts Picker from Warehouse */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <label className="block text-xs font-bold text-white">
                  Списання запчастин зі складу:
                </label>

                <div className="flex gap-2">
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs"
                  >
                    <option value="" className="bg-[#111]">-- Оберіть запчастину --</option>
                    {warehouse.map((w) => (
                      <option key={w.id} value={w.id} className="bg-[#111]">
                        {w.name} (Залишок: {w.currentStock} {w.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={partQty}
                    onChange={(e) => setPartQty(Number(e.target.value))}
                    className="w-16 px-2 py-2 bg-white/5 border border-white/10 rounded-xl text-center text-white font-mono"
                  />

                  <button
                    onClick={handleAddPartToRepair}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs"
                  >
                    + Додати
                  </button>
                </div>

                {repairForm.usedParts.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {repairForm.usedParts.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-[#aaaaaa] bg-white/5 p-1.5 rounded-lg">
                        <span>{p.itemName} ({p.quantity} шт)</span>
                        <strong className="text-white font-mono">{(p.quantity * p.unitPrice).toFixed(2)} грн</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Вартість виконаних робіт (грн)</label>
                <input
                  type="number"
                  value={repairForm.costWork}
                  onChange={(e) => setRepairForm({ ...repairForm, costWork: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsAddRepairModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={handleAddRepairSubmit}
                className="px-5 py-2 btn-accent text-xs font-bold"
              >
                Зберегти ремонт
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Maintenance Plan Modal */}
      {isAddMaintenanceModalOpen && selectedEquipment && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 relative border-white/20">
            <h3 className="text-base font-bold text-white mb-3">Планування регламентних робіт (ТО)</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#aaaaaa] mb-1">Вид регламентної роботи *</label>
                <input
                  type="text"
                  placeholder="напр. Заміна мастила, Заточка ножів..."
                  value={mPlanForm.workType}
                  onChange={(e) => setMPlanForm({ ...mPlanForm, workType: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Періодичність</label>
                  <input
                    type="number"
                    min="1"
                    value={mPlanForm.frequencyValue}
                    onChange={(e) => setMPlanForm({ ...mPlanForm, frequencyValue: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#aaaaaa] mb-1">Одиниця виміру</label>
                  <select
                    value={mPlanForm.frequencyType}
                    onChange={(e) =>
                      setMPlanForm({
                        ...mPlanForm,
                        frequencyType: e.target.value as 'days' | 'months' | 'hours',
                      })
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white"
                  >
                    <option value="days" className="bg-[#111]">Днів</option>
                    <option value="months" className="bg-[#111]">Місяців</option>
                    <option value="hours" className="bg-[#111]">Годин напрацювання</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Дата наступного виконання *</label>
                <input
                  type="date"
                  value={mPlanForm.nextDueDate}
                  onChange={(e) => setMPlanForm({ ...mPlanForm, nextDueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsAddMaintenanceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={handleAddMaintenanceSubmit}
                className="px-5 py-2 btn-accent text-xs font-bold"
              >
                Зберегти ТО
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Issue Needles & Materials Modal */}
      {isQuickIssueModalOpen && selectedEquipment && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 relative border-white/20">
            <h3 className="text-base font-bold text-white mb-1">
              Видача голок чи матеріалів на машинку
            </h3>
            <p className="text-xs text-[#ff6b00] font-bold mb-4">
              {selectedEquipment.nomenclatureName} [{selectedEquipment.nomenclatureNumber}]
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#aaaaaa] mb-1">Оберіть позицію зі складу *</label>
                <select
                  value={issueWarehouseItemId}
                  onChange={(e) => setIssueWarehouseItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-[#ff6b00]"
                >
                  {warehouse.length > 0 ? (
                    warehouse.map((item) => (
                      <option key={item.id} value={item.id} className="bg-[#111] text-white">
                        [{item.category}] {item.name} — Доступно: {item.currentStock} {item.unit}
                      </option>
                    ))
                  ) : (
                    <option value="" className="bg-[#111]">Склад порожній</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Кількість для видачі *</label>
                <input
                  type="number"
                  min="1"
                  value={issueQty}
                  onChange={(e) => setIssueQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-mono text-lg font-bold text-white text-center focus:outline-none focus:border-[#ff6b00]"
                />
              </div>

              <div>
                <label className="block text-[#aaaaaa] mb-1">Примітка / Причина видачі</label>
                <input
                  type="text"
                  placeholder="напр. Заміна голки після зламу / Планова заміна"
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#ff6b00]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsQuickIssueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold"
              >
                Скасувати
              </button>
              <button
                onClick={handleQuickIssueSubmit}
                className="px-5 py-2 btn-accent text-xs font-bold active:scale-95 transition-all"
              >
                Видати на машинку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
