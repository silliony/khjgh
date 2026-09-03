import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit2,
  Download,
  Sparkles,
  CreditCard,
  Repeat,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatBRL } from '../data/initialData';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  currentMonth: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  categories,
  onEdit,
  onDelete,
  currentMonth,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income' | 'subscriptions'>('all');
  const [selectedNature, setSelectedNature] = useState<'all' | 'need' | 'want' | 'savings'>('all');

  // Filter transactions
  const filtered = transactions.filter((t) => {
    const matchesMonth = t.date.startsWith(currentMonth);
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.subscriptionName && t.subscriptionName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.subcategory && t.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || t.categoryId === selectedCategory;
    const matchesType =
      selectedType === 'all' ||
      (selectedType === 'subscriptions' ? t.isSubscription : t.type === selectedType);
    const matchesNature = selectedNature === 'all' || t.nature === selectedNature;

    return matchesMonth && matchesSearch && matchesCat && matchesType && matchesNature;
  });

  // Sort by date descending
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Subcategoria', 'Natureza 50/30/20', 'Valor', 'Método'];
    const rows = sorted.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      return [
        t.date,
        t.type === 'expense' ? 'Despesa' : 'Receita',
        `"${t.description.replace(/"/g, '""')}"`,
        cat?.name || t.categoryId,
        t.subcategory || '',
        t.nature === 'need' ? 'Necessidade' : t.nature === 'want' ? 'Desejo' : 'Reserva',
        t.amount.toFixed(2),
        t.paymentMethod || '',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gastos_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="transaction-list-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header with Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-50">
            Lançamentos do Mês
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {sorted.length} transações registradas no período selecionado
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-csv-btn"
            type="button"
            onClick={exportCSV}
            disabled={sorted.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            id="tx-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição..."
            className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Category Filter */}
        <div>
          <select
            id="tx-filter-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            id="tx-filter-type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="all">Todas as Entradas/Saídas</option>
            <option value="expense">Apenas Gastos (Despesas)</option>
            <option value="income">Apenas Receitas (Entradas)</option>
            <option value="subscriptions">🔁 Apenas Assinaturas Recorrentes</option>
          </select>
        </div>

        {/* Nature Filter */}
        <div>
          <select
            id="tx-filter-nature"
            value={selectedNature}
            onChange={(e) => setSelectedNature(e.target.value as any)}
            className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="all">Classificação 50/30/20 (Todas)</option>
            <option value="need">Necessidade (50%)</option>
            <option value="want">Desejo / Lazer (30%)</option>
            <option value="savings">Reserva / Aporte (20%)</option>
          </select>
        </div>
      </div>

      {/* Transaction List Items */}
      {sorted.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Nenhum lançamento encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {sorted.map((t) => {
            const cat = categories.find((c) => c.id === t.categoryId);
            const isExpense = t.type === 'expense';

            return (
              <div
                key={t.id}
                id={`tx-row-${t.id}`}
                className="p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 transition group"
              >
                {/* Left: Icon & Description */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
                      isExpense
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                    }`}
                  >
                    {isExpense ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {t.description}
                      </span>
                      {t.isSubscription && (
                        <span
                          title={t.subscriptionName ? `Assinatura: ${t.subscriptionName}` : 'Assinatura Recorrente'}
                          className="inline-flex items-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/90 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.5 rounded-md shrink-0 gap-1"
                        >
                          <Repeat className="w-2.5 h-2.5" />
                          {t.subscriptionName || 'Assinatura'}
                        </span>
                      )}
                      {t.aiTip && (
                        <span
                          title={t.aiTip}
                          className="inline-flex items-center text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md cursor-help shrink-0"
                        >
                          <Sparkles className="w-3 h-3 mr-0.5" /> Dica IA
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>{t.date}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {cat?.name || 'Geral'}
                      </span>
                      {t.subcategory && (
                        <>
                          <span>•</span>
                          <span>{t.subcategory}</span>
                        </>
                      )}
                      <span>•</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.nature === 'need'
                            ? 'bg-blue-500/10 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : t.nature === 'want'
                            ? 'bg-purple-500/10 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {t.nature === 'need'
                          ? 'Necessidade'
                          : t.nature === 'want'
                          ? 'Lazer'
                          : 'Reserva'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold block ${
                        isExpense
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isExpense ? '- ' : '+ '}
                      {formatBRL(t.amount)}
                    </span>
                    {t.paymentMethod && (
                      <span className="text-[10px] text-slate-400 capitalize">
                        {t.paymentMethod}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      id={`edit-tx-${t.id}`}
                      type="button"
                      onClick={() => onEdit(t)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`delete-tx-${t.id}`}
                      type="button"
                      onClick={() => onDelete(t.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Excluir"
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
    </div>
  );
};
