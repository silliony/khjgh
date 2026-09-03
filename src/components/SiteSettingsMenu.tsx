import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Wallet,
  ShieldCheck,
  CreditCard,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  User,
  X,
  Cloud,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { formatBRL } from '../data/initialData';
import { useAuth } from '../contexts/AuthContext';

interface SiteSettingsMenuProps {
  monthlyIncome: number;
  totalReserve: number;
  budgetStrategy: 'rule503020' | 'aggressive' | 'comfort';
  onSelectBudgetStrategy: (strategy: 'rule503020' | 'aggressive' | 'comfort') => void;
  onOpenTotalReserveModal: () => void;
  onOpenRecurringIncomesModal: () => void;
  onOpenDataManagementModal: () => void;
  onOpenInvoiceImportModal: () => void;
  onOpenAuthModal: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const SiteSettingsMenu: React.FC<SiteSettingsMenuProps> = ({
  monthlyIncome,
  totalReserve,
  budgetStrategy,
  onSelectBudgetStrategy,
  onOpenTotalReserveModal,
  onOpenRecurringIncomesModal,
  onOpenDataManagementModal,
  onOpenInvoiceImportModal,
  onOpenAuthModal,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const { user, isAnonymous, syncState } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fechar ao apertar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Botão de Configurações no Cabeçalho */}
      <button
        id="site-settings-menu-trigger"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 sm:gap-3 pl-2.5 sm:pl-3 pr-3 py-1.5 rounded-2xl border transition-all cursor-pointer ${
          isOpen
            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200'
        }`}
        title="Abrir menu de configurações e metodologia"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
            {user && !isAnonymous && user.displayName
              ? user.displayName.charAt(0).toUpperCase()
              : user && !isAnonymous && user.email
              ? user.email.charAt(0).toUpperCase()
              : <Settings className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />}
          </div>
          {/* Cloud Sync Status Indicator dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
              syncState === 'synced'
                ? 'bg-emerald-500'
                : syncState === 'syncing'
                ? 'bg-indigo-500 animate-pulse'
                : 'bg-amber-500'
            }`}
            title={`Status Nuvem: ${syncState === 'synced' ? 'Sincronizado' : syncState === 'syncing' ? 'Sincronizando' : 'Offline'}`}
          />
        </div>

        <div className="text-left hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold leading-tight truncate max-w-[110px]">
              {user && !isAnonymous ? (user.displayName || user.email?.split('@')[0]) : 'Configurações'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
            Renda: {monthlyIncome > 0 ? formatBRL(monthlyIncome) : 'R$ 0,00'}
          </p>
        </div>
      </button>

      {/* Menu Dropdown Flutuante */}
      {isOpen && (
        <div
          id="site-settings-dropdown-panel"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 sm:p-5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-4"
        >
          {/* Header do Menu com Perfil de Usuário & Nuvem */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                {user && !isAnonymous && user.displayName ? (
                  user.displayName.charAt(0).toUpperCase()
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {user && !isAnonymous ? (user.displayName || user.email) : 'Modo Convidado'}
                  </h4>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
                      syncState === 'synced'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    <Cloud className="w-2.5 h-2.5" />
                    Nuvem
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {user && !isAnonymous ? user.email : 'Dados sincronizados no Firestore'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Botão de Troca / Login de Usuário */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenAuthModal();
            }}
            className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700/60 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center justify-between cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              {user && !isAnonymous ? 'Gerenciar Conta / Trocar Usuário' : 'Conectar Conta / Fazer Login'}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              Abrir &rarr;
            </span>
          </button>

          {/* Widget de Metodologia de Reserva & Orçamento (substitui o widget de renda base manual) */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Metodologia de Reserva</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                {budgetStrategy === 'rule503020' ? '50/30/20' : budgetStrategy === 'aggressive' ? 'Poupança 30%' : 'Familiar'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onSelectBudgetStrategy('rule503020')}
                className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  budgetStrategy === 'rule503020'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <span className="text-[11px] font-bold block">50 / 30 / 20</span>
                <span className={`text-[9px] block mt-0.5 ${budgetStrategy === 'rule503020' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  Clássica
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectBudgetStrategy('aggressive')}
                className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  budgetStrategy === 'aggressive'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                }`}
              >
                <span className="text-[11px] font-bold block">50 / 20 / 30</span>
                <span className={`text-[9px] block mt-0.5 ${budgetStrategy === 'aggressive' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  Acelerada
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelectBudgetStrategy('comfort')}
                className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  budgetStrategy === 'comfort'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                }`}
              >
                <span className="text-[11px] font-bold block">60 / 25 / 15</span>
                <span className={`text-[9px] block mt-0.5 ${budgetStrategy === 'comfort' ? 'text-amber-100' : 'text-slate-400'}`}>
                  Familiar
                </span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {budgetStrategy === 'rule503020'
                ? '50% Essenciais, 30% Desejos/Lazer e 20% Reserva Financeira.'
                : budgetStrategy === 'aggressive'
                ? '50% Essenciais, 20% Lazer e 30% Aportes para Reserva/Investimentos.'
                : '60% Essenciais, 25% Lazer e 15% Reserva (custos fixos maiores).'}
            </p>
          </div>

          {/* Atalhos das Configurações do Sistema */}
          <div className="space-y-1.5">
            {/* Dia de Salário & VA */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenRecurringIncomesModal();
              }}
              className="w-full p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    Dia do Salário & Rendas Recorrentes
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Definir salário, 5º dia útil e cálculo de VA por dia trabalhado
                  </p>
                </div>
              </div>
            </button>

            {/* Reserva Financeira Total */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenTotalReserveModal();
              }}
              className="w-full p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      Reserva Financeira Total
                    </p>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                      {formatBRL(totalReserve)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Definir meta em meses e saldo acumulado
                  </p>
                </div>
              </div>
            </button>

            {/* Importar Fatura de Cartão */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenInvoiceImportModal();
              }}
              className="w-full p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    Importar Fatura de Cartão
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Upload de CSV/OFX com auto-categorização inteligente
                  </p>
                </div>
              </div>
            </button>

            {/* Deletar / Zerar Todos os Dados (Iniciar do Zero) */}
            <button
              id="menu-open-data-management-btn"
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenDataManagementModal();
              }}
              className="w-full p-2.5 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center justify-between text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-300 group-hover:text-rose-800 transition">
                    Deletar / Zerar Todos os Dados
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Zerar lançamentos, rendas e reservas para começar do zero
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Rodapé com Alternância de Tema */}
          {onToggleDarkMode && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                {isDarkMode ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                Tema {isDarkMode ? 'Escuro' : 'Claro'}
              </span>

              <button
                type="button"
                onClick={onToggleDarkMode}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                Alternar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
