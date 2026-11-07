import React, { useState } from 'react';
import { RouteCheckpoint } from '../types/cockpit';
import { formatCurrency } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import {
  CheckCircle2,
  Clock,
  Radio,
  MapPin,
  Fuel,
  Receipt,
  Shield,
  Bath,
  Truck,
  Plus,
  Scale,
  Edit3,
  Trash2,
  X,
  Check,
} from 'lucide-react';

interface RouteCheckpointsProps {
  checkpoints: RouteCheckpoint[];
  onUpdateCheckpoint: (updated: RouteCheckpoint[]) => void;
  onAddCheckpoint: (newCheckpoint: RouteCheckpoint) => void;
}

export const RouteCheckpoints: React.FC<RouteCheckpointsProps> = ({
  checkpoints,
  onUpdateCheckpoint,
  onAddCheckpoint,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCp, setEditingCp] = useState<RouteCheckpoint | null>(null);
  const [newCpName, setNewCpName] = useState('');
  const [newCpHwy, setNewCpHwy] = useState('');
  const [newCpCity, setNewCpCity] = useState('');
  const [newCpType, setNewCpType] = useState<RouteCheckpoint['type']>('posto_parada');
  const [newCpToll, setNewCpToll] = useState('');

  const toggleCheckpointStatus = (id: string) => {
    playCockpitClick();
    const updated = checkpoints.map((cp) => {
      if (cp.id === id) {
        let nextStatus: RouteCheckpoint['status'] = 'completed';
        if (cp.status === 'upcoming') nextStatus = 'active';
        else if (cp.status === 'active') nextStatus = 'completed';
        else nextStatus = 'upcoming';

        if (nextStatus === 'completed') {
          playSuccessChime();
        }

        return {
          ...cp,
          status: nextStatus,
          actualArrival: nextStatus === 'completed' ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : cp.actualArrival,
        };
      }
      return cp;
    });
    onUpdateCheckpoint(updated);
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpName.trim()) return;

    playSuccessChime();
    const newCp: RouteCheckpoint = {
      id: `cp-${Date.now()}`,
      name: newCpName.trim(),
      highway: newCpHwy.trim() || 'Rodovia',
      city: newCpCity.trim() || 'Em trânsito',
      state: 'BR',
      status: 'upcoming',
      type: newCpType,
      tollFee: newCpToll ? parseFloat(newCpToll) : undefined,
      tollTagDetected: newCpType === 'pedagio',
      hasSafeParking: newCpType === 'posto_parada',
      hasShower: newCpType === 'posto_parada',
    };

    onAddCheckpoint(newCp);
    setShowAddModal(false);
    setNewCpName('');
    setNewCpHwy('');
    setNewCpCity('');
    setNewCpToll('');
  };

  const getTypeIcon = (type: RouteCheckpoint['type']) => {
    switch (type) {
      case 'partida':
        return <Truck className="w-4 h-4 text-[#bec6e0]" />;
      case 'posto_parada':
        return <Fuel className="w-4 h-4 text-[#f59e0b]" />;
      case 'pedagio':
        return <Receipt className="w-4 h-4 text-[#ffb95f]" />;
      case 'fiscalizacao':
        return <Scale className="w-4 h-4 text-[#ea580c]" />;
      case 'descarga':
      case 'destino':
        return <MapPin className="w-4 h-4 text-[#10b981]" />;
      default:
        return <MapPin className="w-4 h-4 text-[#94a3b8]" />;
    }
  };

  return (
    <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 flex items-center justify-between border-b border-[#334155] bg-[#152031]">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#d8e3fb] flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#f59e0b] animate-pulse" />
            Diário de Trechos & Roteiro Rodoviário
          </h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Toque em uma parada para registrar chegada ou avançar status do trecho.
          </p>
        </div>
        <button
          onClick={() => {
            playCockpitClick();
            setShowAddModal(true);
          }}
          className="h-10 px-3 bg-[#243248] hover:bg-[#2a3548] border border-[#475569] text-[#d8e3fb] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#f59e0b]" />
          Adicionar Parada
        </button>
      </div>

      {/* Checkpoint Timeline List */}
      <div className="divide-y divide-[#334155]">
        {checkpoints.map((cp, idx) => {
          const isCompleted = cp.status === 'completed';
          const isActive = cp.status === 'active';
          const isUpcoming = cp.status === 'upcoming';

          return (
            <div
              key={cp.id}
              onClick={() => toggleCheckpointStatus(cp.id)}
              className={`min-h-[64px] p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#243248]/80 hover:bg-[#243248]'
                  : 'hover:bg-[#152031]/60'
              }`}
            >
              {/* Left indicator + checkpoint details */}
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Vertical status indicator icon */}
                <div className="relative shrink-0 flex items-center justify-center">
                  {isCompleted && (
                    <div className="w-7 h-7 rounded-full bg-[#003824] border border-[#10b981] flex items-center justify-center text-[#10b981]">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}

                  {isActive && (
                    <div className="w-7 h-7 rounded-full bg-[#472a00] border-2 border-[#f59e0b] checkpoint-pulse flex items-center justify-center text-[#f59e0b]">
                      <Clock className="w-4 h-4 animate-spin-slow" />
                    </div>
                  )}

                  {isUpcoming && (
                    <div className="w-7 h-7 rounded-full bg-[#111c2d] border border-[#45464d] flex items-center justify-center text-[#909097]">
                      <span className="text-[11px] font-bold font-mono">{idx + 1}</span>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded bg-[#0f172a] text-[#bec6e0] border border-[#334155]">
                      {cp.highway} {cp.kmMarker ? `• ${cp.kmMarker}` : ''}
                    </span>
                    <span
                      className={`text-sm font-bold truncate ${
                        isActive ? 'text-[#ffb95f]' : isCompleted ? 'text-[#d8e3fb]' : 'text-[#c6c6cd]'
                      }`}
                    >
                      {cp.name}
                    </span>
                    <span className="text-[11px] text-[#94a3b8]">
                      ({cp.city} - {cp.state})
                    </span>
                  </div>

                  {/* Amenities & Notes */}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-[#94a3b8]">
                      {getTypeIcon(cp.type)}
                      <span className="capitalize">{cp.type.replace('_', ' ')}</span>
                    </div>

                    {cp.hasSafeParking && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-[#111c2d] text-[#4edea3] px-1.5 py-0.5 rounded border border-[#009365]/30">
                        <Shield className="w-3 h-3" /> Pátio Monitorado
                      </span>
                    )}

                    {cp.hasShower && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-[#111c2d] text-[#bec6e0] px-1.5 py-0.5 rounded border border-[#334155]">
                        <Bath className="w-3 h-3" /> Banho/Chuveiro
                      </span>
                    )}

                    {cp.notes && (
                      <span className="text-[11px] text-[#94a3b8] italic truncate max-w-xs">
                        "{cp.notes}"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: status badge & values */}
              <div className="text-right shrink-0">
                {cp.tollFee !== undefined && (
                  <div className="font-mono text-sm font-bold text-[#ffb95f]">
                    {formatCurrency(cp.tollFee)}
                  </div>
                )}

                {isCompleted && (
                  <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-[#003824] text-[#10b981] border border-[#10b981]/30">
                    Concluído {cp.actualArrival ? `às ${cp.actualArrival}` : ''}
                  </span>
                )}

                {isActive && (
                  <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded bg-[#f59e0b] text-[#0f172a] shadow-sm font-sans tracking-wide uppercase">
                    Em Andamento
                  </span>
                )}

                {/* Actions: Edit & Delete */}
                <div className="flex items-center gap-1.5 justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playCockpitClick();
                      setEditingCp(cp);
                    }}
                    title="Editar Parada"
                    className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-[#bec6e0] hover:text-[#ffb95f] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playCockpitClick();
                      onUpdateCheckpoint(checkpoints.filter((c) => c.id !== cp.id));
                    }}
                    title="Remover Parada"
                    className="p-1 rounded bg-[#1e293b] hover:bg-[#690005] text-[#bec6e0] hover:text-[#ffb4ab] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Checkpoint */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h4 className="text-base font-bold text-[#d8e3fb] mb-1">
              Nova Parada no Roteiro
            </h4>
            <p className="text-xs text-[#94a3b8] mb-4">
              Insira o posto, pedágio ou ponto de parada ao longo do percurso.
            </p>

            <form onSubmit={handleAddNew} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Nome do Local / Ponto de Referência
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Posto São Cristóvão - Rede Rodo"
                  value={newCpName}
                  onChange={(e) => setNewCpName(e.target.value)}
                  className="w-full h-12 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-sm outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Rodovia / KM
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: BR-163 km 520"
                    value={newCpHwy}
                    onChange={(e) => setNewCpHwy(e.target.value)}
                    className="w-full h-12 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-sm outline-hidden font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Nova Mutum"
                    value={newCpCity}
                    onChange={(e) => setNewCpCity(e.target.value)}
                    className="w-full h-12 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-sm outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Tipo do Ponto
                  </label>
                  <select
                    value={newCpType}
                    onChange={(e) => setNewCpType(e.target.value as RouteCheckpoint['type'])}
                    className="w-full h-12 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-sm outline-hidden font-medium"
                  >
                    <option value="posto_parada">Posto de Combustível</option>
                    <option value="pedagio">Praça de Pedágio</option>
                    <option value="fiscalizacao">Balança / Fiscalização</option>
                    <option value="descarga">Local de Descarga</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Pedágio (R$) se houver
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    placeholder="0,00"
                    value={newCpToll}
                    onChange={(e) => setNewCpToll(e.target.value)}
                    className="w-full h-12 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-sm outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-12 px-4 rounded-lg bg-[#1e293b] border border-[#475569] text-[#d8e3fb] font-bold text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-12 px-5 rounded-lg bg-[#f59e0b] text-[#0f172a] font-bold text-sm hover:bg-[#d97706] cursor-pointer"
                >
                  Confirmar Parada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Checkpoint */}
      {editingCp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <h4 className="text-base font-bold text-[#d8e3fb]">Editar Parada do Roteiro</h4>
              <button
                type="button"
                onClick={() => setEditingCp(null)}
                className="text-[#94a3b8] hover:text-[#d8e3fb] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                playSuccessChime();
                onUpdateCheckpoint(
                  checkpoints.map((c) => (c.id === editingCp.id ? editingCp : c))
                );
                setEditingCp(null);
              }}
              className="mt-3.5 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Nome do Local
                </label>
                <input
                  type="text"
                  required
                  value={editingCp.name}
                  onChange={(e) => setEditingCp({ ...editingCp, name: e.target.value })}
                  className="w-full h-11 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-xs font-semibold outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Rodovia / KM
                  </label>
                  <input
                    type="text"
                    value={editingCp.highway}
                    onChange={(e) => setEditingCp({ ...editingCp, highway: e.target.value })}
                    className="w-full h-11 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-xs font-semibold outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={editingCp.city}
                    onChange={(e) => setEditingCp({ ...editingCp, city: e.target.value })}
                    className="w-full h-11 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-xs font-semibold outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Status
                  </label>
                  <select
                    value={editingCp.status}
                    onChange={(e) =>
                      setEditingCp({
                        ...editingCp,
                        status: e.target.value as RouteCheckpoint['status'],
                      })
                    }
                    className="w-full h-11 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-2.5 text-[#d8e3fb] text-xs font-bold outline-hidden"
                  >
                    <option value="upcoming">Aguardando (Cinza)</option>
                    <option value="active">Em Andamento (Âmbar)</option>
                    <option value="completed">Concluído (Verde)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                    Pedágio (R$)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    placeholder="0,00"
                    value={editingCp.tollFee !== undefined ? editingCp.tollFee : ''}
                    onChange={(e) =>
                      setEditingCp({
                        ...editingCp,
                        tollFee: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full h-11 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-xs font-mono font-bold outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94a3b8] mb-1 uppercase">
                  Anotações / Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pátio calçado, banho grátis para abastecimento acima de 200L"
                  value={editingCp.notes || ''}
                  onChange={(e) => setEditingCp({ ...editingCp, notes: e.target.value })}
                  className="w-full h-11 bg-[#0f172a] border border-[#334155] focus:border-[#f59e0b] rounded-lg px-3 text-[#d8e3fb] text-xs outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setEditingCp(null)}
                  className="h-11 px-4 rounded-lg bg-[#1e293b] border border-[#475569] text-[#d8e3fb] font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-lg bg-[#f59e0b] text-[#0f172a] font-extrabold text-xs hover:bg-[#d97706] cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  Salvar Parada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
