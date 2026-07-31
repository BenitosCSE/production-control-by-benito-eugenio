/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  loadAllData,
  saveEquipment,
  deleteEquipment,
  saveWarehouseItem,
  deleteWarehouseItem,
  saveWorkDayLog,
  deleteWorkDayLog,
  saveInventoryAct,
  saveSettings,
  exportDatabaseJSON,
  importDatabaseJSON
} from './lib/db';
import {
  downloadRepairActPDF,
  downloadTimesheetPDF,
  downloadInventoryActPDF,
  downloadEquipmentStatsPDF,
  downloadWarehouseReportPDF,
  downloadReceiptsReportPDF,
  downloadIssuancesReportPDF,
  downloadFullMovementsReportPDF
} from './lib/pdf';
import {
  EquipmentItem,
  WarehouseItem,
  WorkDayLog,
  InventoryAct,
  AppSettings,
  SalarySettings,
  RepairRecord
} from './types';

import { HeaderAndNav, TabType } from './components/BottomNav';
import { HomeSection } from './components/HomeSection';
import { EquipmentSection } from './components/EquipmentSection';
import { WarehouseSection } from './components/WarehouseSection';
import { AccountingSection } from './components/AccountingSection';
import { PinAuthModal } from './components/PinAuthModal';
import { BackupModal } from './components/BackupModal';
import { ReportsModal } from './components/ReportsModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';

export default function App() {
  // Application Data State
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [warehouse, setWarehouse] = useState<WarehouseItem[]>([]);
  const [inventoryActs, setInventoryActs] = useState<InventoryAct[]>([]);
  const [workDayLogs, setWorkDayLogs] = useState<WorkDayLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    isPinSet: false,
    salarySettings: {
      monthlySalary: 30000,
      workingDaysInMonth: 22,
      fullName: 'Беніто Євгеній Олександрович',
      position: 'Головний інженер',
    },
  });

  // UI Navigation & Modal States
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState<string | undefined>(undefined);

  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  const [isReportsOpen, setIsReportsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load Data on Startup
  const refreshData = async () => {
    try {
      const data = await loadAllData();
      setEquipment(data.equipment);
      setWarehouse(data.warehouse);
      setInventoryActs(data.inventoryActs);
      setWorkDayLogs(data.workDayLogs);
      setSettings(data.settings);

      // If PIN is not set yet, stay in auth screen to set up PIN
      if (!data.settings.isPinSet) {
        setIsLocked(true);
      }
    } catch (err) {
      console.error('Failed to load data from IndexedDB', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // PIN Actions
  const handleSetPin = async (pin: string) => {
    // Basic hash simulation for local PIN
    const pinHash = btoa(pin);
    const updatedSettings: AppSettings = {
      ...settings,
      pinHash,
      isPinSet: true,
    };
    await saveSettings(updatedSettings);
    setSettings(updatedSettings);
    setIsLocked(false);
  };

  const handleUnlockPin = (pin: string): boolean => {
    if (!settings.pinHash) return true;
    const inputHash = btoa(pin);
    if (inputHash === settings.pinHash) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const handleResetData = async () => {
    const updatedSettings: AppSettings = {
      ...settings,
      pinHash: undefined,
      isPinSet: false,
    };
    await saveSettings(updatedSettings);
    setSettings(updatedSettings);
    setIsLocked(true);
  };

  // Data Handlers
  const handleSaveEquipment = async (item: EquipmentItem) => {
    await saveEquipment(item);
    await refreshData();
  };

  const handleDeleteEquipment = async (id: string) => {
    await deleteEquipment(id);
    await refreshData();
  };

  const handleSaveWarehouseItem = async (item: WarehouseItem) => {
    await saveWarehouseItem(item);
    await refreshData();
  };

  const handleDeleteWarehouseItem = async (id: string) => {
    await deleteWarehouseItem(id);
    await refreshData();
  };

  const handleDeductWarehouseStock = async (
    itemId: string,
    quantity: number,
    note: string,
    equipmentId?: string,
    division?: string,
    equipmentName?: string
  ) => {
    const target = warehouse.find((w) => w.id === itemId);
    if (target) {
      const newStock = Math.max(0, target.currentStock - quantity);
      const newMovement = {
        id: `mov-${Date.now()}`,
        warehouseItemId: itemId,
        date: new Date().toISOString().split('T')[0],
        type: 'repair_deduction' as const,
        quantity: -quantity,
        note,
        equipmentId,
        division,
        equipmentName,
      };
      const updated: WarehouseItem = {
        ...target,
        currentStock: newStock,
        movements: [newMovement, ...target.movements],
      };
      await saveWarehouseItem(updated);
      await refreshData();
    }
  };

  const handleCompleteMaintenance = async (equipmentId: string, planId: string) => {
    const target = equipment.find((e) => e.id === equipmentId);
    if (!target) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedPlans = target.maintenancePlans.map((p) => {
      if (p.id === planId) {
        // Calculate next date based on frequency
        const nextDate = new Date();
        if (p.frequencyType === 'days') {
          nextDate.setDate(nextDate.getDate() + p.frequencyValue);
        } else if (p.frequencyType === 'months') {
          nextDate.setMonth(nextDate.getMonth() + p.frequencyValue);
        } else {
          nextDate.setDate(nextDate.getDate() + 30);
        }

        return {
          ...p,
          lastDoneDate: todayStr,
          nextDueDate: nextDate.toISOString().split('T')[0],
          status: 'pending' as const,
        };
      }
      return p;
    });

    const updatedEq: EquipmentItem = {
      ...target,
      maintenancePlans: updatedPlans,
    };

    await saveEquipment(updatedEq);
    await refreshData();
  };

  const handleSaveWorkDayLog = async (log: WorkDayLog) => {
    await saveWorkDayLog(log);
    await refreshData();
  };

  const handleDeleteWorkDayLog = async (date: string) => {
    await deleteWorkDayLog(date);
    await refreshData();
  };

  const handleSaveSalarySettings = async (salarySettings: SalarySettings) => {
    const updated: AppSettings = {
      ...settings,
      salarySettings,
    };
    await saveSettings(updated);
    await refreshData();
  };

  const handleSaveInventoryAct = async (act: InventoryAct) => {
    await saveInventoryAct(act);
    await refreshData();
  };

  // Backup JSON Actions
  const handleExportBackup = async () => {
    const jsonStr = await exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_BenitoEugenio_GarmentDB_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await refreshData();
  };

  const handleImportBackup = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const ok = await importDatabaseJSON(text);
      if (ok) {
        await refreshData();
        setIsLocked(false);
      }
      return ok;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  };

  // Home Card Navigation Handler
  const handleNavigateToEquipment = (statusFilter?: string) => {
    setEquipmentStatusFilter(statusFilter);
    setActiveTab('equipment');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#ff6b00] animate-pulse flex items-center justify-center font-black text-xl">
            BE
          </div>
          <p className="text-xs text-[#aaaaaa] font-mono animate-pulse">Завантаження бази даних PWA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#ff6b00]/30 selection:text-white">
      {/* PIN Authentication Screen */}
      {isLocked && (
        <PinAuthModal
          settings={settings}
          onSetPin={handleSetPin}
          onUnlock={handleUnlockPin}
          onResetData={handleResetData}
          onImportBackup={handleImportBackup}
        />
      )}

      {/* PWA Install Banner & Header */}
      <PwaInstallPrompt />
      <HeaderAndNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'equipment') setEquipmentStatusFilter(undefined);
        }}
        onLock={() => setIsLocked(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenReports={() => setIsReportsOpen(true)}
      />

      {/* Main Content View Container */}
      <main className="max-w-7xl mx-auto px-4 py-5">
        {activeTab === 'home' && (
          <HomeSection
            equipment={equipment}
            warehouse={warehouse}
            onNavigateToEquipment={handleNavigateToEquipment}
            onNavigateToWarehouse={() => setActiveTab('warehouse')}
            onCompleteMaintenance={handleCompleteMaintenance}
          />
        )}

        {activeTab === 'equipment' && (
          <EquipmentSection
            equipment={equipment}
            warehouse={warehouse}
            initialStatusFilter={equipmentStatusFilter}
            onSaveEquipment={handleSaveEquipment}
            onDeleteEquipment={handleDeleteEquipment}
            onDeductWarehouseStock={handleDeductWarehouseStock}
            onDownloadRepairPDF={(eq, rep) => downloadRepairActPDF(eq, rep, warehouse)}
          />
        )}

        {activeTab === 'warehouse' && (
          <WarehouseSection
            warehouse={warehouse}
            equipment={equipment}
            onSaveWarehouseItem={handleSaveWarehouseItem}
            onDeleteWarehouseItem={handleDeleteWarehouseItem}
            onSaveInventoryAct={handleSaveInventoryAct}
            onDownloadInventoryActPDF={downloadInventoryActPDF}
            onDownloadReceiptsReportPDF={downloadReceiptsReportPDF}
            onDownloadIssuancesReportPDF={downloadIssuancesReportPDF}
            onDownloadFullMovementsReportPDF={downloadFullMovementsReportPDF}
          />
        )}

        {activeTab === 'accounting' && (
          <AccountingSection
            salarySettings={settings.salarySettings}
            workDayLogs={workDayLogs}
            onSaveSalarySettings={handleSaveSalarySettings}
            onSaveWorkDayLog={handleSaveWorkDayLog}
            onDeleteWorkDayLog={handleDeleteWorkDayLog}
            onDownloadTimesheetPDF={downloadTimesheetPDF}
          />
        )}
      </main>

      {/* Modals */}
      {isBackupOpen && (
        <BackupModal
          settings={settings}
          onClose={() => setIsBackupOpen(false)}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />
      )}

      {isReportsOpen && (
        <ReportsModal
          equipment={equipment}
          warehouse={warehouse}
          workDayLogs={workDayLogs}
          salarySettings={settings.salarySettings}
          inventoryActs={inventoryActs}
          onClose={() => setIsReportsOpen(false)}
          onDownloadEquipmentStatsPDF={downloadEquipmentStatsPDF}
          onDownloadWarehouseReportPDF={downloadWarehouseReportPDF}
          onDownloadReceiptsReportPDF={downloadReceiptsReportPDF}
          onDownloadIssuancesReportPDF={downloadIssuancesReportPDF}
          onDownloadFullMovementsReportPDF={downloadFullMovementsReportPDF}
          onDownloadTimesheetPDF={downloadTimesheetPDF}
          onDownloadInventoryActPDF={downloadInventoryActPDF}
        />
      )}
    </div>
  );
}
