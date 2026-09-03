import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Calendar,
  Utensils,
  Plus,
  Trash2,
  Check,
  X,
  Info,
  DollarSign,
  Clock,
  Sparkles,
} from 'lucide-react';
import { RecurringIncomeSource, Transaction } from '../types';
import { getMonthWorkingDays, calculateVATotal, getSalaryPaydayInfo } from '../utils/workingDays';
import { formatBRL } from '../data/initialData';

interface RecurringIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string;
  onApplyToMonth: (incomes: Omit<Transaction, 'id'>[]) => void;
  onSaveTemplate: (sources: RecurringIncomeSource[], baseMonthlyIncome: number) => void;
  initialSources?: RecurringIncomeSource[];
}

export function RecurringIncomeModal({
  isOpen,
  onClose,
  currentMonth,
  onApplyToMonth,
  onSaveTemplate,
  initialSources,
}: RecurringIncomeModalProps) {
  // Parsing do mês atual
  const [year, month] = currentMonth.split('-').map(Number);
  const workingDaysData = useMemo(() => getMonthWorkingDays(year, month), [year, month]);

  // Lista de fontes de renda padrão
  const [sources, setSources] = useState<RecurringIncomeSource[]>(() => {
    if (initialSources !== undefined) return initialSources;
    const saved = localStorage.getItem('fin_income_sources');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // Dias úteis customizados para o VA
  const [manualDaysInput, setManualDaysInput] = useState<string>('');
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Sincroniza fontes quando o modal abre ou initialSources mudar (ex: após zerar dados)
  useEffect(() => {
    if (isOpen) {
      if (initialSources !== undefined) {
        setSources(initialSources);
      } else {
        const saved = localStorage.getItem('fin_income_sources');
        if (saved) {
          try {
            setSources(JSON.parse(saved));
          } catch (e) {
            setSources([]);
          }
        } else {
          setSources([]);
        }
      }
      setIsManualOverride(false);
      setManualDaysInput('');
    }
  }, [isOpen, initialSources]);

  if (!isOpen) return null;

  const vaSource = sources.find((s) => s.isWorkingDaysVA);
  const effectiveWorkingDays =
    isManualOverride && Number(manualDaysInput) > 0
      ? Number(manualDaysInput)
      : workingDaysData.workingDays;

  const vaDailyRate = vaSource?.dailyRate || 35;
  const calculatedVATotal = calculateVATotal(vaDailyRate, effectiveWorkingDays);

  // Calcula total mensal padrão
  const totalStandardIncome = sources.reduce((acc, s) => {
    if (s.isWorkingDaysVA) return acc + calculatedVATotal;
    return acc + (s.amount || 0);
  }, 0);

  // Handlers
  const handleUpdateAmount = (id: string, newAmt: number) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, amount: Math.max(0, newAmt) } : s))
    );
  };

  const handleUpdateName = (id: string, newName: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
    );
  };

  const handleUpdateDayOfMonth = (id: string, day: number) => {
    const clamped = Math.min(31, Math.max(1, day));
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dayOfMonth: clamped, paydayType: 'day_of_month' } : s))
    );
  };

  const handleUpdatePaydayType = (id: string, type: 'day_of_month' | 'fifth_working_day' | 'last_working_day') => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, paydayType: type } : s))
    );
  };

  const handleUpdateVADailyRate = (rate: number) => {
    setSources((prev) =>
      prev.map((s) => (s.isWorkingDaysVA ? { ...s, dailyRate: Math.max(0, rate) } : s))
    );
  };

  const handleAddSalary = () => {
    const newSource: RecurringIncomeSource = {
      id: `inc-salario-${Date.now()}`,
      name: 'Salário Base Líquido',
      amount: 0,
      dayOfMonth: 5,
      paydayType: 'fifth_working_day',
      notes: 'Rendimento principal',
    };
    setSources((prev) => [...prev, newSource]);
  };

  const handleAddVA = () => {
    if (sources.some((s) => s.isWorkingDaysVA)) return;
    const newSource: RecurringIncomeSource = {
      id: `inc-va-${Date.now()}`,
      name: 'Vale Alimentação / Refeição (VA)',
      amount: 0,
      dayOfMonth: 1,
      isWorkingDaysVA: true,
      dailyRate: 35,
      notes: 'Benefício por dia útil trabalhado',
    };
    setSources((prev) => [...prev, newSource]);
  };

  const handleAddSource = () => {
    const newSource: RecurringIncomeSource = {
      id: `inc-extra-${Date.now()}`,
      name: 'Outra Renda / Freelance',
      amount: 0,
      dayOfMonth: 10,
      paydayType: 'day_of_month',
    };
    setSources((prev) => [...prev, newSource]);
  };

  const handleRemoveSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveAndApply = () => {
    // 1. Salvar template no localStorage
    localStorage.setItem('fin_income_sources', JSON.stringify(sources));
    onSaveTemplate(sources, totalStandardIncome);

    // 2. Gerar transações para o mês ativo com data exata calculada
    const transactionsToApply: Omit<Transaction, 'id'>[] = sources
      .filter((s) => (s.isWorkingDaysVA ? calculatedVATotal > 0 : s.amount > 0))
      .map((s) => {
        const isVA = !!s.isWorkingDaysVA;
        const finalAmount = isVA ? calculatedVATotal : s.amount;
        
        let dateIso = `${currentMonth}-05`;
        let paydayDesc = '';

        if (isVA) {
          dateIso = `${currentMonth}-01`;
          paydayDesc = '1º dia do mês';
        } else {
          const paydayInfo = getSalaryPaydayInfo(year, month, s.paydayType || 'day_of_month', s.dayOfMonth || 5);
          dateIso = paydayInfo.dateIso;
          paydayDesc = paydayInfo.description;
        }

        return {
          description: isVA
            ? `${s.name} (${effectiveWorkingDays} dias úteis × ${formatBRL(vaDailyRate)})`
            : s.name,
          amount: finalAmount,
          date: dateIso,
          type: 'income',
          categoryId: isVA ? 'food' : 'housing',
          nature: 'need',
          notes: isVA
            ? `Calculado sobre ${effectiveWorkingDays} dias úteis do mês de ${currentMonth}. [Renda Recorrente]`
            : s.notes ? `${s.notes} (${paydayDesc}) [Renda Recorrente]` : `Renda mensal (${paydayDesc}) [Renda Recorrente]`,
          paymentMethod: isVA ? 'credit' : 'transfer',
        };
      });

    onApplyToMonth(transactionsToApply);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="recurring-income-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[88vh]"
      >
        {/* Header Compacto */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Rendas Recorrentes
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure suas entradas fixas e benefícios ({currentMonth})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Empty State */}
          {sources.length === 0 && (
            <div className="text-center py-6 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nenhuma renda cadastrada
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-0.5">
                  Adicione seu salário base e vale alimentação para alimentar automaticamente o orçamento.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleAddSalary}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Salário
                </button>
                <button
                  type="button"
                  onClick={handleAddVA}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5" /> Adicionar VA
                </button>
              </div>
            </div>
          )}

          {/* Card Especial: Vale Alimentação / Refeição por Dias Úteis */}
          {vaSource && (
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                    Vale Alimentação / Refeição (VA)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSource(vaSource.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                  title="Remover VA"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Diária */}
                <div className="bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl p-2">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">
                    Diária (R$)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={vaDailyRate || ''}
                    onChange={(e) => handleUpdateVADailyRate(parseFloat(e.target.value) || 0)}
                    className="w-full mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-hidden"
                    placeholder="35,00"
                  />
                </div>

                {/* Dias Úteis */}
                <div className="bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl p-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">
                      Dias Úteis
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsManualOverride(!isManualOverride)}
                      className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      {isManualOverride ? 'Auto' : 'Mudar'}
                    </button>
                  </div>
                  {isManualOverride ? (
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder={String(workingDaysData.workingDays)}
                      value={manualDaysInput}
                      onChange={(e) => setManualDaysInput(e.target.value)}
                      className="w-full mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-hidden"
                    />
                  ) : (
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      {workingDaysData.workingDays} úteis
                    </div>
                  )}
                </div>

                {/* Total VA */}
                <div className="bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl p-2 flex flex-col justify-center">
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Total do Mês
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {formatBRL(calculatedVATotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Outras Rendas Recorrentes (Salário, Freelance, etc.) */}
          {sources.filter((s) => !s.isWorkingDaysVA).length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Rendas Fixas & Salário
                </span>
                <button
                  type="button"
                  onClick={handleAddSource}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Adicionar Renda
                </button>
              </div>

              {sources
                .filter((s) => !s.isWorkingDaysVA)
                .map((source) => {
                  const paydayInfo = getSalaryPaydayInfo(
                    year,
                    month,
                    source.paydayType || 'fifth_working_day',
                    source.dayOfMonth || 5
                  );

                  return (
                    <div
                      key={source.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2"
                    >
                      {/* Linha 1: Nome e Valor */}
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={source.name}
                          onChange={(e) => handleUpdateName(source.id, e.target.value)}
                          className="flex-1 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden"
                          placeholder="Nome da renda"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative w-28">
                            <span className="absolute left-2 top-1.5 text-[11px] font-semibold text-slate-400">R$</span>
                            <input
                              type="number"
                              step="50"
                              min="0"
                              value={source.amount || ''}
                              onChange={(e) => handleUpdateAmount(source.id, parseFloat(e.target.value) || 0)}
                              className="w-full pl-7 pr-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-right focus:ring-1 focus:ring-indigo-500"
                              placeholder="0,00"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSource(source.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Linha 2: Seletor Compacto do Dia de Pagamento */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/60">
                        <span className="text-[10px] text-slate-400 truncate">
                          Previsão: <strong className="text-slate-600 dark:text-slate-300">{paydayInfo.description}</strong>
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={
                              source.paydayType === 'fifth_working_day'
                                ? 'fifth_working_day'
                                : source.paydayType === 'last_working_day'
                                ? 'last_working_day'
                                : 'day_of_month'
                            }
                            onChange={(e) =>
                              handleUpdatePaydayType(
                                source.id,
                                e.target.value as 'fifth_working_day' | 'last_working_day' | 'day_of_month'
                              )
                            }
                            className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="fifth_working_day">5º Dia Útil</option>
                            <option value="day_of_month">Dia Fixo</option>
                            <option value="last_working_day">Último Dia Útil</option>
                          </select>

                          {source.paydayType === 'day_of_month' && (
                            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                              <span className="text-[10px] text-slate-400">Dia:</span>
                              <input
                                type="number"
                                min="1"
                                max="31"
                                value={source.dayOfMonth || 5}
                                onChange={(e) => handleUpdateDayOfMonth(source.id, parseInt(e.target.value) || 1)}
                                className="w-7 text-[11px] font-bold text-slate-800 dark:text-slate-100 bg-transparent text-center focus:outline-hidden"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Ações para adicionar fontes caso ainda não tenha VA ou queira mais */}
          {sources.length > 0 && !vaSource && (
            <button
              type="button"
              onClick={handleAddVA}
              className="w-full py-2 border border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" /> Adicionar Vale Alimentação / Refeição (VA)
            </button>
          )}

          {/* Resumo Consolidado Compacto */}
          {sources.length > 0 && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Total Previsto ({currentMonth})
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {sources.length} fonte(s) configurada(s)
                </span>
              </div>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                {formatBRL(totalStandardIncome)}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="save-apply-incomes-btn"
            type="button"
            onClick={handleSaveAndApply}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Salvar & Lançar no Mês
          </button>
        </div>
      </div>
    </div>
  );
}
