import React, { useState } from 'react';
import {
  Database,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Download,
  Check,
  X,
  FileSpreadsheet,
  Info,
  Calendar,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatBRL } from '../data/initialData';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currentMonth: string;
  monthlyIncome: number;
  totalReserve: number;
  onResetToDummy: () => void;
  onClearAllFinancialData: () => void;
  onClearCurrentMonthTransactions: () => void;
}

export function DataManagementModal({
  isOpen,
  onClose,
  transactions,
  currentMonth,
  monthlyIncome,
  totalReserve,
  onResetToDummy,
  onClearAllFinancialData,
  onClearCurrentMonthTransactions,
}: DataManagementModalProps) {
  const [confirmStep, setConfirmStep] = useState<'none' | 'clear_all' | 'reset_dummy' | 'clear_month'>('none');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMonthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth));
  const totalExpenses = transactions.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const handleExportBackup = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-financas-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMessage('Backup JSON baixado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleExecuteClearAll = () => {
    onClearAllFinancialData();
    setConfirmStep('none');
    setSuccessMessage('Todos os dados financeiros (lançamentos, rendas e reservas) foram zerados! Base limpa para início do zero.');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleExecuteResetDummy = () => {
    onResetToDummy();
    setConfirmStep('none');
    setSuccessMessage('Dados de exemplo (dummy) restaurados com sucesso!');
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleExecuteClearMonth = () => {
    onClearCurrentMonthTransactions();
    setConfirmStep('none');
    setSuccessMessage(`Lançamentos de ${currentMonth} apagados!`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="data-management-modal-card"
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Deletar / Zerar Dados Financeiros
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Iniciar o controle financeiro do zero (redefine lançamentos, rendas e reservas)
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

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-semibold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
          {/* Current State Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Status Atual do Armazenamento Financeiro
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <span className="text-[11px] text-slate-500 block">Lançamentos:</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {transactions.length} registros
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Renda Base:</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {formatBRL(monthlyIncome)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Reserva Total:</span>
                <span className="text-base font-bold text-teal-600 dark:text-teal-400">
                  {formatBRL(totalReserve)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Despesas ({currentMonth}):</span>
                <span className="text-base font-bold text-rose-600 dark:text-rose-400">
                  {formatBRL(totalExpenses)}
                </span>
              </div>
            </div>
          </div>

          {/* Action 1: Zerar Todos os Dados Financeiros / Começar do Zero */}
          <div className="border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/25 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    Deletar / Zerar Todos os Dados (Iniciar do Zero)
                  </h4>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold">
                    Lançamentos, Rendas e Reservas
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Redefine 100% dos dados financeiros para o estado inicial para você começar o controle financeiro do zero com seus valores e contas reais:
                </p>

                {/* Bullets com itens redefinidos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-rose-100 dark:border-rose-950">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Lançamentos:</strong> Apaga os {transactions.length} registros</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-rose-100 dark:border-rose-950">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Renda Base:</strong> Redefine para R$ 0,00</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-rose-100 dark:border-rose-950">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Reserva Total:</strong> Redefine para R$ 0,00</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-rose-100 dark:border-rose-950">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Fontes & Orçamentos:</strong> Limpos do zero</span>
                  </div>
                </div>
              </div>
            </div>

            {confirmStep === 'clear_all' ? (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-400 dark:border-rose-700 space-y-3 animate-in fade-in shadow-sm">
                <div className="flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-bold">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Confirmação: Iniciar controle financeiro do zero?</p>
                    <p className="font-normal text-slate-600 dark:text-slate-300 mt-0.5">
                      Todos os {transactions.length} lançamentos, a reserva acumulada ({formatBRL(totalReserve)}) e a renda mensal ({formatBRL(monthlyIncome)}) serão apagados/zerados.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-rose-100 dark:border-rose-900/50">
                  <button
                    type="button"
                    onClick={() => setConfirmStep('none')}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="confirm-clear-all-dummy-btn"
                    type="button"
                    onClick={handleExecuteClearAll}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sim, Deletar Tudo e Iniciar do Zero
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end pt-1">
                <button
                  id="trigger-clear-all-btn"
                  type="button"
                  onClick={() => setConfirmStep('clear_all')}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Deletar / Zerar Todos os Dados (Iniciar do Zero)
                </button>
              </div>
            )}
          </div>

          {/* Action 2: Limpar apenas o Mês Atual */}
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-3xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Zerar Lançamentos Apenas de {currentMonth}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Apaga apenas as {currentMonthTransactions.length} movimentações registradas neste mês ativo, mantendo os registros de outros meses intactos.
                </p>
              </div>
            </div>

            {confirmStep === 'clear_month' ? (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-3 animate-in fade-in">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Deseja excluir os {currentMonthTransactions.length} lançamentos deste mês?
                </p>
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmStep('none')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="confirm-clear-month-btn"
                    type="button"
                    onClick={handleExecuteClearMonth}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Confirmar Limpeza do Mês
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end pt-1">
                <button
                  id="trigger-clear-month-btn"
                  type="button"
                  disabled={currentMonthTransactions.length === 0}
                  onClick={() => setConfirmStep('clear_month')}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Zerar Apenas {currentMonth}
                </button>
              </div>
            )}
          </div>

          {/* Action 3: Restaurar Valores de Exemplo (Demonstração) */}
          <div className="border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/15 rounded-3xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Restaurar Dados de Exemplo (Dummy Values)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Recarrega o conjunto de dados fictícios de demonstração com receitas, despesas e orçamentos sugeridos. Útil para testar os relatórios e simuladores.
                </p>
              </div>
            </div>

            {confirmStep === 'reset_dummy' ? (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-300 dark:border-indigo-800/80 space-y-3 animate-in fade-in">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Restaurar os dados fictícios substituirá seus lançamentos atuais. Deseja continuar?
                </p>
                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmStep('none')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="confirm-reset-dummy-btn"
                    type="button"
                    onClick={handleExecuteResetDummy}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Dados Exemplo
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end pt-1">
                <button
                  id="trigger-reset-dummy-btn"
                  type="button"
                  onClick={() => setConfirmStep('reset_dummy')}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Exemplos
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            title="Baixar cópia de segurança de todos os lançamentos"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar Backup (JSON)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
