import React from 'react';
import { Home, Wrench, Package, Calculator, Lock, Database, FileText } from 'lucide-react';

export type TabType = 'home' | 'equipment' | 'warehouse' | 'accounting';

interface HeaderAndNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onLock: () => void;
  onOpenBackup: () => void;
  onOpenReports: () => void;
}

export const HeaderAndNav: React.FC<HeaderAndNavProps> = ({
  activeTab,
  onTabChange,
  onLock,
  onOpenBackup,
  onOpenReports,
}) => {
  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff6b00] text-white flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(255,107,0,0.4)] shrink-0">
              BE
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tighter uppercase italic text-white leading-none">
                Benito <span className="text-[#ff6b00]">Eugenio</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-[#aaaaaa] uppercase tracking-widest mt-1 italic font-medium">
                Accounting & Production Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-3 pr-2 border-r border-white/10">
              <div className="text-right">
                <p className="text-[10px] text-[#aaaaaa] uppercase tracking-wider">Поточна дата</p>
                <p className="font-mono font-bold text-sm text-white">
                  {new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
              </div>
              <div className="h-8 w-8 rounded-xl glass-card flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-[#2ecc71] shadow-[0_0_8px_#2ecc71]"></div>
              </div>
            </div>

            <button
              onClick={onOpenReports}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all active:scale-95"
              title="Згенерувати звіти PDF"
            >
              <FileText className="w-4 h-4 text-[#ff6b00]" />
              <span className="hidden sm:inline">Звіти PDF</span>
            </button>

            <button
              onClick={onOpenBackup}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all active:scale-95"
              title="Резервне копіювання"
            >
              <Database className="w-4 h-4 text-[#2ecc71]" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            <button
              onClick={onLock}
              className="p-2 rounded-xl bg-white/5 hover:bg-[#ff3b3b]/20 border border-white/10 text-xs text-[#aaaaaa] hover:text-[#ff3b3b] transition-all active:scale-95"
              title="Заблокувати PIN"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Fixed Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 px-2 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => onTabChange('home')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'home'
                ? 'text-[#ff6b00] bg-[#ff6b00]/10 font-bold'
                : 'text-[#aaaaaa] hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className={`w-5 h-5 mb-0.5 ${activeTab === 'home' ? 'scale-110 text-[#ff6b00]' : ''}`} />
            <span className="text-[11px]">Home</span>
          </button>

          <button
            onClick={() => onTabChange('equipment')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'equipment'
                ? 'text-[#ff6b00] bg-[#ff6b00]/10 font-bold'
                : 'text-[#aaaaaa] hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className={`w-5 h-5 mb-0.5 ${activeTab === 'equipment' ? 'scale-110 text-[#ff6b00]' : ''}`} />
            <span className="text-[11px]">Техніка</span>
          </button>

          <button
            onClick={() => onTabChange('warehouse')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'warehouse'
                ? 'text-[#ff6b00] bg-[#ff6b00]/10 font-bold'
                : 'text-[#aaaaaa] hover:text-white hover:bg-white/5'
            }`}
          >
            <Package className={`w-5 h-5 mb-0.5 ${activeTab === 'warehouse' ? 'scale-110 text-[#ff6b00]' : ''}`} />
            <span className="text-[11px]">Склад</span>
          </button>

          <button
            onClick={() => onTabChange('accounting')}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
              activeTab === 'accounting'
                ? 'text-[#ff6b00] bg-[#ff6b00]/10 font-bold'
                : 'text-[#aaaaaa] hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator className={`w-5 h-5 mb-0.5 ${activeTab === 'accounting' ? 'scale-110 text-[#ff6b00]' : ''}`} />
            <span className="text-[11px]">Бухгалтерія</span>
          </button>
        </div>
      </nav>
    </>
  );
};
