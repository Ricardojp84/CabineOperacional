import React, { useState, useEffect, useRef } from 'react';
import { Trip, User, hasDriverFunction, isUserAdmin } from '../types/cockpit';
import { playCockpitClick, isSoundEnabled, setSoundEnabled } from '../utils/audio';
import {
  Truck,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Calculator,
  FileSpreadsheet,
  Route,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Edit,
  Satellite,
  Compass,
  RotateCcw,
  HardDrive,
  Database,
  BarChart3,
  Users,
  Gauge,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';

interface HeaderCockpitProps {
  trip: Trip;
  currentUser: User | null;
  isNightMode: boolean;
  onToggleNightMode: () => void;
  onOpenTripModal: () => void;
  onOpenEditTripModal: () => void;
  onOpenCalculator: () => void;
  onOpenReport: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenGpsModal: () => void;
  onOpenMapsModal: () => void;
  onOpenBackupModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenAnnualReport?: () => void;
  onOpenVehicleSettings?: () => void;
  onOpenResetData?: () => void;
  onOpenFleetManagement?: () => void;
  onOpenProductivityReport?: () => void;
}

export const HeaderCockpit: React.FC<HeaderCockpitProps> = ({
  trip,
  currentUser,
  isNightMode,
  onToggleNightMode,
  onOpenTripModal,
  onOpenEditTripModal,
  onOpenCalculator,
  onOpenReport,
  onOpenAuth,
  onLogout,
  onOpenGpsModal,
  onOpenMapsModal,
  onOpenBackupModal,
  onOpenSupabaseModal,
  onOpenAnnualReport,
  onOpenVehicleSettings,
  onOpenResetData,
  onOpenFleetManagement,
  onOpenProductivityReport,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isToolsMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isToolsMenuOpen]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playCockpitClick();
  };

  const runToolAction = (action: () => void) => {
    playCockpitClick();
    setIsToolsMenuOpen(false);
    action();
  };

  const isAdmin = isUserAdmin(currentUser);
  const canRouteMaps = hasDriverFunction(currentUser, 'routeAndMaps');
  const canFreightSim = hasDriverFunction(currentUser, 'freightSimulator');
  const canProductivity = hasDriverFunction(currentUser, 'weatherAndProductivity');

  const getRoleLabel = (role?: string) => {
    if (isAdmin) {
      return role === 'gestor_frota' ? 'Gestor de Frota' : 'Administrador';
    }
    if (role === 'motorista_agregado') return 'Motorista Agregado';
    if (role === 'motorista_autonomo') return 'Motorista Autônomo';
    return 'Somente Motorista';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#081425]/95 backdrop-blur-md border-b border-[#334155] px-3 sm:px-4 py-2.5 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Brand & Live Truck Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              if (onOpenVehicleSettings) onOpenVehicleSettings();
              else onOpenEditTripModal();
            }}
            className="flex items-center gap-2 text-left cursor-pointer group min-w-0"
            title="Clique para alterar modelo do caminhão, placa ou eixos"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0f172a] border border-[#f59e0b]/60 group-hover:border-[#f59e0b] flex items-center justify-center text-[#f59e0b] shrink-0 transition-colors">
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm tracking-wider text-[#d8e3fb] uppercase group-hover:text-[#ffb95f] transition-colors block whitespace-nowrap">
                CABINE OPERACIONAL
              </span>
              <div className="text-[11px] text-[#94a3b8] font-medium flex items-center gap-1.5">
                <span className="font-mono font-bold text-[#ffb95f] whitespace-nowrap">{trip.vehiclePlate}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[120px] sm:max-w-[180px] group-hover:text-[#d8e3fb] transition-colors">
                  {trip.vehicleModel}
                </span>
              </div>
            </div>
          </button>

          {/* Quick Route Switcher */}
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              onOpenTripModal();
            }}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#152031] hover:bg-[#1e293b] border border-[#334155] text-xs font-bold text-[#bec6e0] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Route className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="truncate max-w-[180px]">{trip.origin} ➔ {trip.destination}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
          </button>
        </div>

        {/* Streamlined Primary Actions & Tools Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden xl:flex flex-col items-end pr-2 border-r border-[#334155]/80">
            <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">
              Hora
            </span>
            <span className="font-mono tabular-nums font-extrabold text-xs text-[#ffb95f]">
              {timeStr}
            </span>
          </div>

          {isAdmin && onOpenFleetManagement && (
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                onOpenFleetManagement();
              }}
              className="h-9 px-3 bg-[#081425] hover:bg-[#152031] border border-[#f59e0b]/60 text-[#ffb95f] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Gestão de Frota & Motoristas (Administração)"
            >
              <Users className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span className="hidden md:inline">Frota & Motoristas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              onOpenReport();
            }}
            className="h-9 px-3 bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-[#d8e3fb] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            title="Relatório Financeiro da Viagem"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#ffb95f]" />
            <span className="hidden sm:inline">Balanço</span>
          </button>

          {/* Consolidated Tools & Admin Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                setIsToolsMenuOpen((prev) => !prev);
              }}
              aria-expanded={isToolsMenuOpen}
              className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                isToolsMenuOpen
                  ? 'bg-[#082f49] border-[#38bdf8]/60 text-[#38bdf8]'
                  : 'bg-[#152031] hover:bg-[#1e293b] border-[#334155] text-[#d8e3fb]'
              }`}
              title="Abrir ferramentas operacionais e administrativas"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Ferramentas</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isToolsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isToolsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0f172a] border border-[#334155] shadow-2xl p-2 z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  Operação & Navegação
                </div>

                <button
                  type="button"
                  onClick={() => runToolAction(onOpenGpsModal)}
                  className={`w-full h-9 px-2.5 rounded-lg hover:bg-[#1e293b] text-xs font-semibold text-[#4edea3] flex items-center justify-between cursor-pointer ${
                    !canRouteMaps ? 'opacity-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Satellite className="w-4 h-4" />
                    GPS Vivo
                  </span>
                  {!canRouteMaps && <Lock className="w-3.5 h-3.5 text-[#94a3b8]" />}
                </button>

                <button
                  type="button"
                  onClick={() => runToolAction(onOpenMapsModal)}
                  className={`w-full h-9 px-2.5 rounded-lg hover:bg-[#1e293b] text-xs font-semibold text-[#60a5fa] flex items-center justify-between cursor-pointer ${
                    !canRouteMaps ? 'opacity-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Compass className="w-4 h-4" />
                    Google Maps & Pedágios
                  </span>
                  {!canRouteMaps && <Lock className="w-3.5 h-3.5 text-[#94a3b8]" />}
                </button>

                {onOpenProductivityReport && (
                  <button
                    type="button"
                    onClick={() => runToolAction(onOpenProductivityReport)}
                    className={`w-full h-9 px-2.5 rounded-lg hover:bg-[#1e293b] text-xs font-semibold text-[#38bdf8] flex items-center justify-between cursor-pointer ${
                      !canProductivity ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Produtividade km/L
                    </span>
                    {!canProductivity && <Lock className="w-3.5 h-3.5 text-[#94a3b8]" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => runToolAction(onOpenCalculator)}
                  className={`w-full h-9 px-2.5 rounded-lg hover:bg-[#1e293b] text-xs font-semibold text-[#d8e3fb] flex items-center justify-between cursor-pointer ${
                    !canFreightSim ? 'opacity-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-[#4edea3]" />
                    Simulador Piso ANTT
                  </span>
                  {!canFreightSim && <Lock className="w-3.5 h-3.5 text-[#94a3b8]" />}
                </button>

                <button
                  type="button"
                  onClick={() => runToolAction(onOpenEditTripModal)}
                  className="w-full h-9 px-2.5 rounded-lg hover:bg-[#1e293b] text-xs font-semibold text-[#d8e3fb] flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-[#ffb95f]" />
                  Editar Parâmetros da Viagem
                </button>

                {isAdmin && (
                  <>
                    <div className="my-1 border-t border-[#334155]/70" />
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                      Administração & Nuvem
                    </div>

                    <button
                      type="button"
                      onClick={() => runToolAction(onOpenBackupModal)}
                      className="w-full h-9 px-2.5 rounded-lg hover:bg-[#1e293b] text-xs font-semibold text-[#38bdf8] flex items-center gap-2 cursor-pointer"
                    >
                      <HardDrive className="w-4 h-4" />
                      Backup JSON Local
                    </button>

                    <button
                      type="button"
                      onClick={() => runToolAction(onOpenSupabaseModal)}
                      className="w-full h-9 px-2.5 rounded-lg hover:bg-[#1e293b] text-xs font-semibold text-[#34d399] flex items-center gap-2 cursor-pointer"
                    >
                      <Database className="w-4 h-4" />
                      Supabase Nuvem
                    </button>

                    {onOpenAnnualReport && (
                      <button
                        type="button"
                        onClick={() => runToolAction(onOpenAnnualReport)}
                        className="w-full h-9 px-2.5 rounded-lg hover:bg-[#1e293b] text-xs font-semibold text-[#4edea3] flex items-center gap-2 cursor-pointer"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Lucro Anual
                      </button>
                    )}

                    {onOpenResetData && (
                      <button
                        type="button"
                        onClick={() => runToolAction(onOpenResetData)}
                        className="w-full h-9 px-2.5 rounded-lg hover:bg-[#450a0a] text-xs font-semibold text-[#fca5a5] flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-[#ef4444]" />
                        Zerar Dados
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* User Account Button (Login / Profile) */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-xl bg-[#152031] border border-[#334155]">
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  onOpenAuth();
                }}
                className="flex items-center gap-1.5 text-left cursor-pointer hover:opacity-90"
                title="Ver Perfil do Condutor"
              >
                <div className="w-7 h-7 rounded-lg bg-[#243248] border border-[#ffb95f] flex items-center justify-center text-[#ffb95f] font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block leading-tight">
                  <div className="text-xs font-bold text-[#d8e3fb] truncate max-w-[90px]">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-[#4edea3] font-semibold truncate max-w-[90px]">
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  onLogout();
                }}
                title="Sair / Trocar Usuário"
                className="p-1 rounded-md text-[#94a3b8] hover:text-[#ffb4ab] hover:bg-[#690005]/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                onOpenAuth();
              }}
              className="h-9 px-3 bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            title={soundOn ? 'Desativar Som Tátil do Cockpit' : 'Ativar Som Tátil do Cockpit'}
            className="w-9 h-9 rounded-xl bg-[#152031] hover:bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-[#d8e3fb] flex items-center justify-center transition-colors cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-[#f59e0b]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Night Vision Toggle */}
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              onToggleNightMode();
            }}
            title={isNightMode ? 'Modo Normal' : 'Modo Noturno (Reduz Reflexo na Cabine)'}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
              isNightMode
                ? 'bg-[#690005]/50 border-[#ea580c] text-[#ea580c]'
                : 'bg-[#152031] hover:bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:text-[#d8e3fb]'
            }`}
          >
            {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-[#38bdf8]" />}
          </button>
        </div>
      </div>
    </header>
  );
};
