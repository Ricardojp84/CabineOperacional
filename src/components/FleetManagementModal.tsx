import React, { useState, useMemo } from 'react';
import {
  FleetVehicle,
  User,
  UserRole,
  VehicleAxles,
  VehicleStatus,
  DriverOperationalFunctions,
  DEFAULT_DRIVER_FUNCTIONS,
  getDriverFunctions,
} from '../types/cockpit';
import {
  getFleetVehicles,
  saveFleetVehicles,
  addFleetVehicle,
  updateFleetVehicle,
  deleteFleetVehicle,
  registerDriverByAdmin,
  updateDriverByAdmin,
  deleteDriverByAdmin,
  toggleDriverStatus,
  toggleDriverFreightHelper,
} from '../services/fleetService';
import { getUsersFromStorage } from '../data/mockUsers';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import {
  Truck,
  Users,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Copy,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Calendar,
  Fuel,
  Gauge,
  Phone,
  Mail,
  Scale,
  Sparkles,
  ChevronRight,
  KeyRound,
  Eye,
  EyeOff,
  Car,
  BadgeCheck,
  Send,
  UserCheck,
  UserMinus,
  Sliders,
  PlayCircle,
} from 'lucide-react';
import { withAdminPermission } from '../middlewares/permissionMiddleware';

interface FleetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onSelectVehicleForTrip?: (vehicle: FleetVehicle) => void;
  onActivateDriverSession?: (driver: User) => void;
}

const DRIVER_FUNCTION_DEFINITIONS: {
  key: keyof DriverOperationalFunctions;
  label: string;
  description: string;
}[] = [
  {
    key: 'routeAndMaps',
    label: 'Roteiro, GPS & Maps',
    description: 'Visualizar checkpoints, abrir Google Maps e registrar paradas',
  },
  {
    key: 'fuelAndExpenses',
    label: 'Abastecimento & Despesas',
    description: 'Lançar diesel/Arla, pedágios, alimentação e notas na viagem',
  },
  {
    key: 'tachographAndShift',
    label: 'Tacógrafo & Jornada (4h)',
    description: 'Controlar direção contínua, pausas personalizadas e Lei 13.103',
  },
  {
    key: 'maintenanceAndChecklist',
    label: 'Checklist, Pneus & Oficina',
    description: 'Inspeção pré-viagem obrigatória, calibragem e alertas de oficina',
  },
  {
    key: 'weatherAndProductivity',
    label: 'Clima & Produtividade km/L',
    description: 'Previsão meteorológica na rota e comparativo de consumo km/L',
  },
  {
    key: 'freightSimulator',
    label: 'Simulador ANTT & Balanço',
    description: 'Simular frete ANTT e visualizar resumo operacional da viagem',
  },
];

const FleetManagementModalContent: React.FC<FleetManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectVehicleForTrip,
  onActivateDriverSession,
}) => {
  const [activeTab, setActiveTab] = useState<'motoristas' | 'veiculos'>('motoristas');

  // Search & Filter
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState<'todos' | 'ativo' | 'bloqueado'>('todos');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleAxlesFilter, setVehicleAxlesFilter] = useState<'todos' | '2' | '3_4' | 'pesados'>('todos');

  // Data lists
  const [drivers, setDrivers] = useState<User[]>(() => {
    return getUsersFromStorage().filter((u) => u.role !== 'admin' && u.role !== 'administrador');
  });
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(() => getFleetVehicles());

  // Driver modal form states
  const [isDriverFormOpen, setIsDriverFormOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('estrada2026');
  const [driverRole, setDriverRole] = useState<UserRole>('motorista');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [driverRntrc, setDriverRntrc] = useState('');
  const [driverCnhNumber, setDriverCnhNumber] = useState('');
  const [driverCnhCategory, setDriverCnhCategory] = useState('E');
  const [driverCnhDueDate, setDriverCnhDueDate] = useState('');
  const [driverToxicologyDueDate, setDriverToxicologyDueDate] = useState('');
  const [driverHasEar, setDriverHasEar] = useState(true);
  const [driverAssignedVehicleId, setDriverAssignedVehicleId] = useState('');
  const [driverContractType, setDriverContractType] = useState<'clt' | 'autonomo_tac' | 'agregado'>('clt');
  const [driverStatus, setDriverStatus] = useState<'ativo' | 'inativo' | 'bloqueado'>('ativo');
  const [driverHasFreightHelper, setDriverHasFreightHelper] = useState(false);
  const [driverHelperName, setDriverHelperName] = useState('');
  const [driverHelperDailyCost, setDriverHelperDailyCost] = useState<number>(180);
  const [driverFunctions, setDriverFunctions] = useState<DriverOperationalFunctions>({
    ...DEFAULT_DRIVER_FUNCTIONS,
  });
  const [showDriverPassword, setShowDriverPassword] = useState(false);
  const [driverFormError, setDriverFormError] = useState('');
  const [driverFormSuccess, setDriverFormSuccess] = useState('');

  // Inline deletion confirmations (iframe-safe, no window.confirm)
  const [confirmDeleteDriverId, setConfirmDeleteDriverId] = useState<string | null>(null);
  const [confirmDeleteVehicleId, setConfirmDeleteVehicleId] = useState<string | null>(null);

  // Vehicle modal form states
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehPlate, setVehPlate] = useState('');
  const [vehModel, setVehModel] = useState('');
  const [vehType, setVehType] = useState('VUC / Utilitário 2 Eixos');
  const [vehAxles, setVehAxles] = useState<VehicleAxles>(2);
  const [vehYear, setVehYear] = useState<number>(2024);
  const [vehPayloadTon, setVehPayloadTon] = useState<number>(3.5);
  const [vehTargetConsumption, setVehTargetConsumption] = useState<number>(8.5);
  const [vehOdometer, setVehOdometer] = useState<number>(50000);
  const [vehStatus, setVehStatus] = useState<VehicleStatus>('disponivel');
  const [vehAssignedDriverId, setVehAssignedDriverId] = useState('');
  const [vehNotes, setVehNotes] = useState('');
  const [vehicleFormError, setVehicleFormError] = useState('');

  // Copied alert notification
  const [copiedDriverId, setCopiedDriverId] = useState<string | null>(null);

  // Reload data
  const refreshData = () => {
    setDrivers(getUsersFromStorage().filter((u) => u.role !== 'admin' && u.role !== 'administrador'));
    setVehicles(getFleetVehicles());
  };

  // Filtered Drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.email.toLowerCase().includes(driverSearch.toLowerCase()) ||
        (d.truckPlate && d.truckPlate.toLowerCase().includes(driverSearch.toLowerCase())) ||
        (d.cpf && d.cpf.includes(driverSearch));

      const matchStatus =
        driverStatusFilter === 'todos' ||
        (driverStatusFilter === 'ativo' && d.status !== 'bloqueado') ||
        (driverStatusFilter === 'bloqueado' && d.status === 'bloqueado');

      return matchSearch && matchStatus;
    });
  }, [drivers, driverSearch, driverStatusFilter]);

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.type.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(vehicleSearch.toLowerCase()));

      let matchAxles = true;
      if (vehicleAxlesFilter === '2') matchAxles = v.axles === 2;
      else if (vehicleAxlesFilter === '3_4') matchAxles = v.axles === 3 || v.axles === 4;
      else if (vehicleAxlesFilter === 'pesados') matchAxles = v.axles >= 5;

      return matchSearch && matchAxles;
    });
  }, [vehicles, vehicleSearch, vehicleAxlesFilter]);

  if (!isOpen) return null;

  // Open Driver Form for New
  const handleOpenNewDriver = () => {
    playCockpitClick();
    setEditingDriverId(null);
    setDriverName('');
    setDriverEmail('');
    setDriverPassword('estrada2026');
    setDriverRole('motorista');
    setDriverPhone('');
    setDriverCpf('');
    setDriverRntrc('');
    setDriverCnhNumber('');
    setDriverCnhCategory('E');
    setDriverCnhDueDate('');
    setDriverToxicologyDueDate('');
    setDriverHasEar(true);
    setDriverAssignedVehicleId('');
    setDriverContractType('clt');
    setDriverStatus('ativo');
    setDriverHasFreightHelper(false);
    setDriverHelperName('');
    setDriverHelperDailyCost(180);
    setDriverFunctions({ ...DEFAULT_DRIVER_FUNCTIONS });
    setDriverFormError('');
    setDriverFormSuccess('');
    setIsDriverFormOpen(true);
  };

  // Open Driver Form for Edit
  const handleOpenEditDriver = (driver: User) => {
    playCockpitClick();
    setEditingDriverId(driver.id);
    setDriverName(driver.name);
    setDriverEmail(driver.email);
    setDriverPassword(driver.password || 'estrada2026');
    setDriverRole(driver.role === 'motorista_autonomo' || driver.role === 'motorista_agregado' ? driver.role : 'motorista');
    setDriverPhone(driver.phone || '');
    setDriverCpf(driver.cpf || '');
    setDriverRntrc(driver.rntrc || '');
    setDriverCnhNumber(driver.cnhNumber || '');
    setDriverCnhCategory(driver.cnhCategory || 'E');
    setDriverCnhDueDate(driver.cnhDueDate || '');
    setDriverToxicologyDueDate(driver.toxicologyDueDate || '');
    setDriverHasEar(driver.hasEar ?? true);
    setDriverAssignedVehicleId(driver.assignedVehicleId || '');
    setDriverContractType(driver.contractType || 'clt');
    setDriverStatus(driver.status || 'ativo');
    setDriverHasFreightHelper(Boolean(driver.hasFreightHelper));
    setDriverHelperName(driver.freightHelperName || '');
    setDriverHelperDailyCost(driver.freightHelperDailyCost ?? 180);
    setDriverFunctions(getDriverFunctions(driver));
    setDriverFormError('');
    setDriverFormSuccess('');
    setIsDriverFormOpen(true);
  };

  // Save Driver Form
  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverFormError('');

    if (!driverName.trim() || !driverEmail.trim()) {
      setDriverFormError('Nome e E-mail do motorista são obrigatórios.');
      return;
    }

    if (driverPassword.length < 6) {
      setDriverFormError('A senha de acesso deve ter no mínimo 6 caracteres.');
      return;
    }

    if (editingDriverId) {
      // Update
      const res = await updateDriverByAdmin(editingDriverId, {
        name: driverName.trim(),
        email: driverEmail.trim().toLowerCase(),
        password: driverPassword.trim(),
        role: driverRole,
        phone: driverPhone.trim(),
        cpf: driverCpf.trim(),
        rntrc: driverRntrc.trim(),
        cnhNumber: driverCnhNumber.trim(),
        cnhCategory: driverCnhCategory,
        cnhDueDate: driverCnhDueDate,
        toxicologyDueDate: driverToxicologyDueDate,
        hasEar: driverHasEar,
        assignedVehicleId: driverAssignedVehicleId || undefined,
        contractType: driverContractType,
        status: driverStatus,
        hasFreightHelper: driverHasFreightHelper,
        freightHelperName: driverHasFreightHelper ? (driverHelperName.trim() || 'Ajudante de Frete') : undefined,
        freightHelperDailyCost: driverHasFreightHelper ? Math.max(0, driverHelperDailyCost || 0) : 0,
        driverFunctions,
      });

      if (res.success) {
        playSuccessChime();
        refreshData();
        setIsDriverFormOpen(false);
      } else {
        playAlertBeep();
        setDriverFormError(res.error || 'Erro ao atualizar motorista.');
      }
    } else {
      // Register New Driver (strictly driver-only)
      const res = await registerDriverByAdmin({
        name: driverName.trim(),
        email: driverEmail.trim().toLowerCase(),
        password: driverPassword.trim(),
        role: driverRole,
        phone: driverPhone.trim(),
        cpf: driverCpf.trim(),
        rntrc: driverRntrc.trim(),
        cnhNumber: driverCnhNumber.trim(),
        cnhCategory: driverCnhCategory,
        cnhDueDate: driverCnhDueDate,
        toxicologyDueDate: driverToxicologyDueDate,
        hasEar: driverHasEar,
        assignedVehicleId: driverAssignedVehicleId || undefined,
        contractType: driverContractType,
        status: driverStatus,
        hasFreightHelper: driverHasFreightHelper,
        freightHelperName: driverHasFreightHelper ? (driverHelperName.trim() || 'Ajudante de Frete') : undefined,
        freightHelperDailyCost: driverHasFreightHelper ? Math.max(0, driverHelperDailyCost || 0) : 0,
        driverFunctions,
      });

      if (res.success) {
        playSuccessChime();
        refreshData();
        setIsDriverFormOpen(false);
      } else {
        playAlertBeep();
        setDriverFormError(res.error || 'Erro ao cadastrar motorista.');
      }
    }
  };

  // Toggle Driver Active / Blocked
  const handleToggleStatus = (driverId: string) => {
    playCockpitClick();
    toggleDriverStatus(driverId);
    refreshData();
  };

  // Quick toggle Freight Helper on card
  const handleQuickToggleHelper = (driverId: string) => {
    playCockpitClick();
    toggleDriverFreightHelper(driverId);
    refreshData();
  };

  // Delete Driver (inline confirmation, iframe-safe)
  const handleConfirmDeleteDriver = (driverId: string) => {
    playCockpitClick();
    deleteDriverByAdmin(driverId);
    setConfirmDeleteDriverId(null);
    refreshData();
  };

  // Copy Access Credentials for Driver
  const handleCopyAccess = (driver: User) => {
    playCockpitClick();
    const appUrl = window.location.origin;
    const helperLabel = driver.hasFreightHelper
      ? `Sim (${driver.freightHelperName || 'Ajudante'} • Diária R$ ${(driver.freightHelperDailyCost ?? 180).toFixed(2)})`
      : 'Não (Motorista Solo)';
    const text = `🚚 *CABINE OPERACIONAL DO CAMINHONEIRO - ACESSO LIBERADO*\n\nOlá, ${driver.name}!\nSeu cadastro de motorista foi liberado pelo Administrador da frota.\n\n🔗 *Link de Acesso:* ${appUrl}\n👤 *Login / E-mail:* ${driver.email}\n🔑 *Senha de Acesso:* ${driver.password || 'estrada2026'}\n🚛 *Veículo Designado:* ${driver.truckModel} (${driver.truckPlate})\n👷 *Ajudante no Frete:* ${helperLabel}\n\n_Seu acesso é restrito às funções operacionais de motorista (rotas, odômetro, tacógrafo e abastecimentos)._`;

    navigator.clipboard.writeText(text);
    setCopiedDriverId(driver.id);
    setTimeout(() => setCopiedDriverId(null), 3000);
  };

  // Open Vehicle Form for New
  const handleOpenNewVehicle = () => {
    playCockpitClick();
    setEditingVehicleId(null);
    setVehPlate('');
    setVehModel('');
    setVehType('VUC / Utilitário 2 Eixos');
    setVehAxles(2);
    setVehYear(2024);
    setVehPayloadTon(3.5);
    setVehTargetConsumption(8.5);
    setVehOdometer(50000);
    setVehStatus('disponivel');
    setVehAssignedDriverId('');
    setVehNotes('');
    setVehicleFormError('');
    setIsVehicleFormOpen(true);
  };

  // Open Vehicle Form for Edit
  const handleOpenEditVehicle = (veh: FleetVehicle) => {
    playCockpitClick();
    setEditingVehicleId(veh.id);
    setVehPlate(veh.plate);
    setVehModel(veh.model);
    setVehType(veh.type);
    setVehAxles(veh.axles);
    setVehYear(veh.year || 2024);
    setVehPayloadTon(veh.payloadCapacityTon || 15);
    setVehTargetConsumption(veh.targetConsumptionKmL || 2.3);
    setVehOdometer(veh.currentOdometerKm || 0);
    setVehStatus(veh.status);
    setVehAssignedDriverId(veh.assignedDriverId || '');
    setVehNotes(veh.notes || '');
    setVehicleFormError('');
    setIsVehicleFormOpen(true);
  };

  // Save Vehicle Form
  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleFormError('');

    if (!vehPlate.trim() || !vehModel.trim()) {
      setVehicleFormError('Placa e Modelo do veículo são obrigatórios.');
      return;
    }

    const assignedDriver = drivers.find((d) => d.id === vehAssignedDriverId);

    if (editingVehicleId) {
      updateFleetVehicle(editingVehicleId, {
        plate: vehPlate.trim().toUpperCase(),
        model: vehModel.trim(),
        type: vehType,
        axles: vehAxles,
        year: vehYear,
        payloadCapacityTon: vehPayloadTon,
        targetConsumptionKmL: vehTargetConsumption,
        currentOdometerKm: vehOdometer,
        status: vehStatus,
        assignedDriverId: vehAssignedDriverId || undefined,
        assignedDriverName: assignedDriver?.name || undefined,
        notes: vehNotes.trim(),
      });
    } else {
      addFleetVehicle({
        plate: vehPlate.trim().toUpperCase(),
        model: vehModel.trim(),
        type: vehType,
        axles: vehAxles,
        year: vehYear,
        payloadCapacityTon: vehPayloadTon,
        targetConsumptionKmL: vehTargetConsumption,
        currentOdometerKm: vehOdometer,
        status: vehStatus,
        assignedDriverId: vehAssignedDriverId || undefined,
        assignedDriverName: assignedDriver?.name || undefined,
        notes: vehNotes.trim(),
      });
    }

    playSuccessChime();
    refreshData();
    setIsVehicleFormOpen(false);
  };

  // Delete Vehicle (inline confirmation, iframe-safe)
  const handleConfirmDeleteVehicle = (vehId: string) => {
    playCockpitClick();
    deleteFleetVehicle(vehId);
    setConfirmDeleteVehicleId(null);
    refreshData();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0f172a] via-[#152031] to-[#1e293b] border-b border-[#334155] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#081425] border-1.5 border-[#f59e0b] flex items-center justify-center text-[#f59e0b] shadow-md shadow-amber-500/10">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-extrabold text-[#d8e3fb]">
                  Gestão de Frota & Motoristas
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#ef4444] text-white">
                  Exclusivo Administrador
                </span>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Cadastre veículos de 2 a 9 eixos, crie acessos de motoristas e restrinja permissões somente ao operacional.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="w-10 h-10 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 bg-[#0c1322] border-b border-[#334155] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playCockpitClick();
                setActiveTab('motoristas');
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'motoristas'
                  ? 'border-[#f59e0b] text-[#ffb95f]'
                  : 'border-transparent text-[#94a3b8] hover:text-[#d8e3fb]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Motoristas & Acessos ({drivers.length})</span>
            </button>

            <button
              onClick={() => {
                playCockpitClick();
                setActiveTab('veiculos');
              }}
              className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'veiculos'
                  ? 'border-[#f59e0b] text-[#ffb95f]'
                  : 'border-transparent text-[#94a3b8] hover:text-[#d8e3fb]'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Veículos da Frota ({vehicles.length})</span>
            </button>
          </div>

          <div className="pb-2">
            {activeTab === 'motoristas' ? (
              <button
                onClick={handleOpenNewDriver}
                className="h-9 px-3.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Cadastrar Novo Motorista</span>
              </button>
            ) : (
              <button
                onClick={handleOpenNewVehicle}
                className="h-9 px-3.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Cadastrar Novo Veículo</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: MOTORISTAS */}
          {activeTab === 'motoristas' && (
            <div className="space-y-4">
              {/* Security Policy Reminder Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#003824]/60 via-[#152031] to-[#081425] border border-[#10b981]/50 flex items-start gap-3 text-xs text-[#a7f3d0]">
                <BadgeCheck className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold text-[#4edea3] block text-xs">
                    Política de Acesso: Funções Exclusivas de Motorista
                  </span>
                  <p className="text-[11px] text-[#bec6e0] leading-relaxed">
                    Motoristas cadastrados por você possuem permissão <strong>estritamente operacional</strong>. Ao logarem com o e-mail e senha criados aqui, eles acessam apenas o velocímetro, rotas no Maps, odômetro, lançamentos de diesel e despesas, e tacógrafo. <strong>Não têm acesso</strong> a zerar dados, banco Supabase, backups ou relatórios financeiros de margem de lucro.
                  </p>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar motorista por nome, e-mail, placa ou CPF..."
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl pl-9 pr-3 text-xs text-[#d8e3fb] outline-hidden font-medium"
                  />
                  <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-3.5" />
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
                  <button
                    onClick={() => setDriverStatusFilter('todos')}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      driverStatusFilter === 'todos'
                        ? 'bg-[#1e293b] text-[#ffb95f] border border-[#f59e0b]/50'
                        : 'bg-[#081425] text-[#94a3b8] hover:text-[#d8e3fb]'
                    }`}
                  >
                    Todos ({drivers.length})
                  </button>
                  <button
                    onClick={() => setDriverStatusFilter('ativo')}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      driverStatusFilter === 'ativo'
                        ? 'bg-[#003824] text-[#34d399] border border-[#10b981]/50'
                        : 'bg-[#081425] text-[#94a3b8] hover:text-[#d8e3fb]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Ativos ({drivers.filter((d) => d.status !== 'bloqueado').length})</span>
                  </button>
                  <button
                    onClick={() => setDriverStatusFilter('bloqueado')}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      driverStatusFilter === 'bloqueado'
                        ? 'bg-[#450a0a] text-[#fca5a5] border border-[#ef4444]/50'
                        : 'bg-[#081425] text-[#94a3b8] hover:text-[#d8e3fb]'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Bloqueados ({drivers.filter((d) => d.status === 'bloqueado').length})</span>
                  </button>
                </div>
              </div>

              {/* Drivers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDrivers.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-[#94a3b8] bg-[#081425] border border-[#334155] rounded-xl p-6">
                    <Users className="w-10 h-10 text-[#475569] mx-auto mb-2" />
                    <p className="font-bold text-[#d8e3fb]">Nenhum motorista encontrado.</p>
                    <p className="text-[11px] text-[#94a3b8] mt-1">
                      Clique no botão "Cadastrar Novo Motorista" para adicionar e liberar acesso.
                    </p>
                  </div>
                ) : (
                  filteredDrivers.map((driver) => {
                    const isBlocked = driver.status === 'bloqueado';
                    const isCopied = copiedDriverId === driver.id;
                    const resolvedFns = getDriverFunctions(driver);
                    const activeFnCount = Object.values(resolvedFns).filter(Boolean).length;
                    const totalFnCount = Object.keys(DEFAULT_DRIVER_FUNCTIONS).length;
                    const hasHelper = Boolean(driver.hasFreightHelper);

                    return (
                      <div
                        key={driver.id}
                        className={`bg-[#081425] border rounded-xl p-4 transition-all relative space-y-3 ${
                          isBlocked
                            ? 'border-[#ef4444]/40 bg-[#1f0b0e]/30'
                            : 'border-[#334155] hover:border-[#475569]'
                        }`}
                      >
                        {/* Driver Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                isBlocked
                                  ? 'bg-[#450a0a] text-[#ef4444] border border-[#ef4444]/50'
                                  : 'bg-[#0c4a6e] text-[#38bdf8] border border-[#0284c7]/40'
                              }`}
                            >
                              {driver.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-extrabold text-sm text-[#d8e3fb] truncate max-w-[200px]">
                                  {driver.name}
                                </h3>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    isBlocked
                                      ? 'bg-[#450a0a] text-[#ef4444] border border-[#ef4444]/40'
                                      : 'bg-[#003824] text-[#34d399] border border-[#10b981]/40'
                                  }`}
                                >
                                  {isBlocked ? 'Acesso Bloqueado' : 'Acesso Ativo'}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#94a3b8] font-mono flex items-center gap-1">
                                <Mail className="w-3 h-3 text-[#f59e0b]" />
                                {driver.email}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono font-bold bg-[#1e293b] text-[#bec6e0] px-2 py-0.5 rounded border border-[#334155]">
                            {driver.contractType === 'autonomo_tac'
                              ? 'TAC / Autônomo'
                              : driver.contractType === 'agregado'
                              ? 'Agregado'
                              : 'CLT Frota'}
                          </span>
                        </div>

                        {/* Driver Specs & Details */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-lg bg-[#152031]/80 border border-[#334155]/60">
                          <div>
                            <span className="text-[#94a3b8] text-[10px] block">Veículo Designado:</span>
                            <span className="font-bold text-[#ffb95f] truncate block">
                              {driver.truckModel || 'Nenhum caminhão'}
                            </span>
                            <span className="text-[10px] text-[#94a3b8] font-mono">
                              Placa: {driver.truckPlate || 'S/ Placa'}
                            </span>
                          </div>

                          <div>
                            <span className="text-[#94a3b8] text-[10px] block">CNH & Documentos:</span>
                            <span className="font-bold text-[#d8e3fb] block">
                              Cat. {driver.cnhCategory || 'E'} {driver.hasEar ? '• EAR' : ''}
                            </span>
                            <span className="text-[10px] text-[#94a3b8] font-mono">
                              {driver.cnhDueDate ? `Vence: ${driver.cnhDueDate}` : 'Validade não informada'}
                            </span>
                          </div>
                        </div>

                        {/* Driver-Only Functions & Freight Helper Summary Strip */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0c1322] border border-[#334155]/70 text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#1e293b] text-[#38bdf8] border border-[#38bdf8]/30 font-bold flex items-center gap-1">
                              <Sliders className="w-3 h-3" />
                              Somente Motorista ({activeFnCount}/{totalFnCount})
                            </span>

                            <button
                              type="button"
                              onClick={() => handleQuickToggleHelper(driver.id)}
                              title="Clique para alternar se este motorista opera com ajudante no frete ou sozinho"
                              className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                hasHelper
                                  ? 'bg-[#472a00] text-[#ffb95f] border border-[#f59e0b]/50 hover:bg-[#5c3700]'
                                  : 'bg-[#1e293b] text-[#94a3b8] border border-[#334155] hover:text-[#d8e3fb]'
                              }`}
                            >
                              {hasHelper ? (
                                <>
                                  <UserCheck className="w-3 h-3 text-[#ffb95f]" />
                                  <span>
                                    Com Ajudante
                                    {driver.freightHelperDailyCost ? ` (R$ ${driver.freightHelperDailyCost})` : ''}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <UserMinus className="w-3 h-3" />
                                  <span>Sem Ajudante (Solo)</span>
                                </>
                              )}
                            </button>
                          </div>

                          {onActivateDriverSession && !isBlocked && (
                            <button
                              type="button"
                              onClick={() => {
                                playSuccessChime();
                                onActivateDriverSession(driver);
                                onClose();
                              }}
                              className="px-2.5 py-1 rounded-md bg-[#003824] hover:bg-[#004d32] border border-[#10b981]/60 text-[#34d399] font-extrabold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                              title="Ativar sessão deste motorista com funções operacionais apenas"
                            >
                              <PlayCircle className="w-3 h-3" />
                              <span>Ativar Motorista</span>
                            </button>
                          )}
                        </div>

                        {/* Inline Delete Confirmation */}
                        {confirmDeleteDriverId === driver.id ? (
                          <div className="p-2.5 rounded-lg bg-[#450a0a] border border-[#ef4444] flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#fca5a5] font-bold">
                              Excluir {driver.name.split(' ')[0]}?
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDriverId(null)}
                                className="px-2.5 py-1 rounded bg-[#1e293b] text-[#d8e3fb] font-bold cursor-pointer"
                              >
                                Não
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmDeleteDriver(driver.id)}
                                className="px-2.5 py-1 rounded bg-[#ef4444] text-white font-black cursor-pointer"
                              >
                                Sim, Excluir
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Action buttons row */
                          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#334155]/50 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleCopyAccess(driver)}
                              className="h-8 px-2.5 rounded-lg bg-[#0c4a6e] hover:bg-[#0284c7] text-[#38bdf8] hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                              title="Copiar mensagem com login e senha prontos para enviar ao motorista"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-[#34d399]" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Copiado p/ WhatsApp!' : 'Copiar Acesso'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(driver.id)}
                                className={`h-8 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  isBlocked
                                    ? 'bg-[#003824] hover:bg-[#004d32] text-[#34d399] border border-[#10b981]/50'
                                    : 'bg-[#450a0a] hover:bg-[#690005] text-[#fca5a5] border border-[#ef4444]/50'
                                }`}
                                title={isBlocked ? 'Reativar acesso do motorista' : 'Bloquear temporariamente acesso do motorista'}
                              >
                                {isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditDriver(driver)}
                                className="h-8 w-8 rounded-lg bg-[#1e293b] hover:bg-[#243248] text-[#bec6e0] hover:text-[#ffb95f] flex items-center justify-center cursor-pointer transition-colors"
                                title="Editar dados e funções do motorista"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  playCockpitClick();
                                  setConfirmDeleteDriverId(driver.id);
                                }}
                                className="h-8 w-8 rounded-lg bg-[#1e293b] hover:bg-[#450a0a] text-[#94a3b8] hover:text-[#ef4444] flex items-center justify-center cursor-pointer transition-colors"
                                title="Excluir motorista"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: VEÍCULOS DA FROTA */}
          {activeTab === 'veiculos' && (
            <div className="space-y-4">
              {/* Category Quick Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar veículo por placa, modelo ou tipo..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl pl-9 pr-3 text-xs text-[#d8e3fb] outline-hidden font-medium"
                  />
                  <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-3.5" />
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
                  <button
                    onClick={() => setVehicleAxlesFilter('todos')}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      vehicleAxlesFilter === 'todos'
                        ? 'bg-[#1e293b] text-[#ffb95f] border border-[#f59e0b]/50'
                        : 'bg-[#081425] text-[#94a3b8] hover:text-[#d8e3fb]'
                    }`}
                  >
                    Todos ({vehicles.length})
                  </button>
                  <button
                    onClick={() => setVehicleAxlesFilter('2')}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      vehicleAxlesFilter === '2'
                        ? 'bg-[#003824] text-[#34d399] border border-[#10b981]/50'
                        : 'bg-[#081425] text-[#94a3b8] hover:text-[#d8e3fb]'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5 text-[#34d399]" />
                    <span>2 Eixos (VUC / Delivery / HR)</span>
                  </button>
                  <button
                    onClick={() => setVehicleAxlesFilter('3_4')}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      vehicleAxlesFilter === '3_4'
                        ? 'bg-[#0c4a6e] text-[#38bdf8] border border-[#0284c7]/50'
                        : 'bg-[#081425] text-[#94a3b8] hover:text-[#d8e3fb]'
                    }`}
                  >
                    3 & 4 Eixos
                  </button>
                  <button
                    onClick={() => setVehicleAxlesFilter('pesados')}
                    className={`px-3 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      vehicleAxlesFilter === 'pesados'
                        ? 'bg-[#3b0764] text-[#d8b4fe] border border-[#7c3aed]/50'
                        : 'bg-[#081425] text-[#94a3b8] hover:text-[#d8e3fb]'
                    }`}
                  >
                    Pesados (5 a 9E)
                  </button>
                </div>
              </div>

              {/* Vehicles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredVehicles.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-[#94a3b8] bg-[#081425] border border-[#334155] rounded-xl p-6">
                    <Truck className="w-10 h-10 text-[#475569] mx-auto mb-2" />
                    <p className="font-bold text-[#d8e3fb]">Nenhum veículo encontrado.</p>
                    <p className="text-[11px] text-[#94a3b8] mt-1">
                      Cadastre novos caminhões leves de 2 eixos ou pesados clicando em "Cadastrar Novo Veículo".
                    </p>
                  </div>
                ) : (
                  filteredVehicles.map((veh) => {
                    return (
                      <div
                        key={veh.id}
                        className="bg-[#081425] border border-[#334155] hover:border-[#475569] rounded-xl p-4 transition-all relative flex flex-col justify-between space-y-3"
                      >
                        <div>
                          {/* Top Tag & Plate */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="bg-[#152031] border border-[#475569] rounded-lg px-2.5 py-1 text-center shadow-xs">
                              <span className="text-[9px] uppercase font-bold text-[#94a3b8] block tracking-widest">
                                BRASIL
                              </span>
                              <span className="text-sm font-black font-mono text-[#ffb95f] tracking-wider">
                                {veh.plate}
                              </span>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                                  veh.axles === 2
                                    ? 'bg-[#003824] text-[#34d399] border border-[#10b981]/40'
                                    : veh.axles <= 4
                                    ? 'bg-[#0c4a6e] text-[#38bdf8] border border-[#0284c7]/40'
                                    : 'bg-[#3b0764] text-[#d8b4fe] border border-[#7c3aed]/40'
                                }`}
                              >
                                {veh.axles} Eixos
                              </span>

                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                  veh.status === 'operacional' || veh.status === 'em_viagem'
                                    ? 'bg-[#003824] text-[#4edea3]'
                                    : veh.status === 'manutencao'
                                    ? 'bg-[#450a0a] text-[#ef4444]'
                                    : 'bg-[#1e293b] text-[#94a3b8]'
                                }`}
                              >
                                {veh.status === 'operacional'
                                  ? 'Operacional'
                                  : veh.status === 'em_viagem'
                                  ? 'Em Viagem'
                                  : veh.status === 'manutencao'
                                  ? 'Oficina'
                                  : 'Disponível'}
                              </span>
                            </div>
                          </div>

                          <h3 className="font-extrabold text-sm text-[#d8e3fb] leading-tight">
                            {veh.model}
                          </h3>
                          <p className="text-[11px] text-[#94a3b8] mt-0.5">{veh.type}</p>

                          {/* Stats Metrics */}
                          <div className="grid grid-cols-2 gap-2 mt-3 p-2 bg-[#152031] rounded-lg border border-[#334155]/60 text-xs">
                            <div>
                              <span className="text-[10px] text-[#94a3b8] block">Meta Consumo:</span>
                              <span className="font-mono font-bold text-[#ffb95f]">
                                {veh.targetConsumptionKmL} km/L
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#94a3b8] block">Capacidade PBT:</span>
                              <span className="font-mono font-bold text-[#34d399]">
                                {veh.payloadCapacityTon} ton
                              </span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-[#334155]/50 flex items-center justify-between text-[11px]">
                              <span className="text-[#94a3b8]">Odômetro:</span>
                              <span className="font-mono font-bold text-[#d8e3fb]">
                                {veh.currentOdometerKm.toLocaleString('pt-BR')} km
                              </span>
                            </div>
                          </div>

                          {veh.assignedDriverName && (
                            <div className="mt-2 text-[11px] text-[#bec6e0] flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#38bdf8]" />
                              <span>Condutor: <strong className="text-white">{veh.assignedDriverName}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Vehicle Card Actions */}
                        {confirmDeleteVehicleId === veh.id ? (
                          <div className="p-2.5 rounded-lg bg-[#450a0a] border border-[#ef4444] flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#fca5a5] font-bold">
                              Remover {veh.plate}?
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteVehicleId(null)}
                                className="px-2 py-1 rounded bg-[#1e293b] text-[#d8e3fb] font-bold cursor-pointer"
                              >
                                Não
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmDeleteVehicle(veh.id)}
                                className="px-2 py-1 rounded bg-[#ef4444] text-white font-black cursor-pointer"
                              >
                                Sim
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#334155]/60">
                            {onSelectVehicleForTrip && (
                              <button
                                type="button"
                                onClick={() => {
                                  playSuccessChime();
                                  onSelectVehicleForTrip(veh);
                                  onClose();
                                }}
                                className="h-8 px-2.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                                title="Definir este veículo como ativo no Cockpit"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Ativar na Rota</span>
                              </button>
                            )}

                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={() => handleOpenEditVehicle(veh)}
                                className="h-8 w-8 rounded-lg bg-[#1e293b] hover:bg-[#243248] text-[#bec6e0] hover:text-[#ffb95f] flex items-center justify-center cursor-pointer transition-colors"
                                title="Editar veículo"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  playCockpitClick();
                                  setConfirmDeleteVehicleId(veh.id);
                                }}
                                className="h-8 w-8 rounded-lg bg-[#1e293b] hover:bg-[#450a0a] text-[#94a3b8] hover:text-[#ef4444] flex items-center justify-center cursor-pointer transition-colors"
                                title="Excluir veículo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-[#081425] border-t border-[#334155] flex items-center justify-between text-xs text-[#94a3b8] flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#f59e0b]" />
            <span>Módulo de Controle da Frota e Credenciais Operacionais</span>
          </div>
          <button
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#d8e3fb] font-bold text-xs cursor-pointer transition-colors"
          >
            Fechar Painel
          </button>
        </div>
      </div>

      {/* SUB-MODAL: CADASTRO / EDIÇÃO DE MOTORISTA */}
      {isDriverFormOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 animate-in zoom-in-95 duration-150">
          <div className="bg-[#152031] border border-[#f59e0b]/50 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#10b981] text-[#10b981] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#d8e3fb]">
                    {editingDriverId ? 'Editar Motorista' : 'Cadastrar Novo Motorista'}
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Acesso operacional com funções restritas a rotas, odômetro e tacógrafo.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDriverFormOpen(false)}
                className="w-9 h-9 rounded-xl bg-[#1e293b] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {driverFormError && (
              <div className="p-3 rounded-xl bg-[#450a0a] border border-[#ef4444] text-[#fca5a5] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{driverFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDriver} className="space-y-3.5">
              {/* Nome & E-mail */}
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Nome Completo do Motorista *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 text-[#d8e3fb] text-xs font-semibold outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    E-mail de Acesso (Login) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ex: carlos@estrada.com.br"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 text-[#d8e3fb] text-xs font-semibold outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center justify-between">
                    <span>Senha de Acesso *</span>
                    <button
                      type="button"
                      onClick={() => setDriverPassword(`estrada${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-[10px] text-[#ffb95f] hover:underline cursor-pointer"
                    >
                      Gerar Nova
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showDriverPassword ? 'text' : 'password'}
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={driverPassword}
                      onChange={(e) => setDriverPassword(e.target.value)}
                      className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 pr-10 text-[#d8e3fb] font-mono text-xs outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDriverPassword(!showDriverPassword)}
                      className="absolute right-3 top-3 text-[#94a3b8] hover:text-white cursor-pointer"
                    >
                      {showDriverPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Telefone & CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Telefone / WhatsApp (Para envio de rota)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (45) 99876-5432"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    CPF do Motorista
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 000.000.000-00"
                    value={driverCpf}
                    onChange={(e) => setDriverCpf(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs outline-hidden"
                  />
                </div>
              </div>

              {/* CNH & Validades */}
              <div className="p-3 bg-[#081425] rounded-xl border border-[#334155] space-y-3">
                <span className="text-[11px] font-black text-[#ffb95f] uppercase tracking-wider block">
                  Documentação & Vencimentos (Fiscalização CTB / PRF)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1">
                      Número CNH
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 01234567890"
                      value={driverCnhNumber}
                      onChange={(e) => setDriverCnhNumber(e.target.value)}
                      className="w-full h-10 bg-[#152031] border border-[#334155] rounded-lg px-2.5 text-xs text-[#d8e3fb] font-mono outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1">
                      Categoria CNH
                    </label>
                    <select
                      value={driverCnhCategory}
                      onChange={(e) => setDriverCnhCategory(e.target.value)}
                      className="w-full h-10 bg-[#152031] border border-[#334155] rounded-lg px-2 text-xs text-[#d8e3fb] font-bold outline-hidden"
                    >
                      <option value="B">B (VUC / Leves até 3.5t)</option>
                      <option value="C">C (Caminhões acima de 3.5t)</option>
                      <option value="D">D (Transporte Passageiros)</option>
                      <option value="E">E (Carretas, Bitrens, Articulados)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1">
                      Possui EAR?
                    </label>
                    <button
                      type="button"
                      onClick={() => setDriverHasEar(!driverHasEar)}
                      className={`w-full h-10 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        driverHasEar
                          ? 'bg-[#003824] text-[#34d399] border border-[#10b981]/50'
                          : 'bg-[#152031] text-[#94a3b8] border border-[#334155]'
                      }`}
                    >
                      {driverHasEar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      <span>{driverHasEar ? 'Sim (Com EAR)' : 'Não'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1">
                      Data de Vencimento da CNH
                    </label>
                    <input
                      type="date"
                      value={driverCnhDueDate}
                      onChange={(e) => setDriverCnhDueDate(e.target.value)}
                      className="w-full h-10 bg-[#152031] border border-[#334155] rounded-lg px-2.5 text-xs text-[#d8e3fb] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1">
                      Vencimento do Toxicológico (Art. 148-A)
                    </label>
                    <input
                      type="date"
                      value={driverToxicologyDueDate}
                      onChange={(e) => setDriverToxicologyDueDate(e.target.value)}
                      className="w-full h-10 bg-[#152031] border border-[#334155] rounded-lg px-2.5 text-xs text-[#d8e3fb] outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Veículo Vinculado, Categoria Motorista & Vínculo Contratual */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Vincular Veículo da Frota
                  </label>
                  <select
                    value={driverAssignedVehicleId}
                    onChange={(e) => setDriverAssignedVehicleId(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-2.5 text-xs text-[#d8e3fb] font-semibold outline-hidden"
                  >
                    <option value="">Nenhum veículo vinculado (Definir na viagem)</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.model} - {v.plate} ({v.axles} Eixos)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Perfil (Somente Motorista)
                  </label>
                  <select
                    value={driverRole}
                    onChange={(e) => setDriverRole(e.target.value as UserRole)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-2.5 text-xs text-[#d8e3fb] font-semibold outline-hidden"
                  >
                    <option value="motorista">Motorista (Operacional Frota)</option>
                    <option value="motorista_autonomo">Motorista Autônomo (TAC)</option>
                    <option value="motorista_agregado">Motorista Agregado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Vínculo Contratual
                  </label>
                  <select
                    value={driverContractType}
                    onChange={(e) => setDriverContractType(e.target.value as any)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-2.5 text-xs text-[#d8e3fb] font-semibold outline-hidden"
                  >
                    <option value="clt">CLT / Motorista Próprio</option>
                    <option value="autonomo_tac">Motorista Autônomo (TAC / RNTRC)</option>
                    <option value="agregado">Motorista Agregado</option>
                  </select>
                </div>
              </div>

              {/* Ajudante no Frete (Sim ou Não) */}
              <div className="p-3.5 rounded-xl bg-[#081425] border border-[#f59e0b]/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-[#ffb95f] uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#f59e0b]" />
                      Tem Ajudante no Frete?
                    </span>
                    <span className="text-[11px] text-[#94a3b8] block mt-0.5">
                      Define se o motorista viaja com ajudante/chapa na operação ou sozinho (solo).
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#152031] p-1 rounded-xl border border-[#334155]">
                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setDriverHasFreightHelper(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                        !driverHasFreightHelper
                          ? 'bg-[#334155] text-white shadow-xs'
                          : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                      }`}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Não (Solo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setDriverHasFreightHelper(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                        driverHasFreightHelper
                          ? 'bg-[#f59e0b] text-[#081425] shadow-xs'
                          : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sim (Com Ajudante)</span>
                    </button>
                  </div>
                </div>

                {driverHasFreightHelper && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#334155]/60">
                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1">
                        Nome / Identificação do Ajudante
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: João Silva / Ajudante Fixo"
                        value={driverHelperName}
                        onChange={(e) => setDriverHelperName(e.target.value)}
                        className="w-full h-10 bg-[#152031] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-2.5 text-xs text-[#d8e3fb] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1">
                        Diária / Custo do Ajudante no Frete (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={driverHelperDailyCost}
                        onChange={(e) => setDriverHelperDailyCost(parseFloat(e.target.value) || 0)}
                        className="w-full h-10 bg-[#152031] border border-[#f59e0b]/40 focus:border-[#f59e0b] rounded-lg px-2.5 text-xs font-mono font-bold text-[#ffb95f] outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Ativar Funções de Motorista Apenas (Permissões Operacionais) */}
              <div className="p-3.5 rounded-xl bg-[#081425] border border-[#10b981]/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-[#34d399] uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-[#10b981]" />
                      Ativar Funções de Motorista Apenas
                    </span>
                    <span className="text-[11px] text-[#94a3b8] block mt-0.5">
                      Privilégios Administrativos (Supabase, Backup, Zerar Dados) permanecem bloqueados.
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setDriverFunctions({ ...DEFAULT_DRIVER_FUNCTIONS });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#003824] hover:bg-[#004d32] border border-[#10b981]/50 text-[#34d399] text-[10px] font-extrabold cursor-pointer"
                    >
                      Ativar Todas (6/6)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playCockpitClick();
                        setDriverFunctions({
                          routeAndMaps: true,
                          fuelAndExpenses: true,
                          tachographAndShift: true,
                          maintenanceAndChecklist: false,
                          weatherAndProductivity: false,
                          freightSimulator: false,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-[#cbd5e1] text-[10px] font-bold cursor-pointer"
                    >
                      Básico (Estrada)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DRIVER_FUNCTION_DEFINITIONS.map((fnDef) => {
                    const enabled = driverFunctions[fnDef.key];
                    return (
                      <button
                        key={fnDef.key}
                        type="button"
                        onClick={() => {
                          playCockpitClick();
                          setDriverFunctions((prev) => ({
                            ...prev,
                            [fnDef.key]: !prev[fnDef.key],
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2 ${
                          enabled
                            ? 'bg-[#003824]/40 border-[#10b981]/50 text-[#d8e3fb]'
                            : 'bg-[#152031]/70 border-[#334155] text-[#94a3b8]'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-[11px] font-extrabold block text-[#d8e3fb]">
                            {fnDef.label}
                          </span>
                          <span className="text-[10px] text-[#94a3b8] leading-snug block mt-0.5">
                            {fnDef.description}
                          </span>
                        </div>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            enabled
                              ? 'bg-[#10b981] text-[#022c22]'
                              : 'bg-[#1e293b] text-[#64748b]'
                          }`}
                        >
                          {enabled ? 'Ativa' : 'Off'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status do Acesso */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#081425] border border-[#334155]">
                <div>
                  <span className="text-xs font-bold text-[#d8e3fb] block">Status do Acesso de Motorista</span>
                  <span className="text-[11px] text-[#94a3b8]">
                    {driverStatus === 'ativo'
                      ? 'Liberado para login imediato com funções de motorista'
                      : 'Bloqueado temporariamente pelo Administrador'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setDriverStatus(driverStatus === 'ativo' ? 'bloqueado' : 'ativo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    driverStatus === 'ativo'
                      ? 'bg-[#003824] text-[#34d399] border border-[#10b981]/50'
                      : 'bg-[#450a0a] text-[#fca5a5] border border-[#ef4444]/50'
                  }`}
                >
                  {driverStatus === 'ativo' ? 'Acesso Ativo' : 'Acesso Bloqueado'}
                </button>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDriverFormOpen(false)}
                  className="flex-1 h-12 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingDriverId ? 'Salvar Alterações' : 'Salvar & Liberar Acesso'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: CADASTRO / EDIÇÃO DE VEÍCULO */}
      {isVehicleFormOpen && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 animate-in zoom-in-95 duration-150">
          <div className="bg-[#152031] border border-[#f59e0b]/50 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 shadow-2xl flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#f59e0b] text-[#f59e0b] flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#d8e3fb]">
                    {editingVehicleId ? 'Editar Veículo da Frota' : 'Cadastrar Novo Veículo'}
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Cadastre desde veículos de 2 eixos (HR, Delivery) até conjuntos pesados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVehicleFormOpen(false)}
                className="w-9 h-9 rounded-xl bg-[#1e293b] text-[#94a3b8] hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {vehicleFormError && (
              <div className="p-3 rounded-xl bg-[#450a0a] border border-[#ef4444] text-[#fca5a5] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{vehicleFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveVehicle} className="space-y-3.5">
              {/* Modelo & Placa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Placa do Veículo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BRA-2026"
                    value={vehPlate}
                    onChange={(e) => setVehPlate(e.target.value.toUpperCase())}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 font-mono font-black text-sm text-[#ffb95f] uppercase outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Modelo do Caminhão *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Hyundai HR 2.5 Turbo, VW Delivery..."
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 font-bold text-xs text-[#d8e3fb] outline-hidden"
                  />
                </div>
              </div>

              {/* Tipo de Conjunto & Eixos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Tipo de Conjunto
                  </label>
                  <select
                    value={vehType}
                    onChange={(e) => setVehType(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] rounded-xl px-2.5 text-xs text-[#d8e3fb] font-semibold outline-hidden"
                  >
                    <option value="VUC / Utilitário 2 Eixos">VUC / Utilitário 2 Eixos (HR, Bongo, Delivery Express)</option>
                    <option value="Caminhão Leve/Médio 2 Eixos">Caminhão 2 Eixos (Delivery 9.170, 11.180, Accelo)</option>
                    <option value="Toco 2 Eixos">Toco 2 Eixos (Constellation 17.190, Atego 1719)</option>
                    <option value="Truck 3 Eixos (6x2)">Truck 3 Eixos 6x2 (Constellation 24.280, Atego 2426)</option>
                    <option value="Bitruck 4 Eixos (8x2)">Bitruck 4 Eixos 8x2 (Volvo VM 330, Scania P360)</option>
                    <option value="Carreta LS 6 Eixos">Carreta LS 6 Eixos (Cavalo 6x2 + Semirreboque 3E)</option>
                    <option value="Bitrem 7 Eixos">Bitrem 7 Eixos (Cavalo 6x4 + 2 Semirreboques)</option>
                    <option value="Rodotrem 9 Eixos">Rodotrem 9 Eixos (Dolly + 2 Semirreboques)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Eixos (Para Cálculo de Pedágio)
                  </label>
                  <select
                    value={vehAxles}
                    onChange={(e) => setVehAxles(Number(e.target.value) as VehicleAxles)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] rounded-xl px-2.5 text-xs text-[#d8e3fb] font-bold outline-hidden"
                  >
                    <option value={2}>2 Eixos (VUC, Delivery, HR, Toco)</option>
                    <option value={3}>3 Eixos (Truck 6x2)</option>
                    <option value={4}>4 Eixos (Bitruck 8x2)</option>
                    <option value={5}>5 Eixos (Carreta 2E)</option>
                    <option value={6}>6 Eixos (Carreta LS 3E)</option>
                    <option value={7}>7 Eixos (Bitrem 7E)</option>
                    <option value={9}>9 Eixos (Rodotrem 9E)</option>
                  </select>
                </div>
              </div>

              {/* Meta de Consumo & Capacidade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#ffb95f] uppercase mb-1">
                    Meta Consumo (km/L)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="30"
                    required
                    value={vehTargetConsumption}
                    onChange={(e) => setVehTargetConsumption(parseFloat(e.target.value) || 2.3)}
                    className="w-full h-11 bg-[#081425] border-1.5 border-[#f59e0b]/50 focus:border-[#f59e0b] rounded-xl px-3 font-mono font-black text-xs text-[#ffb95f] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Capacidade PBT (ton)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    required
                    value={vehPayloadTon}
                    onChange={(e) => setVehPayloadTon(parseFloat(e.target.value) || 10)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] rounded-xl px-3 font-mono font-bold text-xs text-[#d8e3fb] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Odômetro Atual (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={vehOdometer}
                    onChange={(e) => setVehOdometer(parseInt(e.target.value) || 0)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] rounded-xl px-3 font-mono font-bold text-xs text-[#d8e3fb] outline-hidden"
                  />
                </div>
              </div>

              {/* Motorista Alocado & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Alocar Motorista
                  </label>
                  <select
                    value={vehAssignedDriverId}
                    onChange={(e) => setVehAssignedDriverId(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] rounded-xl px-2.5 text-xs text-[#d8e3fb] font-semibold outline-hidden"
                  >
                    <option value="">Sem motorista alocado (Disponível)</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                    Status Operacional
                  </label>
                  <select
                    value={vehStatus}
                    onChange={(e) => setVehStatus(e.target.value as VehicleStatus)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] rounded-xl px-2.5 text-xs text-[#d8e3fb] font-semibold outline-hidden"
                  >
                    <option value="disponivel">Disponível no Pátio</option>
                    <option value="operacional">Operacional</option>
                    <option value="em_viagem">Em Viagem / Rota Ativa</option>
                    <option value="manutencao">Na Oficina / Manutenção</option>
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                  Observações / Tipo de Implemento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Baú refrigerado, sider, graneleiro, rastreador Omnilink..."
                  value={vehNotes}
                  onChange={(e) => setVehNotes(e.target.value)}
                  className="w-full h-11 bg-[#081425] border border-[#334155] rounded-xl px-3 text-xs text-[#d8e3fb] outline-hidden"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVehicleFormOpen(false)}
                  className="flex-1 h-12 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingVehicleId ? 'Salvar Alterações' : 'Cadastrar Veículo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const FleetManagementModal = withAdminPermission(FleetManagementModalContent, {
  resourceTitle: 'Gestão de Frota & Motoristas',
});
