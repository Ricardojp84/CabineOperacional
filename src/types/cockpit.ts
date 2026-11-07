export type VehicleAxles = 2 | 3 | 4 | 5 | 6 | 7 | 9;

export type CargoType = 
  | 'granel_solido' 
  | 'granel_liquido' 
  | 'carga_geral' 
  | 'frigorificada' 
  | 'perigosa' 
  | 'neogranel';

export type ExpenseCategory = 
  | 'combustivel' 
  | 'arla' 
  | 'pedagio' 
  | 'alimentacao' 
  | 'manutencao' 
  | 'pneu_borracharia' 
  | 'estacionamento' 
  | 'chapa_descarga' 
  | 'outros';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  time: string;
  location?: string;
  liters?: number;
  odometerKm?: number;
  paymentMethod?: 'Cartão Frete' | 'PIX' | 'Dinheiro' | 'TAG Sem Parar' | 'Boleto';
  invoiceNumber?: string;
}

export type CheckpointStatus = 'completed' | 'active' | 'upcoming';

export interface RouteCheckpoint {
  id: string;
  name: string;
  highway: string;
  kmMarker?: string;
  city: string;
  state: string;
  status: CheckpointStatus;
  type: 'partida' | 'pedagio' | 'posto_parada' | 'fiscalizacao' | 'destino' | 'descarga';
  estimatedArrival?: string;
  actualArrival?: string;
  tollFee?: number;
  tollTagDetected?: boolean;
  notes?: string;
  hasSafeParking?: boolean;
  hasShower?: boolean;
}

export type ShiftStatus = 'driving' | 'rest' | 'meal' | 'loading' | 'sleeping' | 'stopped';

export interface DriverShift {
  status: ShiftStatus;
  startedAt: string; // ISO
  continuousDrivingSeconds: number; // Max 5.5 hours (19800s)
  dailyDrivingSeconds: number; // Max 10 hours
  requiredRestSeconds: number; // 30 min (1800s)
  lastRestAt?: string;
}

export type MaintenanceComponent = 
  | 'oleo_motor' 
  | 'filtro_combustivel' 
  | 'filtro_ar' 
  | 'freios' 
  | 'pneus' 
  | 'diferencial' 
  | 'suspensao'
  | 'eletrica_bateria'
  | 'arrefecimento'
  | 'consertos_gerais';

export interface MaintenanceItem {
  id: string;
  title: string;
  intervalKm: number;
  lastDoneKm: number;
  nextDueKm: number;
  urgency: 'ok' | 'warning' | 'urgent';
  estimatedCost: number;
  component: MaintenanceComponent;
  notes?: string;
  recommendedPart?: string;
}

export interface Trip {
  id: string;
  title: string;
  origin: string;
  destination: string;
  routeHighlights: string; // ex: "BR-163 ➔ BR-364 ➔ SP-310"
  cargo: string;
  cargoType: CargoType;
  cargoWeightTon: number;
  vehicleModel: string;
  vehiclePlate: string;
  axles: VehicleAxles;
  
  grossFreight: number; // Valor bruto do frete (R$)
  advancePayment: number; // Adiantamento recebido (R$)
  balancePayment: number; // Saldo a receber no destino (R$)
  
  totalDistanceKm: number;
  completedDistanceKm: number;
  currentOdometerKm: number;
  startOdometerKm: number;
  
  targetConsumptionKmL: number; // ex: 2.3 km/L
  actualConsumptionKmL: number; // calculado dinamicamente
  
  dieselAvgPricePerL: number; // R$/L
  arlaAvgPricePerL: number;
  estimatedTollCost: number;
  
  checkpoints: RouteCheckpoint[];
  expenses: Expense[];
  
  startedAt: string;
  estimatedArrival: string;
  isCompleted: boolean;
}

export type UserRole =
  | 'admin'
  | 'administrador'
  | 'gestor_frota'
  | 'motorista'
  | 'motorista_autonomo'
  | 'motorista_agregado';

/**
 * Checks if the given role or user is an Administrator with full system powers
 */
export const isAdminRole = (role?: UserRole | string | null): boolean => {
  if (!role) return false;
  return role === 'admin' || role === 'administrador' || role === 'gestor_frota';
};

/**
 * Checks if the given role or user is a Driver with operational-only permissions
 */
export const isDriverRole = (role?: UserRole | string | null): boolean => {
  return !isAdminRole(role);
};

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  rntrc?: string;
  phone?: string;
  truckModel: string;
  truckPlate: string;
  cnhCategory?: string;
  avatarUrl?: string;
  isEmailVerified?: boolean;
  verificationToken?: string;
  createdAt: string;
}
