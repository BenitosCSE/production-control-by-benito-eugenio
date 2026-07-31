import React, { useState } from 'react';
import { Lock, KeyRound, AlertTriangle, ShieldCheck, RefreshCw, Upload } from 'lucide-react';
import { AppSettings } from '../types';

interface PinAuthModalProps {
  settings: AppSettings;
  onSetPin: (pin: string) => Promise<void>;
  onUnlock: (pin: string) => boolean;
  onResetData: () => Promise<void>;
  onImportBackup: (file: File) => Promise<boolean>;
}

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  settings,
  onSetPin,
  onUnlock,
  onResetData,
  onImportBackup,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isSettingUp = !settings.isPinSet;

  const handleNumClick = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const handleSubmitPin = async () => {
    if (pin.length < 4) {
      setError('PIN-код повинен містити від 4 до 6 цифр');
      return;
    }

    if (isSettingUp) {
      if (!confirmPin) {
        setConfirmPin(pin);
        setPin('');
        return;
      }

      if (pin !== confirmPin) {
        setError('PIN-коди не збігаються. Спробуйте ще раз.');
        setPin('');
        setConfirmPin('');
        return;
      }

      await onSetPin(pin);
    } else {
      const success = onUnlock(pin);
      if (!success) {
        setError('Невірний PIN-код. Спробуйте ще раз.');
        setPin('');
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ok = await onImportBackup(file);
      if (ok) {
        setShowResetConfirm(false);
      } else {
        setError('Помилка при відновленні з резервної копії');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="w-full max-w-md p-6 glass-card border-[#ff6b00]/30 shadow-2xl relative text-center">
        {/* Header Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#ff6b00]/10 border border-[#ff6b00]/30 flex items-center justify-center mb-4 text-[#ff6b00]">
          {isSettingUp ? <KeyRound className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
        </div>

        <h2 className="text-xl font-bold text-white mb-1">
          {isSettingUp
            ? confirmPin
              ? 'Підтвердіть новий PIN-код'
              : 'Встановіть PIN-код для входу'
            : 'Введіть PIN-код доступу'}
        </h2>
        <p className="text-sm text-[#aaaaaa] mb-6">
          {isSettingUp
            ? 'Для захисту ваших даних локального обліку'
            : 'Авторизація Беніто Євгеній — PWA Облік'}
        </p>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className={`w-10 h-12 rounded-xl border flex items-center justify-center text-xl font-bold font-mono transition-all ${
                pin.length > idx
                  ? 'border-[#ff6b00] bg-[#ff6b00]/20 text-[#ff6b00] shadow-[0_0_12px_rgba(255,107,0,0.4)]'
                  : 'border-white/10 bg-white/5 text-white/30'
              }`}
            >
              {pin.length > idx ? '●' : ''}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 text-xs font-semibold text-[#ff3b3b] bg-[#ff3b3b]/10 border border-[#ff3b3b]/30 p-2.5 rounded-xl animate-pulse">
            {error}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumClick(num)}
              className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xl font-bold font-mono text-white transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xs font-semibold text-[#aaaaaa] transition-all flex items-center justify-center"
          >
            Стерти
          </button>
          <button
            onClick={() => handleNumClick('0')}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-xl font-bold font-mono text-white transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-sm font-semibold text-[#aaaaaa] transition-all flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSubmitPin}
          disabled={pin.length < 4}
          className="w-full py-3.5 btn-accent flex items-center justify-center gap-2 text-base font-bold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed mb-4"
        >
          <ShieldCheck className="w-5 h-5" />
          {isSettingUp ? (confirmPin ? 'Зберегти PIN' : 'Далі') : 'Увійти'}
        </button>

        {!isSettingUp && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-[#aaaaaa] hover:text-[#ff6b00] underline transition-colors"
          >
            Забув PIN-код? (Відновлення)
          </button>
        )}

        {/* Reset / Backup Restore Modal Option */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="glass-card max-w-sm w-full p-5 text-left border-[#ff3b3b]/40">
              <div className="flex items-center gap-2 text-[#ff3b3b] font-bold text-lg mb-2">
                <AlertTriangle className="w-5 h-5" /> Відновлення PIN-коду
              </div>
              <p className="text-xs text-[#aaaaaa] mb-4 leading-relaxed">
                Оскільки всі дані зберігаються суто локально в браузері (без хмари), ви можете завантажити раніше збережений файл резервної копії (.json) або скинути PIN.
              </p>

              <label className="w-full py-2.5 mb-3 px-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-xs font-semibold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-[#ff6b00]" />
                Відновити з backup JSON
                <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
              </label>

              <button
                onClick={async () => {
                  if (confirm('УВАГА: Скидання PIN залишИть локальні дані, але встановить новий PIN. Продовжити?')) {
                    await onResetData();
                    setShowResetConfirm(false);
                  }
                }}
                className="w-full py-2.5 mb-2 px-3 rounded-xl bg-[#ff3b3b]/20 border border-[#ff3b3b]/40 hover:bg-[#ff3b3b]/30 text-xs font-semibold text-[#ff3b3b] flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Скинути PIN-код
              </button>

              <button
                onClick={() => setShowResetConfirm(false)}
                className="w-full py-2 text-center text-xs text-[#aaaaaa] hover:text-white"
              >
                Скасувати
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
