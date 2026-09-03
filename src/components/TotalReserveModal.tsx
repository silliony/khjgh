import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  Check,
  Info,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { formatBRL } from '../data/initialData';

interface TotalReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReserve: number;
  essentialMonthlyExpenses: number;
  freeBalanceMonth: number;
  onUpdateReserve: (newTotal: number, targetMonths: number) => void;
  onDepositFromBalance?: (amount: number, note: string) => void;
  onWithdrawToBalance?: (amount: number, note: string) => void;
  initialTargetMonths?: number;
}

export function TotalReserveModal({
  isOpen,
  onClose,
  currentReserve,
  essentialMonthlyExpenses,
  freeBalanceMonth,
  onUpdateReserve,
  onDepositFromBalance,
  onWithdrawToBalance,
  initialTargetMonths = 6,
}: TotalReserveModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'edit' | 'deposit' | 'withdraw'>('edit');
  const [reserveInput, setReserveInput] = useState<string>(String(currentReserve));
  const [targetMonths, setTargetMonths] = useState<number>(initialTargetMonths);

  // Sync state when modal opens or props change
  React.useEffect(() => {
    if (isOpen) {
      setReserveInput(String(currentReserve));
      setTargetMonths(initialTargetMonths);
      setDepositAmount('');
      setWithdrawAmount('');
    }
  }, [isOpen, currentReserve, initialTargetMonths]);

  // Depósito / Aporte a partir do saldo
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositNote, setDepositNote] = useState<string>('Aporte mensal para Reserva de Emergência');

  // Resgate da reserva
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState<string>('Resgate para cobrir despesa imprevista');

  if (!isOpen) return null;

  const currentVal = parseFloat(reserveInput) || 0;
  const safeMonthlyExpenses = essentialMonthlyExpenses > 0 ? essentialMonthlyExpenses : 0;
  const targetAmount = safeMonthlyExpenses > 0 ? safeMonthlyExpenses * targetMonths : 0;
  const coverageMonths = safeMonthlyExpenses > 0 ? currentVal / safeMonthlyExpenses : 0;
  const progressPct = targetAmount > 0 ? Math.min(100, Math.round((currentVal / targetAmount) * 100)) : 0;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.max(0, parseFloat(reserveInput) || 0);
    onUpdateReserve(parsed, targetMonths);
    onClose();
  };

  const handleExecuteDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(depositAmount);
    if (!val || val <= 0) return;
    if (onDepositFromBalance) {
      onDepositFromBalance(val, depositNote);
    } else {
      onUpdateReserve(currentReserve + val, targetMonths);
    }
    onClose();
  };

  const handleExecuteWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(withdrawAmount);
    if (!val || val <= 0) return;
    if (onWithdrawToBalance) {
      onWithdrawToBalance(val, withdrawNote);
    } else {
      onUpdateReserve(Math.max(0, currentReserve - val), targetMonths);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="total-reserve-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Reserva Financeira Total
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seu colchão de liquidez para segurança e tranquilidade
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SubTabs */}
        <div className="flex items-center gap-2 px-6 sm:px-8 pt-4 pb-1 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubTab('edit')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
              activeSubTab === 'edit'
                ? 'text-teal-600 dark:text-teal-400 border-teal-600 dark:border-teal-400'
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            Ajustar Saldo Total
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('deposit')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1 ${
              activeSubTab === 'deposit'
                ? 'text-teal-600 dark:text-teal-400 border-teal-600 dark:border-teal-400'
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Aportar Valor
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('withdraw')}
            className={`pb-2.5 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1 ${
              activeSubTab === 'withdraw'
                ? 'text-teal-600 dark:text-teal-400 border-teal-600 dark:border-teal-400'
                : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            Resgatar Emergência
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-5 overflow-y-auto">
          {/* SubTab 1: Editar / Ajustar Saldo Total */}
          {activeSubTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Valor Atual que Tenho em Reserva Total
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">R$</span>
                  <input
                    id="total-reserve-input"
                    type="number"
                    step="100"
                    min="0"
                    value={reserveInput}
                    onChange={(e) => setReserveInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 text-lg font-black text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition"
                    placeholder="Ex: 25000"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Soma de todo o dinheiro guardado para segurança imediata (CDB Liquidez Diária, Tesouro Selic, Poupança, etc.).
                </p>
              </div>

              {/* Meta de Meses de Cobertura */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Meta de Cobertura (Meses)
                  </span>
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                    {targetMonths} meses de gastos
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[3, 6, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMonths(m)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        targetMonths === m
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-teal-400'
                      }`}
                    >
                      {m} meses
                      <span className="block text-[9px] font-normal opacity-80">
                        {m === 3 ? 'Iniciante' : m === 6 ? 'Recomendado' : 'Autônomo/PJ'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Status da Cobertura Atual */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Custo Essencial Médio:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatBRL(safeMonthlyExpenses)}/mês
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Meta Calculada ({targetMonths}m):</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatBRL(targetAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Cobertura Garantida:</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {coverageMonths.toFixed(1)} meses de tranquilidade
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="pt-1.5">
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                      <span>0%</span>
                      <span className="font-bold text-teal-600">{progressPct}% da meta concluída</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Salvar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="save-total-reserve-btn"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Salvar Valor da Reserva
                </button>
              </div>
            </form>
          )}

          {/* SubTab 2: Aportar do Saldo */}
          {activeSubTab === 'deposit' && (
            <form onSubmit={handleExecuteDeposit} className="space-y-4">
              <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl">
                <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 block">
                  Saldo Livre no Mês: {formatBRL(freeBalanceMonth)}
                </span>
                <p className="text-[10px] text-teal-700 dark:text-teal-300 mt-0.5">
                  Ao aportar, o valor será adicionado à sua Reserva Total e será gerada uma despesa na categoria "Reserva & Investimentos".
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valor a Aportar
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    max={freeBalanceMonth > 0 ? freeBalanceMonth : undefined}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    autoFocus
                  />
                </div>
                {freeBalanceMonth > 0 && (
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setDepositAmount(String(Math.round(freeBalanceMonth * 0.5)))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-teal-50 hover:text-teal-700 cursor-pointer"
                    >
                      50% do Saldo ({formatBRL(freeBalanceMonth * 0.5)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositAmount(String(Math.round(freeBalanceMonth)))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-teal-50 hover:text-teal-700 cursor-pointer"
                    >
                      100% do Saldo ({formatBRL(freeBalanceMonth)})
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição do Lançamento
                </label>
                <input
                  type="text"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="confirm-deposit-btn"
                  type="submit"
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Confirmar Aporte
                </button>
              </div>
            </form>
          )}

          {/* SubTab 3: Resgatar Emergência */}
          {activeSubTab === 'withdraw' && (
            <form onSubmit={handleExecuteWithdraw} className="space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block">
                  Reserva Atual: {formatBRL(currentReserve)}
                </span>
                <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Ao resgatar, o valor será subtraído da Reserva Total e inserido como uma receita de cobertura no mês atual.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valor do Resgate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    max={currentReserve}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo da Emergência
                </label>
                <input
                  type="text"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="confirm-withdraw-btn"
                  type="submit"
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Confirmar Resgate
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
