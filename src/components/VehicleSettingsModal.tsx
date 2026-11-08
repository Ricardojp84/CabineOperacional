import React, { useState, useMemo } from 'react';
import { Trip, User, VehicleAxles } from '../types/cockpit';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import { Truck, Check, X, ShieldCheck, Sparkles, Scale, Info, Filter, Car } from 'lucide-react';

interface VehicleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrip: Trip;
  onSaveVehicle: (updates: { vehicleModel: string; vehiclePlate: string; axles: VehicleAxles }) => void;
  currentUser?: User | null;
}

export interface VehiclePreset {
  name: string;
  type: string;
  axles: VehicleAxles;
  category: 'vuc_2e' | 'toco_truck' | 'pesados';
  description?: string;
}

const TRUCK_MODELS_PRESETS: VehiclePreset[] = [
  // 2 Eixos - VUC / Utilitários / Caminhões Leves
  {
    name: 'Hyundai HR 2.5 Turbo',
    type: 'VUC / Utilitário 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'Rodagem simples/dupla, CNH B, livre de rodízio e pedágio comercial reduzido',
  },
  {
    name: 'Volkswagen Delivery Express',
    type: 'VUC 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'PBT 3.5t, CNH B, ideal para entregas urbanas e centros restritos',
  },
  {
    name: 'Volkswagen Delivery 9.170',
    type: 'Caminhão Leve 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'PBT 8.5t, motor Cummins, alta agilidade em coletas e entregas',
  },
  {
    name: 'Volkswagen Delivery 11.180',
    type: 'Caminhão Médio 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'Líder da categoria, PBT 10.7t, carga geral e distribuição fracionada',
  },
  {
    name: 'Kia Bongo K2500',
    type: 'VUC / Utilitário 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'Tração 4x4 ou 4x2, CNH B, perfeito para baú e entregas expressas',
  },
  {
    name: 'Mercedes-Benz Accelo 815',
    type: 'VUC / Leve 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'Compacto e robusto para rotas urbanas e intermunicipais',
  },
  {
    name: 'Mercedes-Benz Accelo 1016',
    type: 'Caminhão Leve 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'PBT 9.6t, motor MB BlueTec 5, alta produtividade',
  },
  {
    name: 'Iveco Daily 35-150 / 65-170',
    type: 'Chassi-Cabine 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'Chassi resistente para baú, sider e transporte refrigerado',
  },
  {
    name: 'Ford Cargo 816 / F-4000',
    type: 'Caminhão Urbano 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'Mecânica tradicional 2 eixos para distribuição regional',
  },
  {
    name: 'Volkswagen Constellation 14.190 / 17.190',
    type: 'Toco 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'Caminhão Toco 2 eixos robusto (PBT até 16t)',
  },
  {
    name: 'Mercedes-Benz Atego 1419 / 1719',
    type: 'Toco 2 Eixos',
    axles: 2,
    category: 'vuc_2e',
    description: 'PBT 14.3t a 17t, transporte de carga geral entre capitais e interior',
  },

  // 3 & 4 Eixos - Médios e Pesados Rígidos
  {
    name: 'Volkswagen Constellation 24.280',
    type: 'Truck 3 Eixos (6x2)',
    axles: 3,
    category: 'toco_truck',
    description: 'PBT 23t, chassi rígido consagrado no transporte rodoviário',
  },
  {
    name: 'Mercedes-Benz Atego 2426',
    type: 'Truck 3 Eixos (6x2)',
    axles: 3,
    category: 'toco_truck',
    description: 'PBT 24t, referência de confiabilidade e economia operacional',
  },
  {
    name: 'Volvo VM 330 8x2',
    type: 'Bitruck 4 Eixos (8x2)',
    axles: 4,
    category: 'toco_truck',
    description: 'PBT 29t, dois eixos direcionais, alta capacidade de carga líquida',
  },
  {
    name: 'Scania P360 8x2',
    type: 'Bitruck 4 Eixos (8x2)',
    axles: 4,
    category: 'toco_truck',
    description: 'PBT 29t, cabine leito para viagens rodoviárias de média e longa distância',
  },

  // Pesados & Articulados (5 a 9 Eixos)
  {
    name: 'Scania R540 6x4 Super',
    type: 'Traçado 6x4',
    axles: 6,
    category: 'pesados',
    description: 'Motor Super 13L, 540 cv, alta eficiência para carretas e bitrens',
  },
  {
    name: 'Volvo FH 540 6x4 Globetrotter',
    type: 'Traçado 6x4',
    axles: 6,
    category: 'pesados',
    description: 'Câmbio I-Shift, referência nacional para transporte pesado de grãos e cargas',
  },
  {
    name: 'Mercedes-Benz Actros 2651 6x4',
    type: 'Traçado 6x4',
    axles: 6,
    category: 'pesados',
    description: 'OM 460 LA, tecnologia MirrorCam e alta segurança ativa',
  },
  {
    name: 'DAF XF 530 6x4 Super Space Cab',
    type: 'Traçado 6x4',
    axles: 6,
    category: 'pesados',
    description: 'Cabine espaçosa, motor PACCAR MX-13 de 530 cv',
  },
  {
    name: 'Volkswagen Meteor 29.520 6x4',
    type: 'Traçado 6x4',
    axles: 6,
    category: 'pesados',
    description: 'Motor MAN D26 de 520 cv, robustez para o agronegócio e rotas longas',
  },
  {
    name: 'Scania R450 6x2 Highline',
    type: 'Cavalo 6x2',
    axles: 6,
    category: 'pesados',
    description: 'Consumo econômico para semirreboque 3 eixos de carga geral',
  },
  {
    name: 'Volvo FH 460 6x2 I-Shift',
    type: 'Cavalo 6x2',
    axles: 6,
    category: 'pesados',
    description: 'Equilíbrio ideal entre potência e consumo nas rotas interestaduais',
  },
  {
    name: 'Iveco S-Way 540 6x4',
    type: 'Traçado 6x4',
    axles: 6,
    category: 'pesados',
    description: 'Design aerodinâmico e trem de força Cursor 13',
  },
  {
    name: 'Cavalo + Carreta 2 Eixos',
    type: 'Conjunto 5 Eixos',
    axles: 5,
    category: 'pesados',
    description: 'Cavalo 6x2 + Semirreboque 2 eixos espaçados (PBT 41.5t)',
  },
  {
    name: 'Bitrem 7 Eixos (Cavalo 6x4)',
    type: 'Bitrem 7 Eixos',
    axles: 7,
    category: 'pesados',
    description: 'Dois semirreboques articulados por quinta-roda (PBT 57t)',
  },
  {
    name: 'Rodotrem 9 Eixos (Dolly + Semirreboques)',
    type: 'Rodotrem 9 Eixos',
    axles: 9,
    category: 'pesados',
    description: 'Conjunto longo com Dolly intermediário para grandes volumes (PBT 74t)',
  },
];

export const VehicleSettingsModal: React.FC<VehicleSettingsModalProps> = ({
  isOpen,
  onClose,
  currentTrip,
  onSaveVehicle,
  currentUser,
}) => {
  const [vehicleModel, setVehicleModel] = useState(currentTrip.vehicleModel || 'Scania R540 6x4 Super');
  const [vehiclePlate, setVehiclePlate] = useState(currentTrip.vehiclePlate || 'BRA-2026');
  const [axles, setAxles] = useState<VehicleAxles>(currentTrip.axles || 6);
  const [categoryFilter, setCategoryFilter] = useState<'todos' | 'vuc_2e' | 'toco_truck' | 'pesados'>('todos');

  // Filter presets based on category
  const filteredPresets = useMemo(() => {
    if (categoryFilter === 'todos') return TRUCK_MODELS_PRESETS;
    return TRUCK_MODELS_PRESETS.filter((p) => p.category === categoryFilter);
  }, [categoryFilter]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccessChime();

    onSaveVehicle({
      vehicleModel: vehicleModel.trim() || 'Scania R540 6x4 Super',
      vehiclePlate: vehiclePlate.trim().toUpperCase() || 'BRA-2026',
      axles,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#0f172a] border border-[#f59e0b] flex items-center justify-center text-[#f59e0b] shadow-md shadow-amber-500/10">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#d8e3fb]">
                Alterar Modelo do Veículo / Caminhão
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Cadastre veículos de 2 eixos (VUC, Delivery, HR, Toco) ou carretas pesadas (3 a 9 eixos).
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="w-10 h-10 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input Modelo */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
              Modelo do Veículo / Caminhão (Editável Livremente)
            </label>
            <input
              type="text"
              list="models-presets"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Ex: Hyundai HR 2.5 Turbo, VW Delivery 11.180, Scania R540..."
              className="w-full h-12 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3.5 text-[#d8e3fb] font-bold text-xs outline-hidden"
              required
            />
            <datalist id="models-presets">
              {TRUCK_MODELS_PRESETS.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
          </div>

          {/* Quick Presets Category Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <span className="text-[11px] font-bold text-[#94a3b8] uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
                Sugestões de Veículos Brasileiros:
              </span>
              <span className="text-[10px] text-[#ffb95f] font-mono">
                {filteredPresets.length} modelos disponíveis
              </span>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setCategoryFilter('todos')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                  categoryFilter === 'todos'
                    ? 'bg-[#f59e0b] text-[#0f172a]'
                    : 'bg-[#081425] text-[#bec6e0] hover:text-white border border-[#334155]'
                }`}
              >
                Todos ({TRUCK_MODELS_PRESETS.length})
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('vuc_2e')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] flex items-center gap-1 ${
                  categoryFilter === 'vuc_2e'
                    ? 'bg-[#10b981] text-white'
                    : 'bg-[#081425] text-[#bec6e0] hover:text-white border border-[#334155]'
                }`}
              >
                <Car className="w-3 h-3 text-[#34d399]" />
                <span>2 Eixos (VUC / Delivery / HR)</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('toco_truck')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                  categoryFilter === 'toco_truck'
                    ? 'bg-[#38bdf8] text-[#0f172a]'
                    : 'bg-[#081425] text-[#bec6e0] hover:text-white border border-[#334155]'
                }`}
              >
                3 & 4 Eixos (Truck / Bitruck)
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('pesados')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer text-[11px] ${
                  categoryFilter === 'pesados'
                    ? 'bg-[#8b5cf6] text-white'
                    : 'bg-[#081425] text-[#bec6e0] hover:text-white border border-[#334155]'
                }`}
              >
                Pesados (5 a 9 Eixos)
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto p-1.5 bg-[#081425] rounded-xl border border-[#334155]">
              {filteredPresets.map((preset) => {
                const isSelected = vehicleModel === preset.name && axles === preset.axles;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setVehicleModel(preset.name);
                      setAxles(preset.axles);
                    }}
                    className={`p-2.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#1e293b] text-[#ffb95f] border-[#f59e0b] shadow-sm'
                        : 'bg-[#152031] text-[#bec6e0] border-transparent hover:border-[#475569]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold truncate text-xs">{preset.name}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 font-bold ${
                          preset.axles === 2
                            ? 'bg-[#003824] text-[#34d399] border border-[#10b981]/40'
                            : preset.axles <= 4
                            ? 'bg-[#0c4a6e] text-[#38bdf8] border border-[#0284c7]/40'
                            : 'bg-[#3b0764] text-[#d8b4fe] border border-[#7c3aed]/40'
                        }`}
                      >
                        {preset.axles} Eixos
                      </span>
                    </div>
                    <div className="text-[10px] text-[#94a3b8] mt-0.5">{preset.type}</div>
                    {preset.description && (
                      <div className="text-[9px] text-[#64748b] truncate mt-0.5">
                        {preset.description}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Placa & Eixos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Placa do Veículo
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="Ex: BRA-2026"
                maxLength={8}
                className="w-full h-12 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3.5 text-[#ffb95f] font-mono font-black text-sm outline-hidden uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Configuração de Eixos (Tarifação & Pedágio)
              </label>
              <select
                value={axles}
                onChange={(e) => setAxles(Number(e.target.value) as VehicleAxles)}
                className="w-full h-12 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-bold text-xs outline-hidden"
              >
                <option value={2}>2 Eixos (VUC, Delivery, Hyundai HR, Toco, Utilitário)</option>
                <option value={3}>3 Eixos (Truck 6x2 - PBT 23t)</option>
                <option value={4}>4 Eixos (Bitruck 8x2 / 8x4 - PBT 29t)</option>
                <option value={5}>5 Eixos (Cavalo + Carreta 2 Eixos - PBT 41.5t)</option>
                <option value={6}>6 Eixos (Cavalo 6x2/6x4 + Carreta 3 Eixos LS - PBT 48.5t)</option>
                <option value={7}>7 Eixos (Bitrem 7 Eixos - PBT 57t)</option>
                <option value={9}>9 Eixos (Rodotrem / Tritrem 9 Eixos - PBT 74t)</option>
              </select>
            </div>
          </div>

          {/* Info notice */}
          <div className="p-3 rounded-xl bg-[#081425] border border-[#334155] flex items-start gap-2.5 text-[11px] text-[#94a3b8]">
            <Info className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
            <p className="leading-snug">
              A quantidade de eixos é utilizada para o <strong>cálculo preciso de pedágios</strong> e a tabela de frete mínimo ANTT. Ao cadastrar veículos de <strong>2 eixos (como HR ou Delivery)</strong>, o sistema calcula pedágio de categoria comercial leve de 2 eixos.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 pt-2">
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
              className="flex-1 h-12 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvar Veículo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
