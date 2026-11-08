import React, { useState, useEffect, useMemo } from 'react';
import { Trip, Expense, RouteCheckpoint, MaintenanceItem, User, isAdminRole, isUserAdmin, DriverDocumentReminder } from './types/cockpit';
import { PRESET_TRIPS, INITIAL_MAINTENANCE_ITEMS } from './data/mockRoutes';
import { INITIAL_USERS, getCurrentUserSession, saveCurrentUserSession, verifyUserByToken } from './data/mockUsers';
import { formatCurrency, formatKm, formatOdometer } from './utils/formatters';
import { playCockpitClick, playSuccessChime } from './utils/audio';
import { verifyActiveAdminSession } from './services/supabaseAuthService';
import {
  loadDriverDocuments,
  saveDriverDocuments,
  getCriticalDocumentAlerts,
  formatBrazilianDate,
} from './services/driverDocumentService';

// Components
import { HeaderCockpit } from './components/HeaderCockpit';
import { KpiCard } from './components/KpiCard';
import { ProfitMarginBar } from './components/ProfitMarginBar';
import { RouteCheckpoints } from './components/RouteCheckpoints';
import { QuickFuelModal } from './components/QuickFuelModal';
import { ExpenseModal } from './components/ExpenseModal';
import { EditExpenseModal } from './components/EditExpenseModal';
import { EditTripModal } from './components/EditTripModal';
import { AuthModal } from './components/AuthModal';
import { FreightCalculatorModal } from './components/FreightCalculatorModal';
import { DriverShiftTimer } from './components/DriverShiftTimer';
import { MaintenanceDashboard } from './components/MaintenanceDashboard';
import { TripReportModal } from './components/TripReportModal';
import { NewTripModal } from './components/NewTripModal';
import { GpsLocationModal } from './components/GpsLocationModal';
import { GoogleMapsRouteModal } from './components/GoogleMapsRouteModal';
import { ExpenseDashboard } from './components/ExpenseDashboard';
import { BackupDataModal } from './components/BackupDataModal';
import { SupabaseModal } from './components/SupabaseModal';
import { AnnualProfitReportModal } from './components/AnnualProfitReportModal';
import { ResetDataModal } from './components/ResetDataModal';
import { VehicleSettingsModal } from './components/VehicleSettingsModal';
import { setupBackgroundMaintenanceWatcher } from './services/maintenanceNotificationService';

// Icons
import {
  Fuel,
  Receipt,
  Truck,
  Gauge,
  Wallet,
  TrendingUp,
  MapPin,
  Clock,
  Plus,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Calculator,
  FileSpreadsheet,
  Trash2,
  Edit,
  Edit3,
  Search,
  Satellite,
  Compass,
  Navigation,
  ExternalLink,
  HardDrive,
  Database,
  CheckCircle2,
  X,
  BarChart3,
  RotateCcw,
} from 'lucide-react';

export default function App() {
  // User Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return getCurrentUserSession() || INITIAL_USERS[0];
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isAdmin = isUserAdmin(currentUser);

  // Revalida a sessão de administrador com o banco Supabase na inicialização
  useEffect(() => {
    verifyActiveAdminSession(currentUser).then((verified) => {
      if (verified && (verified.isSupabaseVerifiedAdmin !== currentUser?.isSupabaseVerifiedAdmin || verified.role !== currentUser?.role)) {
        setCurrentUser(verified);
      }
    });
  }, []);

  // LocalStorage state initialization
  const [activeTrip, setActiveTrip] = useState<Trip>(() => {
    try {
      const saved = localStorage.getItem('cabine_active_trip');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return PRESET_TRIPS[0];
  });

  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>(() => {
    try {
      const saved = localStorage.getItem('cabine_maintenance');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_MAINTENANCE_ITEMS;
  });

  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cabine_night_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Active view tab in cockpit
  const [activeTab, setActiveTab] = useState<'cockpit' | 'jornada' | 'despesas' | 'manutencao'>('cockpit');

  // Modals state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [isMapsModalOpen, setIsMapsModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAnnualReportOpen, setIsAnnualReportOpen] = useState(false);
  const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [emailVerificationNotice, setEmailVerificationNotice] = useState<string | null>(null);

  // Driver Documentation Reminders state (CNH, EAR, Exames Toxicológicos)
  const [driverDocuments, setDriverDocuments] = useState<DriverDocumentReminder[]>(() => {
    return loadDriverDocuments();
  });
  const [maintenanceInitialSubTab, setMaintenanceInitialSubTab] = useState<
    'alertas' | 'documentos' | 'todos' | 'pneus' | 'oficina'
  >('alertas');

  // Check URL parameters for email verification link
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const verifyToken = urlParams.get('verify_token');
      if (verifyToken) {
        const result = verifyUserByToken(verifyToken);
        if (result.success && result.user) {
          setCurrentUser(result.user);
          saveCurrentUserSession(result.user);
          playSuccessChime();
          setEmailVerificationNotice(result.message);
          // Clean token from URL without full reload
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          setTimeout(() => setEmailVerificationNotice(null), 8000);
        }
      }
      if (window.location.hash === '#manutencao') {
        setActiveTab('manutencao');
      }
    } catch {
      // Ignore
    }
  }, []);

  // Google Maps Quota Defense state
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // Filter & Search for expenses list
  const [expenseFilter, setExpenseFilter] = useState<string>('todos');
  const [expenseSearch, setExpenseSearch] = useState<string>('');

  // Listen to Google Maps quota exceeded event
  useEffect(() => {
    const handleQuotaExceeded = () => {
      setGmpQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem('cabine_active_trip', JSON.stringify(activeTrip));
    } catch {
      // Ignore
    }
  }, [activeTrip]);

  useEffect(() => {
    try {
      localStorage.setItem('cabine_maintenance', JSON.stringify(maintenanceItems));
    } catch {
      // Ignore
    }
  }, [maintenanceItems]);

  useEffect(() => {
    try {
      localStorage.setItem('cabine_night_mode', isNightMode ? 'true' : 'false');
    } catch {
      // Ignore
    }
  }, [isNightMode]);

  useEffect(() => {
    try {
      saveDriverDocuments(driverDocuments);
    } catch {
      // Ignore
    }
  }, [driverDocuments]);

  // Web API Background & Locked-Screen Maintenance Notification Watcher
  useEffect(() => {
    const cleanup = setupBackgroundMaintenanceWatcher({
      getOdometer: () => activeTrip.currentOdometerKm,
      getMaintenanceItems: () => maintenanceItems,
      getTruckInfo: () => ({
        plate: activeTrip.vehiclePlate || 'BRA-2026',
        model: activeTrip.vehicleModel || 'Scania R540 Super',
      }),
      onNavigateToMaintenance: () => {
        playSuccessChime();
        setActiveTab('manutencao');
      },
    });

    return cleanup;
  }, [activeTrip.currentOdometerKm, activeTrip.vehiclePlate, activeTrip.vehicleModel, maintenanceItems]);

  // Derived financial metrics
  const dieselExpenses = activeTrip.expenses.filter((e) => e.category === 'combustivel' || e.category === 'arla');
  const dieselTotal = dieselExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLitersFuel = dieselExpenses.reduce((sum, e) => sum + (e.liters || 0), 0);

  const tollExpenses = activeTrip.expenses.filter((e) => e.category === 'pedagio');
  const tollTotal = tollExpenses.reduce((sum, e) => sum + e.amount, 0);

  const otherExpenses = activeTrip.expenses.filter(
    (e) => e.category !== 'combustivel' && e.category !== 'arla' && e.category !== 'pedagio'
  );
  const otherExpensesTotal = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalDirectExpenses = activeTrip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const estimatedWearCost = activeTrip.completedDistanceKm * 0.85; // Provisão pneus e depreciação
  const netPocketProfit = activeTrip.grossFreight - totalDirectExpenses;
  const netRealProfit = activeTrip.grossFreight - (totalDirectExpenses + estimatedWearCost);

  const costPerKm = activeTrip.completedDistanceKm > 0 ? totalDirectExpenses / activeTrip.completedDistanceKm : 0;
  const profitPerKm = activeTrip.completedDistanceKm > 0 ? netPocketProfit / activeTrip.completedDistanceKm : 0;

  // Count maintenance items that are overdue or nearing threshold (<= 3000 km)
  const maintenanceAlertCount = maintenanceItems.filter(
    (m) => m.nextDueKm - activeTrip.currentOdometerKm <= 3000
  ).length;

  // Critical driver documentation alerts (CNH, EAR, Exames Toxicológicos)
  const criticalDocAlerts = useMemo(() => {
    return getCriticalDocumentAlerts(driverDocuments);
  }, [driverDocuments]);

  // Authentication Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.truckModel && user.truckPlate) {
      setActiveTrip((prev) => ({
        ...prev,
        vehicleModel: user.truckModel,
        vehiclePlate: user.truckPlate,
      }));
    }
  };

  const handleLogout = () => {
    playCockpitClick();
    saveCurrentUserSession(null);
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  // Fuel Refuel (Create)
  const handleRecordFuel = (fuelExpense: Expense, newOdometer?: number) => {
    const updatedExpenses = [fuelExpense, ...activeTrip.expenses];
    const newOdo = newOdometer || activeTrip.currentOdometerKm;
    const addedKm = newOdometer ? Math.max(0, newOdometer - activeTrip.currentOdometerKm) : 0;
    const updatedCompletedKm = Math.min(activeTrip.totalDistanceKm, activeTrip.completedDistanceKm + addedKm);

    let calculatedAvg = activeTrip.actualConsumptionKmL;
    if (addedKm > 0 && fuelExpense.liters && fuelExpense.liters > 0) {
      calculatedAvg = Math.round((addedKm / fuelExpense.liters) * 100) / 100;
    }

    setActiveTrip({
      ...activeTrip,
      expenses: updatedExpenses,
      currentOdometerKm: newOdo,
      completedDistanceKm: updatedCompletedKm,
      actualConsumptionKmL: calculatedAvg > 0 ? calculatedAvg : activeTrip.actualConsumptionKmL,
    });
  };

  // General Expense (Create)
  const handleAddExpense = (expense: Expense) => {
    setActiveTrip({
      ...activeTrip,
      expenses: [expense, ...activeTrip.expenses],
    });
  };

  // Expense (Update)
  const handleUpdateExpense = (updatedExpense: Expense) => {
    setActiveTrip({
      ...activeTrip,
      expenses: activeTrip.expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)),
    });
  };

  // Expense (Delete)
  const handleDeleteExpense = (id: string) => {
    playCockpitClick();
    setActiveTrip({
      ...activeTrip,
      expenses: activeTrip.expenses.filter((e) => e.id !== id),
    });
  };

  // Trip (Update)
  const handleSaveTrip = (updated: Trip) => {
    setActiveTrip(updated);
  };

  const handleFinishTrip = () => {
    setActiveTrip({
      ...activeTrip,
      isCompleted: true,
      completedDistanceKm: activeTrip.totalDistanceKm,
    });
    setIsReportOpen(true);
  };

  // Checkpoints update (CRUD handled in component)
  const handleUpdateCheckpoints = (updated: RouteCheckpoint[]) => {
    setActiveTrip({
      ...activeTrip,
      checkpoints: updated,
    });
  };

  const handleAddCheckpoint = (newCp: RouteCheckpoint) => {
    setActiveTrip({
      ...activeTrip,
      checkpoints: [...activeTrip.checkpoints, newCp],
    });
  };

  // Switch or Create Trip
  const handleSelectTrip = (trip: Trip) => {
    setActiveTrip(trip);
  };

  const handleCreateCustomTrip = (trip: Trip) => {
    setActiveTrip(trip);
  };

  // Apply route calculated automatically via Google Maps engine
  const handleApplyRouteFromMaps = (result: {
    origin: string;
    destination: string;
    distanceKm: number;
    tollCount: number;
    totalTollCost: number;
    highways: string;
  }) => {
    // Generate fresh checkpoints along the corridor
    const newCheckpoints: RouteCheckpoint[] = [
      {
        id: `cp-start-${Date.now()}`,
        name: `Origem: ${result.origin}`,
        highway: result.highways.split('➔')[0]?.trim() || 'Rodovia',
        city: result.origin.split('-')[0].trim(),
        state: result.origin.split('-')[1]?.trim() || 'BR',
        status: 'completed',
        type: 'partida',
        actualArrival: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: `cp-toll-1-${Date.now()}`,
        name: `Praça de Pedágio 1 (${result.highways.split('➔')[0]?.trim() || 'Rodovia'})`,
        highway: result.highways.split('➔')[0]?.trim() || 'Rodovia',
        city: 'Trecho Rodoviário',
        state: 'BR',
        status: 'active',
        type: 'pedagio',
        tollFee: Math.round(result.totalTollCost / Math.max(1, result.tollCount)),
        tollTagDetected: true,
      },
      {
        id: `cp-dest-${Date.now()}`,
        name: `Destino: ${result.destination}`,
        highway: 'Destino Final',
        city: result.destination.split('-')[0].trim(),
        state: result.destination.split('-')[1]?.trim() || 'BR',
        status: 'upcoming',
        type: 'descarga',
      },
    ];

    setActiveTrip({
      ...activeTrip,
      origin: result.origin,
      destination: result.destination,
      totalDistanceKm: result.distanceKm,
      completedDistanceKm: 0,
      estimatedTollCost: result.totalTollCost,
      routeHighlights: result.highways,
      checkpoints: newCheckpoints,
    });
  };

  // Quick launch Google Maps navigation
  const handleQuickLaunchGoogleMaps = () => {
    playCockpitClick();
    const encodedOrigin = encodeURIComponent(activeTrip.origin.trim() + ', Brasil');
    const encodedDest = encodeURIComponent(activeTrip.destination.trim() + ', Brasil');
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDest}&travelmode=driving`;
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  // Filtered expenses
  const filteredExpenses = activeTrip.expenses.filter((e) => {
    const matchesCategory =
      expenseFilter === 'todos'
        ? true
        : expenseFilter === 'combustivel'
        ? e.category === 'combustivel' || e.category === 'arla'
        : expenseFilter === 'outros'
        ? e.category === 'outros' || e.category === 'estacionamento' || e.category === 'chapa_descarga'
        : e.category === expenseFilter;

    const matchesSearch =
      !expenseSearch.trim() ||
      e.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      (e.location && e.location.toLowerCase().includes(expenseSearch.toLowerCase())) ||
      (e.invoiceNumber && e.invoiceNumber.toLowerCase().includes(expenseSearch.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isNightMode ? 'bg-[#040e1f] text-[#c6c6cd] brightness-90' : 'bg-[#081425] text-[#d8e3fb]'
      }`}
    >
      {/* Mandatory Client-Side Quota Defense Banner (Google Maps Platform) */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Email Verification Success Banner */}
      {emailVerificationNotice && (
        <div className="bg-[#064e3b] border-b border-[#10b981] text-[#a7f3d0] px-4 py-3 text-xs md:text-sm font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#34d399] shrink-0" />
            <span>{emailVerificationNotice}</span>
          </div>
          <button
            onClick={() => setEmailVerificationNotice(null)}
            className="p-1 rounded-md text-[#a7f3d0] hover:text-white hover:bg-emerald-800/40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cockpit Top Header */}
      <HeaderCockpit
        trip={activeTrip}
        currentUser={currentUser}
        isNightMode={isNightMode}
        onToggleNightMode={() => setIsNightMode(!isNightMode)}
        onOpenTripModal={() => setIsTripModalOpen(true)}
        onOpenEditTripModal={() => setIsEditTripOpen(true)}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenGpsModal={() => setIsGpsModalOpen(true)}
        onOpenMapsModal={() => setIsMapsModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenAnnualReport={() => setIsAnnualReportOpen(true)}
        onOpenVehicleSettings={() => setIsVehicleModalOpen(true)}
        onOpenResetData={() => setIsResetDataModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4 sm:space-y-5 pb-28">
        {/* Active Route Hero Banner */}
        <section className="bg-gradient-to-r from-[#0f172a] via-[#152031] to-[#1e293b] border border-[#334155] rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-amber-500/10 to-transparent pointer-events-none" />

          {/* Tier 1: Status & Context Header */}
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#334155]/50">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                    activeTrip.isCompleted
                      ? 'bg-[#003824] text-[#10b981] border border-[#10b981]/40'
                      : 'bg-[#472a00] text-[#ffb95f] border border-[#f59e0b]/40'
                  }`}
                >
                  {activeTrip.isCompleted ? 'Viagem Concluída' : 'Viagem em Andamento'}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setIsGpsModalOpen(true);
                  }}
                  className="text-xs text-[#4edea3] hover:text-[#6ffbbe] font-mono flex items-center gap-1.5 bg-[#081425] px-2.5 py-1 rounded-md border border-[#009365]/30 cursor-pointer transition-colors"
                  title="Ver sinal GPS em tempo real"
                >
                  <Satellite className="w-3.5 h-3.5 text-[#10b981] animate-pulse" />
                  <span>GPS do Aparelho Ativo</span>
                </button>

                {currentUser && (
                  <span className="text-[11px] text-[#bec6e0] font-semibold bg-[#081425] px-2.5 py-1 rounded-md border border-[#334155]">
                    Condutor: <strong className="text-[#ffb95f]">{currentUser.name}</strong>
                  </span>
                )}

                {/* Alerta de Documentação do Condutor no crachá */}
                {criticalDocAlerts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setMaintenanceInitialSubTab('documentos');
                      setActiveTab('manutencao');
                    }}
                    className="text-[11px] font-black px-2.5 py-1 rounded-md bg-[#450a0a] hover:bg-[#690005] border border-[#ef4444] text-[#fca5a5] flex items-center gap-1.5 cursor-pointer animate-pulse transition-all shadow-sm"
                    title="Atenção: Exame toxicológico ou CNH com vencimento pendente"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#ef4444]" />
                    <span>Doc. Pendente ({criticalDocAlerts.length})</span>
                  </button>
                )}
              </div>

              {/* Truck Chip / Alterar Caminhão */}
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setIsVehicleModalOpen(true);
                }}
                className="text-xs text-[#ffb95f] hover:text-white bg-[#081425] hover:bg-[#1e293b] px-3 py-1.5 rounded-md border border-[#f59e0b]/40 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
                title="Clique para alterar modelo do caminhão, placa ou eixos"
              >
                <Truck className="w-3.5 h-3.5 text-[#f59e0b]" />
                <span className="font-extrabold">{activeTrip.vehicleModel || 'Veículo'}</span>
                <span className="text-[11px] text-[#94a3b8] font-mono">({activeTrip.vehiclePlate || 'S/ Placa'})</span>
                <span className="text-[10px] bg-[#f59e0b]/20 text-[#ffb95f] px-1.5 py-0.5 rounded font-bold">
                  {activeTrip.axles || 2} Eixos
                </span>
                <Edit className="w-3 h-3 text-[#94a3b8]" />
              </button>
            </div>

            {/* Tier 2: Route Display Board (Full Width Isolated Box) */}
            <div className="w-full bg-[#081425]/80 border border-[#334155]/80 rounded-xl p-3.5 sm:p-4 shadow-inner">
              {!activeTrip.origin || !activeTrip.destination || activeTrip.totalDistanceKm === 0 ? (
                /* Unconfigured Route Notice */
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-base sm:text-xl font-black">
                      <span className="text-[#94a3b8] flex items-center gap-1.5 whitespace-nowrap">
                        <MapPin className="w-4 h-4 text-[#f59e0b]" />
                        {activeTrip.origin || 'Origem a definir'}
                      </span>
                      <ChevronRight className="w-5 h-5 text-[#f59e0b] shrink-0" />
                      <span className="text-[#ffb95f] whitespace-nowrap">
                        {activeTrip.destination || 'Destino a definir'}
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8]">
                      Nenhuma rota configurada ou quilometragem zerada. Clique no botão ao lado para preencher origem, destino e calcular o KM e pedágios automaticamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setIsEditTripOpen(true);
                    }}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#081425] text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 shrink-0 transition-transform active:scale-95"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Configurar Rota & KM</span>
                  </button>
                </div>
              ) : (
                /* Configured Active Route */
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-lg sm:text-2xl lg:text-3xl font-black text-white whitespace-nowrap flex items-center gap-2">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-[#10b981] shrink-0" />
                      {activeTrip.origin}
                    </span>
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#f59e0b] shrink-0" />
                    <span className="text-lg sm:text-2xl lg:text-3xl font-black text-[#ffb95f] whitespace-nowrap flex items-center gap-2">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-[#f59e0b] shrink-0" />
                      {activeTrip.destination}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#bec6e0] pt-1">
                    <span className="font-semibold text-[#d8e3fb]">
                      {activeTrip.routeHighlights || 'Rota rodoviária'}
                    </span>
                    <span className="text-[#64748b]">•</span>
                    <span className="font-bold text-[#4edea3]">
                      {activeTrip.cargo || 'Carga geral'} ({activeTrip.cargoWeightTon} Toneladas)
                    </span>
                    <span className="text-[#64748b]">•</span>
                    <span className="text-[#94a3b8] font-mono">
                      Frete Bruto: <strong className="text-[#4edea3]">{formatCurrency(activeTrip.grossFreight)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tier 3: Action Toolbars */}
            <div className="space-y-3 pt-1">
              {/* Row 3A: Driver & Operational Route Tools */}
              <div>
                <p className="text-[10px] font-extrabold text-[#94a3b8] uppercase tracking-wider mb-1.5">
                  Operação da Viagem & Navegação
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQuickLaunchGoogleMaps}
                    className="h-10 px-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-95"
                    title="Abrir rota diretamente no aplicativo Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Navegar no Maps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setIsMapsModalOpen(true);
                    }}
                    className="h-10 px-3.5 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#2563eb]/50 text-xs font-bold text-[#60a5fa] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    title="Calcular distância e praças de pedágio"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Roteirizador & Pedágios</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setIsEditTripOpen(true);
                    }}
                    className="h-10 px-3.5 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#ffb95f]/50 text-xs font-bold text-[#ffb95f] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    title="Editar dados da viagem, frete e quilometragem"
                  >
                    <Edit className="w-4 h-4" />
                    <span>{isAdmin ? 'Editar Parâmetros' : 'Editar Dados da Rota'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setIsVehicleModalOpen(true);
                    }}
                    className="h-10 px-3.5 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#f59e0b]/60 text-xs font-bold text-[#ffb95f] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
                    title="Alterar modelo do caminhão, placa ou eixos"
                  >
                    <Truck className="w-4 h-4 text-[#f59e0b]" />
                    <span>Alterar Caminhão</span>
                  </button>
                </div>
              </div>

              {/* Row 3B: Management & Fleet Admin Tools (Exclusive to Admins) */}
              {isAdmin && (
                <div className="pt-2 border-t border-[#334155]/50">
                  <p className="text-[10px] font-extrabold text-[#fca5a5] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#ef4444]" />
                    Painel do Administrador
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setIsResetDataModalOpen(true);
                      }}
                      className="h-9 px-3 rounded-lg bg-[#450a0a] hover:bg-[#7f1d1d] border border-[#ef4444]/60 text-xs font-bold text-[#fca5a5] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-red-950/40"
                      title="Zerar todos os lançamentos para começar do zero (Função Exclusiva de Administração)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#ef4444]" />
                      <span>Zerar Dados</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setIsBackupModalOpen(true);
                      }}
                      className="h-9 px-3 rounded-lg bg-[#081425] hover:bg-[#152031] border border-[#38bdf8]/50 text-xs font-bold text-[#38bdf8] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="Backup Local JSON: Exportar ou Importar Viagens e Despesas (Administração)"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Backup JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setIsSupabaseModalOpen(true);
                      }}
                      className="h-9 px-3 rounded-lg bg-[#032e22] hover:bg-[#064e3b] border border-[#10b981]/50 text-xs font-bold text-[#34d399] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-900/30"
                      title="Integração Supabase: Banco de Dados na Nuvem, Sincronização e Migrations SQL (Administração)"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Supabase Nuvem</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setIsAnnualReportOpen(true);
                      }}
                      className="h-9 px-3 rounded-lg bg-[#003824] hover:bg-[#004d32] border border-[#10b981]/60 text-xs font-bold text-[#4edea3] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-950/40"
                      title="Relatório Anual de Lucro: Gráfico de Barras Recharts com dados de viagens finalizadas do Supabase (Administração)"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#10b981]" />
                      <span>Lucro Mensal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tier 4: Progress Distance Bar */}
            <div className="mt-3 pt-3 border-t border-[#334155]/60">
              <div className="flex flex-wrap items-center justify-between text-xs mb-1.5 gap-2">
                <span className="font-mono font-bold text-[#bec6e0] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#f59e0b]" />
                  {formatKm(activeTrip.completedDistanceKm)} rodados
                </span>
                <span className="text-[#94a3b8] font-mono text-[11px] sm:text-xs">
                  {activeTrip.totalDistanceKm > 0
                    ? `Faltam ${formatKm(Math.max(0, activeTrip.totalDistanceKm - activeTrip.completedDistanceKm))} (Total ${formatKm(activeTrip.totalDistanceKm)})`
                    : 'Quilometragem total a definir (0 km)'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#081425] rounded-full overflow-hidden border border-[#334155]">
                <div
                  style={{
                    width: `${
                      activeTrip.totalDistanceKm > 0
                        ? Math.min(100, Math.max(0, (activeTrip.completedDistanceKm / activeTrip.totalDistanceKm) * 100))
                        : 0
                    }%`,
                  }}
                  className="h-full bg-gradient-to-r from-[#f59e0b] to-[#10b981] transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </section>

        {/* KPI Cards Grid - Strict to Design Token Specifications */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            label="Frete Líquido no Bolso"
            value={formatCurrency(netPocketProfit)}
            variant="profit"
            icon={Wallet}
            badge="Líquido"
            subValue={`Bruto: ${formatCurrency(activeTrip.grossFreight)}`}
            onClick={() => setIsReportOpen(true)}
          />

          <KpiCard
            label="Custo por KM Rodado"
            value={`R$ ${costPerKm.toFixed(2)}`}
            unit="/km"
            variant="expense"
            icon={TrendingUp}
            badge="Diesel+Pedágio"
            subValue={`Total Despesas: ${formatCurrency(totalDirectExpenses)}`}
            onClick={() => setActiveTab('despesas')}
          />

          <KpiCard
            label="Lucro por KM Rodado"
            value={`R$ ${profitPerKm.toFixed(2)}`}
            unit="/km"
            variant="profit"
            icon={ShieldCheck}
            badge="Margem"
            subValue={`${activeTrip.completedDistanceKm} km aferidos`}
            onClick={() => setIsCalculatorOpen(true)}
          />

          <KpiCard
            label="Média de Consumo"
            value={activeTrip.actualConsumptionKmL.toFixed(2)}
            unit="km/L"
            variant="neutral"
            icon={Gauge}
            badge={`${totalLitersFuel}L Abastecidos`}
            subValue={`Meta: ${activeTrip.targetConsumptionKmL} km/L`}
            onClick={() => setIsFuelModalOpen(true)}
          />
        </section>

        {/* Specialized Road Component: Medidor de Margem de Lucro Segmentada */}
        <section>
          <ProfitMarginBar
            grossFreight={activeTrip.grossFreight}
            dieselTotal={dieselTotal}
            tollTotal={tollTotal}
            otherExpensesTotal={otherExpensesTotal}
            estimatedMaintenance={estimatedWearCost}
            netProfit={netRealProfit}
          />
        </section>

        {/* Visual Alert: Lembretes de Vencimento de Documentação do Condutor no Painel Principal */}
        {criticalDocAlerts.length > 0 && (
          <section className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#450a0a] via-[#3a2000] to-[#1e1b4b] border-2 border-[#f59e0b] shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b] text-[#ffb95f] shrink-0">
                <ShieldAlert className="w-6 h-6 text-[#ffb95f] animate-bounce" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-[#ffb95f] uppercase tracking-wide">
                    ⚠️ Alerta de Documentação: {criticalDocAlerts.length} {criticalDocAlerts.length === 1 ? 'item requer' : 'itens requerem'} atenção
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#ef4444] text-white">
                    Fiscalização PRF & DETRAN
                  </span>
                </div>
                <p className="text-xs text-[#fed7aa] leading-relaxed">
                  {criticalDocAlerts
                    .map(
                      (a) =>
                        `${a.doc.title}: ${
                          a.daysRemaining < 0
                            ? `VENCIDO há ${Math.abs(a.daysRemaining)} dias`
                            : `vence em ${a.daysRemaining} dias (${formatBrazilianDate(a.doc.dueDate)})`
                        }`
                    )
                    .join(' • ')}
                </p>
                <p className="text-[11px] text-[#fca5a5]/90 font-medium">
                  Art. 148-A do CTB: Dirigir com toxicológico ou CNH vencida acarreta multa gravíssima de R$ 1.467,35 (5x) e retenção.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playCockpitClick();
                setMaintenanceInitialSubTab('documentos');
                setActiveTab('manutencao');
              }}
              className="h-10 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 shrink-0 transition-all active:scale-95"
            >
              <span>Ver Documentos & Regularizar</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </section>
        )}

        {/* Cockpit Navigation Tabs */}
        <nav className="flex items-center gap-1.5 p-1 bg-[#152031] rounded-xl border border-[#334155] overflow-x-auto">
          <button
            onClick={() => {
              playCockpitClick();
              setActiveTab('cockpit');
            }}
            className={`flex-1 min-w-[120px] h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'cockpit'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/50 shadow-sm font-extrabold'
                : 'text-[#94a3b8] hover:text-[#d8e3fb] hover:bg-[#1e293b]/50'
            }`}
          >
            <Truck className="w-4 h-4" />
            Roteiro & Paradas
          </button>

          <button
            onClick={() => {
              playCockpitClick();
              setActiveTab('jornada');
            }}
            className={`flex-1 min-w-[120px] h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'jornada'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/50 shadow-sm font-extrabold'
                : 'text-[#94a3b8] hover:text-[#d8e3fb] hover:bg-[#1e293b]/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Tacógrafo & Jornada
          </button>

          <button
            onClick={() => {
              playCockpitClick();
              setActiveTab('despesas');
            }}
            className={`flex-1 min-w-[120px] h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'despesas'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/50 shadow-sm font-extrabold'
                : 'text-[#94a3b8] hover:text-[#d8e3fb] hover:bg-[#1e293b]/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Despesas ({activeTrip.expenses.length})
          </button>

          <button
            onClick={() => {
              playCockpitClick();
              setActiveTab('manutencao');
            }}
            className={`flex-1 min-w-[140px] h-11 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'manutencao'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/50 shadow-sm font-extrabold'
                : 'text-[#94a3b8] hover:text-[#d8e3fb] hover:bg-[#1e293b]/50'
            }`}
          >
            <Gauge className="w-4 h-4" />
            <span>Pneus & Oficina</span>
            {maintenanceAlertCount > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-[#ea580c] text-white animate-pulse" title="Alertas Mecânicos de Odômetro">
                {maintenanceAlertCount} mec
              </span>
            )}
            {criticalDocAlerts.length > 0 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-[#ef4444] text-white animate-pulse" title="Lembretes de CNH, EAR ou Toxicológico">
                {criticalDocAlerts.length} doc
              </span>
            )}
          </button>
        </nav>

        {/* Tab 1: Cockpit - Checkpoints and Timeline */}
        {activeTab === 'cockpit' && (
          <div className="space-y-4">
            <RouteCheckpoints
              checkpoints={activeTrip.checkpoints}
              onUpdateCheckpoint={handleUpdateCheckpoints}
              onAddCheckpoint={handleAddCheckpoint}
            />

            {/* Quick Summary of Recent Expenses */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#f59e0b]" />
                  Últimos Gastos Lançados na Rota
                </h3>
                <button
                  onClick={() => setActiveTab('despesas')}
                  className="text-xs text-[#ffb95f] font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  Ver todos ({activeTrip.expenses.length}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-[#334155]/60">
                {activeTrip.expenses.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#94a3b8] flex flex-col items-center justify-center gap-2">
                    <Receipt className="w-8 h-8 text-[#475569] stroke-1" />
                    <span>Nenhum gasto lançado nesta viagem até o momento.</span>
                    <button
                      onClick={() => {
                        playCockpitClick();
                        setIsExpenseModalOpen(true);
                      }}
                      className="mt-1 px-3 py-1.5 bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                    >
                      Lançar Primeiro Gasto
                    </button>
                  </div>
                ) : (
                  activeTrip.expenses.slice(0, 3).map((exp) => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#d8e3fb]">{exp.description}</div>
                        <div className="text-[11px] text-[#94a3b8]">
                          {exp.date} às {exp.time} • {exp.paymentMethod}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-extrabold text-sm text-[#f59e0b]">
                          {formatCurrency(exp.amount)}
                        </span>
                        <button
                          onClick={() => {
                            playCockpitClick();
                            setEditingExpense(exp);
                          }}
                          className="p-1 rounded bg-[#243248] hover:bg-[#334155] text-[#bec6e0] hover:text-[#ffb95f] transition-colors cursor-pointer"
                          title="Editar Gasto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tacógrafo & Jornada do Motorista */}
        {activeTab === 'jornada' && (
          <div>
            <DriverShiftTimer />
          </div>
        )}

        {/* Tab 3: Detailed Expenses Manager (Full CRUD) */}
        {activeTab === 'despesas' && (
          <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden">
            {/* Recharts Analytics Dashboard */}
            <ExpenseDashboard
              trip={activeTrip}
              selectedCategory={expenseFilter}
              onSelectCategory={(cat) => {
                playCockpitClick();
                setExpenseFilter(cat);
              }}
            />

            {/* Header with Filters & Search */}
            <div className="p-4 md:p-5 bg-[#152031] border-b border-[#334155] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#f59e0b]" />
                    Extrato Detalhado de Despesas da Viagem
                  </h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Total acumulado: {formatCurrency(totalDirectExpenses)} ({activeTrip.expenses.length} lançamentos)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playCockpitClick();
                      setIsBackupModalOpen(true);
                    }}
                    className="h-10 px-3 bg-[#081425] hover:bg-[#243248] border border-[#38bdf8]/40 text-[#38bdf8] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    title="Exportar ou Importar Despesas em arquivo JSON"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Backup JSON</span>
                  </button>

                  <button
                    onClick={() => {
                      playCockpitClick();
                      setIsExpenseModalOpen(true);
                    }}
                    className="h-10 px-3 bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Novo Gasto</span>
                  </button>
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Buscar por descrição, local ou NF..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="w-full h-9 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-lg pl-8 pr-3 text-xs text-[#d8e3fb] outline-hidden"
                  />
                  <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-3" />
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {['todos', 'combustivel', 'pedagio', 'alimentacao', 'pneu_borracharia', 'manutencao', 'outros'].map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        playCockpitClick();
                        setExpenseFilter(f);
                      }}
                      className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer capitalize ${
                        expenseFilter === f
                          ? 'bg-[#243248] text-[#ffb95f] border-[#f59e0b]'
                          : 'bg-[#0f172a] text-[#94a3b8] border-[#334155]'
                      }`}
                    >
                      {f === 'pneu_borracharia' ? 'Pneus' : f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List */}
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94a3b8]">
                Nenhuma despesa encontrada para esta busca ou filtro.
              </div>
            ) : (
              <div className="divide-y divide-[#334155]">
                {filteredExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[#152031]/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#0f172a] text-[#bec6e0] border border-[#334155]">
                          {exp.category}
                        </span>
                        <h4 className="text-sm font-bold text-[#d8e3fb] truncate">
                          {exp.description}
                        </h4>
                      </div>

                      <div className="text-xs text-[#94a3b8] mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>{exp.date} às {exp.time}</span>
                        {exp.location && <span>• {exp.location}</span>}
                        {exp.paymentMethod && <span>• {exp.paymentMethod}</span>}
                        {exp.invoiceNumber && <span>• Cupom: {exp.invoiceNumber}</span>}
                        {exp.liters && <span className="text-[#ffb95f]">({exp.liters}L)</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="font-mono text-base font-extrabold text-[#f59e0b]">
                        {formatCurrency(exp.amount)}
                      </div>

                      <button
                        onClick={() => {
                          playCockpitClick();
                          setEditingExpense(exp);
                        }}
                        title="Editar Despesa (CRUD)"
                        className="w-8 h-8 rounded-lg bg-[#243248] hover:bg-[#334155] text-[#bec6e0] hover:text-[#ffb95f] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        title="Excluir Despesa (CRUD)"
                        className="w-8 h-8 rounded-lg bg-[#243248] hover:bg-[#690005] hover:text-[#ffb4ab] text-[#94a3b8] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Fleet & Maintenance */}
        {activeTab === 'manutencao' && (
          <div>
            <MaintenanceDashboard
              currentOdometer={activeTrip.currentOdometerKm}
              maintenanceItems={maintenanceItems}
              onUpdateMaintenance={(items) => setMaintenanceItems(items)}
              onUpdateOdometer={(newOdo) => {
                setActiveTrip({
                  ...activeTrip,
                  currentOdometerKm: newOdo,
                });
              }}
              onAddExpense={(exp) =>
                handleAddExpense({
                  ...exp,
                  id: `exp-maint-${Date.now()}`,
                })
              }
              vehicleModel={activeTrip.vehicleModel}
              vehiclePlate={activeTrip.vehiclePlate}
              currentUser={currentUser}
              driverDocuments={driverDocuments}
              onUpdateDriverDocuments={(docs) => setDriverDocuments(docs)}
              initialSubTab={maintenanceInitialSubTab}
            />
          </div>
        )}
      </main>

      {/* DOCKED BOTTOM THUMB-ZONE NAVIGATION & RAPID ACTION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#081425]/95 backdrop-blur-md border-t border-[#334155] p-3 sm:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
          {/* Primary Operational Action: Abastecimento de Bomba (Giant 56px Button) */}
          <button
            onClick={() => {
              playCockpitClick();
              setIsFuelModalOpen(true);
            }}
            className="flex-1 h-14 min-h-[56px] rounded-xl bg-[#f59e0b] hover:bg-[#d97706] active:bg-[#b45309] text-[#0f172a] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Fuel className="w-6 h-6 stroke-[2.5]" />
            <span>Abastecer Agora</span>
          </button>

          {/* Secondary Operational Action: Lançar Despesa (56px) */}
          <button
            onClick={() => {
              playCockpitClick();
              setIsExpenseModalOpen(true);
            }}
            className="flex-1 h-14 min-h-[56px] rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#475569] text-[#f8fafc] font-bold text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Receipt className="w-5 h-5 text-[#ffb95f]" />
            <span>Lançar Gasto</span>
          </button>

          {/* Google Maps Route Button (56px) */}
          <button
            onClick={() => {
              playCockpitClick();
              setIsMapsModalOpen(true);
            }}
            className="h-14 min-h-[56px] px-4 rounded-xl bg-[#1e3a8a] hover:bg-[#1d4ed8] border border-[#3b82f6]/50 text-[#93c5fd] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
            title="Google Maps & Cálculo de Pedágios"
          >
            <Compass className="w-5 h-5 text-[#60a5fa]" />
            <span className="hidden sm:inline">Google Maps</span>
          </button>

          {/* Tertiary Action: Simulador ANTT (56px icon/text) */}
          <button
            onClick={() => {
              playCockpitClick();
              setIsCalculatorOpen(true);
            }}
            className="h-14 min-h-[56px] px-4 rounded-xl bg-[#003824] hover:bg-[#004d32] border border-[#10b981]/50 text-[#10b981] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
            title="Calcular Piso ANTT e Custo"
          >
            <Calculator className="w-5 h-5" />
            <span className="hidden sm:inline">Simular Frete</span>
          </button>
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <QuickFuelModal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        onRecordFuel={handleRecordFuel}
        currentOdometer={activeTrip.currentOdometerKm}
        defaultDieselPrice={activeTrip.dieselAvgPricePerL}
        defaultArlaPrice={activeTrip.arlaAvgPricePerL}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onAddExpense={handleAddExpense}
      />

      <EditExpenseModal
        isOpen={editingExpense !== null}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        onSaveExpense={handleUpdateExpense}
      />

      <EditTripModal
        isOpen={isEditTripOpen}
        onClose={() => setIsEditTripOpen(false)}
        trip={activeTrip}
        onSaveTrip={handleSaveTrip}
        onFinishTrip={handleFinishTrip}
        currentUser={currentUser}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
        allowClose={currentUser !== null}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      <FreightCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        defaultAxles={activeTrip.axles}
        defaultCargoType={activeTrip.cargoType}
        defaultDistanceKm={activeTrip.totalDistanceKm}
        defaultDieselPrice={activeTrip.dieselAvgPricePerL}
      />

      <TripReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        trip={activeTrip}
        currentUser={currentUser}
      />

      <NewTripModal
        isOpen={isTripModalOpen}
        onClose={() => setIsTripModalOpen(false)}
        onSelectTrip={handleSelectTrip}
        onCreateCustomTrip={handleCreateCustomTrip}
        currentUser={currentUser}
      />

      <GpsLocationModal
        isOpen={isGpsModalOpen}
        onClose={() => setIsGpsModalOpen(false)}
        onApplyLocation={(locationName, highway) => {
          setActiveTrip((prev) => ({
            ...prev,
            origin: locationName,
            routeHighlights: `${highway} ➔ ${prev.routeHighlights.split('➔').slice(1).join('➔') || prev.destination}`,
          }));
        }}
      />

      <GoogleMapsRouteModal
        isOpen={isMapsModalOpen}
        onClose={() => setIsMapsModalOpen(false)}
        initialOrigin={activeTrip.origin}
        initialDestination={activeTrip.destination}
        vehicleAxles={activeTrip.axles}
        onApplyRoute={handleApplyRouteFromMaps}
      />

      <BackupDataModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        activeTrip={activeTrip}
        maintenanceItems={maintenanceItems}
        onRestoreTrip={(restoredTrip) => {
          setActiveTrip(restoredTrip);
          playSuccessChime();
        }}
        currentUser={currentUser}
      />

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        activeTrip={activeTrip}
        maintenanceItems={maintenanceItems}
        currentUser={currentUser}
      />

      <AnnualProfitReportModal
        isOpen={isAnnualReportOpen}
        onClose={() => setIsAnnualReportOpen(false)}
        onOpenSupabaseConfig={() => setIsSupabaseModalOpen(true)}
      />

      <ResetDataModal
        isOpen={isResetDataModalOpen}
        onClose={() => setIsResetDataModalOpen(false)}
        currentTrip={activeTrip}
        onResetComplete={(newCleanTrip) => {
          setActiveTrip(newCleanTrip);
          playSuccessChime();
          // If the route was cleared, give driver quick prompt to configure origin/destination
          if (!newCleanTrip.origin && !newCleanTrip.destination) {
            setTimeout(() => {
              setIsEditTripOpen(true);
            }, 300);
          }
        }}
        currentUser={currentUser}
      />

      <VehicleSettingsModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        currentTrip={activeTrip}
        onSaveVehicle={(updates) => {
          setActiveTrip((prev) => ({
            ...prev,
            vehicleModel: updates.vehicleModel,
            vehiclePlate: updates.vehiclePlate,
            axles: updates.axles,
          }));
          if (currentUser) {
            const updatedUser = {
              ...currentUser,
              truckModel: updates.vehicleModel,
              truckPlate: updates.vehiclePlate,
            };
            setCurrentUser(updatedUser);
            saveCurrentUserSession(updatedUser);
          }
        }}
        currentUser={currentUser}
      />
    </div>
  );
}
