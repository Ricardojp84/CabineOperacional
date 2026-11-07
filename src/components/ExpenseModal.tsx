import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../types/cockpit';
import { formatCurrency } from '../utils/formatters';
import { playCockpitClick, playSuccessChime } from '../utils/audio';
import {
  Receipt,
  Utensils,
  Wrench,
  CircleDot,
  ParkingCircle,
  Users,
  CreditCard,
  Check,
  X,
  FileText,
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (expense: Expense) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('pedagio');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [location, setLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'TAG Sem Parar' | 'Cartão Frete' | 'PIX' | 'Dinheiro'>('TAG Sem Parar');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  if (!isOpen) return null;

  const CATEGORIES: { id: ExpenseCategory; label: string; icon: React.ReactNode; colorClass: string }[] = [
    {
      id: 'pedagio',
      label: 'Pedágio',
      icon: <Receipt className="w-4 h-4" />,
      colorClass: 'border-[#ffb95f] text-[#ffb95f] bg-[#472a00]/50',
    },
    {
      id: 'alimentacao',
      label: 'Alimentação',
      icon: <Utensils className="w-4 h-4" />,
      colorClass: 'border-[#38bdf8] text-[#38bdf8] bg-[#0c4a6e]/40',
    },
    {
      id: 'pneu_borracharia',
      label: 'Borracharia/Pneu',
      icon: <CircleDot className="w-4 h-4" />,
      colorClass: 'border-[#ffb4ab] text-[#ffb4ab] bg-[#690005]/40',
    },
    {
      id: 'manutencao',
      label: 'Manutenção',
      icon: <Wrench className="w-4 h-4" />,
      colorClass: 'border-[#ffb4ab] text-[#ffb4ab] bg-[#690005]/40',
    },
    {
      id: 'estacionamento',
      label: 'Pernoite/Pátio',
      icon: <ParkingCircle className="w-4 h-4" />,
      colorClass: 'border-[#c6c6cd] text-[#c6c6cd] bg-[#1e293b]',
    },
    {
      id: 'chapa_descarga',
      label: 'Chapa/Descarga',
      icon: <Users className="w-4 h-4" />,
      colorClass: 'border-[#f59e0b] text-[#f59e0b] bg-[#472a00]/40',
    },
  ];

  const handleCategorySelect = (cat: ExpenseCategory) => {
    playCockpitClick();
    setCategory(cat);
    if (cat === 'pedagio') {
      setPaymentMethod('TAG Sem Parar');
      if (!description) setDescription('Praça de Pedágio Rodovia');
    } else if (cat === 'alimentacao') {
      setPaymentMethod('PIX');
      if (!description) setDescription('Almoço Restaurante Rodoviário');
    } else if (cat === 'pneu_borracharia') {
      setPaymentMethod('PIX');
      if (!description) setDescription('Conserto / Calibragem de Pneu');
    } else if (cat === 'chapa_descarga') {
      setPaymentMethod('Dinheiro');
      if (!description) setDescription('Ajudante / Chapa Descarga Armazém');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    playSuccessChime();

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      category,
      description: description.trim() || `Despesa de ${category}`,
      amount: val,
      location: location.trim() || undefined,
      paymentMethod,
      invoiceNumber: invoiceNumber.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    onAddExpense(newExp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#152031] border-t sm:border border-[#475569] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#243248] border border-[#ffb95f] flex items-center justify-center text-[#ffb95f]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#d8e3fb]">
                Lançar Despesa Operacional
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Registre pedágios, alimentação, borracharia e diárias da viagem.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playCockpitClick();
              onClose();
            }}
            className="w-10 h-10 rounded-xl bg-[#1e293b] hover:bg-[#243248] text-[#94a3b8] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category Chips - exactly 36px height as in spec */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1.5">
              Categoria da Despesa
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`h-[36px] px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? `${cat.colorClass} border-1.5 font-bold shadow-xs`
                        : 'bg-[#1e293b] text-[#c6c6cd] border-[#334155] hover:bg-[#243248]'
                    }`}
                  >
                    {cat.icon}
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount input - 56px */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
              Valor da Despesa (R$)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-14 min-h-[56px] bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 text-[#d8e3fb] font-mono font-extrabold text-2xl outline-hidden"
              />
              <span className="absolute right-4 top-4 text-xs font-bold text-[#f59e0b]">
                BRL
              </span>
            </div>
          </div>

          {/* Quick amount presets */}
          <div className="flex gap-2">
            {[35, 50, 80, 120, 250].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  playCockpitClick();
                  setAmount(preset.toString());
                }}
                className="flex-1 h-9 rounded-lg bg-[#1e293b] hover:bg-[#243248] border border-[#334155] text-xs font-mono font-bold text-[#bec6e0] cursor-pointer"
              >
                +R${preset}
              </button>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
              Descrição / Motivo
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Almoço churrascaria + água"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 text-[#d8e3fb] font-medium text-sm outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-[#ffb95f]" />
                Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-bold text-xs outline-hidden"
              >
                <option value="TAG Sem Parar">TAG Automática</option>
                <option value="Cartão Frete">Cartão Frete</option>
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#94a3b8]" />
                Nº Nota / Cupom
              </label>
              <input
                type="text"
                placeholder="Ex: NF-e 4920"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-mono font-medium text-sm outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
              Localização / Posto / Praça
            </label>
            <input
              type="text"
              placeholder="Ex: BR-163 km 390 - Posto Sorriso"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 text-[#d8e3fb] font-medium text-sm outline-hidden"
            />
          </div>

          {/* Primary Action Button - 56px minimum height */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-14 min-h-[56px] rounded-xl bg-[#f59e0b] hover:bg-[#d97706] active:bg-[#b45309] text-[#0f172a] font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
            >
              <Check className="w-6 h-6 stroke-[3]" />
              Salvar Despesa {amount ? `(${formatCurrency(parseFloat(amount) || 0)})` : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
