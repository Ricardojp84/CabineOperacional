import React, { useState, useEffect } from 'react';
import { Trip, User, isAdminRole, isUserAdmin } from '../types/cockpit';
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
  Radio,
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
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playCockpitClick();
  };

  const isAdmin = isUserAdmin(currentUser);

  const getRoleLabel = (role?: string) => {
    if (role === 'administrador') return 'Administrador';
    if (role === 'gestor_frota') return 'Gestor de Frota';
    if (role === 'motorista_agregado') return 'Motorista Agregado';
    return 'Motorista';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#081425]/95 backdrop-blur-md border-b border-[#334155] px-3 sm:px-4 py-2.5 sm:py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Brand & Live Truck Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              if (onOpenVehicleSettings) onOpenVehicleSettings();
              else onOpenEditTripModal();
            }}
            className="flex items-center gap-2 text-left cursor-pointer group"
            title="Clique para alterar modelo do caminhão, placa ou eixos"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] border border-[#f59e0b]/60 group-hover:border-[#f59e0b] flex items-center justify-center text-[#f59e0b] shadow-md shadow-amber-500/10 shrink-0 transition-colors">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wider text-[#d8e3fb] uppercase group-hover:text-[#ffb95f] transition-colors">
                  CABINE OPERACIONAL
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#003824] text-[#4edea3] border border-[#10b981]/30">
                  <Radio className="w-2.5 h-2.5 text-[#10b981] animate-pulse" />
                  ONLINE
                </span>
              </div>
              <div className="text-[11px] text-[#94a3b8] font-medium flex items-center gap-1.5">
                <span className="font-bold text-[#ffb95f] group-hover:underline">{trip.vehiclePlate}</span>
                <span>•</span>
                <span className="truncate max-w-[130px] sm:max-w-none group-hover:text-[#d8e3fb] transition-colors">
                  {trip.vehicleModel}
                </span>
                <Edit className="w-3 h-3 text-[#94a3b8] group-hover:text-[#ffb95f] shrink-0" />
              </div>
            </div>
          </button>

          {/* Quick Route Switcher Button */}
          <button
            onClick={() => {
              playCockpitClick();
              onOpenTripModal();
            }}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#152031] hover:bg-[#1e293b] border border-[#334155] text-xs font-bold text-[#bec6e0] transition-colors cursor-pointer"
          >
            <Route className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="truncate max-w-[180px]">{trip.origin} ➔ {trip.destination}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" />
          </button>
        </div>

        {/* Cockpit Actions, User Profile & Live Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Real-time Clock for Tachograph */}
          <div className="hidden xl:flex flex-col items-end pr-2 border-r border-[#334155]/80">
            <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">
              Hora Oficial
            </span>
            <span className="font-mono font-extrabold text-sm text-[#ffb95f]">
              {timeStr}
            </span>
          </div>

          {/* GPS Live Button */}
          <button
            onClick={() => {
              playCockpitClick();
              onOpenGpsModal();
            }}
            className="h-10 px-2.5 sm:px-3 bg-[#081425] hover:bg-[#152031] border border-[#10b981]/50 text-[#4edea3] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Localização GPS em Tempo Real"
          >
            <Satellite className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">GPS Vivo</span>
          </button>

          {/* Google Maps & Pedágios Button */}
          <button
            onClick={() => {
              playCockpitClick();
              onOpenMapsModal();
            }}
            className="h-10 px-2.5 sm:px-3 bg-[#1e293b] hover:bg-[#243248] border border-[#2563eb]/50 text-[#60a5fa] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Google Maps: Roteirizador e Pedágios"
          >
            <Compass className="w-4 h-4" />
            <span className="hidden sm:inline">Google Maps</span>
          </button>

          {/* Administrative Functions: Frota & Motoristas, Backup JSON & Supabase Cloud (Admin Only) */}
          {isAdmin ? (
            <>
              <button
                onClick={() => {
                  playCockpitClick();
                  if (onOpenFleetManagement) onOpenFleetManagement();
                }}
                className="h-10 px-2.5 sm:px-3 bg-[#081425] hover:bg-[#152031] border border-[#f59e0b]/60 text-[#ffb95f] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                title="Gestão de Frota: Cadastrar Veículos e Motoristas com Acesso Restrito (Administração)"
              >
                <Users className="w-4 h-4 text-[#f59e0b]" />
                <span className="hidden md:inline">Frota & Motoristas</span>
              </button>

              <button
                onClick={() => {
                  playCockpitClick();
                  onOpenBackupModal();
                }}
                className="h-10 px-2.5 sm:px-3 bg-[#081425] hover:bg-[#152031] border border-[#38bdf8]/40 text-[#38bdf8] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Backup Local JSON: Exportar ou Importar Viagens e Despesas (Administração)"
              >
                <HardDrive className="w-4 h-4" />
                <span className="hidden lg:inline">Backup JSON</span>
              </button>

              <button
                onClick={() => {
                  playCockpitClick();
                  onOpenSupabaseModal();
                }}
                className="h-10 px-2.5 sm:px-3 bg-[#081425] hover:bg-[#152031] border border-[#10b981]/50 text-[#34d399] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Supabase: Conexão, Sincronização em Nuvem e Migrations SQL (Administração)"
              >
                <Database className="w-4 h-4 text-[#34d399]" />
                <span className="hidden sm:inline">Supabase</span>
              </button>
            </>
          ) : (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003824] border border-[#10b981]/40 text-[#4edea3] text-xs font-bold"
              title="Perfil Operacional de Motorista (Comandos de nuvem e banco restritos à administração)"
            >
              <Truck className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Modo Motorista</span>
            </div>
          )}

          {/* User Account Button (Login / Profile) */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-xl bg-[#152031] border border-[#334155]">
              <button
                onClick={() => {
                  playCockpitClick();
                  onOpenAuth();
                }}
                className="flex items-center gap-1.5 text-left cursor-pointer hover:opacity-90"
                title="Ver Perfil do Motorista"
              >
                <div className="w-8 h-8 rounded-lg bg-[#243248] border border-[#ffb95f] flex items-center justify-center text-[#ffb95f] font-bold text-xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden sm:block leading-tight">
                  <div className="text-xs font-bold text-[#d8e3fb] truncate max-w-[95px]">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-[#4edea3] font-semibold truncate max-w-[95px]">
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  playCockpitClick();
                  onLogout();
                }}
                title="Sair / Trocar Usuário"
                className="p-1 rounded-md text-[#94a3b8] hover:text-[#ffb4ab] hover:bg-[#690005]/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                playCockpitClick();
                onOpenAuth();
              }}
              className="h-10 px-3 bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            >
              <UserIcon className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}

          {/* Zerar Dados / Iniciar Operação do Zero (Função Exclusiva de Administração) */}
          {isAdmin && onOpenResetData && (
            <button
              onClick={() => {
                playCockpitClick();
                onOpenResetData();
              }}
              className="h-10 px-2.5 sm:px-3 bg-[#3f0f15] hover:bg-[#5f131c] border border-[#ef4444]/50 text-[#fca5a5] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Zerar todos os dados lançados para incluir sua rota e custos do zero (Função Administrativa)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#ef4444]" />
              <span className="hidden lg:inline">Zerar Dados</span>
            </button>
          )}

          {/* Edit Active Trip (CRUD Update) */}
          <button
            onClick={() => {
              playCockpitClick();
              onOpenEditTripModal();
            }}
            className="h-10 px-2.5 sm:px-3 bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-[#d8e3fb] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Editar Parâmetros da Viagem (CRUD)"
          >
            <Edit className="w-3.5 h-3.5 text-[#ffb95f]" />
            <span className="hidden md:inline">Editar</span>
          </button>

          {/* ANTT Simulator Quick Action */}
          <button
            onClick={() => {
              playCockpitClick();
              onOpenCalculator();
            }}
            className="h-10 px-2.5 sm:px-3 bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-[#d8e3fb] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Simulador de Piso Mínimo ANTT"
          >
            <Calculator className="w-4 h-4 text-[#4edea3]" />
            <span className="hidden md:inline">ANTT</span>
          </button>

          {/* Financial Closing Report Action */}
          <button
            onClick={() => {
              playCockpitClick();
              onOpenReport();
            }}
            className="h-10 px-2.5 sm:px-3 bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-[#d8e3fb] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Relatório Financeiro da Viagem"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#ffb95f]" />
            <span className="hidden md:inline">Balanço</span>
          </button>

          {/* Annual Profit Report Action with Recharts (Admin Only) */}
          {isAdmin && onOpenAnnualReport && (
            <button
              onClick={() => {
                playCockpitClick();
                onOpenAnnualReport();
              }}
              className="h-10 px-2.5 sm:px-3 bg-[#081425] hover:bg-[#152031] border border-[#10b981]/50 text-[#4edea3] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Relatório Anual de Lucro: Gráfico Recharts de Viagens Finalizadas do Supabase (Administração)"
            >
              <BarChart3 className="w-4 h-4 text-[#10b981]" />
              <span className="hidden md:inline">Lucro Anual</span>
            </button>
          )}

          {/* Sound Toggle (Comando do Cockpit: Admin Only) */}
          {isAdmin && (
            <button
              onClick={handleToggleSound}
              title={soundOn ? 'Desativar Som Tátil (Comando Admin)' : 'Ativar Som Tátil (Comando Admin)'}
              className="w-10 h-10 rounded-xl bg-[#152031] hover:bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-[#d8e3fb] flex items-center justify-center transition-colors cursor-pointer"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-[#f59e0b]" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}

          {/* Night Vision / Antirreflexo Mode Toggle */}
          <button
            onClick={() => {
              playCockpitClick();
              onToggleNightMode();
            }}
            title={isNightMode ? 'Modo Normal' : 'Modo Noturno (Reduz Reflexo na Cabine)'}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
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
