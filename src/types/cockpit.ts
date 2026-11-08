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
 * Checks if a user is an authenticated and verified Supabase Administrator.
 * In accordance with the strict security policy:
 * - Pre-configured administrator accounts are revoked.
 * - ONLY accounts registered and verified in SUPABASE (isSupabaseVerifiedAdmin === true)
 *   are accepted as administrators.
 */
export const isUserAdmin = (user?: User | null): boolean => {
  if (!user) return false;
  return Boolean(user.isSupabaseVerifiedAdmin && isAdminRole(user.role));
};

/**
 * Checks if the given role or user is a Driver with operational-only permissions
 */
export const isDriverRole = (role?: UserRole | string | null): boolean => {
  return !isUserAdmin({ role: (role as UserRole) || 'motorista', id: '', name: '', email: '', truckModel: '', truckPlate: '', createdAt: '' });
};

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  rntrc?: string;
  phone?: string;
  cpf?: string;
  cnhNumber?: string;
  cnhCategory?: string;
  cnhDueDate?: string;
  toxicologyDueDate?: string;
  hasEar?: boolean;
  truckModel: string;
  truckPlate: string;
  assignedVehicleId?: string;
  contractType?: 'clt' | 'autonomo_tac' | 'agregado';
  status?: 'ativo' | 'inativo' | 'bloqueado';
  avatarUrl?: string;
  isEmailVerified?: boolean;
  verificationToken?: string;
  createdAt: string;
  // Supabase Verification fields
  supabaseUserId?: string;
  isSupabaseVerifiedAdmin?: boolean;
  authProvider?: 'local' | 'supabase';
}

export type VehicleStatus = 'operacional' | 'em_viagem' | 'manutencao' | 'disponivel';

export interface FleetVehicle {
  id: string;
  plate: string;
  model: string;
  type: string;
  axles: VehicleAxles;
  year?: number;
  renavam?: string;
  chassis?: string;
  payloadCapacityTon: number;
  targetConsumptionKmL: number;
  currentOdometerKm: number;
  status: VehicleStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  notes?: string;
  createdAt: string;
}

export type DriverDocumentType =
  | 'cnh'
  | 'ear'
  | 'toxicologico'
  | 'mopp'
  | 'rntrc_antt'
  | 'crlv_veiculo'
  | 'cronotacografo'
  | 'outros';

export type DriverDocumentStatus = 'valido' | 'alerta' | 'vencido';

export interface DriverDocumentReminder {
  id: string;
  type: DriverDocumentType;
  title: string;
  documentNumber?: string;
  categoryOrDetails?: string; // ex: "Categoria E", "Resolução CONTRAN 922/2022"
  dueDate: string; // YYYY-MM-DD
  issueDate?: string; // YYYY-MM-DD
  notes?: string;
  alertDaysThreshold: number; // Dias antes do vencimento para alertar (ex: 30)
  driverName?: string;
  laboratoryOrIssuer?: string; // ex: "Laboratório Credenciado SENATRAN", "DETRAN-SP"
  lastRenewedAt?: string;
}

