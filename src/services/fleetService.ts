import { FleetVehicle, User, UserRole, VehicleAxles, VehicleStatus } from '../types/cockpit';
import { getUsersFromStorage, saveUsersToStorage } from '../data/mockUsers';
import { getSupabaseClient, getStoredCredentials } from '../lib/supabase';
import { INITIAL_DRIVER_DOCUMENTS } from './driverDocumentService';

export const INITIAL_FLEET_VEHICLES: FleetVehicle[] = [
  {
    id: 'veh-1',
    plate: 'BRA-9S40',
    model: 'Scania R540 6x4 Super',
    type: 'Traçado 6x4 (Cavalo Pesado)',
    axles: 6,
    year: 2024,
    payloadCapacityTon: 37.5,
    targetConsumptionKmL: 2.3,
    currentOdometerKm: 435000,
    status: 'em_viagem',
    assignedDriverId: 'user-1',
    assignedDriverName: 'Marcos Vinícius',
    notes: 'Conjunto Graneleiro LS 3 eixos espaçados (Rota Safra MT-Porto Santos)',
    createdAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 'veh-2',
    plate: 'PR-CAS-6540',
    model: 'Volvo FH 540 Globetrotter 6x2',
    type: 'Cavalo Mecânico 6x2',
    axles: 6,
    year: 2023,
    payloadCapacityTon: 35.0,
    targetConsumptionKmL: 2.4,
    currentOdometerKm: 210000,
    status: 'disponivel',
    assignedDriverId: 'user-2',
    assignedDriverName: 'Ricardo Pinheiro',
    notes: 'Cabine Globetrotter, suspensão pneumática, implemento sider baú',
    createdAt: '2025-01-12T14:00:00Z',
  },
  {
    id: 'veh-3',
    plate: 'SP-HHR-2026',
    model: 'Hyundai HR 2.5 Turbo Euro 6',
    type: 'VUC / Utilitário 2 Eixos',
    axles: 2,
    year: 2024,
    payloadCapacityTon: 1.8,
    targetConsumptionKmL: 8.5,
    currentOdometerKm: 62400,
    status: 'operacional',
    assignedDriverId: 'user-4',
    assignedDriverName: 'Carlos Eduardo',
    notes: 'Baú isotérmico urbano, livre de rodízio SP e pedágio comercial reduzido',
    createdAt: '2025-02-01T08:00:00Z',
  },
  {
    id: 'veh-4',
    plate: 'RJ-DEL-1180',
    model: 'Volkswagen Delivery 11.180',
    type: 'Caminhão Médio 2 Eixos',
    axles: 2,
    year: 2024,
    payloadCapacityTon: 7.5,
    targetConsumptionKmL: 5.2,
    currentOdometerKm: 98000,
    status: 'disponivel',
    notes: 'Ideal para distribuição regional fracionada e rotas de entrega intermunicipais',
    createdAt: '2025-02-15T09:00:00Z',
  },
  {
    id: 'veh-5',
    plate: 'MG-BTM-2651',
    model: 'Mercedes-Benz Actros 2651 6x4',
    type: 'Bitrem 7 Eixos (Vanderleia / Articulado)',
    axles: 7,
    year: 2023,
    payloadCapacityTon: 45.0,
    targetConsumptionKmL: 1.8,
    currentOdometerKm: 312500,
    status: 'operacional',
    assignedDriverId: 'user-3',
    assignedDriverName: 'Juliana Freitas',
    notes: 'Trem de força de alta capacidade, rota minério e carga pesada',
    createdAt: '2025-02-20T11:00:00Z',
  },
];

/**
 * Storage key for Fleet Vehicles
 */
const FLEET_STORAGE_KEY = 'cabine_fleet_vehicles';

export const getFleetVehicles = (): FleetVehicle[] => {
  try {
    const raw = localStorage.getItem(FLEET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return INITIAL_FLEET_VEHICLES;
};

export const saveFleetVehicles = (vehicles: FleetVehicle[]): void => {
  try {
    localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(vehicles));
  } catch {
    // ignore
  }
};

/**
 * Add a new vehicle to the fleet
 */
export const addFleetVehicle = (
  vehicleData: Omit<FleetVehicle, 'id' | 'createdAt'>
): FleetVehicle => {
  const list = getFleetVehicles();
  const newVehicle: FleetVehicle = {
    ...vehicleData,
    id: `veh-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [newVehicle, ...list];
  saveFleetVehicles(updatedList);
  return newVehicle;
};

/**
 * Update an existing vehicle
 */
export const updateFleetVehicle = (
  id: string,
  updates: Partial<FleetVehicle>
): FleetVehicle | null => {
  const list = getFleetVehicles();
  const index = list.findIndex((v) => v.id === id);
  if (index === -1) return null;

  const updated = {
    ...list[index],
    ...updates,
  };

  list[index] = updated;
  saveFleetVehicles(list);

  // If driver was linked/unlinked, keep user profile truck model & plate in sync
  if (updates.assignedDriverId || updates.assignedDriverId === '') {
    const users = getUsersFromStorage();
    const userIdx = users.findIndex((u) => u.id === updates.assignedDriverId);
    if (userIdx >= 0) {
      users[userIdx].assignedVehicleId = id;
      users[userIdx].truckModel = updated.model;
      users[userIdx].truckPlate = updated.plate;
      saveUsersToStorage(users);
    }
  }

  return updated;
};

/**
 * Delete a vehicle
 */
export const deleteFleetVehicle = (id: string): boolean => {
  const list = getFleetVehicles();
  const filtered = list.filter((v) => v.id !== id);
  if (filtered.length === list.length) return false;

  saveFleetVehicles(filtered);
  return true;
};

/**
 * Parameters for Admin registering a new driver
 */
export interface AdminRegisterDriverParams {
  name: string;
  email: string;
  password?: string;
  role?: UserRole; // 'motorista' | 'motorista_autonomo' | 'motorista_agregado'
  phone?: string;
  cpf?: string;
  rntrc?: string;
  cnhNumber?: string;
  cnhCategory?: string; // 'B' | 'C' | 'D' | 'E'
  cnhDueDate?: string; // YYYY-MM-DD
  toxicologyDueDate?: string; // YYYY-MM-DD
  hasEar?: boolean;
  assignedVehicleId?: string;
  contractType?: 'clt' | 'autonomo_tac' | 'agregado';
  status?: 'ativo' | 'inativo' | 'bloqueado';
}

/**
 * Register a driver by Administrator with strictly driver-only permissions
 * (isSupabaseVerifiedAdmin: false, role: 'motorista').
 * Also syncs with Supabase if connected.
 */
export const registerDriverByAdmin = async (
  params: AdminRegisterDriverParams
): Promise<{ success: boolean; user?: User; error?: string; supabaseSynced?: boolean }> => {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name.trim();
  const cleanPassword = params.password?.trim() || 'estrada2026';

  if (!cleanName || !cleanEmail) {
    return { success: false, error: 'Nome e E-mail do motorista são obrigatórios.' };
  }

  const users = getUsersFromStorage();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return {
      success: false,
      error: `Já existe um usuário cadastrado com o e-mail "${cleanEmail}".`,
    };
  }

  // Get assigned vehicle info if selected
  let truckModel = 'Scania R540 6x4 Super';
  let truckPlate = 'BRA-2026';
  if (params.assignedVehicleId) {
    const vehicles = getFleetVehicles();
    const veh = vehicles.find((v) => v.id === params.assignedVehicleId);
    if (veh) {
      truckModel = veh.model;
      truckPlate = veh.plate;
    }
  }

  let supabaseSynced = false;
  let authUserId: string | undefined = undefined;

  // Sync to Supabase if client is active
  const client = getSupabaseClient();
  const creds = getStoredCredentials();
  if (client && creds.url && creds.key) {
    try {
      if (cleanPassword) {
        try {
          const { data: authData, error: authErr } = await client.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: {
              data: {
                name: cleanName,
                role: params.role || 'motorista',
              },
            },
          });
          if (!authErr && authData?.user) {
            authUserId = authData.user.id;
          }
        } catch (authException) {
          console.warn('Supabase auth motorista signUp:', authException);
        }
      }

      // Upsert into public.profiles with role = 'motorista' (STRICTLY NO ADMIN POWERS)
      const { error: profileErr } = await client.from('profiles').upsert(
        {
          name: cleanName,
          email: cleanEmail,
          role: params.role || 'motorista',
          truck_model: truckModel,
          truck_plate: truckPlate,
          rntrc: params.rntrc || '',
          phone: params.phone || '',
          cnh_category: params.cnhCategory || 'E',
          is_email_verified: true,
          auth_user_id: authUserId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );

      if (!profileErr) {
        supabaseSynced = true;
      }
    } catch (err) {
      console.warn('Erro ao sincronizar motorista no Supabase:', err);
    }
  }

  // Create new Driver user object - STRICTLY DRIVER ONLY
  const newDriver: User = {
    id: authUserId || `driver-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    role: params.role || 'motorista', // strictly driver role
    rntrc: params.rntrc || 'Isento',
    phone: params.phone || '',
    cpf: params.cpf || '',
    cnhNumber: params.cnhNumber || '',
    cnhCategory: params.cnhCategory || 'E',
    cnhDueDate: params.cnhDueDate,
    toxicologyDueDate: params.toxicologyDueDate,
    hasEar: params.hasEar ?? true,
    truckModel,
    truckPlate,
    assignedVehicleId: params.assignedVehicleId,
    contractType: params.contractType || 'clt',
    status: params.status || 'ativo',
    isEmailVerified: true,
    isSupabaseVerifiedAdmin: false, // MANDATORY: Driver NEVER gets admin powers
    authProvider: supabaseSynced ? 'supabase' : 'local',
    createdAt: new Date().toISOString(),
  };

  // Persist to users list
  users.push(newDriver);
  saveUsersToStorage(users);

  // Link vehicle to driver if assigned
  if (params.assignedVehicleId) {
    updateFleetVehicle(params.assignedVehicleId, {
      assignedDriverId: newDriver.id,
      assignedDriverName: newDriver.name,
    });
  }

  // Auto-register driver documentation reminders if dates provided
  syncDriverDocumentReminders(newDriver);

  return {
    success: true,
    user: newDriver,
    supabaseSynced,
  };
};

/**
 * Update an existing driver's details, permissions, or vehicle
 */
export const updateDriverByAdmin = async (
  driverId: string,
  updates: Partial<User>
): Promise<{ success: boolean; user?: User; error?: string }> => {
  const users = getUsersFromStorage();
  const index = users.findIndex((u) => u.id === driverId);
  if (index === -1) {
    return { success: false, error: 'Motorista não encontrado.' };
  }

  // Enforce driver-only safety (cannot promote to admin via driver update)
  const safeUpdates = {
    ...updates,
    isSupabaseVerifiedAdmin: false, // Cannot bypass admin security
  };

  const updatedDriver: User = {
    ...users[index],
    ...safeUpdates,
  };

  users[index] = updatedDriver;
  saveUsersToStorage(users);

  // Sync to Supabase if connected
  const client = getSupabaseClient();
  if (client) {
    try {
      await client
        .from('profiles')
        .update({
          name: updatedDriver.name,
          phone: updatedDriver.phone,
          truck_model: updatedDriver.truckModel,
          truck_plate: updatedDriver.truckPlate,
          cnh_category: updatedDriver.cnhCategory,
          updated_at: new Date().toISOString(),
        })
        .eq('email', updatedDriver.email.toLowerCase().trim());
    } catch (err) {
      console.warn('Erro ao atualizar motorista no Supabase:', err);
    }
  }

  syncDriverDocumentReminders(updatedDriver);

  return {
    success: true,
    user: updatedDriver,
  };
};

/**
 * Toggle driver status (Ativo <-> Bloqueado)
 */
export const toggleDriverStatus = (
  driverId: string
): { success: boolean; newStatus?: 'ativo' | 'bloqueado'; user?: User } => {
  const users = getUsersFromStorage();
  const index = users.findIndex((u) => u.id === driverId);
  if (index === -1) return { success: false };

  const currentStatus = users[index].status || 'ativo';
  const newStatus: 'ativo' | 'bloqueado' = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';

  users[index].status = newStatus;
  saveUsersToStorage(users);

  return {
    success: true,
    newStatus,
    user: users[index],
  };
};

/**
 * Delete a driver
 */
export const deleteDriverByAdmin = (driverId: string): boolean => {
  const users = getUsersFromStorage();
  const filtered = users.filter((u) => u.id !== driverId);
  if (filtered.length === users.length) return false;

  saveUsersToStorage(filtered);

  // Unlink from vehicles
  const vehicles = getFleetVehicles();
  const updatedVehicles = vehicles.map((v) => {
    if (v.assignedDriverId === driverId) {
      return { ...v, assignedDriverId: undefined, assignedDriverName: undefined };
    }
    return v;
  });
  saveFleetVehicles(updatedVehicles);

  return true;
};

/**
 * Automatically integrates driver CNH and toxicology due dates into the Cabine documentation tracker
 */
const syncDriverDocumentReminders = (driver: User): void => {
  try {
    const raw = localStorage.getItem('cabine_driver_documents');
    let docList = raw ? JSON.parse(raw) : INITIAL_DRIVER_DOCUMENTS;
    if (!Array.isArray(docList)) docList = INITIAL_DRIVER_DOCUMENTS;

    // CNH reminder
    if (driver.cnhDueDate) {
      const existingCnhIdx = docList.findIndex(
        (d: any) => d.type === 'cnh' && (d.driverName === driver.name || d.id === `doc-cnh-${driver.id}`)
      );
      const cnhDoc = {
        id: `doc-cnh-${driver.id}`,
        type: 'cnh',
        title: `CNH - ${driver.name}`,
        documentNumber: driver.cnhNumber || 'A definir',
        categoryOrDetails: `Categoria ${driver.cnhCategory || 'E'}${driver.hasEar ? ' com EAR' : ''}`,
        dueDate: driver.cnhDueDate,
        alertDaysThreshold: 30,
        driverName: driver.name,
        laboratoryOrIssuer: 'DETRAN',
      };
      if (existingCnhIdx >= 0) {
        docList[existingCnhIdx] = { ...docList[existingCnhIdx], ...cnhDoc };
      } else {
        docList.unshift(cnhDoc);
      }
    }

    // Toxicology reminder
    if (driver.toxicologyDueDate) {
      const existingToxIdx = docList.findIndex(
        (d: any) => d.type === 'toxicologico' && (d.driverName === driver.name || d.id === `doc-tox-${driver.id}`)
      );
      const toxDoc = {
        id: `doc-tox-${driver.id}`,
        type: 'toxicologico',
        title: `Exame Toxicológico - ${driver.name}`,
        documentNumber: `LAB-${driver.cpf?.slice(0, 3) || 'SENATRAN'}`,
        categoryOrDetails: 'Exame Periódico Obrigatório (Art. 148-A CTB)',
        dueDate: driver.toxicologyDueDate,
        alertDaysThreshold: 30,
        driverName: driver.name,
        laboratoryOrIssuer: 'Laboratório Credenciado SENATRAN',
      };
      if (existingToxIdx >= 0) {
        docList[existingToxIdx] = { ...docList[existingToxIdx], ...toxDoc };
      } else {
        docList.unshift(toxDoc);
      }
    }

    localStorage.setItem('cabine_driver_documents', JSON.stringify(docList));
  } catch (e) {
    console.warn('Erro ao sincronizar lembretes do motorista:', e);
  }
};
