import React, { useState } from 'react';
import { Trip, User, VehicleAxles, isAdminRole, isUserAdmin } from '../types/cockpit';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import {
  RotateCcw,
  Truck,
  AlertTriangle,
  CheckCircle2,
  X,
  Gauge,
  Sparkles,
  ShieldAlert,
  Trash2,
  Check,
} from 'lucide-react';
import { withAdminPermission } from '../middlewares/permissionMiddleware';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrip: Trip;
  onResetComplete: (newTrip: Trip) => void;
  currentUser?: User | null;
}

const POPULAR_TRUCK_MODELS = [
  'Hyundai HR 2.5 Turbo (2 Eixos)',
  'Volkswagen Delivery Express (2 Eixos)',
  'Volkswagen Delivery 11.180 (2 Eixos)',
  'Mercedes-Benz Accelo 1016 (2 Eixos)',
  'Kia Bongo K2500 (2 Eixos)',
  'Volkswagen Constellation 24.280 (3 Eixos)',
  'Mercedes-Benz Atego 2426 (3 Eixos)',
  'Volvo VM 330 8x2 (4 Eixos Bitruck)',
  'Scania R540 6x4 Super (6 Eixos)',
  'Volvo FH 540 6x4 Globetrotter (6 Eixos)',
  'Mercedes-Benz Actros 2651 6x4 (6 Eixos)',
  'DAF XF 530 6x4 Super Space Cab (6 Eixos)',
  'Volkswagen Meteor 29.520 6x4 (6 Eixos)',
  'Scania R450 6x2 (5 Eixos)',
  'Bitrem 7 Eixos (57t)',
  'Rodotrem 9 Eixos (74t)',
];

const ResetDataModalContent: React.FC<ResetDataModalProps> = ({
  isOpen,
  onClose,
  currentTrip,
  onResetComplete,
  currentUser,
}) => {
  const [truckModel, setTruckModel] = useState(currentTrip.vehicleModel || 'Scania R540 6x4 Super');
  const [truckPlate, setTruckPlate] = useState(currentTrip.vehiclePlate || 'BRA-2026');
  const [axles, setAxles] = useState<VehicleAxles>(currentTrip.axles || 6);
  const [initialOdometer, setInitialOdometer] = useState<number>(currentTrip.currentOdometerKm || 435000);
  
  // Options
  const [clearExpenses, setClearExpenses] = useState(true);
  const [clearCheckpoints, setClearCheckpoints] = useState(true);
  const [clearRoute, setClearRoute] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const isAdmin = isUserAdmin(currentUser);

  // Security check: Block display and execution of Zerar Dados for non-admin users
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-[#152031] border-2 border-[#ef4444] rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#450a0a] border border-[#ef4444] flex items-center justify-center text-[#ef4444] shadow-lg shadow-red-950/50">
            <ShieldAlert className="w-9 h-9 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#7f1d1d]/50 text-[#fca5a5] border border-[#ef4444]/40">
              403 • Acesso Restrito
            </span>
            <h3 className="text-xl font-black text-[#d8e3fb] pt-2">
              Comando Exclusivo de Administração
            </h3>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              A função de <strong>Zerar Dados do Sistema</strong> (apagar histórico de despesas, rotas ou reinicializar odômetro) é estritamente restrita a usuários com perfil de <strong className="text-[#fca5a5]">Administrador ('admin')</strong>.
            </p>
          </div>

          <div className="w-full p-3.5 rounded-xl bg-[#081425] border border-[#334155] text-left text-xs space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[#bec6e0]">
              <span className="text-[#94a3b8] font-sans">Usuário ativo:</span>
              <span className="font-bold">{currentUser?.name || 'Não identificado'}</span>
            </div>
            <div className="flex items-center justify-between text-[#bec6e0]">
              <span className="text-[#94a3b8] font-sans">Perfil / Role:</span>
              <span className="text-[#ffb95f] font-bold">{currentUser?.role || 'motorista'}</span>
            </div>
            <div className="flex items-center justify-between text-[#bec6e0]">
              <span className="text-[#94a3b8] font-sans">Permissão requerida:</span>
              <span className="text-[#ef4444] font-black uppercase">admin</span>
            </div>
          </div>

          <p className="text-[11px] text-[#64748b] italic">
            Como motorista, você tem permissão para editar os dados básicos da viagem, adicionar paradas e lançar despesas de estrada normalmente.
          </p>

          <button
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="w-full h-11 bg-[#243248] hover:bg-[#334155] border border-[#475569] text-[#d8e3fb] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Fechar e Voltar à Cabine</span>
          </button>
        </div>
      </div>
    );
  }

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      playAlertBeep();
      return;
    }

    playSuccessChime();

    // Create pristine clean trip
    const cleanTrip: Trip = {
      id: `trip_${Date.now()}`,
      title: clearRoute ? 'Nova Rota Operacional' : currentTrip.title,
      origin: clearRoute ? '' : currentTrip.origin,
      destination: clearRoute ? '' : currentTrip.destination,
      routeHighlights: clearRoute ? '' : currentTrip.routeHighlights,
      cargo: clearRoute ? '' : currentTrip.cargo,
      cargoType: 'granel_solido',
      cargoWeightTon: clearRoute ? 0 : currentTrip.cargoWeightTon,
      vehicleModel: truckModel.trim() || 'Scania R540 6x4 Super',
      vehiclePlate: truckPlate.trim().toUpperCase() || 'BRA-2026',
      axles: axles,
      grossFreight: clearRoute ? 0 : currentTrip.grossFreight,
      advancePayment: 0,
      balancePayment: 0,
      totalDistanceKm: clearRoute ? 0 : currentTrip.totalDistanceKm,
      completedDistanceKm: 0,
      currentOdometerKm: Number(initialOdometer) || 0,
      startOdometerKm: Number(initialOdometer) || 0,
      targetConsumptionKmL: 2.3,
      actualConsumptionKmL: 2.3,
      dieselAvgPricePerL: 6.19,
      arlaAvgPricePerL: 2.45,
      estimatedTollCost: 0,
      isCompleted: false,
      startedAt: new Date().toISOString(),
      estimatedArrival: '',
      expenses: clearExpenses ? [] : currentTrip.expenses,
      checkpoints: clearCheckpoints ? [] : currentTrip.checkpoints,
    };

    // Save to local storage clean state
    try {
      localStorage.setItem('cabine_active_trip', JSON.stringify(cleanTrip));
      if (clearExpenses) {
        localStorage.removeItem('cabine_preset_trips');
      }
    } catch {
      // ignore
    }

    onResetComplete(cleanTrip);
    onClose();
  };

  const handleQuickResetInstant = () => {
    playSuccessChime();
    const cleanTrip: Trip = {
      id: `trip_${Date.now()}`,
      title: 'Nova Rota Operacional',
      origin: '',
      destination: '',
      routeHighlights: '',
      cargo: '',
      cargoType: 'granel_solido',
      cargoWeightTon: 0,
      vehicleModel: truckModel.trim() || 'Scania R540 6x4 Super',
      vehiclePlate: truckPlate.trim().toUpperCase() || 'BRA-2026',
      axles: axles,
      grossFreight: 0,
      advancePayment: 0,
      balancePayment: 0,
      totalDistanceKm: 0,
      completedDistanceKm: 0,
      currentOdometerKm: Number(initialOdometer) || 0,
      startOdometerKm: Number(initialOdometer) || 0,
      targetConsumptionKmL: 2.3,
      actualConsumptionKmL: 2.3,
      dieselAvgPricePerL: 6.19,
      arlaAvgPricePerL: 2.45,
      estimatedTollCost: 0,
      isCompleted: false,
      startedAt: new Date().toISOString(),
      estimatedArrival: '',
      expenses: [],
      checkpoints: [],
    };

    try {
      localStorage.setItem('cabine_active_trip', JSON.stringify(cleanTrip));
      localStorage.removeItem('cabine_preset_trips');
    } catch {
      // ignore
    }

    onResetComplete(cleanTrip);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border-2 border-[#ef4444] rounded-2xl w-full max-w-xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#450a0a] border border-[#ef4444] flex items-center justify-center text-[#ef4444] shadow-lg shadow-red-950/40 shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#7f1d1d]/60 text-[#fca5a5] border border-[#ef4444]/40">
                  Operação Limpa
                </span>
                <h3 className="text-base sm:text-lg font-black text-[#d8e3fb]">
                  Zerar Dados do Sistema
                </h3>
              </div>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Limpe os dados fictícios e configure o modelo real do seu caminhão para começar do zero.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick One-Click Reset Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#081425] border border-[#ef4444]/40 gap-2">
          <div>
            <div className="text-xs font-black text-[#fca5a5] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ef4444]" />
              Zerar Imediatamente (1 Clique)
            </div>
            <div className="text-[11px] text-[#94a3b8]">
              Limpa todas as despesas fictícias e reseta a rota para R$ 0,00.
            </div>
          </div>
          <button
            type="button"
            onClick={handleQuickResetInstant}
            className="h-9 px-3.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Zerar Agora</span>
          </button>
        </div>

        <form onSubmit={handleConfirmReset} className="space-y-4">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-xl bg-[#450a0a]/70 border border-[#ef4444]/60 flex items-start gap-2.5 text-xs text-[#fecaca]">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Personalização completa:</strong> Se preferir, ajuste o modelo do caminhão, placa e hodômetro abaixo antes de confirmar o reset.
            </div>
          </div>

          {/* 1. SEÇÃO MODELO DO CAMINHÃO */}
          <div className="p-3.5 rounded-xl bg-[#081425] border border-[#334155] space-y-3">
            <h4 className="text-xs font-extrabold uppercase text-[#ffb95f] flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-[#ffb95f]" />
              Configurar Veículo / Cavalo Mecânico
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                Modelo do Caminhão
              </label>
              <input
                type="text"
                list="truck-models-list"
                value={truckModel}
                onChange={(e) => setTruckModel(e.target.value)}
                placeholder="Ex: Scania R540 6x4 Super, Volvo FH 540..."
                className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#ffb95f] rounded-xl px-3 text-[#d8e3fb] font-semibold text-xs outline-hidden"
                required
              />
              <datalist id="truck-models-list">
                {POPULAR_TRUCK_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* Quick Presets Buttons */}
            <div>
              <span className="block text-[10px] font-bold text-[#94a3b8] uppercase mb-1.5">
                Modelos Mais Populares na Estrada:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TRUCK_MODELS.slice(0, 6).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setTruckModel(m);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      truckModel === m
                        ? 'bg-[#f59e0b] text-[#0f172a] font-black border-[#f59e0b]'
                        : 'bg-[#152031] text-[#bec6e0] border-[#334155] hover:border-[#ffb95f]'
                    }`}
                  >
                    {m.split(' ')[0]} {m.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Plate & Axles */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                  Placa do Cavalo
                </label>
                <input
                  type="text"
                  value={truckPlate}
                  onChange={(e) => setTruckPlate(e.target.value.toUpperCase())}
                  placeholder="Ex: BRA-2026"
                  maxLength={8}
                  className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#ffb95f] rounded-xl px-3 text-[#ffb95f] font-mono font-black text-xs outline-hidden uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1">
                  Eixos do Conjunto
                </label>
                <select
                  value={axles}
                  onChange={(e) => setAxles(Number(e.target.value) as VehicleAxles)}
                  className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#ffb95f] rounded-xl px-3 text-[#d8e3fb] font-bold text-xs outline-hidden"
                >
                  <option value={2}>2 Eixos (VUC, HR, Delivery, Toco)</option>
                  <option value={3}>3 Eixos (Truck 6x2 - 23t)</option>
                  <option value={4}>4 Eixos (Bitruck 8x2 - 29t)</option>
                  <option value={5}>5 Eixos (Carreta 2 Eixos - 41.5t)</option>
                  <option value={6}>6 Eixos (Carreta LS 3 Eixos - 48.5t)</option>
                  <option value={7}>7 Eixos (Bitrem - 57t)</option>
                  <option value={9}>9 Eixos (Rodotrem / Tritrem - 74t)</option>
                </select>
              </div>
            </div>

            {/* Initial Odometer */}
            <div>
              <label className="block text-[11px] font-bold text-[#94a3b8] uppercase mb-1 flex items-center justify-between">
                <span>Odômetro Atual do Painel (KM Real)</span>
                <span className="text-[10px] text-[#ffb95f]">Quilometragem real do caminhão</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={initialOdometer}
                  onChange={(e) => setInitialOdometer(Number(e.target.value))}
                  placeholder="Ex: 435000"
                  className="w-full h-11 bg-[#152031] border border-[#334155] focus:border-[#ffb95f] rounded-xl pl-9 pr-3 text-[#d8e3fb] font-mono font-bold text-xs outline-hidden"
                  required
                />
                <Gauge className="w-4 h-4 text-[#94a3b8] absolute left-3 top-3.5" />
              </div>
            </div>
          </div>

          {/* 2. OPÇÕES DE LIMPEZA */}
          <div className="p-3.5 rounded-xl bg-[#081425] border border-[#334155] space-y-2.5 text-xs">
            <h4 className="text-[11px] font-extrabold uppercase text-[#94a3b8] mb-1">
              O que deseja zerar?
            </h4>

            <label className="flex items-center gap-2.5 text-[#d8e3fb] cursor-pointer">
              <input
                type="checkbox"
                checked={clearExpenses}
                onChange={(e) => setClearExpenses(e.target.checked)}
                className="w-4 h-4 rounded-sm accent-[#ef4444]"
              />
              <span>Apagar todas as despesas lançadas (Diesel, Pedágios, Alimentação)</span>
            </label>

            <label className="flex items-center gap-2.5 text-[#d8e3fb] cursor-pointer">
              <input
                type="checkbox"
                checked={clearRoute}
                onChange={(e) => setClearRoute(e.target.checked)}
                className="w-4 h-4 rounded-sm accent-[#ef4444]"
              />
              <span>Zerar dados de rota, carga e frete para preencher uma viagem do zero</span>
            </label>

            <label className="flex items-center gap-2.5 text-[#d8e3fb] cursor-pointer">
              <input
                type="checkbox"
                checked={clearCheckpoints}
                onChange={(e) => setClearCheckpoints(e.target.checked)}
                className="w-4 h-4 rounded-sm accent-[#ef4444]"
              />
              <span>Limpar praças de pedágio e paradas antigas da rota</span>
            </label>
          </div>

          {/* 3. CONFIRMAÇÃO DE SEGURANÇA */}
          <div className="p-3 rounded-xl bg-[#1c1917] border border-[#ef4444]/40 flex items-center gap-2.5 text-xs">
            <input
              type="checkbox"
              id="confirm-reset-checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded-sm accent-[#ef4444] cursor-pointer"
            />
            <label htmlFor="confirm-reset-checkbox" className="text-[#fecaca] font-bold cursor-pointer">
              Confirmo que desejo zerar os lançamentos e iniciar a operação com o veículo acima.
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                playCockpitClick();
                onClose();
              }}
              className="flex-1 h-12 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] font-bold text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!confirmed}
              className={`flex-1 h-12 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                confirmed
                  ? 'bg-[#dc2626] hover:bg-[#b91c1c] text-white shadow-lg shadow-red-950/50 active:scale-95'
                  : 'bg-[#334155] text-[#94a3b8] opacity-60 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Zerar e Iniciar do Zero</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ResetDataModal = withAdminPermission(ResetDataModalContent, {
  resourceTitle: 'Zerar Dados do Sistema',
});
