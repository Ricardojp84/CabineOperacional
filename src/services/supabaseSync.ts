import { getSupabaseClient, isSupabaseConfigured, sanitizeSupabaseUrl, sanitizeSupabaseKey } from '../lib/supabase';
import { Trip, Expense, MaintenanceItem, RouteCheckpoint } from '../types/cockpit';

export interface SyncResult {
  success: boolean;
  message: string;
  isTableMissing?: boolean;
}

/**
 * Tests connection to the configured or provided Supabase instance
 */
export const testSupabaseConnection = async (overrideUrl?: string, overrideKey?: string): Promise<SyncResult> => {
  const cleanUrl = overrideUrl ? sanitizeSupabaseUrl(overrideUrl) : undefined;
  const cleanKey = overrideKey ? sanitizeSupabaseKey(overrideKey) : undefined;

  const client = getSupabaseClient(cleanUrl, cleanKey);

  if (!client) {
    return {
      success: false,
      message: 'Supabase não está configurado. Preencha a URL do projeto (https://...) e a Chave Anon (começa com eyJ...).',
    };
  }

  try {
    const { error } = await client.from('trips').select('id').limit(1);

    if (error) {
      // 42P01 means Postgres answered! The API key and URL are 100% VALID, only the tables need to be created.
      if (error.code === '42P01') {
        return {
          success: true,
          isTableMissing: true,
          message: 'Conectado ao Supabase com sucesso! A chave e URL estão válidas. Agora execute a Migration na aba "Migrations SQL" para criar as tabelas.',
        };
      }

      // Check for Invalid API Key
      if (
        error.message?.toLowerCase().includes('invalid api key') ||
        error.message?.toLowerCase().includes('jwt') ||
        error.code === 'PGRST301' ||
        (error as any).status === 401
      ) {
        return {
          success: false,
          message: 'Chave API Inválida (Invalid API key). No painel do Supabase, vá em Project Settings ➔ API ➔ Project API keys e copie a chave da linha "anon public" (inicia com eyJ...). Não use a senha do banco ou JWT secret.',
        };
      }

      return {
        success: false,
        message: `Erro ao conectar com o Supabase: ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida com sucesso! Banco relacional e tabelas operacionais.',
    };
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.toLowerCase().includes('invalid api key') || msg.toLowerCase().includes('jwt')) {
      return {
        success: false,
        message: 'Chave API Inválida (Invalid API key). Verifique a chave "anon public" no Supabase (Project Settings ➔ API).',
      };
    }
    return {
      success: false,
      message: `Falha de rede ao conectar com o Supabase: ${msg || 'Verifique a URL e credenciais'}`,
    };
  }
};

/**
 * Synchronizes an active trip and its checkpoints/expenses to Supabase
 */
export const syncTripToSupabase = async (trip: Trip): Promise<SyncResult> => {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured) {
    return {
      success: true,
      message: 'Salvo em modo local (Supabase não conectado).',
    };
  }

  try {
    // 1. Upsert trip
    const { error: tripError } = await client.from('trips').upsert({
      id: trip.id,
      title: trip.title,
      origin: trip.origin,
      destination: trip.destination,
      route_highlights: trip.routeHighlights,
      cargo: trip.cargo,
      cargo_type: trip.cargoType,
      cargo_weight_ton: trip.cargoWeightTon,
      vehicle_model: trip.vehicleModel,
      vehicle_plate: trip.vehiclePlate,
      axles: trip.axles,
      gross_freight: trip.grossFreight,
      advance_payment: trip.advancePayment,
      balance_payment: trip.balancePayment,
      total_distance_km: trip.totalDistanceKm,
      completed_distance_km: trip.completedDistanceKm,
      current_odometer_km: trip.currentOdometerKm,
      start_odometer_km: trip.startOdometerKm,
      target_consumption_km_l: trip.targetConsumptionKmL,
      actual_consumption_km_l: trip.actualConsumptionKmL,
      diesel_avg_price_per_l: trip.dieselAvgPricePerL,
      arla_avg_price_per_l: trip.arlaAvgPricePerL,
      estimated_toll_cost: trip.estimatedTollCost,
      is_completed: trip.isCompleted,
      started_at: trip.startedAt,
      estimated_arrival: trip.estimatedArrival,
      updated_at: new Date().toISOString(),
    });

    if (tripError) {
      if (tripError.code === '42P01') {
        return {
          success: false,
          isTableMissing: true,
          message: 'Tabelas não encontradas no Supabase. Execute a migration SQL na aba "Migrations SQL" do modal.',
        };
      }
      return { success: false, message: `Erro ao sincronizar viagem: ${tripError.message}` };
    }

    // 2. Upsert expenses
    if (trip.expenses && trip.expenses.length > 0) {
      const expensesPayload = trip.expenses.map((e) => ({
        id: e.id,
        trip_id: trip.id,
        category: e.category,
        description: e.description,
        amount: e.amount,
        date: e.date,
        time: e.time,
        location: e.location || null,
        liters: e.liters || null,
        odometer_km: e.odometerKm || null,
        payment_method: e.paymentMethod || null,
        invoice_number: e.invoiceNumber || null,
      }));

      await client.from('expenses').upsert(expensesPayload);
    }

    // 3. Upsert checkpoints
    if (trip.checkpoints && trip.checkpoints.length > 0) {
      const checkpointsPayload = trip.checkpoints.map((cp) => ({
        id: cp.id,
        trip_id: trip.id,
        name: cp.name,
        highway: cp.highway,
        km_marker: cp.kmMarker || null,
        city: cp.city,
        state: cp.state,
        status: cp.status,
        type: cp.type,
        estimated_arrival: cp.estimatedArrival || null,
        actual_arrival: cp.actualArrival || null,
        toll_fee: cp.tollFee || null,
        toll_tag_detected: cp.tollTagDetected || false,
        notes: cp.notes || null,
        has_safe_parking: cp.hasSafeParking || false,
        has_shower: cp.hasShower || false,
      }));

      await client.from('checkpoints').upsert(checkpointsPayload);
    }

    return {
      success: true,
      message: 'Viagem, despesas e checkpoints sincronizados no Supabase com sucesso!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao enviar dados ao Supabase: ${err.message || 'Falha de comunicação'}`,
    };
  }
};

/**
 * Synchronizes maintenance items to Supabase
 */
export const syncMaintenanceToSupabase = async (items: MaintenanceItem[]): Promise<SyncResult> => {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured) {
    return {
      success: true,
      message: 'Manutenções salvas localmente.',
    };
  }

  try {
    const payload = items.map((m) => ({
      id: m.id,
      title: m.title,
      interval_km: m.intervalKm,
      last_done_km: m.lastDoneKm,
      next_due_km: m.nextDueKm,
      urgency: m.urgency,
      estimated_cost: m.estimatedCost,
      component: m.component,
      notes: m.notes || null,
      recommended_part: m.recommendedPart || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('maintenance_items').upsert(payload);
    if (error) {
      return { success: false, message: `Erro ao sincronizar manutenção: ${error.message}` };
    }

    return {
      success: true,
      message: 'Plano de manutenção sincronizado com o Supabase!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro na sincronização de manutenção: ${err.message}`,
    };
  }
};
