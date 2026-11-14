import React, { useState, useMemo, useEffect } from 'react';
import {
  TireMonitorItem,
  TireLifeStage,
  Expense,
} from '../types/cockpit';
import {
  calculateTireWear,
  addKmToAllTires,
  TIRE_WEAR_ALERT_THRESHOLD_PCT,
} from '../services/tireMonitorService';
import { formatOdometer, formatCurrency } from '../utils/formatters';
import { playCockpitClick, playSuccessChime, playAlertBeep } from '../utils/audio';
import {
  CircleDot,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  Gauge,
  Check,
  X,
  Sparkles,
  TrendingUp,
  Layers,
  Receipt,
} from 'lucide-react';

interface TireMonitorSectionProps {
  tires: TireMonitorItem[];
  onUpdateTires: (tires: TireMonitorItem[]) => void;
  currentOdometer: number;
  vehicleModel?: string;
  vehiclePlate?: string;
  onAddExpense?: (expense: Omit<Expense, 'id'>) => void;
}

const PRESET_POSITIONS = [
  'Dianteiro Esquerdo (Eixo 1)',
  'Dianteiro Direito (Eixo 1)',
  'Tração Externa Esquerda (Eixo 2)',
  'Tração Interna Esquerda (Eixo 2)',
  'Tração Externa Direita (Eixo 2)',
  'Tração Interna Direita (Eixo 2)',
  'Truck Externo Esquerdo (Eixo 3)',
  'Truck Interno Esquerdo (Eixo 3)',
  'Truck Externo Direito (Eixo 3)',
  'Truck Interno Direito (Eixo 3)',
  'Carreta Eixo 1 Esquerdo Externo',
  'Carreta Eixo 1 Direito Externo',
  'Estepe / Reserva',
];

export const TireMonitorSection: React.FC<TireMonitorSectionProps> = ({
  tires,
  onUpdateTires,
  currentOdometer,
  vehicleModel,
  vehiclePlate,
  onAddExpense,
}) => {
  const [filterMode, setFilterMode] = useState<'todos' | 'alerta' | 'bom' | 'dianteiro' | 'tracao'>('todos');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'alert'; text: string } | null>(null);

  // Per-tire inline KM draft values
  const [kmInputs, setKmInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setKmInputs((prev) => {
      const next: Record<string, string> = {};
      tires.forEach((t) => {
        next[t.id] = prev[t.id] !== undefined ? prev[t.id] : String(t.currentTireKm);
      });
      return next;
    });
  }, [tires]);

  // Batch +KM state
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [batchKmDelta, setBatchKmDelta] = useState('500');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTire, setEditingTire] = useState<TireMonitorItem | null>(null);
  const [formPosition, setFormPosition] = useState('Dianteiro Esquerdo (Eixo 1)');
  const [formAxle, setFormAxle] = useState('1');
  const [formBrand, setFormBrand] = useState('Michelin X Multi Z 295/80 R22.5');
  const [formFireNumber, setFormFireNumber] = useState('');
  const [formDotCode, setFormDotCode] = useState('');
  const [formLifeStage, setFormLifeStage] = useState<TireLifeStage>('novo');
  const [formCurrentKm, setFormCurrentKm] = useState('0');
  const [formEstimatedKm, setFormEstimatedKm] = useState('85000');
  const [formNotes, setFormNotes] = useState('');

  // Replace / Recap modal state
  const [replacingTire, setReplacingTire] = useState<TireMonitorItem | null>(null);
  const [replaceStage, setReplaceStage] = useState<TireLifeStage>('1_recapagem');
  const [replaceEstimatedKm, setReplaceEstimatedKm] = useState('75000');
  const [replaceCost, setReplaceCost] = useState('1250');
  const [launchReplaceExpense, setLaunchReplaceExpense] = useState(false);

  const showToast = (type: 'success' | 'alert', text: string) => {
    setActionNotice({ type, text });
    setTimeout(() => {
      setActionNotice((curr) => (curr?.text === text ? null : curr));
    }, 6000);
  };

  // Analyze all tires
  const {
    analyzedTires,
    healthyCount,
    alert80Count,
    criticalCount,
    totalAlertsCount,
  } = useMemo(() => {
    let healthy = 0;
    let alert80 = 0;
    let critical = 0;

    const list = tires.map((tire) => {
      const analysis = calculateTireWear(tire);
      if (analysis.status === 'critico') critical += 1;
      else if (analysis.status === 'alerta_80') alert80 += 1;
      else healthy += 1;

      return { tire, analysis };
    });

    // Sort highest wear percentage first so critical/80% tires stand out immediately
    list.sort((a, b) => b.analysis.wearPct - a.analysis.wearPct);

    return {
      analyzedTires: list,
      healthyCount: healthy,
      alert80Count: alert80,
      criticalCount: critical,
      totalAlertsCount: alert80 + critical,
    };
  }, [tires]);

  const filteredTires = useMemo(() => {
    return analyzedTires.filter(({ tire, analysis }) => {
      if (filterMode === 'alerta') return analysis.isAlert80;
      if (filterMode === 'bom') return !analysis.isAlert80;
      if (filterMode === 'dianteiro') return tire.axleNumber === 1;
      if (filterMode === 'tracao') return tire.axleNumber >= 2;
      return true;
    });
  }, [analyzedTires, filterMode]);

  // Inline save current mileage for a single tire
  const handleRegisterTireKm = (tire: TireMonitorItem, rawVal?: string) => {
    const strVal = rawVal !== undefined ? rawVal : kmInputs[tire.id] ?? String(tire.currentTireKm);
    const parsedKm = Math.max(0, Math.round(Number(strVal)));

    if (isNaN(parsedKm)) {
      playAlertBeep();
      showToast('alert', 'Informe um valor numérico válido de quilometragem para o pneu.');
      return;
    }

    const updatedTire: TireMonitorItem = {
      ...tire,
      currentTireKm: parsedKm,
      lastUpdatedAt: new Date().toISOString(),
    };

    const nextList = tires.map((t) => (t.id === tire.id ? updatedTire : t));
    onUpdateTires(nextList);
    setKmInputs((prev) => ({ ...prev, [tire.id]: String(parsedKm) }));

    const analysis = calculateTireWear(updatedTire);
    if (analysis.status === 'critico') {
      playAlertBeep();
      showToast(
        'alert',
        `🚨 LIMITE CRÍTICO: "${tire.position}" atingiu ${analysis.wearPct.toFixed(1)}% do desgaste estimado (${formatOdometer(parsedKm)} / ${formatOdometer(tire.estimatedLifeKm)}). Troca urgente recomendada!`
      );
    } else if (analysis.isAlert80) {
      playAlertBeep();
      showToast(
        'alert',
        `⚠️ ALERTA 80%: "${tire.position}" atingiu ${analysis.wearPct.toFixed(1)}% da vida útil estimada! Restam apenas ${formatOdometer(analysis.remainingKm)}.`
      );
    } else {
      playSuccessChime();
      showToast(
        'success',
        `Quilometragem de "${tire.position}" atualizada para ${formatOdometer(parsedKm)} (${analysis.wearPct.toFixed(1)}% de desgaste).`
      );
    }
  };

  const handleBatchAddKm = (e: React.FormEvent) => {
    e.preventDefault();
    const delta = Math.round(Number(batchKmDelta));
    if (isNaN(delta) || delta <= 0) {
      playAlertBeep();
      return;
    }

    const updated = addKmToAllTires(tires, delta);
    onUpdateTires(updated);

    // Sync inline inputs
    const nextInputs: Record<string, string> = {};
    updated.forEach((t) => {
      nextInputs[t.id] = String(t.currentTireKm);
    });
    setKmInputs(nextInputs);

    const alertsNow = updated.filter((t) => calculateTireWear(t).isAlert80);
    if (alertsNow.length > 0) {
      playAlertBeep();
      showToast(
        'alert',
        `+${formatOdometer(delta)} somados em ${updated.length} pneus. Atenção: ${alertsNow.length} pneu(s) estão com ≥ 80% de desgaste!`
      );
    } else {
      playSuccessChime();
      showToast('success', `+${formatOdometer(delta)} registrados em toda a frota de pneus!`);
    }
    setShowBatchPanel(false);
  };

  const handleOpenAddModal = () => {
    playCockpitClick();
    setEditingTire(null);
    setFormPosition('Dianteiro Esquerdo (Eixo 1)');
    setFormAxle('1');
    setFormBrand('Michelin X Multi Z 295/80 R22.5');
    setFormFireNumber(`F-0${tires.length + 101}`);
    setFormDotCode('2425');
    setFormLifeStage('novo');
    setFormCurrentKm('0');
    setFormEstimatedKm('90000');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (tire: TireMonitorItem) => {
    playCockpitClick();
    setEditingTire(tire);
    setFormPosition(tire.position);
    setFormAxle(String(tire.axleNumber));
    setFormBrand(tire.brandModel);
    setFormFireNumber(tire.fireNumber || '');
    setFormDotCode(tire.dotCode || '');
    setFormLifeStage(tire.lifeStage);
    setFormCurrentKm(String(tire.currentTireKm));
    setFormEstimatedKm(String(tire.estimatedLifeKm));
    setFormNotes(tire.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveTireModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPosition.trim() || !formBrand.trim()) return;

    const currentKm = Math.max(0, Math.round(Number(formCurrentKm) || 0));
    const estimatedKm = Math.max(1000, Math.round(Number(formEstimatedKm) || 80000));
    const axleNum = Math.min(9, Math.max(1, Math.round(Number(formAxle) || 1)));

    const payload: TireMonitorItem = {
      id: editingTire ? editingTire.id : `tire-${Date.now()}`,
      position: formPosition.trim(),
      axleNumber: axleNum,
      brandModel: formBrand.trim(),
      fireNumber: formFireNumber.trim() || undefined,
      dotCode: formDotCode.trim() || undefined,
      lifeStage: formLifeStage,
      currentTireKm: currentKm,
      estimatedLifeKm: estimatedKm,
      lastUpdatedAt: new Date().toISOString(),
      notes: formNotes.trim() || undefined,
    };

    const nextList = editingTire
      ? tires.map((t) => (t.id === editingTire.id ? payload : t))
      : [...tires, payload];

    onUpdateTires(nextList);
    setKmInputs((prev) => ({ ...prev, [payload.id]: String(payload.currentTireKm) }));
    setIsModalOpen(false);

    const analysis = calculateTireWear(payload);
    if (analysis.isAlert80) {
      playAlertBeep();
      showToast(
        'alert',
        `⚠️ Pneu "${payload.position}" salvo com ${analysis.wearPct.toFixed(1)}% de desgaste (acima do alerta de 80%)!`
      );
    } else {
      playSuccessChime();
      showToast(
        'success',
        editingTire
          ? `Dados do pneu "${payload.position}" atualizados.`
          : `Pneu "${payload.position}" adicionado ao monitoramento.`
      );
    }
  };

  const handleConfirmReplace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replacingTire) return;

    const newEst = Math.max(1000, Math.round(Number(replaceEstimatedKm) || 80000));
    const costVal = Math.max(0, parseFloat(replaceCost) || 0);

    const updated: TireMonitorItem = {
      ...replacingTire,
      lifeStage: replaceStage,
      currentTireKm: 0,
      estimatedLifeKm: newEst,
      lastUpdatedAt: new Date().toISOString(),
      notes: `Renovado em ${new Date().toLocaleDateString('pt-BR')} (${
        replaceStage === 'novo'
          ? 'Pneu Novo'
          : replaceStage === '1_recapagem'
          ? '1ª Recapagem'
          : '2ª Recapagem'
      }) no odômetro ${formatOdometer(currentOdometer)}.`,
    };

    onUpdateTires(tires.map((t) => (t.id === replacingTire.id ? updated : t)));
    setKmInputs((prev) => ({ ...prev, [replacingTire.id]: '0' }));

    if (launchReplaceExpense && onAddExpense && costVal > 0) {
      onAddExpense({
        category: 'pneu_borracharia',
        description: `Substituição/Recapagem: ${replacingTire.position} (${replacingTire.brandModel})`,
        amount: costVal,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        location: 'Borracharia / Recapadora',
        odometerKm: currentOdometer,
        paymentMethod: 'PIX',
      });
      showToast(
        'success',
        `Pneu "${replacingTire.position}" zerado para nova vida útil e despesa de ${formatCurrency(costVal)} lançada!`
      );
    } else {
      showToast('success', `Pneu "${replacingTire.position}" renovado com sucesso! KM zerado.`);
    }

    playSuccessChime();
    setReplacingTire(null);
  };

  const handleDeleteTire = (tire: TireMonitorItem) => {
    playCockpitClick();
    onUpdateTires(tires.filter((t) => t.id !== tire.id));
    showToast('success', `Pneu "${tire.position}" removido do monitoramento.`);
  };

  const getLifeStageLabel = (stage: TireLifeStage) => {
    if (stage === 'novo') return 'Pneu Novo (1ª Vida)';
    if (stage === '1_recapagem') return '1ª Recapagem';
    return '2ª Recapagem';
  };

  return (
    <div className="p-4 md:p-5 space-y-4">
      {/* Header da Seção */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-[#f59e0b]" />
            Monitoramento de Vida Útil dos Pneus {vehiclePlate ? `• ${vehiclePlate}` : ''}
          </h4>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Registre a quilometragem atual de cada pneu. O sistema dispara alertas visuais automáticos quando atingir{' '}
            <strong className="text-[#ffb95f]">{TIRE_WEAR_ALERT_THRESHOLD_PCT}% do desgaste estimado</strong>.
            {vehicleModel ? ` (${vehicleModel})` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playCockpitClick();
              setShowBatchPanel((v) => !v);
            }}
            className="h-10 px-3.5 rounded-xl bg-[#081425] hover:bg-[#152031] border border-[#38bdf8]/50 text-[#38bdf8] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Somar quilometragem percorrida na viagem em todos os pneus de uma só vez"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Somar +KM em Lote</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="h-10 px-3.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Cadastrar Pneu</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
            actionNotice.type === 'alert'
              ? 'bg-[#450a0a] border-[#ef4444] text-[#fecaca]'
              : 'bg-[#003824] border-[#10b981] text-[#d1fae5]'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'alert' ? (
              <AlertTriangle className="w-4 h-4 text-[#ef4444] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="p-1 rounded-lg hover:bg-black/20 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Batch +KM Panel */}
      {showBatchPanel && (
        <form
          onSubmit={handleBatchAddKm}
          className="p-4 rounded-xl bg-[#081425] border border-[#38bdf8]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
        >
          <div>
            <div className="text-xs font-extrabold text-[#38bdf8] flex items-center gap-1.5">
              <Gauge className="w-4 h-4" />
              Atualização Rápida de Rodagem em Lote
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              Adiciona a distância percorrida na viagem atual simultaneamente aos {tires.length} pneus cadastrados.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[250, 500, 1000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setBatchKmDelta(String(preset))}
                className={`h-9 px-2.5 rounded-lg text-xs font-mono font-bold border cursor-pointer transition-colors ${
                  batchKmDelta === String(preset)
                    ? 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8]'
                    : 'bg-[#152031] border-[#334155] text-[#94a3b8] hover:text-white'
                }`}
              >
                +{preset} km
              </button>
            ))}
            <input
              type="number"
              min="1"
              step="10"
              value={batchKmDelta}
              onChange={(e) => setBatchKmDelta(e.target.value)}
              className="w-24 h-9 bg-[#152031] border border-[#38bdf8]/60 rounded-lg px-2.5 text-xs font-mono font-bold text-white outline-hidden"
            />
            <button
              type="submit"
              className="h-9 px-3.5 rounded-lg bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#081425] text-xs font-black cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Aplicar</span>
            </button>
          </div>
        </form>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#081425] border border-[#334155]">
          <div className="text-[10px] font-bold uppercase text-[#94a3b8]">Pneus Monitorados</div>
          <div className="text-xl font-black font-mono text-[#d8e3fb] mt-1">{tires.length}</div>
          <div className="text-[11px] text-[#64748b] mt-0.5">Posições ativas no veículo</div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#081425] border border-[#10b981]/40">
          <div className="text-[10px] font-bold uppercase text-[#4edea3]">Em Condição Segura (&lt; 80%)</div>
          <div className="text-xl font-black font-mono text-[#34d399] mt-1">{healthyCount}</div>
          <div className="text-[11px] text-[#a7f3d0]/70 mt-0.5">Rodagem dentro do esperado</div>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            alert80Count > 0
              ? 'bg-[#422006]/70 border-[#f59e0b] shadow-lg shadow-amber-950/30'
              : 'bg-[#081425] border-[#334155]'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-[#ffb95f]">Alerta de Desgaste (80% - 99%)</div>
          <div className="text-xl font-black font-mono text-[#ffb95f] mt-1">{alert80Count}</div>
          <div className="text-[11px] text-[#fed7aa]/80 mt-0.5">Programar rodízio ou recapagem</div>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            criticalCount > 0
              ? 'bg-[#450a0a]/80 border-[#ef4444] shadow-lg shadow-red-950/40 animate-pulse'
              : 'bg-[#081425] border-[#334155]'
          }`}
        >
          <div className="text-[10px] font-bold uppercase text-[#fca5a5]">Limite Atingido (≥ 100%)</div>
          <div className="text-xl font-black font-mono text-[#ef4444] mt-1">{criticalCount}</div>
          <div className="text-[11px] text-[#fecaca]/80 mt-0.5">Troca ou recapagem imediata</div>
        </div>
      </div>

      {/* Prominent 80% Visual Alert Banner */}
      {totalAlertsCount > 0 ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#450a0a] via-[#422006] to-[#1e1b4b] border-2 border-[#ef4444] shadow-xl text-white space-y-2.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#ef4444]/20 border border-[#ef4444] text-[#fca5a5] shrink-0 animate-pulse">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-[#fecaca] uppercase">
                    ⚠️ ALERTA DE DESGASTE DE PNEUS: {totalAlertsCount} Pneu(s) Atingiram ≥ 80% da Vida Útil!
                  </h4>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#ef4444] text-white">
                    Inspeção TWI Obrigatória
                  </span>
                </div>
                <p className="text-xs text-[#fed7aa] mt-1">
                  {analyzedTires
                    .filter((item) => item.analysis.isAlert80)
                    .map(
                      ({ tire, analysis }) =>
                        `${tire.position}${tire.fireNumber ? ` (${tire.fireNumber})` : ''}: ${analysis.wearPct.toFixed(
                          1
                        )}% (${
                          analysis.remainingKm <= 0
                            ? `excedido em ${formatOdometer(Math.abs(analysis.remainingKm))}`
                            : `restam ${formatOdometer(analysis.remainingKm)}`
                        })`
                    )
                    .join(' • ')}
                </p>
                <p className="text-[11px] text-[#fca5a5]/90 mt-1">
                  Recomendação de segurança: pneus acima de 80% de desgaste devem ser enviados para recapagem antes de atingir a lona (preservação da carcaça e conformidade PRF/CONTRAN).
                </p>
              </div>
            </div>

            {filterMode !== 'alerta' && (
              <button
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setFilterMode('alerta');
                }}
                className="h-9 px-3.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-black cursor-pointer shrink-0 shadow-md"
              >
                Filtrar Pneus em Alerta ({totalAlertsCount})
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#022c22] to-[#043d30] border border-[#10b981] text-[#a7f3d0] flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#10b981]/20 text-[#34d399] shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs sm:text-sm font-extrabold text-[#d1fae5]">
              Todos os Pneus Abaixo de 80% do Desgaste Estimado
            </h5>
            <p className="text-[11px] text-[#a7f3d0]/80">
              Nenhuma posição atingiu a faixa crítica de troca ou recapagem no momento.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'todos', label: `Todos (${tires.length})` },
          { key: 'alerta', label: `⚠️ Alerta ≥ 80% (${totalAlertsCount})` },
          { key: 'bom', label: `✅ Saudáveis (${healthyCount})` },
          { key: 'dianteiro', label: 'Dianteiros (Eixo 1)' },
          { key: 'tracao', label: 'Tração / Eixos Traseiros' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              playCockpitClick();
              setFilterMode(tab.key as typeof filterMode);
            }}
            className={`h-8 px-3 rounded-lg font-bold border transition-all cursor-pointer whitespace-nowrap ${
              filterMode === tab.key
                ? 'bg-[#243248] text-[#ffb95f] border-[#f59e0b]'
                : 'bg-[#081425] text-[#94a3b8] border-[#334155] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tires Cards Grid */}
      {filteredTires.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#94a3b8] bg-[#152031] rounded-xl border border-[#334155]">
          <CircleDot className="w-8 h-8 mx-auto text-[#64748b] mb-2" />
          Nenhum pneu encontrado para o filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filteredTires.map(({ tire, analysis }) => {
            const isCritical = analysis.status === 'critico';
            const isAlert80 = analysis.status === 'alerta_80';

            return (
              <div
                key={tire.id}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-3 shadow-lg ${
                  isCritical
                    ? 'bg-[#152031] border-[#ef4444] shadow-red-950/30'
                    : isAlert80
                    ? 'bg-[#152031] border-[#f59e0b] shadow-amber-950/25'
                    : 'bg-[#152031] border-[#334155]'
                }`}
              >
                {/* Top Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCritical
                          ? 'bg-[#450a0a] border-[#ef4444] text-[#fca5a5]'
                          : isAlert80
                          ? 'bg-[#422006] border-[#f59e0b] text-[#fde68a]'
                          : 'bg-[#081425] border-[#334155] text-[#34d399]'
                      }`}
                    >
                      <CircleDot className={`w-5 h-5 ${analysis.isAlert80 ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#081425] border border-[#334155] text-[#38bdf8]">
                          Eixo {tire.axleNumber}
                        </span>
                        {tire.fireNumber && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#081425] border border-[#334155] text-[#ffb95f]">
                            Fogo: {tire.fireNumber}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#0f172a] text-[#94a3b8]">
                          {getLifeStageLabel(tire.lifeStage)}
                        </span>
                      </div>
                      <h5 className="text-sm font-black text-white mt-1 leading-tight">{tire.position}</h5>
                      <p className="text-[11px] text-[#94a3b8] truncate">
                        {tire.brandModel} {tire.dotCode ? `• DOT ${tire.dotCode}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isCritical ? (
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#690005] text-[#ffb4ab] border border-[#ef4444] flex items-center gap-1 animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{analysis.wearPct.toFixed(1)}% CRÍTICO</span>
                      </span>
                    ) : isAlert80 ? (
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#472a00] text-[#ffb95f] border border-[#f59e0b] flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />
                        <span>{analysis.wearPct.toFixed(1)}% ALERTA ≥80%</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#003824] text-[#34d399] border border-[#10b981]/40 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{analysis.wearPct.toFixed(1)}% OK</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Wear Progress Bar with 80% Marker */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span
                      className={
                        isCritical
                          ? 'text-[#fca5a5] font-bold'
                          : isAlert80
                          ? 'text-[#ffb95f] font-bold'
                          : 'text-[#4edea3] font-bold'
                      }
                    >
                      Desgaste Estimado: {analysis.wearPct.toFixed(1)}%
                    </span>
                    <span className="text-[#94a3b8]">
                      {analysis.remainingKm <= 0
                        ? `Excedido em ${formatOdometer(Math.abs(analysis.remainingKm))}`
                        : `Restam ${formatOdometer(analysis.remainingKm)}`}
                    </span>
                  </div>

                  <div className="relative w-full h-3 bg-[#081425] rounded-full overflow-hidden border border-[#334155]">
                    <div
                      style={{ width: `${analysis.clampedBarPct}%` }}
                      className={`h-full transition-all duration-300 ${
                        isCritical
                          ? 'bg-gradient-to-r from-[#ea580c] to-[#ef4444]'
                          : isAlert80
                          ? 'bg-gradient-to-r from-[#f59e0b] to-[#ea580c]'
                          : 'bg-gradient-to-r from-[#059669] to-[#10b981]'
                      }`}
                    />
                    {/* 80% Threshold Marker */}
                    <div
                      className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-white/80 z-10"
                      title="Marca de Alerta: 80% de desgaste estimado"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#64748b]">
                    <span>0 km</span>
                    <span className="text-[#ffb95f] font-bold">▲ Gatilho 80% ({formatOdometer(Math.round(tire.estimatedLifeKm * 0.8))})</span>
                    <span>Meta: {formatOdometer(tire.estimatedLifeKm)}</span>
                  </div>
                </div>

                {/* Inline Mileage Registration Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRegisterTireKm(tire);
                  }}
                  className="p-2.5 rounded-xl bg-[#081425] border border-[#334155] space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[#94a3b8]">
                    <span>Registrar Quilometragem Atual do Pneu (KM)</span>
                    <span className="font-mono text-[#38bdf8]">
                      Atual: {formatOdometer(tire.currentTireKm)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      aria-label={`Quilometragem atual do pneu ${tire.position}`}
                      value={kmInputs[tire.id] ?? String(tire.currentTireKm)}
                      onChange={(e) =>
                        setKmInputs((prev) => ({
                          ...prev,
                          [tire.id]: e.target.value,
                        }))
                      }
                      className="flex-1 h-9 bg-[#152031] border border-[#475569] focus:border-[#f59e0b] rounded-lg px-3 text-xs font-mono font-bold text-white outline-hidden"
                    />
                    <button
                      type="submit"
                      className="h-9 px-3.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Registrar KM</span>
                    </button>
                  </div>
                </form>

                {tire.notes && (
                  <p className="text-[11px] text-[#94a3b8] italic bg-[#0f172a]/70 px-2.5 py-1.5 rounded-lg border border-[#334155]/50">
                    "{tire.notes}"
                  </p>
                )}

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#334155]/60">
                  <button
                    type="button"
                    onClick={() => {
                      playCockpitClick();
                      setReplacingTire(tire);
                      setReplaceStage(tire.lifeStage === 'novo' ? '1_recapagem' : '2_recapagem');
                      setReplaceEstimatedKm(String(tire.estimatedLifeKm));
                    }}
                    className="h-8 px-3 rounded-lg bg-[#243248] hover:bg-[#334155] border border-[#475569] text-[11px] font-bold text-[#d8e3fb] flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Registrar troca ou recapagem do pneu e zerar o contador de KM"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>Trocar / Recapar (Zerar KM)</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(tire)}
                      className="h-8 px-2.5 rounded-lg bg-[#081425] hover:bg-[#1e293b] border border-[#334155] text-[11px] font-bold text-[#bec6e0] flex items-center gap-1 cursor-pointer transition-colors"
                      title="Editar informações e vida útil estimada do pneu"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#ffb95f]" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTire(tire)}
                      className="w-8 h-8 rounded-lg bg-[#081425] hover:bg-[#690005] border border-[#334155] hover:border-[#ef4444] text-[#94a3b8] hover:text-[#ffb4ab] flex items-center justify-center cursor-pointer transition-colors"
                      title="Remover pneu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: CADASTRAR / EDITAR PNEU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#f59e0b]/20 text-[#f59e0b]">
                  <CircleDot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-[#d8e3fb]">
                    {editingTire ? 'Editar Pneu Monitorado' : 'Cadastrar Novo Pneu'}
                  </h4>
                  <p className="text-xs text-[#94a3b8]">
                    Defina a posição, quilometragem atual e vida útil estimada (alerta automático em 80%).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-9 h-9 rounded-lg bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTireModal} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Posição no Veículo / Conjunto
                </label>
                <input
                  type="text"
                  list="tire-positions-presets"
                  required
                  value={formPosition}
                  onChange={(e) => setFormPosition(e.target.value)}
                  placeholder="Ex: Dianteiro Esquerdo (Eixo 1)"
                  className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-bold outline-hidden"
                />
                <datalist id="tire-positions-presets">
                  {PRESET_POSITIONS.map((pos) => (
                    <option key={pos} value={pos} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Eixo (1 a 9)
                  </label>
                  <select
                    value={formAxle}
                    onChange={(e) => setFormAxle(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-bold outline-hidden"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((ax) => (
                      <option key={ax} value={ax}>
                        Eixo {ax} {ax === 1 ? '(Dianteiro)' : ax <= 3 ? '(Tração / Truck)' : '(Carreta)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Estágio de Vida
                  </label>
                  <select
                    value={formLifeStage}
                    onChange={(e) => setFormLifeStage(e.target.value as TireLifeStage)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-bold outline-hidden"
                  >
                    <option value="novo">Pneu Novo (1ª Vida)</option>
                    <option value="1_recapagem">1ª Recapagem</option>
                    <option value="2_recapagem">2ª Recapagem</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Marca / Medida / Modelo
                </label>
                <input
                  type="text"
                  required
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  placeholder="Ex: Michelin X Multi Z 295/80 R22.5"
                  className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs font-semibold outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Nº de Fogo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formFireNumber}
                    onChange={(e) => setFormFireNumber(e.target.value.toUpperCase())}
                    placeholder="Ex: F-0105"
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#ffb95f] font-mono text-xs font-bold outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Código DOT (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formDotCode}
                    onChange={(e) => setFormDotCode(e.target.value)}
                    placeholder="Ex: 2425"
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs font-bold outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    KM Atual Rodado no Pneu
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={formCurrentKm}
                    onChange={(e) => setFormCurrentKm(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#38bdf8] font-mono text-xs font-bold outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Vida Útil Estimada (KM)
                  </label>
                  <input
                    type="number"
                    min="5000"
                    step="1000"
                    required
                    value={formEstimatedKm}
                    onChange={(e) => setFormEstimatedKm(e.target.value)}
                    className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#ffb95f] font-mono text-xs font-bold outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Observações (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Sulco medido em 6mm, calibrado com 110 PSI..."
                  className="w-full bg-[#081425] border border-[#334155] focus:border-[#f59e0b] rounded-xl p-3 text-[#d8e3fb] text-xs outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-11 px-4 rounded-xl bg-[#1e293b] border border-[#475569] text-[#d8e3fb] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-extrabold text-xs cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingTire ? 'Salvar Alterações' : 'Cadastrar Pneu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TROCAR / RECAPAR PNEU (ZERAR KM) */}
      {replacingTire && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#152031] border border-[#10b981]/60 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#003824] border border-[#10b981] text-[#34d399]">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-white">
                    Trocar / Recapar Pneu
                  </h4>
                  <p className="text-[11px] text-[#94a3b8]">{replacingTire.position}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplacingTire(null)}
                className="w-8 h-8 rounded-lg bg-[#1e293b] text-[#94a3b8] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReplace} className="space-y-3.5">
              <p className="text-xs text-[#bec6e0]">
                Esta ação irá <strong>zerar a quilometragem atual do pneu (0 km)</strong> para iniciar o monitoramento do novo ciclo.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Novo Estágio do Pneu
                </label>
                <select
                  value={replaceStage}
                  onChange={(e) => setReplaceStage(e.target.value as TireLifeStage)}
                  className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 text-[#d8e3fb] text-xs font-bold outline-hidden"
                >
                  <option value="novo">Pneu Novo (Substituição Completa)</option>
                  <option value="1_recapagem">1ª Recapagem</option>
                  <option value="2_recapagem">2ª Recapagem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Nova Vida Útil Estimada (KM)
                </label>
                <input
                  type="number"
                  min="5000"
                  step="1000"
                  required
                  value={replaceEstimatedKm}
                  onChange={(e) => setReplaceEstimatedKm(e.target.value)}
                  className="w-full h-11 bg-[#081425] border border-[#334155] focus:border-[#10b981] rounded-xl px-3 text-[#34d399] font-mono text-xs font-bold outline-hidden"
                />
              </div>

              {onAddExpense && (
                <div className="p-3 rounded-xl bg-[#081425] border border-[#334155] space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#d8e3fb] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={launchReplaceExpense}
                      onChange={(e) => setLaunchReplaceExpense(e.target.checked)}
                      className="w-4 h-4 accent-[#10b981]"
                    />
                    <span>Lançar custo nas Despesas da Viagem?</span>
                  </label>

                  {launchReplaceExpense && (
                    <div>
                      <label className="block text-[10px] font-bold text-[#94a3b8] mb-1 uppercase">
                        Valor Gasto (R$)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={replaceCost}
                        onChange={(e) => setReplaceCost(e.target.value)}
                        className="w-full h-10 bg-[#152031] border border-[#10b981]/50 rounded-lg px-3 text-[#ffb95f] font-mono text-xs font-bold outline-hidden"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReplacingTire(null)}
                  className="h-10 px-4 rounded-xl bg-[#1e293b] border border-[#475569] text-xs font-bold text-[#d8e3fb] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#022c22] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar e Zerar KM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
