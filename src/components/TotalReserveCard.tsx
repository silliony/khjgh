import React from 'react';
import { ShieldCheck, TrendingUp, ArrowUpRight, Edit3, Sparkles } from 'lucide-react';
import { formatBRL } from '../data/initialData';

interface TotalReserveCardProps {
  totalReserve: number;
  essentialMonthlyExpenses: number;
  targetMonths?: number;
  freeBalanceMonth: number;
  onOpenModal: () => void;
}

export function TotalReserveCard({
  totalReserve,
  essentialMonthlyExpenses,
  targetMonths = 6,
  freeBalanceMonth,
  onOpenModal,
}: TotalReserveCardProps) {
  const safeMonthlyExpenses = essentialMonthlyExpenses > 0 ? essentialMonthlyExpenses : 3000;
  const coverageMonths = safeMonthlyExpenses > 0 ? totalReserve / safeMonthlyExpenses : 0;
  const targetAmount = safeMonthlyExpenses * targetMonths;
  const progressPct = Math.min(100, Math.round((totalReserve / (targetAmount || 1)) * 100));

  return (
    <div
      id="total-reserve-card"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between relative overflow-hidden group hover:border-teal-300 dark:hover:border-teal-800/80 transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Reserva Total Acumulada
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 font-bold border border-teal-200/60 dark:border-teal-800/40">
                {coverageMonths.toFixed(1)} meses de segurança
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
              {formatBRL(totalReserve)}
            </p>
          </div>
        </div>

        <button
          id="open-edit-reserve-btn"
          type="button"
          onClick={onOpenModal}
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950/50 text-slate-600 dark:text-slate-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
          title="Alterar valor total da reserva ou aportar do saldo"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Ajustar Reserva</span>
        </button>
      </div>

      {/* Metric & Progress */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Meta de Segurança ({targetMonths} meses): <strong>{formatBRL(targetAmount)}</strong>
          </span>
          <span className="font-bold text-teal-600 dark:text-teal-400">
            {progressPct}% atingido
          </span>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 pt-0.5">
          <span>Base essencial: {formatBRL(safeMonthlyExpenses)}/mês</span>
          {freeBalanceMonth > 0 && (
            <button
              type="button"
              onClick={onOpenModal}
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowUpRight className="w-3 h-3" />
              Aportar saldo do mês ({formatBRL(freeBalanceMonth)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
