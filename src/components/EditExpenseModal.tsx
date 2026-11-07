import React, { useState, useEffect } from 'react';
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
  Fuel,
  Droplet,
} from 'lucide-react';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onSaveExpense: (updated: Expense) => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  onSaveExpense,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('pedagio');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [location, setLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Expense['paymentMethod']>('TAG Sem Parar');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [liters, setLiters] = useState<string>('');

  useEffect(() => {
    if (expense) {
      setCategory(expense.category);
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setLocation(expense.location || '');
      setPaymentMethod(expense.paymentMethod || 'PIX');
      setInvoiceNumber(expense.invoiceNumber || '');
      setLiters(expense.liters ? expense.liters.toString() : '');
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const CATEGORIES: { id: ExpenseCategory; label: string }[] = [
    { id: 'combustivel', label: 'Combustível' },
    { id: 'arla', label: 'Arla 32' },
    { id: 'pedagio', label: 'Pedágio' },
    { id: 'alimentacao', label: 'Alimentação' },
    { id: 'pneu_borracharia', label: 'Borracharia/Pneu' },
    { id: 'manutencao', label: 'Manutenção' },
    { id: 'estacionamento', label: 'Pernoite/Pátio' },
    { id: 'chapa_descarga', label: 'Chapa/Descarga' },
    { id: 'outros', label: 'Outros' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    playSuccessChime();

    const updated: Expense = {
      ...expense,
      category,
      description: description.trim() || expense.description,
      amount: parsedAmount,
      location: location.trim() || undefined,
      paymentMethod,
      invoiceNumber: invoiceNumber.trim() || undefined,
      liters: liters ? parseFloat(liters) : undefined,
    };

    onSaveExpense(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#152031] border border-[#475569] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#243248] border border-[#f59e0b] flex items-center justify-center text-[#f59e0b]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#d8e3fb]">
                Editar Despesa Lançada
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Atualize o valor, descrição, litros ou forma de pagamento.
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-bold text-xs outline-hidden"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
              Valor (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-14 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 text-[#d8e3fb] font-mono font-extrabold text-2xl outline-hidden"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
              Descrição
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-4 text-[#d8e3fb] font-semibold text-xs outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Litros (se combustível/Arla)
              </label>
              <input
                type="number"
                step="1"
                placeholder="Ex: 300"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-2 text-[#d8e3fb] font-bold text-xs outline-hidden"
              >
                <option value="TAG Sem Parar">TAG Automática</option>
                <option value="Cartão Frete">Cartão Frete</option>
                <option value="PIX">PIX</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Boleto">Boleto</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Local / Posto
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] text-xs outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase mb-1">
                Nº Cupom / NF-e
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full h-12 bg-[#081425] border-1.5 border-[#334155] focus:border-[#f59e0b] rounded-xl px-3 text-[#d8e3fb] font-mono text-xs outline-hidden"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-14 rounded-xl bg-[#1e293b] hover:bg-[#243248] border border-[#475569] text-[#d8e3fb] font-bold text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 h-14 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f172a] font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
