export type EquipmentStatus = 'in_work' | 'warehouse' | 'repair' | 'awaiting_parts';

export type EquipmentCategory = 
  | 'Швейна машина'
  | 'Розкрійне обладнання'
  | 'Волого-теплова обробка'
  | 'Спеціальне обладнання'
  | 'Вспоміжне обладнання'
  | 'Інше';

export interface RepairRecord {
  id: string;
  equipmentId: string;
  date: string; // YYYY-MM-DD
  faultDescription: string;
  workDone: string;
  performerType: 'self' | 'external';
  performerName: string;
  usedParts: {
    warehouseItemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
  }[];
  costParts: number;
  costWork: number;
  totalCost: number;
  photoBefore?: string; // base64
  photoAfter?: string; // base64
}

export interface MaintenancePlan {
  id: string;
  equipmentId: string;
  workType: string; // e.g., Заміна мастила, Чистка човника, Регулювання натягу
  frequencyType: 'days' | 'months' | 'hours';
  frequencyValue: number;
  lastDoneDate: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  status: 'pending' | 'due' | 'overdue' | 'completed';
}

export interface EquipmentItem {
  id: string;
  brand?: string; // Марка машини (напр. JUKI, SIRUBA, JACK)
  model?: string; // Модель машини (напр. DDL-8700-7, 747K)
  nomenclatureName: string; // Назва / Повна марка та модель (напр., JUKI DDL-8700-7)
  classification: string; // Класифікація обладнання (напр., Прямострочна машина 1-голкова)
  serialNumber: string;
  nomenclatureNumber: string;
  category: EquipmentCategory;
  subcategory: string; // e.g., Оверлок 4-нитковий, Ручний розкрійний ніж
  division: string; // e.g., Цех №1, Розкрійне відділення, ВТО дільниця
  responsiblePerson: string;
  status: EquipmentStatus;
  qrCodeUrl?: string;
  commissioningDate: string; // YYYY-MM-DD
  photos: string[]; // base64 strings
  repairs: RepairRecord[];
  maintenancePlans: MaintenancePlan[];
  notes?: string;
}

export type WarehouseCategory = 
  | 'Запчастини'
  | 'Витратники'
  | 'Голки'
  | 'Мастило'
  | 'Інше';

export interface StockMovement {
  id: string;
  warehouseItemId: string;
  date: string; // ISO string or YYYY-MM-DD
  type: 'receipt' | 'expense' | 'repair_deduction' | 'inventory_adjustment';
  quantity: number;
  note: string;
  reasonForDeduction?: string; // Причина списання для бухгалтерії (знос, поломка, планова заміна тощо)
  repairId?: string;
  division?: string;
  equipmentId?: string;
  equipmentName?: string;
}

export interface WarehouseItem {
  id: string;
  name: string;
  category: WarehouseCategory;
  brand?: string; // Фірма / виробник (напр. Groz-Beckert, Organ)
  specs?: string; // Технічна характеристика (напр. DBx1 №90, 110/18)
  purpose?: string; // Призначення (напр. для прямострочної одноголкової машини)
  unit: string; // e.g., шт, уп, л, кг, г, компл
  itemsPerPack?: number; // кількість штук в упаковці (для одиниці "уп")
  currentStock: number;
  minStockThreshold: number;
  supplier?: string;
  purchasePrice?: number;
  arrivalDate?: string; // дата оприходування
  assignedEquipmentId?: string; // ID закріпленого обладнання
  assignedEquipmentName?: string; // Назва закріпленого обладнання
  movements: StockMovement[];
}

export interface InventoryCheckItem {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  accountingStock: number;
  actualStock: number;
  difference: number; // actual - accounting
  note?: string;
}

export interface InventoryAct {
  id: string;
  date: string;
  responsiblePerson: string;
  items: InventoryCheckItem[];
  notes?: string;
}

export interface SalarySettings {
  monthlySalary: number; // e.g. 25000 UAH
  workingDaysInMonth: number; // e.g. 22 days
  fullName: string; // e.g. Євгеній Беніто
  position: string; // e.g. Головний інженер / Майстер
}

export interface AutoCompensationSettings {
  carValue: number; // V — Вартість авто, грн (e.g. 350000)
  resourceKm: number; // R — Ресурс до капремонту, км (e.g. 250000)
  fuelConsumptionNorm: number; // N — Паспортна норма витрати, л/100 км (e.g. 9.0)
  kCold: number; // K_cold — Коефіцієнт холодного пуску (e.g. 1.5)
  sColdLimit: number; // S_cold — Ліміт дистанції прогріву, км (e.g. 3.0)
  petrolPrice: number; // P_benz — Ціна бензину, грн/л (e.g. 55.0)
  regularFuelPrice: number; // P_norm — Ціна штатного пального, грн/л (e.g. 30.0)
  kRisk: number; // K_risk — Коефіцієнт ризику/суміщення (e.g. 1.5)
  sStartEquivalent: number; // S_start — Еквівалент зносу холодного пуску, км (e.g. 10.0)
}

export interface AutoTripLog {
  distanceKm: number; // S_total
  durationMinutes: number; // T
  cTime: number; // Вартість робочого часу (надбавка)
  cFuel: number; // Пальне
  cWear: number; // Амортизація
  totalCompensation: number; // C_total
  note?: string;
}

export interface WorkDayLog {
  date: string; // YYYY-MM-DD
  hours: number;
  isWeekend: boolean; // Sat/Sun or custom weekend
  note?: string;
  autoTrip?: AutoTripLog;
}

export interface AppSettings {
  pinHash?: string;
  isPinSet: boolean;
  salarySettings: SalarySettings;
  autoSettings?: AutoCompensationSettings;
  lastBackupDate?: string;
}

export interface DatabaseData {
  equipment: EquipmentItem[];
  warehouse: WarehouseItem[];
  inventoryActs: InventoryAct[];
  workDayLogs: WorkDayLog[];
  settings: AppSettings;
}
