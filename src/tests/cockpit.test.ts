import assert from 'node:assert/strict';

// Polyfill browser storage & window for Node test execution
function installBrowserEnvMock() {
  const store = new Map<string, string>();
  const storageMock: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: storageMock,
    configurable: true,
    writable: true,
  });

  if (typeof (globalThis as Record<string, unknown>).window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      configurable: true,
      writable: true,
    });
  }
}

installBrowserEnvMock();

import {
  DEFAULT_DRIVER_FUNCTIONS,
  Trip,
  User,
  getDriverFunctions,
  hasDriverFunction,
  isAdminRole,
  isUserAdmin,
} from '../types/cockpit';
import { checkAdminPermission } from '../middlewares/permissionMiddleware';
import {
  addFleetVehicle,
  authenticateDriverAccount,
  deleteFleetVehicle,
  getFleetVehicles,
  registerDriverByAdmin,
  sanitizeDriverOnlyRole,
  toggleDriverFreightHelper,
  toggleDriverStatus,
  updateDriverByAdmin,
  updateDriverOnlyFunctions,
  updateFleetVehicle,
} from '../services/fleetService';
import {
  INITIAL_TIRES,
  addKmToAllTires,
  calculateTireWear,
  getCriticalTireAlerts,
} from '../services/tireMonitorService';
import {
  calculateAnttMinimumFloor,
  calculateTripFinancials,
} from '../utils/formatters';
import {
  buildSavedInspection,
  computeInspectionProgress,
  createDefaultPreTripInspection,
  resolveInspectionStatus,
} from '../components/PreTripChecklist';
import {
  FOUR_HOUR_ALERT_SECONDS,
  MAX_CONTINUOUS_SECONDS,
  clampCustomReminderMinutes,
  formatReminderIntervalLabel,
  getShiftAlertStage,
  hoursMinutesToMinutes,
  isCustomBreakReminderDue,
  isCustomBreakVisualAlertActive,
  loadCustomBreakPrefs,
  minutesToHoursMinutes,
  saveCustomBreakPrefs,
} from '../components/DriverShiftTimer';
import {
  buildProductivityComparisonData,
  getNationalBenchmarkForVehicle,
} from '../components/ProductivityReportModal';
import {
  extractCitySearchCandidates,
  interpretWeatherForDriving,
} from '../services/weatherService';
import { analyzeRouteTollHotspots } from '../data/tollPlazasDatabase';
import { interpolateAnimatedValue } from '../components/GoogleMapsRouteModal';

function createBaseTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-test-1',
    title: 'Frete Teste Rondonópolis -> Santos',
    origin: 'Rondonópolis - MT',
    destination: 'Porto de Santos - SP',
    routeHighlights: 'BR-163 ➔ BR-364 ➔ SP-310',
    cargo: 'Soja em Grãos',
    cargoType: 'granel_solido',
    cargoWeightTon: 37.5,
    axles: 6,
    grossFreight: 18500,
    advancePayment: 9250,
    balancePayment: 9250,
    totalDistanceKm: 1420,
    completedDistanceKm: 500,
    startOdometerKm: 435000,
    currentOdometerKm: 435500,
    vehicleModel: 'Scania R540 6x4 Super',
    vehiclePlate: 'BRA-9S40',
    targetConsumptionKmL: 2.3,
    actualConsumptionKmL: 2.45,
    dieselAvgPricePerL: 6.15,
    arlaAvgPricePerL: 4.1,
    estimatedTollCost: 950,
    startedAt: '2026-11-10T08:00:00.000Z',
    estimatedArrival: '2026-11-12T18:00:00.000Z',
    isCompleted: false,
    hasFreightHelper: false,
    freightHelperCost: 0,
    expenses: [
      {
        id: 'exp-1',
        category: 'combustivel',
        description: 'Abastecimento Posto Graal',
        amount: 2000,
        liters: 325,
        odometerKm: 435250,
        date: '2026-11-10',
        time: '14:00',
      },
      {
        id: 'exp-2',
        category: 'pedagio',
        description: 'Praça de Pedágio Anhanguera',
        amount: 400,
        date: '2026-11-10',
        time: '18:00',
      },
      {
        id: 'exp-3',
        category: 'alimentacao',
        description: 'Refeição na estrada',
        amount: 100,
        date: '2026-11-10',
        time: '20:00',
      },
    ],
    checkpoints: [],
    ...overrides,
  };
}

function runTest(name: string, fn: () => void | Promise<void>) {
  return { name, fn };
}

async function main() {
  const tests = [
    runTest('1. Permissions Middleware: bloqueia motoristas e admins não verificados no Supabase', () => {
      const driver: User = {
        id: 'u-driver',
        name: 'Motorista Teste',
        email: 'motorista@frota.com',
        role: 'motorista',
        truckModel: 'Scania R540',
        truckPlate: 'BRA-1234',
        createdAt: '2026-11-10T08:00:00.000Z',
        isSupabaseVerifiedAdmin: false,
      };
      const unverifiedAdmin: User = {
        ...driver,
        id: 'u-fake-admin',
        role: 'admin',
        isSupabaseVerifiedAdmin: false,
      };
      const verifiedAdmin: User = {
        ...driver,
        id: 'u-admin',
        role: 'admin',
        isSupabaseVerifiedAdmin: true,
      };

      assert.equal(isAdminRole('motorista'), false);
      assert.equal(isAdminRole('admin'), true);
      assert.equal(isUserAdmin(driver), false);
      assert.equal(isUserAdmin(unverifiedAdmin), false);
      assert.equal(isUserAdmin(verifiedAdmin), true);

      assert.equal(checkAdminPermission(driver).allowed, false);
      assert.equal(checkAdminPermission(unverifiedAdmin).allowed, false);
      assert.equal(checkAdminPermission(verifiedAdmin).allowed, true);
    }),

    runTest('2. Cadastro de motorista pelo Administrador: força funções apenas de motorista e persiste ajudante', async () => {
      localStorage.clear();

      // Mesmo que tente passar role 'administrador', sanitizeDriverOnlyRole deve bloquear
      assert.equal(sanitizeDriverOnlyRole('administrador'), 'motorista');
      assert.equal(sanitizeDriverOnlyRole('admin'), 'motorista');
      assert.equal(sanitizeDriverOnlyRole('motorista_autonomo'), 'motorista_autonomo');

      const result = await registerDriverByAdmin({
        name: 'João da Estrada',
        email: 'joao.estrada@cabine.com',
        password: '123',
        role: 'administrador' as User['role'],
        cnhCategory: 'E',
        hasFreightHelper: true,
        freightHelperName: 'Lucas Ajudante',
        freightHelperDailyCost: 220,
        driverFunctions: {
          routeAndMaps: true,
          fuelAndExpenses: true,
          tachographAndShift: true,
          maintenanceAndChecklist: false,
          weatherAndProductivity: false,
          freightSimulator: false,
        },
      });

      assert.equal(result.success, true);
      assert.ok(result.user);
      assert.equal(result.user!.role, 'motorista');
      assert.equal(result.user!.isSupabaseVerifiedAdmin, false);
      assert.equal(isUserAdmin(result.user!), false);
      assert.equal(result.user!.hasFreightHelper, true);
      assert.equal(result.user!.freightHelperName, 'Lucas Ajudante');
      assert.equal(result.user!.freightHelperDailyCost, 220);
      assert.equal(hasDriverFunction(result.user!, 'routeAndMaps'), true);
      assert.equal(hasDriverFunction(result.user!, 'freightSimulator'), false);
    }),

    runTest('3. Ativação de funções de motorista apenas e bloqueio de motorista', async () => {
      localStorage.clear();

      const reg = await registerDriverByAdmin({
        name: 'Carlos Agregado',
        email: 'carlos.agregado@cabine.com',
        password: '456',
        role: 'motorista_agregado',
        driverFunctions: { ...DEFAULT_DRIVER_FUNCTIONS },
      });
      assert.equal(reg.success, true);
      const driverId = reg.user!.id;

      // Atualiza apenas funções operacionais de motorista
      const fnUpdate = updateDriverOnlyFunctions(driverId, {
        routeAndMaps: true,
        fuelAndExpenses: true,
        tachographAndShift: false,
        maintenanceAndChecklist: true,
        weatherAndProductivity: false,
        freightSimulator: false,
      });
      assert.equal(fnUpdate.success, true);
      assert.equal(fnUpdate.user!.isSupabaseVerifiedAdmin, false);
      assert.equal(getDriverFunctions(fnUpdate.user!).tachographAndShift, false);
      assert.equal(hasDriverFunction(fnUpdate.user!, 'tachographAndShift'), false);
      assert.equal(hasDriverFunction(fnUpdate.user!, 'fuelAndExpenses'), true);

      // Login válido enquanto ativo
      const okLogin = authenticateDriverAccount('carlos.agregado@cabine.com', '456');
      assert.equal(okLogin.success, true);
      assert.equal(okLogin.user?.isSupabaseVerifiedAdmin, false);

      // Senha incorreta falha
      const badPass = authenticateDriverAccount('carlos.agregado@cabine.com', 'errada');
      assert.equal(badPass.success, false);

      // Bloqueio do motorista pelo Admin impede login e desabilita funções
      const toggled = toggleDriverStatus(driverId);
      assert.equal(toggled.success, true);
      assert.equal(toggled.newStatus, 'bloqueado');
      assert.equal(hasDriverFunction(toggled.user!, 'fuelAndExpenses'), false);

      const blockedLogin = authenticateDriverAccount('carlos.agregado@cabine.com', '456');
      assert.equal(blockedLogin.success, false);
      assert.ok(blockedLogin.error?.toLowerCase().includes('bloqueado'));

      // Tentativa de promover motorista via updateDriverByAdmin é sanitizada
      const tryPromote = await updateDriverByAdmin(driverId, {
        role: 'admin',
        isSupabaseVerifiedAdmin: true,
      });
      assert.equal(tryPromote.success, true);
      assert.equal(tryPromote.user!.role, 'motorista');
      assert.equal(tryPromote.user!.isSupabaseVerifiedAdmin, false);
    }),

    runTest('4. Alternância Com Ajudante vs Sem Ajudante (Solo) e impacto financeiro na viagem', async () => {
      localStorage.clear();

      const reg = await registerDriverByAdmin({
        name: 'Marcos Solo',
        email: 'marcos.solo@cabine.com',
        password: '123',
        hasFreightHelper: false,
      });
      assert.equal(reg.success, true);
      const driverId = reg.user!.id;

      // Ativa ajudante no frete pelo serviço
      const helperOn = toggleDriverFreightHelper(driverId, 'Pedro Chapa', 250);
      assert.equal(helperOn.success, true);
      assert.equal(helperOn.user?.hasFreightHelper, true);
      assert.equal(helperOn.user?.freightHelperName, 'Pedro Chapa');
      assert.equal(helperOn.user?.freightHelperDailyCost, 250);

      // Desativa ajudante no frete (volta para Solo)
      const helperOff = toggleDriverFreightHelper(driverId);
      assert.equal(helperOff.success, true);
      assert.equal(helperOff.user?.hasFreightHelper, false);
      assert.equal(helperOff.user?.freightHelperDailyCost, 0);

      // Cálculo financeiro da viagem: Solo vs Com Ajudante
      const soloTrip = createBaseTrip({ hasFreightHelper: false, freightHelperCost: 300 });
      const soloSummary = calculateTripFinancials(soloTrip);
      assert.equal(soloSummary.helperCost, 0);
      assert.equal(soloSummary.totalDirectExpenses, 2500);
      assert.equal(soloSummary.netPocketProfit, 16000);

      const helperTrip = createBaseTrip({
        hasFreightHelper: true,
        freightHelperName: 'Pedro Chapa',
        freightHelperCost: 300,
      });
      const helperSummary = calculateTripFinancials(helperTrip);
      assert.equal(helperSummary.helperCost, 300);
      assert.equal(helperSummary.otherExpensesTotal, 400); // 100 alimentação + 300 ajudante
      assert.equal(helperSummary.totalDirectExpenses, 2800);
      assert.equal(helperSummary.netPocketProfit, 15700);
    }),

    runTest('5. CRUD de Veículos da Frota (FleetManagement)', () => {
      localStorage.clear();
      const initialCount = getFleetVehicles().length;
      assert.ok(initialCount > 0);

      const added = addFleetVehicle({
        plate: 'TST-2026',
        model: 'Volvo FH 540 6x4',
        type: 'Cavalo Pesado 6x4',
        axles: 6,
        year: 2026,
        payloadCapacityTon: 38,
        targetConsumptionKmL: 2.35,
        currentOdometerKm: 15000,
        status: 'disponivel',
      });
      assert.equal(getFleetVehicles().length, initialCount + 1);

      const updated = updateFleetVehicle(added.id, { status: 'em_viagem', currentOdometerKm: 16200 });
      assert.equal(updated?.status, 'em_viagem');
      assert.equal(updated?.currentOdometerKm, 16200);

      const deleted = deleteFleetVehicle(added.id);
      assert.equal(deleted, true);
      assert.equal(getFleetVehicles().length, initialCount);
    }),

    runTest('6. Monitoramento de Pneus: desgaste e alerta >= 80%', () => {
      const lowWear = calculateTireWear({
        ...INITIAL_TIRES[0],
        currentTireKm: 45000,
        estimatedLifeKm: 90000,
      });
      assert.equal(lowWear.wearPct, 50);
      assert.equal(lowWear.isAlert80, false);
      assert.equal(lowWear.status, 'bom');

      const alertWear = calculateTireWear({
        ...INITIAL_TIRES[0],
        currentTireKm: 72000,
        estimatedLifeKm: 90000,
      });
      assert.equal(alertWear.wearPct, 80);
      assert.equal(alertWear.isAlert80, true);
      assert.equal(alertWear.status, 'alerta_80');

      const criticalAlerts = getCriticalTireAlerts(INITIAL_TIRES);
      assert.ok(criticalAlerts.length >= 2);
      assert.ok(criticalAlerts.every((a) => a.analysis.wearPct >= 80));

      const incremented = addKmToAllTires(INITIAL_TIRES, 1000);
      assert.equal(incremented[0].currentTireKm, INITIAL_TIRES[0].currentTireKm + 1000);
    }),

    runTest('7. Checklist Pré-Viagem: progresso e status vinculados à viagem', () => {
      const inspection = createDefaultPreTripInspection('trip-test-1', 'Marcos', 435000);
      assert.equal(inspection.status, 'pendente');
      assert.equal(computeInspectionProgress(inspection.items).completedCount, 0);

      // Marca apenas os itens obrigatórios
      const withMandatory = inspection.items.map((item) =>
        item.mandatory ? { ...item, completed: true } : item
      );
      assert.equal(resolveInspectionStatus(withMandatory), 'aprovada_com_ressalvas');

      // Marca todos os itens
      const allCompleted = inspection.items.map((item) => ({ ...item, completed: true }));
      const saved = buildSavedInspection({
        tripId: 'trip-test-1',
        items: allCompleted,
        notes: 'Tudo verificado antes de sair do pátio',
        inspectorName: 'Marcos',
        odometerAtInspection: 435000,
      });
      assert.equal(saved.status, 'aprovada');
      assert.equal(saved.tripId, 'trip-test-1');
    }),

    runTest('8. Lei do Motorista (4h/5h30) e lembretes personalizados (2h/3h)', () => {
      assert.equal(getShiftAlertStage(3600), 'normal');
      assert.equal(getShiftAlertStage(FOUR_HOUR_ALERT_SECONDS), 'warning_4h');
      assert.equal(getShiftAlertStage(MAX_CONTINUOUS_SECONDS), 'critical_5h30');

      assert.equal(clampCustomReminderMinutes(5), 15);
      assert.equal(clampCustomReminderMinutes(300), 235);
      assert.equal(formatReminderIntervalLabel(120), '2h00');
      assert.equal(formatReminderIntervalLabel(180), '3h00');

      // Lembrete de 2h dispara ao atingir 7200s antes das 4h
      assert.equal(
        isCustomBreakReminderDue({
          continuousSeconds: 7199,
          customEnabled: true,
          customIntervalMinutes: 120,
          alreadySent: false,
        }),
        false
      );
      assert.equal(
        isCustomBreakReminderDue({
          continuousSeconds: 7200,
          customEnabled: true,
          customIntervalMinutes: 120,
          alreadySent: false,
        }),
        true
      );
      // Não dispara duas vezes nem após 4h
      assert.equal(
        isCustomBreakReminderDue({
          continuousSeconds: 7500,
          customEnabled: true,
          customIntervalMinutes: 120,
          alreadySent: true,
        }),
        false
      );

      // Conversão Manual (Horas + Minutos) e persistência do painel de configuração
      const manualTotal = hoursMinutesToMinutes(2, 15);
      assert.equal(manualTotal, 135);
      assert.equal(formatReminderIntervalLabel(manualTotal), '2h15');
      assert.deepEqual(minutesToHoursMinutes(135), { hours: 2, minutes: 15 });

      saveCustomBreakPrefs({
        enabled: true,
        minutes: 135,
        mode: 'manual',
        soundEnabled: false,
      });
      const loadedPrefs = loadCustomBreakPrefs();
      assert.equal(loadedPrefs.enabled, true);
      assert.equal(loadedPrefs.minutes, 135);
      assert.equal(loadedPrefs.mode, 'manual');
      assert.equal(loadedPrefs.soundEnabled, false);

      // Alerta visual no Cockpit aparece quando tempo manual (2h15 = 8100s) é atingido e some ao dispensar
      assert.equal(
        isCustomBreakVisualAlertActive({
          continuousSeconds: 8100,
          customEnabled: true,
          customIntervalMinutes: 135,
          dismissed: false,
        }),
        true
      );
      assert.equal(
        isCustomBreakVisualAlertActive({
          continuousSeconds: 8100,
          customEnabled: true,
          customIntervalMinutes: 135,
          dismissed: true,
        }),
        false
      );
    }),

    runTest('9. Produtividade, Clima na Rota e Piso ANTT', () => {
      const benchmark = getNationalBenchmarkForVehicle('Scania R540 6x4 Super', 6);
      assert.ok(benchmark.nationalAvgKmL > 0);

      const trip = createBaseTrip({ actualConsumptionKmL: 2.6 });
      const productivity = buildProductivityComparisonData({ trip, driverName: 'Marcos Vinícius' });
      assert.equal(productivity.driverAvgKmL, 2.6);
      assert.equal(productivity.comparisonBars.length, 3);

      const candidates = extractCitySearchCandidates('Porto de Santos - SP');
      assert.ok(candidates.some((c) => c.cityQuery === 'Santos' && c.stateAbbr === 'SP'));

      const fog = interpretWeatherForDriving({ weatherCode: 45, windSpeedKmh: 12, visibilityMeters: 200 });
      assert.equal(fog.conditionCategory, 'cerracao');
      assert.equal(fog.safetyLevel, 'alerta');

      const antt = calculateAnttMinimumFloor(1420, 6, 'granel_solido');
      assert.ok(antt.total > 10000);
    }),

    runTest('10. Mapa de Pedágios: destaca praças mais caras e calcula rota econômica', () => {
      const analysis = analyzeRouteTollHotspots({
        origin: 'Rondonópolis - MT',
        destination: 'Porto de Santos - SP',
        originCoords: { lat: -16.4674, lng: -54.6361 },
        destCoords: { lat: -23.9618, lng: -46.3322 },
        totalDistanceKm: 1480,
        totalTollCount: 14,
        totalTollCost: 940,
        highways: 'BR-163 ➔ BR-364 ➔ SP-310 ➔ SP-348 ➔ SP-160',
        axles: 6,
        tripType: 'somente_ida',
      });

      assert.ok(analysis.plazas.length >= 4);
      assert.ok(analysis.topHotspots.length >= 1);
      assert.equal(analysis.topHotspots[0].rank, 1);
      assert.equal(analysis.topHotspots[0].severity, 'critical');
      assert.ok(analysis.topHotspots[0].totalCost >= analysis.averagePlazaCost);
      assert.ok(analysis.economicalOption.tollSavings > 0);
      assert.ok(analysis.economicalOption.totalTollCost < 940);
      assert.ok(analysis.economicalOption.waypoints.length >= 2);

      // Transição numérica animada (ease-out cubic)
      assert.equal(interpolateAnimatedValue(0, 940, 0), 0);
      assert.equal(interpolateAnimatedValue(0, 940, 1), 940);
      const mid = interpolateAnimatedValue(0, 940, 0.5);
      assert.ok(mid > 470 && mid < 940);
      assert.equal(interpolateAnimatedValue(940, 680, 1.5), 680);
    }),
  ];

  let passed = 0;
  for (const t of tests) {
    await t.fn();
    passed += 1;
    console.log(`PASS: ${t.name}`);
  }
  console.log(`\n${passed}/${tests.length} testes concluídos com sucesso.`);
}

main().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
