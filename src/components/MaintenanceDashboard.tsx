import React, { useState, useMemo, useEffect } from 'react';
import { MaintenanceItem, MaintenanceComponent, Expense, User, DriverDocumentReminder, TireMonitorItem } from '../types/cockpit';
import { formatCurrency, formatOdometer } from '../utils/formatters';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import { generateMaintenancePdf } from '../utils/maintenancePdfGenerator';
import { DriverDocumentSection } from './DriverDocumentSection';
import { TireMonitorSection } from './TireMonitorSection';
import { FuelConsumptionTrendChart } from './FuelConsumptionTrendChart';
import { MaintenanceSavingsChart } from './MaintenanceSavingsChart';
import {
  loadDriverDocuments,
  saveDriverDocuments,
  calculateDaysRemaining,
  getCriticalDocumentAlerts,
} from '../services/driverDocumentService';
import {
  loadTires,
  saveTires,
  getCriticalTireAlerts,
} from '../services/tireMonitorService';
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Plus,
  Gauge,
  CircleDot,
  Fuel,
  Droplet,
  Trash2,
  X,
  Check,
  Bell,
  BellRing,
  BellOff,
  Wind,
  Zap,
  Thermometer,
  ShieldAlert,
  ArrowRight,
  Filter,
  Layers,
  Truck,
  RotateCcw,
  Sparkles,
  Receipt,
  FileText,
  FileCheck,
  FileDown,
  Lock,
  Smartphone,
  Radio,
  Play,
  Volume2,
} from 'lucide-react';
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  isBackgroundNotificationEnabled,
  setBackgroundNotificationEnabled,
  scheduleTestBackgroundNotification,
  sendCriticalMaintenanceNotification,
  analyzeCriticalMaintenance,
  NotificationSupportStatus,
} from '../services/maintenanceNotificationService';

interface MaintenanceDashboardProps {
  currentOdometer: number;
  maintenanceItems: MaintenanceItem[];
  onUpdateMaintenance: (items: MaintenanceItem[]) => void;
  onUpdateOdometer: (newOdometer: number) => void;
  onAddExpense?: (expense: Omit<Expense, 'id'>) => void;
  vehicleModel?: string;
  vehiclePlate?: string;
  currentUser?: User | null;
  driverDocuments?: DriverDocumentReminder[];
  onUpdateDriverDocuments?: (docs: DriverDocumentReminder[]) => void;
  tires?: TireMonitorItem[];
  onUpdateTires?: (tires: TireMonitorItem[]) => void;
  expenses?: Expense[];
  startOdometerKm?: number;
  targetConsumptionKmL?: number;
  actualConsumptionKmL?: number;
  initialSubTab?: 'alertas' | 'vida_pneus' | 'documentos' | 'todos' | 'pneus' | 'oficina';
}

export const MaintenanceDashboard: React.FC<MaintenanceDashboardProps> = ({
  currentOdometer,
  maintenanceItems,
  onUpdateMaintenance,
  onUpdateOdometer,
  onAddExpense,
  vehicleModel = 'Scania R540 6x4 Super',
  vehiclePlate = 'BRA-2026',
  currentUser,
  driverDocuments,
  onUpdateDriverDocuments,
  tires,
  onUpdateTires,
  expenses = [],
  startOdometerKm = 0,
  targetConsumptionKmL = 2.3,
  actualConsumptionKmL = 0,
  initialSubTab = 'alertas',
}) => {
  // Navigation sub-tabs inside Maintenance Dashboard
  const [subTab, setSubTab] = useState<'alertas' | 'vida_pneus' | 'documentos' | 'todos' | 'pneus' | 'oficina'>(
    initialSubTab || 'alertas'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');

  // Synchronize initialSubTab if changed from parent
  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Driver documents internal state fallback
  const [localDocs, setLocalDocs] = useState<DriverDocumentReminder[]>(() => loadDriverDocuments());
  const docsToUse = driverDocuments || localDocs;

  const handleUpdateDocs = (updated: DriverDocumentReminder[]) => {
    setLocalDocs(updated);
    if (onUpdateDriverDocuments) {
      onUpdateDriverDocuments(updated);
    }
    saveDriverDocuments(updated);
  };

  const criticalDocsInAlert = useMemo(() => {
    return getCriticalDocumentAlerts(docsToUse);
  }, [docsToUse]);

  // Tires lifespan monitor internal state fallback
  const [localTires, setLocalTires] = useState<TireMonitorItem[]>(() => loadTires());
  const tiresToUse = tires || localTires;

  const handleUpdateTires = (updated: TireMonitorItem[]) => {
    setLocalTires(updated);
    if (onUpdateTires) {
      onUpdateTires(updated);
    }
    saveTires(updated);
  };

  const criticalTiresInAlert = useMemo(() => {
    return getCriticalTireAlerts(tiresToUse);
  }, [tiresToUse]);

  // Odometer editing state
  const [odometerInput, setOdometerInput] = useState<string>(currentOdometer.toString());
  const [showOdoEdit, setShowOdoEdit] = useState(false);

  // Add Item modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInterval, setNewInterval] = useState('20000');
  const [newCost, setNewCost] = useState('800');
  const [newComponent, setNewComponent] = useState<MaintenanceComponent>('oleo_motor');
  const [newNotes, setNewNotes] = useState('');
  const [newPart, setNewPart] = useState('');

  // Quick feedback toast
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Web Notification API states
  const [notifPermission, setNotifPermission] = useState<NotificationSupportStatus>(() =>
    getNotificationPermissionStatus()
  );
  const [bgNotifEnabled, setBgNotifEnabled] = useState<boolean>(() =>
    isBackgroundNotificationEnabled()
  );
  const [isTestingCountdown, setIsTestingCountdown] = useState<number | null>(null);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(getNotificationPermissionStatus());
    setBgNotifEnabled(isBackgroundNotificationEnabled());
    if (granted) {
      playSuccessChime();
      setActionNotice('Notificações de tela bloqueada e segundo plano ativadas com sucesso!');
    } else {
      playAlertBeep();
      setActionNotice('Permissão de notificações não foi concedida nas preferências do navegador.');
    }
  };

  const handleToggleBgEnabled = () => {
    playCockpitClick();
    const next = !bgNotifEnabled;
    setBackgroundNotificationEnabled(next);
    setBgNotifEnabled(next);
    setActionNotice(
      next
        ? 'Vigilância de tela bloqueada ativada para manutenções críticas.'
        : 'Notificações de segundo plano pausadas temporariamente.'
    );
  };

  const handleStartLockedTest = async () => {
    playCockpitClick();
    if (notifPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      setNotifPermission(getNotificationPermissionStatus());
      if (!granted) {
        playAlertBeep();
        setActionNotice('Conceda a permissão de notificações do navegador para testar o alerta na tela de bloqueio.');
        return;
      }
    }

    setIsTestingCountdown(5);
    scheduleTestBackgroundNotification(5, currentOdometer, 'BRA-2026');

    let remaining = 5;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setIsTestingCountdown(null);
        setActionNotice('Notificação de teste enviada via Web API para tela de bloqueio!');
      } else {
        setIsTestingCountdown(remaining);
      }
    }, 1000);
  };

  const handleTestImmediate = async () => {
    playCockpitClick();
    if (notifPermission !== 'granted') {
      const granted = await requestNotificationPermission();
      setNotifPermission(getNotificationPermissionStatus());
      if (!granted) return;
    }

    const sent = await sendCriticalMaintenanceNotification({
      items: maintenanceItems,
      currentOdometer,
      truckPlate: 'BRA-2026',
      truckModel: 'Scania R540 Super',
      force: true,
      isBackground: false,
    });

    if (sent) {
      playSuccessChime();
      setActionNotice('Alerta crítico de manutenção emitido com vibração de cabine!');
    }
  };

  // PDF Generation State and Handler
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGeneratePdf = () => {
    playCockpitClick();
    setIsGeneratingPdf(true);
    try {
      generateMaintenancePdf({
        maintenanceItems,
        currentOdometer,
        vehicleModel,
        vehiclePlate,
        currentUser,
      });
      playSuccessChime();
      setActionNotice('Relatório em PDF de manutenção gerado com sucesso! Arquivo baixado para a gestão da frota.');
      setTimeout(() => setActionNotice(null), 6000);
    } catch (err) {
      console.error('Erro ao gerar PDF de manutenção:', err);
      playAlertBeep();
      setActionNotice('Erro ao gerar relatório em PDF de manutenção.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Analyze maintenance urgency & statistics
  const { urgentItems, warningItems, okItems, totalEstimatedPendingCost } = useMemo(() => {
    const urgent: MaintenanceItem[] = [];
    const warning: MaintenanceItem[] = [];
    const ok: MaintenanceItem[] = [];
    let pendingCost = 0;

    maintenanceItems.forEach((item) => {
      const kmRemaining = item.nextDueKm - currentOdometer;
      if (kmRemaining <= 0) {
        urgent.push(item);
        pendingCost += item.estimatedCost;
      } else if (kmRemaining <= 3000) {
        warning.push(item);
        pendingCost += item.estimatedCost;
      } else {
        ok.push(item);
      }
    });

    return {
      urgentItems: urgent,
      warningItems: warning,
      okItems: ok,
      totalEstimatedPendingCost: pendingCost,
    };
  }, [maintenanceItems, currentOdometer]);

  const alertItemsCount = urgentItems.length + warningItems.length;

  const handleSaveOdometer = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(odometerInput, 10);
    if (!isNaN(val) && val > 0) {
      playSuccessChime();
      onUpdateOdometer(val);
      setShowOdoEdit(false);
      setActionNotice(`Hodômetro atualizado para ${formatOdometer(val)}.`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleMarkAsDone = (id: string, launchExpense = false) => {
    playSuccessChime();
    const target = maintenanceItems.find((m) => m.id === id);
    if (!target) return;

    const updated = maintenanceItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          lastDoneKm: currentOdometer,
          nextDueKm: currentOdometer + item.intervalKm,
          urgency: 'ok' as const,
        };
      }
      return item;
    });

    onUpdateMaintenance(updated);

    // Optionally launch as expense in active trip
    if (launchExpense && onAddExpense) {
      const expenseCategory =
        target.component === 'pneus' ? 'pneu_borracharia' : 'manutencao';

      onAddExpense({
        category: expenseCategory,
        description: `Manutenção: ${target.title}`,
        amount: target.estimatedCost,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        location: 'Oficina / Posto de Serviços',
        odometerKm: currentOdometer,
        paymentMethod: 'PIX',
      });
      setActionNotice(
        `"${target.title}" renovada e lançada nas Despesas da Viagem (${formatCurrency(target.estimatedCost)})!`
      );
    } else {
      setActionNotice(`"${target.title}" registrada com sucesso! Próxima troca em ${formatOdometer(currentOdometer + target.intervalKm)}.`);
    }

    setTimeout(() => setActionNotice(null), 5000);
  };

  // Helper: icon per component
  const getComponentIcon = (component: MaintenanceComponent) => {
    switch (component) {
      case 'oleo_motor':
        return <Droplet className="w-4 h-4 text-[#f59e0b]" />;
      case 'filtro_combustivel':
        return <Fuel className="w-4 h-4 text-[#38bdf8]" />;
      case 'filtro_ar':
        return <Wind className="w-4 h-4 text-[#60a5fa]" />;
      case 'freios':
        return <AlertTriangle className="w-4 h-4 text-[#ef4444]" />;
      case 'pneus':
        return <CircleDot className="w-4 h-4 text-[#ec4899]" />;
      case 'diferencial':
        return <Wrench className="w-4 h-4 text-[#a78bfa]" />;
      case 'suspensao':
        return <Layers className="w-4 h-4 text-[#10b981]" />;
      case 'eletrica_bateria':
        return <Zap className="w-4 h-4 text-[#fbbf24]" />;
      case 'arrefecimento':
        return <Thermometer className="w-4 h-4 text-[#06b6d4]" />;
      case 'consertos_gerais':
      default:
        return <Wrench className="w-4 h-4 text-[#ffb95f]" />;
    }
  };

  const getComponentLabel = (component: MaintenanceComponent) => {
    switch (component) {
      case 'oleo_motor':
        return 'Óleo & Lubrificação';
      case 'filtro_combustivel':
        return 'Filtro Combustível';
      case 'filtro_ar':
        return 'Filtro de Ar / Cabine';
      case 'freios':
        return 'Freios & Cuícas';
      case 'pneus':
        return 'Pneus & Borracharia';
      case 'diferencial':
        return 'Câmbio & Diferencial';
      case 'suspensao':
        return 'Suspensão Pneumática';
      case 'eletrica_bateria':
        return 'Elétrica & Baterias';
      case 'arrefecimento':
        return 'Arrefecimento & Radiador';
      case 'consertos_gerais':
      default:
        return 'Consertos Gerais';
    }
  };

  const getUrgencyBadge = (item: MaintenanceItem) => {
    const kmRemaining = item.nextDueKm - currentOdometer;
    if (kmRemaining <= 0) {
      return (
        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#690005] text-[#ffb4ab] border border-[#ea580c] flex items-center gap-1 shadow-xs animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-[#ffb4ab]" />
          VENCIDO ({formatOdometer(Math.abs(kmRemaining))} atrás)
        </span>
      );
    }
    if (kmRemaining <= 3000) {
      return (
        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#472a00] text-[#ffb95f] border border-[#f59e0b] flex items-center gap-1 shadow-xs">
          <BellRing className="w-3.5 h-3.5 text-[#f59e0b]" />
          ATENÇÃO ({formatOdometer(kmRemaining)} restantes)
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#003824] text-[#10b981] border border-[#10b981]/40 flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-[#34d399]" />
        Em Dia ({formatOdometer(kmRemaining)} restantes)
      </span>
    );
  };

  // Filter items for subtabs
  const displayedItems = useMemo(() => {
    if (subTab === 'alertas') {
      return [...urgentItems, ...warningItems];
    }
    if (subTab === 'pneus') {
      return maintenanceItems.filter((m) => m.component === 'pneus');
    }
    if (subTab === 'oficina') {
      return maintenanceItems.filter(
        (m) =>
          m.component === 'consertos_gerais' ||
          m.component === 'freios' ||
          m.component === 'suspensao' ||
          m.component === 'eletrica_bateria' ||
          m.component === 'arrefecimento' ||
          m.component === 'diferencial'
      );
    }

    // 'todos' tab
    if (categoryFilter === 'todos') return maintenanceItems;
    return maintenanceItems.filter((m) => m.component === categoryFilter);
  }, [subTab, categoryFilter, maintenanceItems, urgentItems, warningItems]);

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden space-y-0">
      {/* Top Header with Odômetro & Quick Stats */}
      <div className="p-4 md:p-5 bg-[#152031] border-b border-[#334155] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#f59e0b]" />
              Painel de Manutenção Preventiva & Alertas de Frota
            </h3>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Controle de troca de óleo, filtros, rodízio de pneus, freios e consertos mecânicos gerais.
            </p>
          </div>

          {/* Top Actions: Add New Item & Odometer */}
          {/* Top Actions: Add New Item, PDF Report & Odometer */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="h-10 px-3.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-900/30 active:scale-95 disabled:opacity-50"
              title="Gerar e baixar relatório técnico em PDF (Histórico de revisões e cronograma das próximas)"
            >
              <FileDown className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Gerando...' : 'Relatório PDF'}</span>
            </button>

            <button
              onClick={() => {
                playCockpitClick();
                setShowAddModal(true);
              }}
              className="h-10 px-3.5 bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Item</span>
            </button>

            {!showOdoEdit ? (
              <button
                onClick={() => {
                  playCockpitClick();
                  setShowOdoEdit(true);
                }}
                className="h-10 px-3.5 bg-[#081425] hover:bg-[#0f172a] border border-[#334155] hover:border-[#f59e0b] rounded-xl flex items-center gap-2 text-[#d8e3fb] transition-all cursor-pointer"
                title="Clique para atualizar o odômetro atual do caminhão"
              >
                <Gauge className="w-4 h-4 text-[#f59e0b]" />
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-[#94a3b8]">Odômetro Atual</div>
                  <div className="font-mono text-xs font-extrabold text-[#d8e3fb]">
                    {formatOdometer(currentOdometer)}
                  </div>
                </div>
              </button>
            ) : (
              <form onSubmit={handleSaveOdometer} className="flex items-center gap-1.5">
                <input
                  type="number"
                  autoFocus
                  value={odometerInput}
                  onChange={(e) => setOdometerInput(e.target.value)}
                  className="w-32 h-10 bg-[#081425] border-2 border-[#f59e0b] rounded-xl px-2.5 text-xs font-mono font-bold text-[#d8e3fb] outline-hidden"
                />
                <button
                  type="submit"
                  className="h-10 px-3 bg-[#f59e0b] text-[#0f172a] font-black text-xs rounded-xl cursor-pointer"
                >
                  Salvar
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {actionNotice && (
          <div className="p-3 rounded-xl bg-[#064e3b]/90 border border-[#10b981] flex items-center justify-between text-xs font-semibold text-[#a7f3d0] animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-[#a7f3d0] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SUB-TABS: Alertas de Manutenção (Destaque), Todos os Itens, Pneus & Borracharia, Consertos Oficina */}
        <div className="flex gap-2 p-1 bg-[#081425] rounded-xl border border-[#334155] overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setSubTab('alertas');
            }}
            className={`flex-1 min-w-[170px] h-10 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
              subTab === 'alertas'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/60 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <BellRing className={`w-4 h-4 ${alertItemsCount > 0 ? 'text-[#ea580c] animate-bounce' : 'text-[#94a3b8]'}`} />
            <span>Alertas de Manutenção</span>
            {alertItemsCount > 0 && (
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  urgentItems.length > 0
                    ? 'bg-[#ea580c] text-white animate-pulse'
                    : 'bg-[#f59e0b] text-[#0f172a]'
                }`}
              >
                {alertItemsCount}
              </span>
            )}
          </button>

          {/* Sub-tab: Lembretes de Documentação (CNH, EAR, Exame Toxicológico) */}
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setSubTab('documentos');
            }}
            className={`flex-1 min-w-[170px] h-10 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
              subTab === 'documentos'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/60 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <FileCheck className="w-4 h-4 text-[#ec4899]" />
            <span>Documentação & CNH</span>
            {criticalDocsInAlert.length > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#ef4444] text-white animate-pulse">
                {criticalDocsInAlert.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setSubTab('todos');
            }}
            className={`flex-1 min-w-[150px] h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              subTab === 'todos'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/60 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Layers className="w-4 h-4 text-[#38bdf8]" />
            <span>Plano Completo ({maintenanceItems.length})</span>
          </button>

          {/* Sub-tab: Monitoramento de Vida Útil dos Pneus (>= 80% alerta) */}
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setSubTab('vida_pneus');
            }}
            className={`flex-1 min-w-[175px] h-10 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
              subTab === 'vida_pneus'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/60 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <CircleDot className={`w-4 h-4 ${criticalTiresInAlert.length > 0 ? 'text-[#f59e0b] animate-pulse' : 'text-[#38bdf8]'}`} />
            <span>Vida Útil dos Pneus</span>
            {criticalTiresInAlert.length > 0 && (
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#ef4444] text-white animate-pulse"
                title="Pneus que atingiram 80% ou mais do desgaste estimado"
              >
                {criticalTiresInAlert.length} ≥80%
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setSubTab('pneus');
            }}
            className={`flex-1 min-w-[150px] h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              subTab === 'pneus'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/60 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <CircleDot className="w-4 h-4 text-[#ec4899]" />
            <span>Pneus & Borracharia</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setSubTab('oficina');
            }}
            className={`flex-1 min-w-[170px] h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              subTab === 'oficina'
                ? 'bg-[#1e293b] text-[#ffb95f] border border-[#ffb95f]/60 shadow-xs'
                : 'text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            <Wrench className="w-4 h-4 text-[#10b981]" />
            <span>Consertos Gerais & Oficina</span>
          </button>
        </div>
      </div>

      {/* GRÁFICOS ANALÍTICOS: CONSUMO HISTÓRICO E PREVENTIVA VS ECONOMIA EM RODOVIA */}
      <div className="px-4 md:px-5 pt-4 grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
        <FuelConsumptionTrendChart
          expenses={expenses}
          startOdometerKm={startOdometerKm}
          targetConsumptionKmL={targetConsumptionKmL}
          actualConsumptionKmL={actualConsumptionKmL}
          vehicleModel={vehicleModel}
        />

        <MaintenanceSavingsChart
          maintenanceItems={maintenanceItems}
          currentOdometer={currentOdometer}
          expenses={expenses}
          onAddNewItem={() => {
            playCockpitClick();
            setShowAddModal(true);
          }}
        />
      </div>

      {/* VIEW 1: ABA DE ALERTAS DE MANUTENÇÃO EM DESTAQUE */}
      {subTab === 'alertas' && (
        <div className="p-4 md:p-5 space-y-4">
          {/* PAINEL DE NOTIFICAÇÕES LOCAIS WEB API (SEGUNDO PLANO E TELA BLOQUEADA) */}
          <div className="p-4 rounded-2xl bg-[#0f172a] border-2 border-[#334155] hover:border-[#38bdf8]/60 transition-all shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#38bdf8] flex items-center justify-center text-[#38bdf8] shrink-0 shadow-md shadow-sky-500/10">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-extrabold text-[#d8e3fb] uppercase tracking-wide flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#ffb95f]" />
                      Vigilância em Segundo Plano & Tela Bloqueada
                    </h4>
                    {notifPermission === 'granted' && bgNotifEnabled ? (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#003824] text-[#34d399] border border-[#10b981] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-ping" />
                        Vigilância Ativa
                      </span>
                    ) : notifPermission === 'granted' && !bgNotifEnabled ? (
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#334155] text-[#94a3b8] border border-[#475569]">
                        Pausada
                      </span>
                    ) : notifPermission === 'denied' ? (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#450a0a] text-[#fca5a5] border border-[#ef4444]">
                        Bloqueada no Navegador
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#422006] text-[#ffb95f] border border-[#f59e0b]">
                        Permissão Pendente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Utiliza a <strong>Web Notification API + Service Worker local</strong> para alertar o motorista sobre peças vencidas mesmo com o telefone bloqueado no suporte veicular ou app minimizado.
                  </p>
                </div>
              </div>

              {/* Action Buttons for Background Notification */}
              <div className="flex items-center gap-2 flex-wrap">
                {notifPermission !== 'granted' ? (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ea580c] hover:from-[#d97706] hover:to-[#c2410c] text-[#0f172a] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>Ativar Alertas de Tela Bloqueada</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleBgEnabled}
                      className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        bgNotifEnabled
                          ? 'bg-[#1e293b] hover:bg-[#243248] border-[#38bdf8]/50 text-[#38bdf8]'
                          : 'bg-[#1e293b] hover:bg-[#243248] border-[#475569] text-[#94a3b8]'
                      }`}
                      title={bgNotifEnabled ? 'Pausar notificações em segundo plano' : 'Reativar notificações em segundo plano'}
                    >
                      {bgNotifEnabled ? <Bell className="w-3.5 h-3.5 text-[#38bdf8]" /> : <BellOff className="w-3.5 h-3.5" />}
                      <span>{bgNotifEnabled ? 'Vigilância Ligada' : 'Vigilância Pausada'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleStartLockedTest}
                      disabled={isTestingCountdown !== null}
                      className="h-9 px-3.5 rounded-xl bg-[#081425] hover:bg-[#152031] border border-[#ffb95f]/60 hover:border-[#ffb95f] text-[#ffb95f] font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
                      title="Testa a notificação com um atraso de 5 segundos para que você possa bloquear a tela do celular"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Testar com Tela Bloqueada (5s)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestImmediate}
                      className="h-9 px-3 rounded-xl bg-[#081425] hover:bg-[#152031] border border-[#10b981]/50 hover:border-[#10b981] text-[#34d399] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      title="Dispara a notificação crítica imediatamente"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Alerta Imediato</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Countdown Test Banner when active */}
            {isTestingCountdown !== null && (
              <div className="p-3.5 rounded-xl bg-[#422006]/90 border-2 border-[#f59e0b] flex items-center justify-between gap-3 text-xs animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f59e0b] text-[#0f172a] font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                    {isTestingCountdown}s
                  </div>
                  <div>
                    <h5 className="font-extrabold text-[#fef3c7] uppercase">
                      📱 BLOQUEIE A TELA OU ALTERNE DE APP AGORA!
                    </h5>
                    <p className="text-[#fed7aa] text-[11px] mt-0.5">
                      O Service Worker vai emitir a notificação nativa com vibração pesada de cabine assim que a contagem zerar.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-[#ffb95f] px-2 py-1 rounded-lg bg-[#2a1700]">
                  Aguardando...
                </span>
              </div>
            )}

            {/* Monitoring specs footer */}
            <div className="pt-2 border-t border-[#334155]/60 flex flex-wrap items-center justify-between text-[11px] text-[#94a3b8] font-mono gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#ef4444]" />
                <span>Gatilho: Peças vencidas ou iminentes (&le; 500 km) no hodômetro ({formatOdometer(currentOdometer)})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#081425] border border-[#334155] text-[#bec6e0]">
                  Vibração: 300ms • 150ms • 500ms
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#081425] border border-[#334155] text-[#bec6e0]">
                  Offline: 100% Nativo
                </span>
              </div>
            </div>
          </div>

          {/* Alerta de Documentação do Condutor na aba Alertas */}
          {criticalDocsInAlert.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#450a0a] via-[#3f2500] to-[#1e1b4b] border-2 border-[#ef4444] shadow-xl text-white space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#690005] border border-[#ef4444] text-[#ffb4ab] shrink-0 mt-0.5">
                    <FileText className="w-6 h-6 text-[#ffb4ab] animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-black text-[#fecaca] uppercase">
                        ⚠️ ALERTA DE DOCUMENTAÇÃO: {criticalDocsInAlert.length} Documento(s) Próximo(s) do Vencimento
                      </h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#ef4444] text-white">
                        Exigência Legal PRF
                      </span>
                    </div>
                    <p className="text-xs text-[#fed7aa] mt-1">
                      {criticalDocsInAlert
                        .map(
                          (a) =>
                            `${a.doc.title} (${
                              a.daysRemaining < 0
                                ? `Vencido há ${Math.abs(a.daysRemaining)} dias`
                                : `vence em ${a.daysRemaining} dias`
                            })`
                        )
                        .join(' • ')}
                    </p>
                    <p className="text-[11px] text-[#fca5a5]/80 mt-1">
                      Art. 148-A do CTB: Dirigir com toxicológico ou CNH vencida acarreta multa gravíssima (5x) e retenção.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setSubTab('documentos');
                  }}
                  className="h-9 px-3.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
                >
                  <span>Regularizar Documentação</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Alerta de Vida Útil de Pneus >= 80% na aba Alertas */}
          {criticalTiresInAlert.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#450a0a] via-[#422006] to-[#1e1b4b] border-2 border-[#f59e0b] shadow-xl text-white space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-[#472a00] border border-[#f59e0b] text-[#ffb95f] shrink-0 mt-0.5">
                    <CircleDot className="w-6 h-6 text-[#ffb95f] animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-black text-[#fef3c7] uppercase">
                        🛞 ALERTA DE PNEUS: {criticalTiresInAlert.length} Pneu(s) Atingiram ≥ 80% de Desgaste
                      </h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#f59e0b] text-[#0f172a]">
                        Monitor de Vida Útil
                      </span>
                    </div>
                    <p className="text-xs text-[#fed7aa] mt-1">
                      {criticalTiresInAlert
                        .map(
                          ({ tire, analysis }) =>
                            `${tire.position}: ${analysis.wearPct.toFixed(1)}% (${
                              analysis.remainingKm <= 0
                                ? `excedido ${formatOdometer(Math.abs(analysis.remainingKm))}`
                                : `restam ${formatOdometer(analysis.remainingKm)}`
                            })`
                        )
                        .join(' • ')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setSubTab('vida_pneus');
                  }}
                  className="h-9 px-3.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
                >
                  <span>Gerenciar Vida Útil dos Pneus</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Main Diagnostic Banner */}
          {urgentItems.length > 0 ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#450a0a] to-[#2b0808] border-2 border-[#ef4444] shadow-xl text-white space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#ef4444]/20 border border-[#ef4444] text-[#fca5a5] shrink-0 mt-0.5">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-black tracking-wide text-[#fecaca] uppercase">
                      ⚠️ ALERTA CRÍTICO: {urgentItems.length} Manutenções Vencidas no Odômetro!
                    </h4>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#ef4444] text-white">
                      Parada Recomendada
                    </span>
                  </div>
                  <p className="text-xs text-[#fca5a5]/90 mt-1">
                    Componentes vitais do caminhão ultrapassaram a quilometragem máxima de troca. Riscos de
                    quebra de motor, falha de freio ou recusa em postos de pesagem da ANTT.
                  </p>
                  <div className="text-xs font-mono font-bold text-[#ffb95f] mt-2">
                    Provisão estimada para regularização: {formatCurrency(totalEstimatedPendingCost)}
                  </div>
                </div>
              </div>
            </div>
          ) : warningItems.length > 0 ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#422006] to-[#291505] border-2 border-[#f59e0b] shadow-lg text-white space-y-2">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b] text-[#fde68a] shrink-0 mt-0.5">
                  <BellRing className="w-6 h-6 text-[#f59e0b]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-black text-[#fef3c7] uppercase">
                      🔔 ALERTA PREVENTIVO: {warningItems.length} Itens Próximos da Troca
                    </h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#f59e0b] text-[#0f172a]">
                      Menos de 3.000 KM
                    </span>
                  </div>
                  <p className="text-xs text-[#fed7aa] mt-1">
                    Itens preventivos (óleo, filtros ou pneus) atingirão a quilometragem recomendada em breve.
                    Planeje a parada nos postos conveniados da sua rota.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#022c22] to-[#043d30] border-2 border-[#10b981] text-[#a7f3d0] flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#10b981]/20 text-[#34d399] shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#d1fae5]">
                  Frota 100% Em Dia! Nenhum Alerta Pendente.
                </h4>
                <p className="text-xs text-[#a7f3d0]/80">
                  Todas as trocas de óleo, filtros, freios e inspeções de pneus estão dentro da margem segura.
                </p>
              </div>
            </div>
          )}

          {/* Cards de Alertas em Destaque */}
          {alertItemsCount === 0 ? (
            <div className="p-8 text-center text-xs text-[#94a3b8] bg-[#152031] rounded-xl border border-[#334155]">
              <Sparkles className="w-8 h-8 mx-auto text-[#10b981] mb-2" />
              Nenhum item precisa de intervenção agora. O caminhão está pronto para a rodovia!
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {[...urgentItems, ...warningItems].map((item) => {
                const kmRemaining = item.nextDueKm - currentOdometer;
                const isOverdue = kmRemaining <= 0;
                const progress = Math.min(
                  150,
                  Math.max(0, ((currentOdometer - item.lastDoneKm) / item.intervalKm) * 100)
                );

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between shadow-lg ${
                      isOverdue
                        ? 'bg-[#152031] border-[#ef4444] shadow-red-950/30'
                        : 'bg-[#152031] border-[#f59e0b] shadow-amber-950/20'
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              isOverdue
                                ? 'bg-[#450a0a] border-[#ef4444] text-[#fca5a5]'
                                : 'bg-[#422006] border-[#f59e0b] text-[#fde68a]'
                            }`}
                          >
                            {getComponentIcon(item.component)}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] block">
                              {getComponentLabel(item.component)}
                            </span>
                            <h4 className="text-sm font-black text-[#f8fafc] leading-tight">
                              {item.title}
                            </h4>
                          </div>
                        </div>

                        {getUrgencyBadge(item)}
                      </div>

                      {/* Technical Notes / Recommended Lubricant */}
                      {(item.recommendedPart || item.notes) && (
                        <div className="my-2.5 p-2.5 rounded-xl bg-[#081425] border border-[#334155] text-xs space-y-1">
                          {item.recommendedPart && (
                            <div className="text-[11px] text-[#ffb95f] font-semibold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#ffb95f] shrink-0" />
                              <span>Peça / Lubrificante: {item.recommendedPart}</span>
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-[11px] text-[#94a3b8]">
                              Observação Técnica: {item.notes}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Wear Progress Bar */}
                      <div className="my-3 space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className={isOverdue ? 'text-[#ffb4ab] font-bold' : 'text-[#ffb95f] font-bold'}>
                            {isOverdue
                              ? `Vencido há ${formatOdometer(Math.abs(kmRemaining))}`
                              : `Restam ${formatOdometer(kmRemaining)} para o limite`}
                          </span>
                          <span className="text-[#94a3b8]">
                            Limite: {formatOdometer(item.nextDueKm)}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-[#081425] rounded-full overflow-hidden border border-[#334155]">
                          <div
                            style={{ width: `${Math.min(100, progress)}%` }}
                            className={`h-full transition-all duration-300 ${
                              isOverdue ? 'bg-[#ef4444]' : 'bg-[#f59e0b]'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Odometer & Cost stats */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#334155]/60 text-center text-xs">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-[#94a3b8]">Última Troca</div>
                          <div className="font-mono font-bold text-[#d8e3fb] text-[11px]">
                            {formatOdometer(item.lastDoneKm)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-bold text-[#94a3b8]">Intervalo</div>
                          <div className="font-mono font-bold text-[#38bdf8] text-[11px]">
                            a cada {formatOdometer(item.intervalKm)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-bold text-[#94a3b8]">Custo Estimado</div>
                          <div className="font-mono font-black text-[#ffb95f] text-[11px]">
                            {formatCurrency(item.estimatedCost)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons on alert card */}
                    <div className="flex items-center gap-2 mt-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleMarkAsDone(item.id, false)}
                        className="flex-1 h-10 rounded-xl bg-[#243248] hover:bg-[#334155] border border-[#475569] text-xs font-bold text-[#d8e3fb] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        title="Registra a troca no hodômetro atual e reprograma o próximo limite"
                      >
                        <CheckCircle className="w-4 h-4 text-[#10b981]" />
                        <span>Fiz a Troca</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkAsDone(item.id, true)}
                        className="flex-1 h-10 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
                        title="Renova o item e lança automaticamente como recibo nas despesas da rota ativa"
                      >
                        <Receipt className="w-4 h-4 stroke-[2.5]" />
                        <span>Fiz & Lançar Despesa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2, 3, 4: LISTAGEM DE ITENS COM FILTRO DE CATEGORIAS */}
      {subTab !== 'alertas' && subTab !== 'documentos' && subTab !== 'vida_pneus' && (
        <div>
          {/* Quick Filter Bar for 'todos' subtab */}
          {subTab === 'todos' && (
            <div className="p-3 bg-[#152031]/60 border-b border-[#334155] flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold uppercase text-[#94a3b8] px-2 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtrar:
              </span>
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'oleo_motor', label: 'Óleo & Lubrificação' },
                { key: 'filtro_combustivel', label: 'Filtro Combustível' },
                { key: 'filtro_ar', label: 'Filtro Ar / Cabine' },
                { key: 'freios', label: 'Freios' },
                { key: 'pneus', label: 'Pneus & Borracharia' },
                { key: 'eletrica_bateria', label: 'Elétrica' },
                { key: 'arrefecimento', label: 'Arrefecimento' },
                { key: 'consertos_gerais', label: 'Consertos Gerais' },
              ].map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    playCockpitClick();
                    setCategoryFilter(cat.key);
                  }}
                  className={`h-7 px-2.5 rounded-lg font-bold border transition-all cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat.key
                      ? 'bg-[#243248] text-[#ffb95f] border-[#f59e0b]'
                      : 'bg-[#0f172a] text-[#94a3b8] border-[#334155]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Items List */}
          <div className="divide-y divide-[#334155]">
            {displayedItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94a3b8]">
                Nenhum item de manutenção encontrado nesta categoria.
              </div>
            ) : (
              displayedItems.map((item) => {
                const kmRemaining = item.nextDueKm - currentOdometer;
                const progress = Math.min(
                  100,
                  Math.max(0, ((currentOdometer - item.lastDoneKm) / item.intervalKm) * 100)
                );

                return (
                  <div key={item.id} className="p-4 hover:bg-[#152031]/50 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#081425] border border-[#334155] flex items-center justify-center shrink-0">
                          {getComponentIcon(item.component)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#d8e3fb]">{item.title}</h4>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#081425] text-[#94a3b8] border border-[#334155]">
                              {getComponentLabel(item.component)}
                            </span>
                          </div>
                          <div className="text-xs text-[#94a3b8] font-mono mt-0.5">
                            Intervalo: {formatOdometer(item.intervalKm)} • Feito em:{' '}
                            {formatOdometer(item.lastDoneKm)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getUrgencyBadge(item)}

                        <button
                          onClick={() => handleMarkAsDone(item.id, false)}
                          title="Registrar Troca / Revisão Realizada"
                          className="h-9 px-3 bg-[#243248] hover:bg-[#2a3548] border border-[#475569] text-xs font-bold text-[#d8e3fb] rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                          Fiz a Troca
                        </button>

                        <button
                          onClick={() => {
                            playCockpitClick();
                            onUpdateMaintenance(maintenanceItems.filter((m) => m.id !== item.id));
                          }}
                          title="Remover Item"
                          className="w-9 h-9 bg-[#243248] hover:bg-[#690005] hover:text-[#ffb4ab] text-[#94a3b8] rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.recommendedPart && (
                      <div className="text-[11px] text-[#ffb95f] mb-1.5 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#ffb95f]" />
                        <span>Peça/Especificação: {item.recommendedPart}</span>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="w-full h-2 bg-[#081425] rounded-full overflow-hidden border border-[#334155]">
                        <div
                          style={{ width: `${progress}%` }}
                          className={`h-full transition-all duration-300 ${
                            progress >= 100
                              ? 'bg-[#ea580c]'
                              : progress >= 85
                              ? 'bg-[#f59e0b]'
                              : 'bg-[#10b981]'
                          }`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#94a3b8] mt-1 font-mono">
                        <span>Desgaste: {progress.toFixed(0)}%</span>
                        <span>Próxima troca prevista em: {formatOdometer(item.nextDueKm)}</span>
                        <span>Estimativa: {formatCurrency(item.estimatedCost)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW: ABA DE LEMBRETES DE DOCUMENTAÇÃO (CNH, EAR, EXAME TOXICOLÓGICO) */}
      {subTab === 'documentos' && (
        <div className="p-4 md:p-5">
          <DriverDocumentSection
            documents={docsToUse}
            onUpdateDocuments={handleUpdateDocs}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* VIEW: ABA DE MONITORAMENTO DE VIDA ÚTIL DE PNEUS */}
      {subTab === 'vida_pneus' && (
        <TireMonitorSection
          tires={tiresToUse}
          onUpdateTires={handleUpdateTires}
          currentOdometer={currentOdometer}
          vehicleModel={vehicleModel}
          vehiclePlate={vehiclePlate}
          onAddExpense={onAddExpense}
        />
      )}

      {/* MODAL: CADASTRAR NOVO ITEM DE MANUTENÇÃO */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f59e0b]/20 text-[#f59e0b]">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#d8e3fb]">
                    Novo Item de Manutenção Preventiva
                  </h4>
                  <p className="text-xs text-[#94a3b8]">
                    Defina o componente, intervalo de quilometragem e peça recomendada.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 rounded-lg bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTitle.trim()) return;
                playSuccessChime();
                const interval = parseInt(newInterval, 10) || 20000;
                const cost = parseFloat(newCost) || 0;
                const newItem: MaintenanceItem = {
                  id: `m-${Date.now()}`,
                  title: newTitle.trim(),
                  intervalKm: interval,
                  lastDoneKm: currentOdometer,
                  nextDueKm: currentOdometer + interval,
                  urgency: 'ok',
                  estimatedCost: cost,
                  component: newComponent,
                  recommendedPart: newPart.trim() || undefined,
                  notes: newNotes.trim() || undefined,
                };
                onUpdateMaintenance([...maintenanceItems, newItem]);
                setShowAddModal(false);
                setNewTitle('');
                setNewPart('');
                setNewNotes('');
                setActionNotice(`Item "${newItem.title}" cadastrado com sucesso!`);
                setTimeout(() => setActionNotice(null), 4000);
              }}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Título do Serviço de Manutenção
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Troca de Óleo Lubrificante 15W40 + Filtros"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-semibold outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Componente / Categoria
                </label>
                <select
                  value={newComponent}
                  onChange={(e) => setNewComponent(e.target.value as MaintenanceComponent)}
                  className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-bold outline-hidden"
                >
                  <option value="oleo_motor">🛢️ Óleo do Motor & Lubrificação</option>
                  <option value="filtro_combustivel">⛽ Filtro de Combustível (Racor & Secundário)</option>
                  <option value="filtro_ar">💨 Filtro de Ar do Motor & Cabine</option>
                  <option value="pneus">🛞 Pneus, Rodízio, Recapagem & Alinhamento</option>
                  <option value="freios">🛑 Freios, Lonas, Tambores & Cuícas</option>
                  <option value="eletrica_bateria">⚡ Sistema Elétrico, Baterias & Alternador</option>
                  <option value="arrefecimento">❄️ Sistema de Arrefecimento & Radiador</option>
                  <option value="diferencial">⚙️ Câmbio, Diferencial & Cubos</option>
                  <option value="suspensao">🛡️ Suspensão & Bolsas Pneumáticas</option>
                  <option value="consertos_gerais">🔧 Consertos Gerais & Oficina Mecânica</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Intervalo Recomendado (KM)
                  </label>
                  <input
                    type="number"
                    step="1000"
                    required
                    placeholder="Ex: 30000"
                    value={newInterval}
                    onChange={(e) => setNewInterval(e.target.value)}
                    className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-mono font-bold outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Custo Estimado (R$)
                  </label>
                  <input
                    type="number"
                    step="50"
                    placeholder="Ex: 1500"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-mono font-bold outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Peça / Óleo / Especificação Recomendada (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Óleo 15W40 CI-4 Top Turbo ou Pneu 295/80 R22.5"
                  value={newPart}
                  onChange={(e) => setNewPart(e.target.value)}
                  className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Observações Técnicas / Procedimento (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Verificar vazamento no bujão, drenar copo Racor..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl p-3 text-[#d8e3fb] text-xs outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-11 px-4 rounded-xl bg-[#1e293b] border border-[#475569] text-[#d8e3fb] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-[#f59e0b] text-[#0f172a] font-extrabold text-xs hover:bg-[#d97706] cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Cadastrar no Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
