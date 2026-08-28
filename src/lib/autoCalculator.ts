import { AutoCompensationSettings, AutoTripLog, SalarySettings } from '../types';

export const DEFAULT_AUTO_SETTINGS: AutoCompensationSettings = {
  carValue: 350000, // V (грн)
  resourceKm: 250000, // R (км)
  fuelConsumptionNorm: 9.0, // N (л/100км)
  kCold: 1.5, // K_cold
  sColdLimit: 3.0, // S_cold ліміт (км)
  petrolPrice: 55.0, // P_benz (грн/л)
  regularFuelPrice: 30.0, // P_norm (грн/л)
  kRisk: 1.5, // K_risk
  sStartEquivalent: 10.0, // S_start (км-еквівалент)
};

export interface CalculationTrace {
  cTime: number;
  timeSteps: {
    perDay: number;
    perHour: number;
    perMinute: number;
    baseForTask: number;
    extraRateMultiplier: number;
  };
  cFuel: number;
  fuelSteps: {
    sCold: number;
    sNorm: number;
    fuelColdLitres: number;
    costCold: number;
    fuelNormLitres: number;
    costNorm: number;
  };
  cWear: number;
  wearSteps: {
    perKm: number;
    equivalentDistance: number;
  };
  totalCompensation: number;
}

export function calculateAutoTripCompensation(
  distanceKm: number, // S_total
  durationMinutes: number, // T
  autoSettings: AutoCompensationSettings = DEFAULT_AUTO_SETTINGS,
  salarySettings: SalarySettings = {
    monthlySalary: 30000,
    workingDaysInMonth: 21,
    fullName: 'Бистрицький Євгеній Ігорович',
    position: 'Головний механік / Майстер',
  }
): CalculationTrace {
  const W = Number(salarySettings.monthlySalary) || 0;
  const D = Number(salarySettings.workingDaysInMonth) || 21;
  const T = Number(durationMinutes) || 0;
  const Krisk = Number(autoSettings.kRisk) || 1.0;

  // --- Блок 1: Вартість робочого часу (надбавка понад оклад) ---
  // C_time = (W / (D × 8 × 60)) × T × (K_risk - 1)
  const perDay = D > 0 ? W / D : 0;
  const perHour = perDay / 8;
  const perMinute = perHour / 60;
  const baseForTask = perMinute * T;
  const extraRateMultiplier = Math.max(0, Krisk - 1);
  const cTime = baseForTask * extraRateMultiplier;

  // --- Блок 2: Витрати пального ---
  // C_fuel = (N · K_cold / 100) · S_cold · P_benz + (N / 100) · S_norm · P_norm
  const N = Number(autoSettings.fuelConsumptionNorm) || 0;
  const Stotal = Number(distanceKm) || 0;
  const Kcold = Number(autoSettings.kCold) || 1.0;
  const ScoldLimit = Number(autoSettings.sColdLimit) || 0;
  const Pbenz = Number(autoSettings.petrolPrice) || 0;
  const Pnorm = Number(autoSettings.regularFuelPrice) || 0;

  const sCold = Math.min(Stotal, ScoldLimit);
  const sNorm = Math.max(0, Stotal - sCold);

  const fuelColdLitres = (N * Kcold / 100) * sCold;
  const costCold = fuelColdLitres * Pbenz;

  const fuelNormLitres = (N / 100) * sNorm;
  const costNorm = fuelNormLitres * Pnorm;

  const cFuel = costCold + costNorm;

  // --- Блок 3: Амортизація та еквівалентний знос ---
  // C_wear = (V / R) × (S_total + S_start)
  const V = Number(autoSettings.carValue) || 0;
  const R = Number(autoSettings.resourceKm) || 1;
  const Sstart = Number(autoSettings.sStartEquivalent) || 0;

  const perKm = R > 0 ? V / R : 0;
  const equivalentDistance = Stotal > 0 ? Stotal + Sstart : 0;
  const cWear = perKm * equivalentDistance;

  const totalCompensation = cTime + cFuel + cWear;

  return {
    cTime,
    timeSteps: {
      perDay,
      perHour,
      perMinute,
      baseForTask,
      extraRateMultiplier,
    },
    cFuel,
    fuelSteps: {
      sCold,
      sNorm,
      fuelColdLitres,
      costCold,
      fuelNormLitres,
      costNorm,
    },
    cWear,
    wearSteps: {
      perKm,
      equivalentDistance,
    },
    totalCompensation,
  };
}
