import { openDB, DBSchema, IDBPDatabase } from 'idb';
import QRCode from 'qrcode';
import { DatabaseData, EquipmentItem, WarehouseItem, WorkDayLog, InventoryAct, AppSettings } from '../types';

interface GarmentDB extends DBSchema {
  equipment: {
    key: string;
    value: EquipmentItem;
  };
  warehouse: {
    key: string;
    value: WarehouseItem;
  };
  inventoryActs: {
    key: string;
    value: InventoryAct;
  };
  workDayLogs: {
    key: string;
    value: WorkDayLog; // key is date (YYYY-MM-DD)
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'BenitoEugenioGarmentDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GarmentDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<GarmentDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('equipment')) {
          db.createObjectStore('equipment', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('warehouse')) {
          db.createObjectStore('warehouse', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('inventoryActs')) {
          db.createObjectStore('inventoryActs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('workDayLogs')) {
          db.createObjectStore('workDayLogs', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

// Generate QR Code data URL helper
export async function generateQRCode(equipmentId: string, nomenclatureNumber: string): Promise<string> {
  try {
    const qrText = JSON.stringify({
      app: 'BenitoEugenioPWA',
      id: equipmentId,
      code: nomenclatureNumber,
    });
    return await QRCode.toDataURL(qrText, {
      margin: 1,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

// Initial Seed Data for first startup
export async function seedInitialData() {
  const db = await getDB();
  const existingSettings = await db.get('settings', 'appSettings');
  if (existingSettings) return; // DB was already initialized, do not re-seed even if collections are empty

  // Seed Warehouse Items
  const initialWarehouse: WarehouseItem[] = [
    {
      id: 'wh-001',
      name: 'Голки',
      brand: 'SCHMETZ',
      specs: 'DBx1 №90',
      purpose: 'для прямострочної одноголкової машини',
      category: 'Голки',
      unit: 'уп',
      itemsPerPack: 10,
      currentStock: 34,
      minStockThreshold: 10,
      supplier: 'Швейпром Київ',
      purchasePrice: 180,
      movements: [
        {
          id: 'mov-101-a',
          warehouseItemId: 'wh-001',
          date: '2026-07-01',
          type: 'receipt',
          quantity: 14,
          note: 'Початкове зарахування на склад (Накладна №101)',
        },
        {
          id: 'mov-101-b',
          warehouseItemId: 'wh-001',
          date: '2026-07-15',
          type: 'receipt',
          quantity: 25,
          note: 'Додатковий прихід голок SCHMETZ DBx1 №90 (Накладна №158 від ТОВ "Швейпром")',
        },
        {
          id: 'mov-101-c',
          warehouseItemId: 'wh-001',
          date: '2026-07-22',
          type: 'expense',
          quantity: -5,
          note: 'Видача голок на планову заміну',
          equipmentId: 'eq-001',
          equipmentName: 'JUKI DDL-8700-7 [ШМ-001]',
          division: 'Цех №1 (Трикотаж)',
        }
      ]
    },
    {
      id: 'wh-002',
      name: 'Голки',
      brand: 'GROZ-BECKERT',
      specs: 'B-27 №80',
      purpose: 'для 4-ниткового оверлока',
      category: 'Голки',
      unit: 'уп',
      itemsPerPack: 10,
      currentStock: 18,
      minStockThreshold: 10,
      supplier: 'Текстиль-Сервіс',
      purchasePrice: 210,
      movements: [
        {
          id: 'mov-102-a',
          warehouseItemId: 'wh-002',
          date: '2026-07-02',
          type: 'receipt',
          quantity: 10,
          note: 'Початкова закупівля (Накладна №108)',
        },
        {
          id: 'mov-102-b',
          warehouseItemId: 'wh-002',
          date: '2026-07-18',
          type: 'receipt',
          quantity: 12,
          note: 'Поповнення запасу голок для оверлока (Накладна №204)',
        },
        {
          id: 'mov-102-c',
          warehouseItemId: 'wh-002',
          date: '2026-07-25',
          type: 'expense',
          quantity: -4,
          note: 'Видача у 2-й цех на оверлок SIRUBA 747K',
          equipmentId: 'eq-002',
          equipmentName: 'SIRUBA 747K-514M2-24 [ОВ-002]',
          division: 'Цех №2 (Верхній одяг)',
        }
      ]
    },
    {
      id: 'wh-003',
      name: 'Олія',
      brand: 'SHELL',
      specs: 'Catenex 22 (вазелінове)',
      purpose: 'для мастила картерів швейних машин',
      category: 'Мастило',
      unit: 'л',
      currentStock: 6.5,
      minStockThreshold: 2.0,
      supplier: 'Масла Та Запчастини',
      purchasePrice: 320,
      movements: [
        {
          id: 'mov-103-a',
          warehouseItemId: 'wh-003',
          date: '2026-07-05',
          type: 'receipt',
          quantity: 5,
          note: 'Закупівля першої каністри',
        },
        {
          id: 'mov-103-b',
          warehouseItemId: 'wh-003',
          date: '2026-07-20',
          type: 'receipt',
          quantity: 3,
          note: 'Прихід мастила вазелінового (Накладна №219)',
        },
        {
          id: 'mov-103-c',
          warehouseItemId: 'wh-003',
          date: '2026-07-24',
          type: 'expense',
          quantity: -1.5,
          note: 'Заправка картерів машин у Цеху №1',
          division: 'Цех №1 (Трикотаж)',
        }
      ]
    },
    {
      id: 'wh-004',
      name: 'Петлювач',
      brand: 'Siruba',
      specs: 'верхній 747K',
      purpose: 'для 5-ниткового оверлока',
      category: 'Запчастини',
      unit: 'шт',
      currentStock: 0, // ZERO STOCK DANGER!
      minStockThreshold: 2,
      supplier: 'ШвейЗіп',
      purchasePrice: 450,
      movements: []
    },
    {
      id: 'wh-005',
      name: 'Ніж',
      brand: 'Eastman',
      specs: 'рухомий 8"',
      purpose: 'для розкрійного ножа Blue Streak',
      category: 'Запчастини',
      unit: 'шт',
      currentStock: 4,
      minStockThreshold: 2,
      supplier: 'Розкрій Про',
      purchasePrice: 650,
      movements: []
    },
    {
      id: 'wh-006',
      name: 'Підошва',
      brand: 'Silter',
      specs: 'тефлонова STB-200',
      purpose: 'для праски з парогенератором',
      category: 'Витратники',
      unit: 'шт',
      currentStock: 2,
      minStockThreshold: 1,
      supplier: 'ВТО Маркет',
      purchasePrice: 280,
      movements: []
    }
  ];

  for (const item of initialWarehouse) {
    await db.put('warehouse', item);
  }

  // Seed Equipment Items
  const eq1Id = 'eq-001';
  const qr1 = await generateQRCode(eq1Id, 'ШМ-001');

  const eq2Id = 'eq-002';
  const qr2 = await generateQRCode(eq2Id, 'ОВ-002');

  const eq3Id = 'eq-003';
  const qr3 = await generateQRCode(eq3Id, 'РН-003');

  const eq4Id = 'eq-004';
  const qr4 = await generateQRCode(eq4Id, 'ВТО-004');

  const initialEquipment: EquipmentItem[] = [
    {
      id: eq1Id,
      brand: 'JUKI',
      model: 'DDL-8700-7',
      nomenclatureName: 'JUKI DDL-8700-7',
      classification: 'Прямострочна машина 1-голкова',
      serialNumber: 'JK-8700-99412',
      nomenclatureNumber: 'ШМ-001',
      category: 'Швейна машина',
      subcategory: 'Прямострочна машина 1-голкова',
      division: 'Цех №1 (Трикотаж)',
      responsiblePerson: 'Беніто Євгеній',
      status: 'in_work',
      qrCodeUrl: qr1,
      commissioningDate: '2024-03-15',
      photos: [],
      repairs: [
        {
          id: 'rep-001',
          equipmentId: eq1Id,
          date: '2026-06-10',
          faultDescription: 'Пропуски стібків на тонкому бифлексі',
          workDone: 'Регулювання зазору носа човника відносно голки, заміна голки',
          performerType: 'self',
          performerName: 'Євгеній (Майстер)',
          usedParts: [
            {
              warehouseItemId: 'wh-001',
              itemName: 'Голки SCHMETZ DBx1 №90',
              quantity: 1,
              unitPrice: 18,
            }
          ],
          costParts: 18,
          costWork: 300,
          totalCost: 318,
        }
      ],
      maintenancePlans: [
        {
          id: 'mp-001',
          equipmentId: eq1Id,
          workType: 'Повна заміна мастила в піддоні та чистка масляного фільтра',
          frequencyType: 'months',
          frequencyValue: 3,
          lastDoneDate: '2026-05-01',
          nextDueDate: '2026-08-01', // Due soon (within 7 days of 2026-07-27)
          status: 'pending',
        }
      ],
      notes: 'Машина в чудовому стані. Встановлено серводвигун 550W.'
    },
    {
      id: eq2Id,
      brand: 'SIRUBA',
      model: '747K-514M2-24',
      nomenclatureName: 'SIRUBA 747K-514M2-24',
      classification: '4-нитковий оверлок',
      serialNumber: 'SR-747K-88231',
      nomenclatureNumber: 'ОВ-002',
      category: 'Швейна машина',
      subcategory: 'Оверлок 4-нитковий',
      division: 'Цех №1 (Трикотаж)',
      responsiblePerson: 'Петренко О.М.',
      status: 'awaiting_parts', // Awaiting parts
      qrCodeUrl: qr2,
      commissioningDate: '2024-06-20',
      photos: [],
      repairs: [
        {
          id: 'rep-002',
          equipmentId: eq2Id,
          date: '2026-07-25',
          faultDescription: 'Злам верхнього петлювача при пошиві щільного футера 3-нитки',
          workDone: 'Демонтаж пошкодженого петлювача. Очікується постачання запчастини зі складу.',
          performerType: 'self',
          performerName: 'Євгеній (Майстер)',
          usedParts: [],
          costParts: 0,
          costWork: 200,
          totalCost: 200,
        }
      ],
      maintenancePlans: [
        {
          id: 'mp-002',
          equipmentId: eq2Id,
          workType: 'Перевірка зазору ножів та заточка верхнього ножа',
          frequencyType: 'days',
          frequencyValue: 30,
          lastDoneDate: '2026-06-20',
          nextDueDate: '2026-07-20', // OVERDUE!
          status: 'overdue',
        }
      ],
      notes: 'Потребує заміни верхнього петлювача wh-004.'
    },
    {
      id: eq3Id,
      brand: 'EASTMAN',
      model: 'Blue Streak II 8"',
      nomenclatureName: 'EASTMAN Blue Streak II 8"',
      classification: 'Розкрійний вертикальний ніж',
      serialNumber: 'EM-BS2-10492',
      nomenclatureNumber: 'РН-003',
      category: 'Розкрійне обладнання',
      subcategory: 'Вертикальний розкрійний ніж',
      division: 'Розкрійний цех',
      responsiblePerson: 'Ковальчук В.П.',
      status: 'repair', // In Repair
      qrCodeUrl: qr3,
      commissioningDate: '2023-11-10',
      photos: [],
      repairs: [
        {
          id: 'rep-003',
          equipmentId: eq3Id,
          date: '2026-07-26',
          faultDescription: 'Іскріння графітових щіток двигуна, сильний нагрів корпуса',
          workDone: 'Передача у сервісний центр на заміну щіток та шліфування колектора',
          performerType: 'external',
          performerName: 'ТОВ "ШвейСервіс Центр"',
          usedParts: [],
          costParts: 350,
          costWork: 850,
          totalCost: 1200,
        }
      ],
      maintenancePlans: [
        {
          id: 'mp-003',
          equipmentId: eq3Id,
          workType: 'Змащення направляючих стойки та заточувального механізму',
          frequencyType: 'days',
          frequencyValue: 14,
          lastDoneDate: '2026-07-15',
          nextDueDate: '2026-07-29', // Due in 2 days
          status: 'pending',
        }
      ]
    },
    {
      id: eq4Id,
      brand: 'SILTER',
      model: 'Super Mini 2005 (5 л)',
      nomenclatureName: 'SILTER Super Mini 2005 (5 л)',
      classification: 'Парогенератор з праскою',
      serialNumber: 'SL-2005-4412',
      nomenclatureNumber: 'ВТО-004',
      category: 'Волого-теплова обробка',
      subcategory: 'Парогенератор',
      division: 'Дільниця ВТО',
      responsiblePerson: 'Шевченко І.С.',
      status: 'in_work',
      qrCodeUrl: qr4,
      commissioningDate: '2025-01-12',
      photos: [],
      repairs: [],
      maintenancePlans: [
        {
          id: 'mp-004',
          equipmentId: eq4Id,
          workType: 'Промивка бойлера від накипу антинакипіном',
          frequencyType: 'days',
          frequencyValue: 30,
          lastDoneDate: '2026-07-01',
          nextDueDate: '2026-07-31',
          status: 'pending',
        }
      ]
    }
  ];

  for (const eq of initialEquipment) {
    await db.put('equipment', eq);
  }

  // Seed default App Settings
  const defaultSettings: AppSettings = {
    isPinSet: false,
    salarySettings: {
      monthlySalary: 30000,
      workingDaysInMonth: 22,
      fullName: 'Беніто Євгеній Олександрович',
      position: 'Головний інженер / Власник',
    },
    lastBackupDate: new Date().toISOString().split('T')[0],
  };
  await db.put('settings', defaultSettings, 'appSettings');

  // Seed sample WorkDayLogs for July 2026
  const sampleLogs: WorkDayLog[] = [
    { date: '2026-07-01', hours: 8, isWeekend: false, note: 'Наналаштування оверлоків' },
    { date: '2026-07-02', hours: 8, isWeekend: false },
    { date: '2026-07-03', hours: 9, isWeekend: false, note: 'Понаднормово +1 год' },
    { date: '2026-07-04', hours: 5, isWeekend: true, note: 'Субота, терміновий ремонт РН-003' },
    { date: '2026-07-06', hours: 8, isWeekend: false },
    { date: '2026-07-07', hours: 8, isWeekend: false },
    { date: '2026-07-08', hours: 8, isWeekend: false },
    { date: '2026-07-09', hours: 8, isWeekend: false },
    { date: '2026-07-10', hours: 8, isWeekend: false },
    { date: '2026-07-11', hours: 6, isWeekend: true, note: 'Субота, пусконалагодження ВТО' },
    { date: '2026-07-13', hours: 8, isWeekend: false },
    { date: '2026-07-14', hours: 8, isWeekend: false },
    { date: '2026-07-15', hours: 8, isWeekend: false },
    { date: '2026-07-16', hours: 8, isWeekend: false },
    { date: '2026-07-17', hours: 8, isWeekend: false },
    { date: '2026-07-20', hours: 8, isWeekend: false },
    { date: '2026-07-21', hours: 8, isWeekend: false },
    { date: '2026-07-22', hours: 8, isWeekend: false },
    { date: '2026-07-23', hours: 8, isWeekend: false },
    { date: '2026-07-24', hours: 8, isWeekend: false },
    { date: '2026-07-25', hours: 4, isWeekend: true, note: 'Субота, ремонт ОВ-002' },
    { date: '2026-07-27', hours: 8, isWeekend: false },
  ];

  for (const log of sampleLogs) {
    await db.put('workDayLogs', log);
  }
}

// Data Loaders and Mutators
export async function loadAllData(): Promise<DatabaseData> {
  const db = await getDB();
  await seedInitialData();

  const rawEquipment = await db.getAll('equipment');
  const equipment = rawEquipment.map((eq) => {
    let name = eq.nomenclatureName || '';
    let classification = eq.classification || '';

    // Backward compatibility cleanup if nomenclatureName contains classification
    if (!classification) {
      if (name.includes('JUKI DDL-8700-7')) {
        name = 'JUKI DDL-8700-7';
        classification = 'Прямострочна машина 1-голкова';
      } else if (name.includes('SIRUBA 747K')) {
        name = 'SIRUBA 747K-514M2-24';
        classification = '4-нитковий оверлок';
      } else if (name.includes('EASTMAN Blue Streak')) {
        name = 'EASTMAN Blue Streak II 8"';
        classification = 'Розкрійний вертикальний ніж';
      } else if (name.includes('SILTER Super Mini')) {
        name = 'SILTER Super Mini 2005 (5 л)';
        classification = 'Парогенератор з праскою';
      } else {
        classification = eq.subcategory || 'Швейна техніка';
      }
    }

    // Ensure brand and model exist
    let brand = eq.brand || '';
    let model = eq.model || '';

    if (!brand || !model) {
      if (name) {
        const parts = name.trim().split(' ');
        if (!brand) brand = parts[0] || 'Inший бренд';
        if (!model) model = parts.slice(1).join(' ') || name;
      }
    }

    if (!name && (brand || model)) {
      name = `${brand} ${model}`.trim();
    }

    return {
      ...eq,
      brand,
      model,
      nomenclatureName: name,
      classification,
    };
  });
  const rawWarehouse = await db.getAll('warehouse');
  const warehouse = await Promise.all(
    rawWarehouse.map(async (item) => {
      let updated = false;
      let { name, brand, specs, purpose, itemsPerPack, unit } = item;

      if (!brand || !specs || name.includes('SCHMETZ') || name.includes('GROZ-BECKERT') || name.includes('SHELL') || name.includes('Siruba') || name.includes('Eastman') || name.includes('Silter')) {
        if (name.includes('SCHMETZ') || item.id === 'wh-001') {
          name = 'Голки';
          brand = brand || 'SCHMETZ';
          specs = specs || 'DBx1 №90';
          purpose = purpose || 'для прямострочної одноголкової машини';
          itemsPerPack = itemsPerPack || 10;
          unit = 'уп';
          updated = true;
        } else if (name.includes('GROZ-BECKERT') || item.id === 'wh-002') {
          name = 'Голки';
          brand = brand || 'GROZ-BECKERT';
          specs = specs || 'B-27 №80';
          purpose = purpose || 'для 4-ниткового оверлока';
          itemsPerPack = itemsPerPack || 10;
          unit = 'уп';
          updated = true;
        } else if (name.includes('SHELL') || item.id === 'wh-003') {
          name = 'Олія';
          brand = brand || 'SHELL';
          specs = specs || 'Catenex 22 (вазелінове)';
          purpose = purpose || 'для мастила картерів швейних машин';
          updated = true;
        } else if (name.includes('Siruba') || item.id === 'wh-004') {
          name = 'Петлювач';
          brand = brand || 'Siruba';
          specs = specs || 'верхній 747K';
          purpose = purpose || 'для 5-ниткового оверлока';
          updated = true;
        } else if (name.includes('Eastman') || item.id === 'wh-005') {
          name = 'Ніж';
          brand = brand || 'Eastman';
          specs = specs || 'рухомий 8"';
          purpose = purpose || 'для розкрійного ножа Blue Streak';
          updated = true;
        } else if (name.includes('Silter') || item.id === 'wh-006') {
          name = 'Підошва';
          brand = brand || 'Silter';
          specs = specs || 'тефлонова STB-200';
          purpose = purpose || 'для праски з парогенератором';
          updated = true;
        }
      }

      const newItem = {
        ...item,
        name,
        brand,
        specs,
        purpose,
        itemsPerPack,
        unit,
      };

      if (updated) {
        await db.put('warehouse', newItem);
      }

      return newItem;
    })
  );
  const inventoryActs = await db.getAll('inventoryActs');
  const workDayLogs = await db.getAll('workDayLogs');
  const settings = (await db.get('settings', 'appSettings')) || {
    isPinSet: false,
    salarySettings: {
      monthlySalary: 30000,
      workingDaysInMonth: 22,
      fullName: 'Беніто Євгеній Олександрович',
      position: 'Головний інженер',
    }
  };

  return {
    equipment,
    warehouse,
    inventoryActs,
    workDayLogs,
    settings,
  };
}

export async function saveEquipment(item: EquipmentItem) {
  const db = await getDB();
  if (!item.qrCodeUrl) {
    item.qrCodeUrl = await generateQRCode(item.id, item.nomenclatureNumber);
  }
  await db.put('equipment', item);
}

export async function deleteEquipment(id: string) {
  const db = await getDB();
  await db.delete('equipment', id);
}

export async function saveWarehouseItem(item: WarehouseItem) {
  const db = await getDB();
  await db.put('warehouse', item);
}

export async function deleteWarehouseItem(id: string) {
  const db = await getDB();
  await db.delete('warehouse', id);
}

export async function saveWorkDayLog(log: WorkDayLog) {
  const db = await getDB();
  await db.put('workDayLogs', log);
}

export async function deleteWorkDayLog(date: string) {
  const db = await getDB();
  await db.delete('workDayLogs', date);
}

export async function saveInventoryAct(act: InventoryAct) {
  const db = await getDB();
  await db.put('inventoryActs', act);
}

export async function saveSettings(settings: AppSettings) {
  const db = await getDB();
  await db.put('settings', settings, 'appSettings');
}

// Export Full JSON Backup
export async function exportDatabaseJSON(): Promise<string> {
  const data = await loadAllData();
  data.settings.lastBackupDate = new Date().toISOString().split('T')[0];
  await saveSettings(data.settings);
  return JSON.stringify(data, null, 2);
}

// Import Full JSON Backup
export async function importDatabaseJSON(jsonStr: string): Promise<boolean> {
  try {
    const data: DatabaseData = JSON.parse(jsonStr);
    if (!data || !Array.isArray(data.equipment) || !Array.isArray(data.warehouse)) {
      throw new Error('Невалідний формат резервної копії');
    }

    const db = await getDB();
    await db.clear('equipment');
    await db.clear('warehouse');
    await db.clear('inventoryActs');
    await db.clear('workDayLogs');

    for (const eq of data.equipment) {
      await db.put('equipment', eq);
    }
    for (const wh of data.warehouse) {
      await db.put('warehouse', wh);
    }
    if (Array.isArray(data.inventoryActs)) {
      for (const act of data.inventoryActs) {
        await db.put('inventoryActs', act);
      }
    }
    if (Array.isArray(data.workDayLogs)) {
      for (const log of data.workDayLogs) {
        await db.put('workDayLogs', log);
      }
    }
    if (data.settings) {
      await db.put('settings', data.settings, 'appSettings');
    }

    return true;
  } catch (err) {
    console.error('Failed to import backup JSON', err);
    return false;
  }
}
