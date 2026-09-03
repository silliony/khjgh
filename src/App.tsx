import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart,
  Target,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  ArrowRight,
  Wallet,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { Category, ExpenseNature, RecurringIncomeSource, Transaction } from './types';
import {
  DEFAULT_CATEGORIES,
  INITIAL_BUDGETS,
  INITIAL_TRANSACTIONS,
  formatBRL,
} from './data/initialData';
import { MetricCard } from './components/MetricCard';
import { TransactionModal } from './components/TransactionModal';
import { TransactionList } from './components/TransactionList';
import {
  BudgetManager,
  calculateFullBudgetForStrategy,
} from './components/BudgetManager';
import { CategoryIcon } from './components/CategoryIcon';
import { VisualReports } from './components/VisualReports';
import { PurchaseEvaluator } from './components/PurchaseEvaluator';
import { InvoiceImportModal } from './components/InvoiceImportModal';
import { RecurringIncomeModal } from './components/RecurringIncomeModal';
import { DataManagementModal } from './components/DataManagementModal';
import { TotalReserveModal } from './components/TotalReserveModal';
import { TotalReserveCard } from './components/TotalReserveCard';
import { SiteSettingsMenu } from './components/SiteSettingsMenu';
import { AuthModal } from './components/AuthModal';
import { useAuth } from './contexts/AuthContext';
import {
  initializeUserDataIfNeeded,
  subscribeToUserProfile,
  subscribeToTransactions,
  subscribeToBudgets,
  subscribeToRecurringIncomes,
  syncSaveTransaction,
  syncDeleteTransaction,
  syncBatchSaveTransactions,
  syncUpdateUserProfile,
  syncSaveBudgets,
  syncSaveRecurringIncomes,
  syncResetToDemoData,
  syncResetAllFinancialDataToZero,
  syncClearAllTransactions,
} from './services/firestoreSync';

export function App() {
  const { user, isAnonymous, setSyncState } = useAuth();

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('fin_theme') === 'dark' ||
      (!('fin_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fin_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fin_theme', 'light');
    }
  }, [isDarkMode]);

  // Primary State
  const [categories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('fin_categories');
    if (saved) {
      try {
        const parsed: Category[] = JSON.parse(saved);
        const hasSubscriptions = parsed.some(
          (c) => c.id === 'subscriptions' || /assinatura/i.test(c.name)
        );
        if (!hasSubscriptions) {
          const subCat = DEFAULT_CATEGORIES.find((c) => c.id === 'subscriptions');
          if (subCat) return [...parsed, subCat];
        }
        return parsed;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    }
    return DEFAULT_CATEGORIES;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('fin_transactions');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('fin_budgets');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return INITIAL_BUDGETS;
  });

  const [monthlyIncome, setMonthlyIncome] = useState<number>(() => {
    const saved = localStorage.getItem('fin_monthly_income');
    if (saved !== null) {
      const val = Number(saved);
      return isNaN(val) ? 0 : val;
    }
    return 8000;
  });

  // Metodologia Ativa de Reserva / Orçamento
  const [budgetStrategy, setBudgetStrategy] = useState<'rule503020' | 'aggressive' | 'comfort'>(() => {
    const saved = localStorage.getItem('fin_budget_strategy');
    if (saved === 'rule503020' || saved === 'aggressive' || saved === 'comfort') {
      return saved;
    }
    return 'rule503020';
  });

  // Valor da Reserva Total Acumulada
  const [totalReserve, setTotalReserve] = useState<number>(() => {
    const saved = localStorage.getItem('fin_total_reserve');
    if (saved !== null) {
      const val = Number(saved);
      return isNaN(val) ? 0 : val;
    }
    return 24000;
  });

  const [reserveTargetMonths, setReserveTargetMonths] = useState<number>(() => {
    const saved = localStorage.getItem('fin_reserve_target_months');
    if (saved !== null) {
      const val = Number(saved);
      return isNaN(val) ? 6 : val;
    }
    return 6;
  });

  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'budget' | 'evaluator' | 'reports'>('overview');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isRecurringIncomeModalOpen, setIsRecurringIncomeModalOpen] = useState(false);
  const [isDataManagementModalOpen, setIsDataManagementModalOpen] = useState(false);
  const [isTotalReserveModalOpen, setIsTotalReserveModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fontes de Rendas Recorrentes
  const [recurringIncomeSources, setRecurringIncomeSources] = useState<RecurringIncomeSource[]>(() => {
    const saved = localStorage.getItem('fin_recurring_incomes') || localStorage.getItem('fin_income_sources');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      {
        id: 'inc-salario-default',
        name: 'Salário Base Líquido',
        amount: 8000,
        dayOfMonth: 5,
        paydayType: 'fifth_working_day',
      },
    ];
  });

  // Sincronização em tempo real com Firebase Firestore por usuário
  useEffect(() => {
    if (!user) return;
    setSyncState('syncing');

    // 1. Carrega ou inicializa perfil do usuário na nuvem
    initializeUserDataIfNeeded(user.uid, user.email, user.displayName)
      .then((profile) => {
        setMonthlyIncome(profile.monthlyIncome);
        setTotalReserve(profile.totalReserve);
        setReserveTargetMonths(profile.reserveTargetMonths);
        setSyncState('synced');
      })
      .catch((err) => {
        console.warn('Erro ao inicializar perfil:', err);
        setSyncState('offline');
      });

    // 2. Ouvinte em tempo real do perfil (renda base e reserva total)
    const unsubProfile = subscribeToUserProfile(
      user.uid,
      (remoteProfile) => {
        setMonthlyIncome(remoteProfile.monthlyIncome);
        setTotalReserve(remoteProfile.totalReserve);
        setReserveTargetMonths(remoteProfile.reserveTargetMonths);
        setSyncState('synced');
      },
      () => setSyncState('offline')
    );

    // 3. Ouvinte em tempo real de transações
    const unsubTxs = subscribeToTransactions(
      user.uid,
      (remoteTxs) => {
        setTransactions(remoteTxs);
        setSyncState('synced');
      },
      () => setSyncState('offline')
    );

    // 4. Ouvinte em tempo real de orçamentos
    const unsubBudgets = subscribeToBudgets(
      user.uid,
      (remoteBudgets) => {
        setBudgets(remoteBudgets);
        setSyncState('synced');
      },
      () => setSyncState('offline')
    );

    // 5. Ouvinte em tempo real de fontes de renda recorrente
    const unsubIncomes = subscribeToRecurringIncomes(
      user.uid,
      (remoteIncomes) => {
        setRecurringIncomeSources(remoteIncomes);
        setSyncState('synced');
      },
      () => setSyncState('offline')
    );

    return () => {
      unsubProfile();
      unsubTxs();
      unsubBudgets();
      unsubIncomes();
    };
  }, [user?.uid]);

  // Fallback no localStorage
  useEffect(() => {
    localStorage.setItem('fin_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('fin_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('fin_monthly_income', String(monthlyIncome));
  }, [monthlyIncome]);

  useEffect(() => {
    localStorage.setItem('fin_total_reserve', String(totalReserve));
  }, [totalReserve]);

  useEffect(() => {
    localStorage.setItem('fin_reserve_target_months', String(reserveTargetMonths));
  }, [reserveTargetMonths]);

  useEffect(() => {
    localStorage.setItem('fin_recurring_incomes', JSON.stringify(recurringIncomeSources));
    localStorage.setItem('fin_income_sources', JSON.stringify(recurringIncomeSources));
  }, [recurringIncomeSources]);

  useEffect(() => {
    localStorage.setItem('fin_budget_strategy', budgetStrategy);
  }, [budgetStrategy]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Month navigation
  const handlePrevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonthStr);
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonthStr);
  };

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  // Calculations for active month
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth));
  const monthExpenses = monthTransactions.filter((t) => t.type === 'expense');
  const monthIncomes = monthTransactions.filter((t) => t.type === 'income');

  // Lógica de Renda Unificada:
  // Se houver lançamentos de receita no mês, soma todas as entradas registradas;
  // Se ainda não houver lançamentos de receita, utiliza a renda base configurada (monthlyIncome).
  const registeredIncome = monthIncomes.reduce((acc, t) => acc + t.amount, 0);
  const effectiveIncome = registeredIncome > 0 ? registeredIncome : monthlyIncome;
  const totalExpenses = monthExpenses.reduce((acc, t) => acc + t.amount, 0);
  const remainingBalance = effectiveIncome - totalExpenses;
  const savingsRate = effectiveIncome > 0 ? (remainingBalance / effectiveIncome) * 100 : 0;

  // Total de gastos por categoria no mês ativo
  const categoryExpenses = monthExpenses.reduce((acc, t) => {
    acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  // Gastos essenciais para calcular cobertura da reserva de emergência
  const essentialExpenses = monthExpenses
    .filter((t) => t.nature === 'need' || ['housing', 'food', 'health', 'transport'].includes(t.categoryId))
    .reduce((acc, t) => acc + t.amount, 0);
  const effectiveEssentialExpenses = essentialExpenses > 0 ? essentialExpenses : (effectiveIncome * 0.5);

  // Add / Edit Transaction
  const handleSaveTransaction = (data: Omit<Transaction, 'id'>, id?: string) => {
    if (id) {
      const updatedTx: Transaction = { ...data, id };
      const updated = transactions.map((t) => (t.id === id ? updatedTx : t));
      setTransactions(updated);
      localStorage.setItem('fin_transactions', JSON.stringify(updated));
      showToast('Lançamento atualizado com sucesso!');
      if (user) {
        syncSaveTransaction(user.uid, updatedTx).catch((err) => console.error('Erro ao salvar no Firestore:', err));
      }
    } else {
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}`,
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem('fin_transactions', JSON.stringify(updated));
      showToast('Novo lançamento adicionado!');
      if (user) {
        syncSaveTransaction(user.uid, newTx).catch((err) => console.error('Erro ao salvar no Firestore:', err));
      }
    }
  };

  // Importar Fatura de Cartão com Auto-Categorização
  const handleImportInvoiceTransactions = (newTxs: Omit<Transaction, 'id'>[]) => {
    const created: Transaction[] = newTxs.map((t, idx) => ({
      ...t,
      id: `tx-card-${Date.now()}-${idx}`,
    }));
    const updated = [...created, ...transactions];
    setTransactions(updated);
    localStorage.setItem('fin_transactions', JSON.stringify(updated));
    showToast(`${created.length} despesas da fatura importadas com sucesso!`);
    if (user) {
      syncBatchSaveTransactions(user.uid, created).catch((err) => console.error('Erro ao importar para Firestore:', err));
    }
  };

  // Aplicar e Lançar Rendas Recorrentes no Mês Atual
  const handleApplyRecurringIncomes = (incomes: Omit<Transaction, 'id'>[]) => {
    // Remove qualquer renda recorrente anterior deste mês específico para evitar duplicações
    const nonRecurring = transactions.filter(
      (t) =>
        !(
          t.date.startsWith(currentMonth) &&
          t.type === 'income' &&
          (t.notes?.includes('[Renda Recorrente]') ||
            /salário|salario|vale alimentação|vale alimentacao|\bva\b/i.test(t.description))
        )
    );

    const created: Transaction[] = incomes.map((inc, idx) => ({
      ...inc,
      id: `tx-inc-${Date.now()}-${idx}`,
      notes: inc.notes?.includes('[Renda Recorrente]')
        ? inc.notes
        : `${inc.notes || ''} [Renda Recorrente]`.trim(),
    }));

    const updated = [...created, ...nonRecurring];
    setTransactions(updated);
    localStorage.setItem('fin_transactions', JSON.stringify(updated));
    showToast(`${created.length} renda(s) recorrente(s) lançada(s) em ${getMonthName(currentMonth)}!`);

    if (user) {
      syncBatchSaveTransactions(user.uid, created).catch((err) => console.error('Erro ao salvar rendas no Firestore:', err));
    }
  };

  const handleSaveIncomeTemplate = (sources: RecurringIncomeSource[], baseMonthlyIncome: number) => {
    setMonthlyIncome(baseMonthlyIncome);
    setRecurringIncomeSources(sources);
    localStorage.setItem('fin_monthly_income', String(baseMonthlyIncome));
    localStorage.setItem('fin_recurring_incomes', JSON.stringify(sources));
    localStorage.setItem('fin_income_sources', JSON.stringify(sources));

    // Se tiver renda e metodologia definida, sincroniza tetos recomendados
    if (baseMonthlyIncome > 0) {
      const updatedBudgets = calculateFullBudgetForStrategy(baseMonthlyIncome, budgetStrategy);
      setBudgets(updatedBudgets);
      localStorage.setItem('fin_budgets', JSON.stringify(updatedBudgets));
      if (user) {
        syncSaveBudgets(user.uid, updatedBudgets).catch(console.error);
      }
    }

    showToast(`Padrão de rendas mensais atualizado para ${formatBRL(baseMonthlyIncome)}!`);
    if (user) {
      syncUpdateUserProfile(user.uid, { monthlyIncome: baseMonthlyIncome }).catch(console.error);
      syncSaveRecurringIncomes(user.uid, sources).catch(console.error);
    }
  };

  // Alternar Metodologia de Reserva / Orçamento
  const handleSelectBudgetStrategy = (strategy: 'rule503020' | 'aggressive' | 'comfort') => {
    setBudgetStrategy(strategy);
    localStorage.setItem('fin_budget_strategy', strategy);
    if (effectiveIncome > 0) {
      const newBudgets = calculateFullBudgetForStrategy(effectiveIncome, strategy);
      setBudgets(newBudgets);
      localStorage.setItem('fin_budgets', JSON.stringify(newBudgets));
      if (user) {
        syncSaveBudgets(user.uid, newBudgets).catch(console.error);
      }
      showToast(
        `Metodologia ${
          strategy === 'aggressive'
            ? 'Poupança Acelerada (50/20/30)'
            : strategy === 'comfort'
            ? 'Equilíbrio Familiar (60/25/15)'
            : 'Regra 50/30/20'
        } aplicada aos limites!`
      );
    } else {
      showToast('Metodologia alterada. Defina sua renda nas configurações para calcular valores.');
    }
  };

  // Funções da Reserva Total
  const handleUpdateReserve = (newTotal: number, targetMonths: number) => {
    setTotalReserve(newTotal);
    setReserveTargetMonths(targetMonths);
    localStorage.setItem('fin_total_reserve', String(newTotal));
    localStorage.setItem('fin_reserve_target_months', String(targetMonths));
    showToast(`Reserva Total atualizada para ${formatBRL(newTotal)}!`);
    if (user) {
      syncUpdateUserProfile(user.uid, { totalReserve: newTotal, reserveTargetMonths: targetMonths }).catch(console.error);
    }
  };

  const handleDepositToReserve = (amount: number, note: string) => {
    const newTx: Transaction = {
      id: `tx-res-dep-${Date.now()}`,
      description: note || 'Aporte para Reserva de Emergência',
      amount,
      date: `${currentMonth}-15`,
      type: 'expense',
      categoryId: 'savings',
      nature: 'savings',
      notes: 'Aporte transferido para a Reserva Financeira Total.',
      paymentMethod: 'transfer',
    };
    const newReserveTotal = totalReserve + amount;
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    setTotalReserve(newReserveTotal);
    localStorage.setItem('fin_transactions', JSON.stringify(updated));
    localStorage.setItem('fin_total_reserve', String(newReserveTotal));
    showToast(`Aporte de ${formatBRL(amount)} adicionado à sua Reserva Total!`);
    if (user) {
      syncSaveTransaction(user.uid, newTx).catch(console.error);
      syncUpdateUserProfile(user.uid, { totalReserve: newReserveTotal }).catch(console.error);
    }
  };

  const handleWithdrawFromReserve = (amount: number, note: string) => {
    const newTx: Transaction = {
      id: `tx-res-with-${Date.now()}`,
      description: note || 'Resgate de Emergência da Reserva',
      amount,
      date: `${currentMonth}-15`,
      type: 'income',
      categoryId: 'housing',
      nature: 'need',
      notes: 'Resgate de emergência para cobrir despesas imprevistas.',
      paymentMethod: 'transfer',
    };
    const newReserveTotal = Math.max(0, totalReserve - amount);
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    setTotalReserve(newReserveTotal);
    localStorage.setItem('fin_transactions', JSON.stringify(updated));
    localStorage.setItem('fin_total_reserve', String(newReserveTotal));
    showToast(`Resgate de ${formatBRL(amount)} creditado ao saldo de ${getMonthName(currentMonth)}.`);
    if (user) {
      syncSaveTransaction(user.uid, newTx).catch(console.error);
      syncUpdateUserProfile(user.uid, { totalReserve: newReserveTotal }).catch(console.error);
    }
  };

  // Orçamentos por categoria
  const handleUpdateBudgets = (newBudgets: Record<string, number>) => {
    setBudgets(newBudgets);
    localStorage.setItem('fin_budgets', JSON.stringify(newBudgets));
    if (user) {
      syncSaveBudgets(user.uid, newBudgets).catch(console.error);
    }
  };

  // Funções de Gerenciamento & Reset de Dados para Início do Zero
  const handleClearAllFinancialData = () => {
    const toDelete = [...transactions];
    setTransactions([]);
    setMonthlyIncome(0);
    setTotalReserve(0);
    setReserveTargetMonths(6);
    setBudgets({
      housing: 0,
      food: 0,
      transport: 0,
      health: 0,
      leisure: 0,
      education: 0,
      debts: 0,
      savings: 0,
    });
    setRecurringIncomeSources([]);
    localStorage.setItem('fin_transactions', '[]');
    localStorage.setItem('fin_monthly_income', '0');
    localStorage.setItem('fin_total_reserve', '0');
    localStorage.setItem('fin_reserve_target_months', '6');
    localStorage.setItem(
      'fin_budgets',
      JSON.stringify({
        housing: 0,
        food: 0,
        transport: 0,
        health: 0,
        leisure: 0,
        education: 0,
        debts: 0,
        savings: 0,
      })
    );
    localStorage.setItem('fin_recurring_incomes', '[]');
    localStorage.setItem('fin_income_sources', '[]');
    showToast('Todos os dados financeiros (lançamentos, rendas e reservas) foram zerados com sucesso! Base limpa para início do zero.');
    if (user) {
      syncResetAllFinancialDataToZero(user.uid, toDelete).catch(console.error);
    }
  };

  const handleClearCurrentMonthTransactions = () => {
    const toDelete = transactions.filter((t) => t.date.startsWith(currentMonth));
    const remaining = transactions.filter((t) => !t.date.startsWith(currentMonth));
    setTransactions(remaining);
    localStorage.setItem('fin_transactions', JSON.stringify(remaining));
    showToast(`Lançamentos de ${getMonthName(currentMonth)} foram apagados.`);
    if (user) {
      syncClearAllTransactions(user.uid, toDelete).catch(console.error);
    }
  };

  const handleResetToDummy = () => {
    setTransactions(INITIAL_TRANSACTIONS);
    setBudgets(INITIAL_BUDGETS);
    setMonthlyIncome(8000);
    setTotalReserve(24000);
    setCurrentMonth('2026-09');
    setRecurringIncomeSources([
      {
        id: 'inc-salario-default',
        name: 'Salário Base Líquido',
        amount: 8000,
        dayOfMonth: 5,
        paydayType: 'fifth_working_day',
      },
    ]);
    localStorage.setItem('fin_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem('fin_budgets', JSON.stringify(INITIAL_BUDGETS));
    localStorage.setItem('fin_monthly_income', '8000');
    localStorage.setItem('fin_total_reserve', '24000');
    showToast('Dados de demonstração (dummy) restaurados com sucesso!');
    if (user) {
      syncResetToDemoData(user.uid).catch(console.error);
      syncSaveBudgets(user.uid, INITIAL_BUDGETS).catch(console.error);
      syncUpdateUserProfile(user.uid, {
        monthlyIncome: 8000,
        totalReserve: 24000,
        reserveTargetMonths: 6,
      }).catch(console.error);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      const remaining = transactions.filter((t) => t.id !== id);
      setTransactions(remaining);
      localStorage.setItem('fin_transactions', JSON.stringify(remaining));
      showToast('Lançamento excluído.');
      if (user) {
        syncDeleteTransaction(user.uid, id).catch((err) => console.error('Erro ao excluir no Firestore:', err));
      }
    }
  };

  // Top 4 categorias mais gastas no mês para o resumo da Visão Geral
  const sortedExpenseCategories: [string, number][] = (
    Object.entries(categoryExpenses) as [string, number][]
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-600 selection:text-white flex flex-col">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-2xl shadow-lg border border-slate-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          {toastMessage}
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Logo and title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-xs">
                F
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                  Finanças+
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Controle Inteligente de Gastos & Metas
                </p>
              </div>
            </div>

            {/* Controls: Month selector, Add transaction, Settings Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Month Selector */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs border border-slate-200/80 dark:border-slate-700/60">
                <button
                  id="prev-month-btn"
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 font-bold capitalize text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  {getMonthName(currentMonth)}
                </span>
                <button
                  id="next-month-btn"
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Add Transaction Button */}
              <button
                id="open-add-transaction-btn"
                type="button"
                onClick={() => {
                  setEditingTransaction(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Lançamento</span>
              </button>

              {/* Menu de Configurações & Metodologia (sem o botão avulso de nuvem) */}
              <div className="pl-2 border-l border-slate-200 dark:border-slate-800">
                <SiteSettingsMenu
                  monthlyIncome={effectiveIncome}
                  totalReserve={totalReserve}
                  budgetStrategy={budgetStrategy}
                  onSelectBudgetStrategy={handleSelectBudgetStrategy}
                  onOpenTotalReserveModal={() => setIsTotalReserveModalOpen(true)}
                  onOpenRecurringIncomesModal={() => setIsRecurringIncomeModalOpen(true)}
                  onOpenDataManagementModal={() => setIsDataManagementModalOpen(true)}
                  onOpenInvoiceImportModal={() => setIsInvoiceModalOpen(true)}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Overview, Transactions, Budget, Evaluator, Reports) */}
          <div className="flex space-x-6 border-t border-slate-100 dark:border-slate-800/80 -mb-px overflow-x-auto">
            <button
              id="tab-overview-btn"
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3.5 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold'
                  : 'border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Visão Geral
            </button>

            <button
              id="tab-transactions-btn"
              type="button"
              onClick={() => setActiveTab('transactions')}
              className={`py-3.5 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'transactions'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold'
                  : 'border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Lançamentos do Mês
              {monthTransactions.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  {monthTransactions.length}
                </span>
              )}
            </button>

            <button
              id="tab-budget-btn"
              type="button"
              onClick={() => setActiveTab('budget')}
              className={`py-3.5 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'budget'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold'
                  : 'border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Target className="w-4 h-4" />
              Categorias & Reservas
            </button>

            <button
              id="tab-evaluator-btn"
              type="button"
              onClick={() => setActiveTab('evaluator')}
              className={`py-3.5 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'evaluator'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold'
                  : 'border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Avaliador de Compras
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold uppercase">
                Simulador
              </span>
            </button>

            <button
              id="tab-reports-btn"
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`py-3.5 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'reports'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 font-bold'
                  : 'border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <PieChart className="w-4 h-4" />
              Relatórios & Comportamento
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        {/* Tab 1: Overview Consistente */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Signature Sleek Hero Banner */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-3xl text-white shadow-lg shadow-indigo-100 dark:shadow-none flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden gap-6">
              <div className="relative z-10">
                <p className="text-indigo-100 text-sm font-medium mb-1">
                  Saldo Total Disponível • {getMonthName(currentMonth)}
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {formatBRL(remainingBalance)}
                </h2>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <button
                    id="hero-add-income-btn"
                    type="button"
                    onClick={() => {
                      setEditingTransaction(null);
                      setIsModalOpen(true);
                    }}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Receita
                  </button>
                  <button
                    id="hero-add-expense-btn"
                    type="button"
                    onClick={() => {
                      setEditingTransaction(null);
                      setIsModalOpen(true);
                    }}
                    className="bg-white hover:bg-indigo-50 text-indigo-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Novo Gasto
                  </button>
                  <button
                    id="hero-evaluate-purchase-btn"
                    type="button"
                    onClick={() => setActiveTab('evaluator')}
                    className="bg-indigo-950/40 hover:bg-indigo-950/60 border border-white/20 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4 text-indigo-200" /> Avaliar Compra
                  </button>
                  <button
                    id="hero-manage-incomes-btn"
                    type="button"
                    onClick={() => setIsRecurringIncomeModalOpen(true)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 text-emerald-300" /> Rendas Recorrentes
                  </button>
                </div>
              </div>

              <div className="relative z-10 md:text-right">
                <p className="text-indigo-100 text-sm font-medium mb-1">Gastos este mês</p>
                <p className="text-2xl sm:text-3xl font-bold text-rose-200">
                  {formatBRL(totalExpenses)}
                </p>
                <div className="mt-2 inline-flex items-center px-3 py-1 bg-white/15 rounded-full text-xs font-bold text-rose-100 backdrop-blur-xs">
                  <span>{monthExpenses.length} despesas contabilizadas</span>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
            </div>

            {/* Top Financial KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                id="metric-income"
                title="Renda do Mês"
                value={formatBRL(effectiveIncome)}
                subtitle="Unificada (entradas ou base mensal)"
                icon={ArrowUpRight}
                iconColorClass="text-emerald-600 bg-emerald-500/10 dark:bg-emerald-950/40"
                badge={{
                  text: registeredIncome > 0 ? `${monthIncomes.length} entradas lançadas` : 'Renda base',
                  type: 'positive',
                }}
              />

              <MetricCard
                id="metric-expenses"
                title="Gastos Realizados"
                value={formatBRL(totalExpenses)}
                subtitle={`${monthExpenses.length} despesas contabilizadas`}
                icon={ArrowDownLeft}
                iconColorClass="text-rose-600 bg-rose-500/10 dark:bg-rose-950/40"
                badge={{
                  text: effectiveIncome > 0 ? `${((totalExpenses / effectiveIncome) * 100).toFixed(0)}% da renda` : 'Sem renda',
                  type: totalExpenses > effectiveIncome ? 'danger' : 'neutral',
                }}
              />

              <MetricCard
                id="metric-balance"
                title="Saldo Disponível"
                value={formatBRL(remainingBalance)}
                subtitle="Margem livre após despesas"
                icon={PiggyBank}
                iconColorClass={
                  remainingBalance >= 0
                    ? 'text-indigo-600 bg-indigo-500/10 dark:bg-indigo-950/40'
                    : 'text-rose-600 bg-rose-500/10 dark:bg-rose-950/40'
                }
                badge={{
                  text: remainingBalance >= 0 ? 'Positivo' : 'Déficit',
                  type: remainingBalance >= 0 ? 'positive' : 'danger',
                }}
              />

              <MetricCard
                id="metric-savings-rate"
                title="Taxa de Poupança"
                value={`${Math.max(0, savingsRate).toFixed(1)}%`}
                subtitle="Meta recomendada: ao menos 20%"
                icon={TrendingUp}
                iconColorClass="text-teal-600 bg-teal-500/10 dark:bg-teal-950/40"
                badge={{
                  text: savingsRate >= 20 ? 'Excelente' : savingsRate >= 10 ? 'Equilibrado' : 'Abaixo da meta',
                  type: savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'warning' : 'danger',
                }}
              />
            </div>

            {/* Total Reserve Summary Card */}
            <TotalReserveCard
              totalReserve={totalReserve}
              essentialMonthlyExpenses={effectiveEssentialExpenses}
              targetMonths={reserveTargetMonths}
              freeBalanceMonth={remainingBalance > 0 ? remainingBalance : 0}
              onOpenModal={() => setIsTotalReserveModalOpen(true)}
            />

            {/* Painel Consistente de Distribuição & Atalho para Lançamentos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Maiores Gastos por Categoria no Mês */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Principais Gastos por Categoria
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Consumo registrado em {getMonthName(currentMonth)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('budget')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Ver Tetos &rarr;
                    </button>
                  </div>

                  <div className="pt-4 space-y-3.5">
                    {sortedExpenseCategories.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        Nenhum gasto registrado neste mês ainda.
                      </div>
                    ) : (
                      sortedExpenseCategories.map(([catId, amount]) => {
                        const cat = categories.find((c) => c.id === catId);
                        const budget = budgets[catId] || 0;
                        const pctOfBudget = budget > 0 ? Math.min(100, (amount / budget) * 100) : 0;

                        return (
                          <div key={catId} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <CategoryIcon
                                  iconName={cat?.iconName || 'DollarSign'}
                                  color={cat?.color || '#6366f1'}
                                  className="w-4 h-4"
                                />
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {cat?.name || catId}
                                </span>
                              </div>
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {formatBRL(amount)}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  backgroundColor: cat?.color || '#6366f1',
                                  width: `${pctOfBudget > 0 ? pctOfBudget : Math.min(100, (amount / (totalExpenses || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Total de Despesas:</span>
                  <span className="font-black text-rose-600 dark:text-rose-400">{formatBRL(totalExpenses)}</span>
                </div>
              </div>

              {/* Card 2: Status de Lançamentos & Atalho dedicado */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Extrato de Lançamentos
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {monthTransactions.length} lançamentos em {getMonthName(currentMonth)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {monthIncomes.length} ent / {monthExpenses.length} saí
                    </span>
                  </div>

                  <div className="pt-4 space-y-2.5">
                    {monthTransactions.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        Nenhuma transação lançada neste mês.
                      </div>
                    ) : (
                      monthTransactions.slice(0, 3).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {tx.description}
                            </p>
                            <span className="text-[10px] text-slate-400">{tx.date}</span>
                          </div>
                          <span
                            className={`text-xs font-bold shrink-0 ${
                              tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'} {formatBRL(tx.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    id="overview-go-to-transactions-btn"
                    type="button"
                    onClick={() => setActiveTab('transactions')}
                    className="w-full py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer group"
                  >
                    <span>Ver e Gerenciar Todos os Lançamentos do Mês</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Lançamentos do Mês (Nova Aba Dedicada) */}
        {activeTab === 'transactions' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    Lançamentos de {getMonthName(currentMonth)}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Consulte, filtre, edite e exporte todas as suas receitas e despesas do período.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecurringIncomeModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" /> Rendas Recorrentes
                </button>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Importar Fatura
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo Lançamento
                </button>
              </div>
            </div>

            <TransactionList
              transactions={transactions}
              categories={categories}
              onEdit={(tx) => {
                setEditingTransaction(tx);
                setIsModalOpen(true);
              }}
              onDelete={handleDeleteTransaction}
              currentMonth={currentMonth}
            />
          </div>
        )}

        {/* Tab 3: Categorias & Reservas (Budget Manager) */}
        {activeTab === 'budget' && (
          <BudgetManager
            categories={categories}
            budgets={budgets}
            onUpdateBudget={handleUpdateBudgets}
            monthlyIncome={effectiveIncome}
            transactions={transactions}
            currentMonth={currentMonth}
            strategy={budgetStrategy}
          />
        )}

        {/* Tab 4: Avaliador de Compras Esporádicas */}
        {activeTab === 'evaluator' && (
          <PurchaseEvaluator
            categories={categories}
            monthlyIncome={effectiveIncome}
            remainingBalance={remainingBalance}
            totalExpenses={totalExpenses}
            budgets={budgets}
            categoryExpenses={categoryExpenses}
            currentMonth={currentMonth}
            onAddTransaction={(tx) => {
              handleSaveTransaction(tx);
              setActiveTab('transactions');
            }}
          />
        )}

        {/* Tab 5: Relatórios Visuais & Diagnóstico */}
        {activeTab === 'reports' && (
          <VisualReports
            categories={categories}
            transactions={transactions}
            budgets={budgets}
            monthlyIncome={effectiveIncome}
            currentMonth={currentMonth}
          />
        )}
      </main>

      {/* Sleek Footer */}
      <footer className="mt-auto px-6 sm:px-8 py-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saúde Financeira: {savingsRate >= 20 ? 'Excelente' : savingsRate >= 10 ? 'Equilibrada' : 'Atenção'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Reserva Livre: {formatBRL(remainingBalance > 0 ? remainingBalance : 0)}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 font-medium tracking-wide">
          © 2026 Finanças Plus Intelligence. Dados sincronizados na nuvem Firestore.
        </p>
      </footer>

      {/* Transaction Modal (Add / Edit) */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        categories={categories}
        initialData={editingTransaction}
      />

      {/* Credit Card Invoice Import Modal */}
      <InvoiceImportModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        categories={categories}
        currentMonth={currentMonth}
        onImport={handleImportInvoiceTransactions}
      />

      {/* Recurring Income & Working Days VA Modal */}
      <RecurringIncomeModal
        isOpen={isRecurringIncomeModalOpen}
        onClose={() => setIsRecurringIncomeModalOpen(false)}
        currentMonth={currentMonth}
        initialSources={recurringIncomeSources}
        onApplyToMonth={handleApplyRecurringIncomes}
        onSaveTemplate={handleSaveIncomeTemplate}
      />

      {/* Data Management & Reset Modal */}
      <DataManagementModal
        isOpen={isDataManagementModalOpen}
        onClose={() => setIsDataManagementModalOpen(false)}
        transactions={transactions}
        currentMonth={currentMonth}
        monthlyIncome={effectiveIncome}
        totalReserve={totalReserve}
        onResetToDummy={handleResetToDummy}
        onClearAllFinancialData={handleClearAllFinancialData}
        onClearCurrentMonthTransactions={handleClearCurrentMonthTransactions}
      />

      {/* Total Reserve Modal */}
      <TotalReserveModal
        isOpen={isTotalReserveModalOpen}
        onClose={() => setIsTotalReserveModalOpen(false)}
        currentReserve={totalReserve}
        essentialMonthlyExpenses={effectiveEssentialExpenses}
        freeBalanceMonth={remainingBalance > 0 ? remainingBalance : 0}
        onUpdateReserve={handleUpdateReserve}
        onDepositFromBalance={handleDepositToReserve}
        onWithdrawToBalance={handleWithdrawFromReserve}
        initialTargetMonths={reserveTargetMonths}
      />

      {/* Authentication & User Switch Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccessToast={showToast}
      />
    </div>
  );
}

export default App;
