import React, { useState, useEffect, useMemo } from 'react';
import {
  Trip,
  User,
  PreTripChecklistItem,
  PreTripCheckCategory,
  PreTripInspection,
  PreTripInspectionStatus,
} from '../types/cockpit';
import { formatOdometer } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import {
  ClipboardCheck,
  CheckCircle2,
  Check,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';

export const DEFAULT_PRE_TRIP_ITEMS: Omit<PreTripChecklistItem, 'completed' | 'completedAt'>[] = [
  {
    id: 'chk-luzes',
    label: 'Luzes, Faróis, Setas e Luz de Freio',
    description:
      'Testar farol alto/baixo, setas direcionais, pisca-alerta, luz de ré e lanternas da carreta.',
    category: 'iluminacao',
    mandatory: true,
  },
  {
    id: 'chk-freios',
    label: 'Freios, Pressão Pneumática e Cuícas',
    description:
      'Conferir manômetros de ar (8–10 bar), drenar reservatórios e validar freio de estacionamento.',
    category: 'freios_pneus',
    mandatory: true,
  },
  {
    id: 'chk-oleo',
    label: 'Nível de Óleo do Motor e Vazamentos',
    description:
      'Medir nível na vareta em piso plano e inspecionar cárter, turbina e mangueiras sem vazamentos.',
    category: 'motor_fluidos',
    mandatory: true,
  },
  {
    id: 'chk-cinto',
    label: 'Cinto de Segurança, Trava da Cabine e Espelhos',
    description:
      'Testar travamento do cinto de 3 pontos, trava de basculamento da cabine e retrovisores.',
    category: 'seguranca_cabine',
    mandatory: true,
  },
  {
    id: 'chk-pneus',
    label: 'Pneus, Calibragem e Aperto de Porcas',
    description:
      'Checar sulcos mínimos legais, ausência de cortes/bolhas, porcas das rodas e fixação do estepe.',
    category: 'freios_pneus',
    mandatory: true,
  },
  {
    id: 'chk-arrefecimento-arla',
    label: 'Líquido de Arrefecimento e ARLA 32',
    description:
      'Verificar nível no reservatório de expansão do radiador e autonomia do tanque de ARLA 32.',
    category: 'motor_fluidos',
    mandatory: true,
  },
  {
    id: 'chk-emergencia',
    label: 'Extintor ABC, Triângulos e Kit de Emergência',
    description:
      'Confirmar manômetro do extintor na faixa verde, presença de triângulos e colete refletivo.',
    category: 'seguranca_cabine',
    mandatory: true,
  },
  {
    id: 'chk-quinta-roda',
    label: 'Engate Quinta-Roda, Pino Rei e Mangueiras',
    description:
      'Garantir travamento mecânico completo da quinta-roda e conexões pneumáticas/elétricas firmes.',
    category: 'documentacao_carga',
    mandatory: true,
  },
  {
    id: 'chk-tacografo-docs',
    label: 'Cronotacógrafo e Documentos Obrigatórios',
    description:
      'Conferir disco/fita do tacógrafo, CNH, CRLV, RNTRC, MDF-e e notas fiscais da carga.',
    category: 'documentacao_carga',
    mandatory: true,
  },
  {
    id: 'chk-amarracao-carga',
    label: 'Amarração, Lona e Lacres da Carga',
    description:
      'Inspecionar cintas, catracas, lonas e ausência de excesso lateral ou vazamento de grãos.',
    category: 'documentacao_carga',
    mandatory: false,
  },
];

const CATEGORY_LABELS: Record<'todos' | PreTripCheckCategory, string> = {
  todos: 'Todos',
  iluminacao: 'Iluminação',
  freios_pneus: 'Freios & Pneus',
  motor_fluidos: 'Motor & Óleo',
  seguranca_cabine: 'Cabine & Cinto',
  documentacao_carga: 'Engate, Carga & Docs',
};

export function createDefaultPreTripInspection(
  tripId: string,
  inspectorName?: string,
  odometerKm?: number
): PreTripInspection {
  return {
    tripId,
    items: DEFAULT_PRE_TRIP_ITEMS.map((item) => ({
      ...item,
      completed: false,
    })),
    status: 'pendente',
    notes: '',
    inspectorName,
    odometerAtInspection: odometerKm,
  };
}

export function computeInspectionProgress(items: PreTripChecklistItem[]) {
  const totalCount = items.length;
  const completedCount = items.filter((i) => i.completed).length;
  const mandatoryItems = items.filter((i) => i.mandatory);
  const mandatoryTotal = mandatoryItems.length;
  const mandatoryCompleted = mandatoryItems.filter((i) => i.completed).length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allMandatoryDone = mandatoryTotal > 0 ? mandatoryCompleted === mandatoryTotal : true;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return {
    completedCount,
    totalCount,
    mandatoryCompleted,
    mandatoryTotal,
    percent,
    allMandatoryDone,
    allDone,
  };
}

export function resolveInspectionStatus(items: PreTripChecklistItem[]): PreTripInspectionStatus {
  const progress = computeInspectionProgress(items);
  if (progress.completedCount === 0) return 'pendente';
  if (progress.allDone) return 'aprovada';
  if (progress.allMandatoryDone) return 'aprovada_com_ressalvas';
  return 'em_andamento';
}

export function buildSavedInspection(params: {
  tripId: string;
  items: PreTripChecklistItem[];
  notes?: string;
  inspectorName?: string;
  odometerAtInspection?: number;
  nowIso?: string;
}): PreTripInspection {
  const now = params.nowIso || new Date().toISOString();
  return {
    tripId: params.tripId,
    items: params.items,
    status: resolveInspectionStatus(params.items),
    notes: params.notes?.trim() || undefined,
    savedAt: now,
    inspectorName: params.inspectorName,
    odometerAtInspection: params.odometerAtInspection,
  };
}

function getStatusMeta(status: PreTripInspectionStatus): {
  label: string;
  textColor: string;
  barColor: string;
  borderColor: string;
} {
  switch (status) {
    case 'aprovada':
      return {
        label: 'Inspeção Aprovada',
        textColor: 'text-[#34d399]',
        barColor: 'bg-[#10b981]',
        borderColor: 'border-[#10b981]/50',
      };
    case 'aprovada_com_ressalvas':
      return {
        label: 'Aprovada (Obrigatórios OK)',
        textColor: 'text-[#38bdf8]',
        barColor: 'bg-[#38bdf8]',
        borderColor: 'border-[#38bdf8]/50',
      };
    case 'em_andamento':
      return {
        label: 'Inspeção em Andamento',
        textColor: 'text-[#ffb95f]',
        barColor: 'bg-[#f59e0b]',
        borderColor: 'border-[#f59e0b]/50',
      };
    case 'pendente':
    default:
      return {
        label: 'Pendente Pré-Partida',
        textColor: 'text-[#fca5a5]',
        barColor: 'bg-[#ef4444]',
        borderColor: 'border-[#334155]',
      };
  }
}

interface PreTripChecklistProps {
  trip: Trip;
  currentUser?: User | null;
  onSaveInspection: (inspection: PreTripInspection) => void;
}

export const PreTripChecklist: React.FC<PreTripChecklistProps> = ({
  trip,
  currentUser,
  onSaveInspection,
}) => {
  const initialInspection = useMemo(() => {
    if (trip.preTripInspection && trip.preTripInspection.tripId === trip.id) {
      return trip.preTripInspection;
    }
    return createDefaultPreTripInspection(
      trip.id,
      currentUser?.name,
      trip.currentOdometerKm
    );
  }, [trip.id, trip.preTripInspection, currentUser?.name, trip.currentOdometerKm]);

  const [items, setItems] = useState<PreTripChecklistItem[]>(initialInspection.items);
  const [notes, setNotes] = useState<string>(initialInspection.notes || '');
  const [categoryFilter, setCategoryFilter] = useState<'todos' | PreTripCheckCategory>('todos');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [customLabel, setCustomLabel] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<PreTripCheckCategory>('seguranca_cabine');
  const [customMandatory, setCustomMandatory] = useState<boolean>(true);

  // Sync local checklist when active trip changes or saved trip inspection updates externally
  useEffect(() => {
    setItems(initialInspection.items);
    setNotes(initialInspection.notes || '');
    setHasUnsavedChanges(false);
    setSaveFeedback(null);
  }, [trip.id, trip.preTripInspection?.savedAt]);

  const progress = useMemo(() => computeInspectionProgress(items), [items]);
  const liveStatus = useMemo(() => resolveInspectionStatus(items), [items]);
  const savedStatus = trip.preTripInspection?.tripId === trip.id ? trip.preTripInspection.status : null;
  const statusMeta = getStatusMeta(liveStatus);

  const visibleItems = useMemo(() => {
    if (categoryFilter === 'todos') return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [items, categoryFilter]);

  const handleToggleItem = (id: string) => {
    playCockpitClick();
    const nowIso = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextCompleted = !item.completed;
        return {
          ...item,
          completed: nextCompleted,
          completedAt: nextCompleted ? nowIso : undefined,
        };
      })
    );
    setHasUnsavedChanges(true);
    setSaveFeedback(null);
  };

  const handleCompleteAll = () => {
    playCockpitClick();
    const nowIso = new Date().toISOString();
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        completed: true,
        completedAt: item.completedAt || nowIso,
      }))
    );
    setHasUnsavedChanges(true);
    setSaveFeedback(null);
  };

  const handleResetChecklist = () => {
    playCockpitClick();
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        completed: false,
        completedAt: undefined,
      }))
    );
    setNotes('');
    setHasUnsavedChanges(true);
    setSaveFeedback(null);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLabel.trim();
    if (!trimmed) return;
    playCockpitClick();

    const newItem: PreTripChecklistItem = {
      id: `chk-custom-${Date.now()}`,
      label: trimmed,
      description: 'Verificação adicional cadastrada pelo motorista para esta viagem.',
      category: customCategory,
      mandatory: customMandatory,
      completed: false,
    };

    setItems((prev) => [...prev, newItem]);
    setCustomLabel('');
    setShowAddCustom(false);
    setHasUnsavedChanges(true);
    setSaveFeedback(null);
  };

  const handleSave = () => {
    const saved = buildSavedInspection({
      tripId: trip.id,
      items,
      notes,
      inspectorName: currentUser?.name || 'Motorista em Operação',
      odometerAtInspection: trip.currentOdometerKm,
    });

    onSaveInspection(saved);
    setHasUnsavedChanges(false);

    if (saved.status === 'aprovada' || saved.status === 'aprovada_com_ressalvas') {
      playSuccessChime();
    } else {
      playCockpitClick();
    }

    const formattedTime = new Date(saved.savedAt!).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setSaveFeedback(
      `Status "${getStatusMeta(saved.status).label}" salvo na viagem "${trip.title}" às ${formattedTime}.`
    );
  };

  const formatCheckedTime = (iso?: string) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  return (
    <section
      aria-label="Inspeção Pré-Viagem"
      className={`bg-[#1e293b] border rounded-xl p-4 sm:p-5 space-y-4 transition-colors ${statusMeta.borderColor}`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#081425] border border-[#334155] flex items-center justify-center text-[#ffb95f] shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold text-[#d8e3fb]">
                Inspeção Pré-Viagem (Checklist de Segurança)
              </h3>
              <span className={`text-xs font-extrabold inline-flex items-center gap-1 ${statusMeta.textColor}`}>
                {liveStatus === 'aprovada' ? (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                ) : liveStatus === 'pendente' ? (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                )}
                {statusMeta.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8] mt-0.5">
              <span className="truncate max-w-[260px] sm:max-w-none">{trip.title}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{trip.vehiclePlate}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatOdometer(trip.currentOdometerKm)}</span>
              {trip.preTripInspection?.savedAt && savedStatus && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#34d399]">
                    Salva às {formatCheckedTime(trip.preTripInspection.savedAt)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right font-mono tabular-nums mr-1">
            <div className="text-xs font-extrabold text-[#d8e3fb]">
              {progress.completedCount}/{progress.totalCount} itens
            </div>
            <div className="text-[11px] text-[#94a3b8]">
              Obrigatórios: {progress.mandatoryCompleted}/{progress.mandatoryTotal}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setIsExpanded((prev) => !prev);
            }}
            aria-expanded={isExpanded}
            className="h-10 px-3 rounded-lg bg-[#0f172a] hover:bg-[#152031] border border-[#334155] text-xs font-bold text-[#d8e3fb] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Recolher</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Abrir Lista</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2.5 bg-[#081425] rounded-full overflow-hidden border border-[#334155]">
          <div
            style={{ width: `${progress.percent}%` }}
            className={`h-full transition-all duration-300 ${statusMeta.barColor}`}
          />
        </div>
        {hasUnsavedChanges && (
          <div className="text-[11px] font-semibold text-[#ffb95f]">
            Alterações locais pendentes — clique em &ldquo;Salvar Inspeção na Viagem&rdquo; para vincular à viagem ativa.
          </div>
        )}
      </div>

      {/* Save Feedback */}
      {saveFeedback && (
        <div className="px-3.5 py-2.5 rounded-lg bg-[#064e3b]/50 border border-[#10b981]/50 text-xs font-semibold text-[#a7f3d0] flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
            {saveFeedback}
          </span>
          <button
            type="button"
            onClick={() => setSaveFeedback(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Expanded Checklist Body */}
      {isExpanded && (
        <div className="space-y-4 pt-1 border-t border-[#334155]/80">
          {/* Category Filter + Quick Bulk Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-1 p-1 bg-[#081425] rounded-lg border border-[#334155] overflow-x-auto max-w-full">
              {(Object.keys(CATEGORY_LABELS) as Array<'todos' | PreTripCheckCategory>).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    playCockpitClick();
                    setCategoryFilter(cat);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#1e293b] text-[#ffb95f]'
                      : 'text-[#94a3b8] hover:text-[#d8e3fb]'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCompleteAll}
                className="h-9 px-3 rounded-lg bg-[#0f172a] hover:bg-[#152031] border border-[#334155] text-xs font-bold text-[#34d399] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Marcar Todos</span>
              </button>

              <button
                type="button"
                onClick={handleResetChecklist}
                className="h-9 px-3 rounded-lg bg-[#0f172a] hover:bg-[#152031] border border-[#334155] text-xs font-bold text-[#94a3b8] hover:text-[#d8e3fb] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setShowAddCustom((prev) => !prev);
                }}
                className="h-9 px-3 rounded-lg bg-[#0f172a] hover:bg-[#152031] border border-[#334155] text-xs font-bold text-[#ffb95f] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Item Extra</span>
              </button>
            </div>
          </div>

          {/* Inline Custom Item Form */}
          {showAddCustom && (
            <form
              onSubmit={handleAddCustomItem}
              className="p-3 rounded-xl bg-[#081425] border border-[#334155] grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
            >
              <input
                type="text"
                required
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Ex: Conferir lona térmica / corrente de travamento"
                className="sm:col-span-5 h-10 px-3 rounded-lg bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] text-xs text-[#d8e3fb] outline-hidden"
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as PreTripCheckCategory)}
                className="sm:col-span-3 h-10 px-2.5 rounded-lg bg-[#0f172a] border border-[#334155] text-xs font-bold text-[#d8e3fb] outline-hidden"
              >
                <option value="iluminacao">Iluminação</option>
                <option value="freios_pneus">Freios & Pneus</option>
                <option value="motor_fluidos">Motor & Óleo</option>
                <option value="seguranca_cabine">Cabine & Cinto</option>
                <option value="documentacao_carga">Engate, Carga & Docs</option>
              </select>
              <label className="sm:col-span-2 flex items-center gap-1.5 text-xs text-[#cbd5e1] cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={customMandatory}
                  onChange={(e) => setCustomMandatory(e.target.checked)}
                  className="accent-[#f59e0b] w-4 h-4"
                />
                <span>Obrigatório</span>
              </label>
              <button
                type="submit"
                className="sm:col-span-2 h-10 px-3 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-extrabold cursor-pointer whitespace-nowrap"
              >
                Adicionar
              </button>
            </form>
          )}

          {/* Checklist Items List */}
          <div className="divide-y divide-[#334155]/70 bg-[#0f172a] rounded-xl border border-[#334155] overflow-hidden">
            {visibleItems.map((item) => {
              const checkedTime = formatCheckedTime(item.completedAt);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="checkbox"
                  aria-checked={item.completed}
                  onClick={() => handleToggleItem(item.id)}
                  className={`w-full text-left px-3.5 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                    item.completed
                      ? 'bg-[#064e3b]/20 hover:bg-[#064e3b]/30'
                      : 'hover:bg-[#152031]'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      item.completed
                        ? 'bg-[#10b981] border-[#10b981] text-[#022c22]'
                        : 'bg-[#081425] border-[#475569] text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          item.completed ? 'text-[#a7f3d0]' : 'text-[#d8e3fb]'
                        }`}
                      >
                        {item.label}
                      </span>

                      <span className="text-[11px] font-mono tabular-nums text-[#94a3b8] shrink-0">
                        {item.completed && checkedTime
                          ? `Concluído às ${checkedTime}`
                          : item.mandatory
                          ? 'Obrigatório'
                          : 'Recomendado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-snug">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Notes + Save Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
            <div className="flex-1">
              <label
                htmlFor="pretrip-notes"
                className="block text-[11px] font-bold text-[#94a3b8] mb-1"
              >
                Observações / Ressalvas da Inspeção (Opcional)
              </label>
              <input
                id="pretrip-notes"
                type="text"
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setHasUnsavedChanges(true);
                  setSaveFeedback(null);
                }}
                placeholder="Ex: Pressão aferida nos 9 eixos, lanterna traseira direita revisada..."
                className="w-full h-11 px-3 rounded-xl bg-[#081425] border border-[#334155] focus:border-[#f59e0b] text-xs text-[#d8e3fb] outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="h-11 px-5 rounded-xl bg-[#f59e0b] hover:bg-[#fbbf24] text-[#0f172a] font-extrabold text-xs flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Inspeção na Viagem</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
