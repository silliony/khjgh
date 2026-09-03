export type TransactionType = 'expense' | 'income';
export type ExpenseNature = 'need' | 'want' | 'savings'; // 50/30/20 framework

export interface Category {
  id: string;
  name: string;
  iconName: string;
  color: string;
  nature: ExpenseNature;
  defaultPct: number; // default recommended percentage of income
  description: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  categoryId: string;
  subcategory?: string;
  nature: ExpenseNature;
  isSubscription?: boolean;
  subscriptionName?: string;
  notes?: string;
  aiTip?: string;
  paymentMethod?: 'pix' | 'credit' | 'debit' | 'cash' | 'transfer';
}

export interface CategoryBudget {
  categoryId: string;
  reservedAmount: number;
}

export interface FinancialProfile {
  monthlyIncome: number;
  strategy: 'rule503020' | 'aggressive_savings' | 'comfort_balance' | 'custom';
}

export interface BehavioralDiagnostic {
  overallStatus: string;
  behavioralScore: number;
  summary: string;
  recommendations: string[];
  categoryAlerts: string[];
  savingsPotential: number;
}

// Rendas recorrentes e padrão mensal
export interface RecurringIncomeSource {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  paydayType?: 'day_of_month' | 'fifth_working_day' | 'last_working_day'; // Configuração do dia de recebimento
  isWorkingDaysVA?: boolean; // Vale Alimentação / Refeição por dia útil
  dailyRate?: number; // R$ por dia útil
  manualWorkingDaysOverride?: number | null; // Se o usuário quiser forçar os dias
  notes?: string;
}

export interface EmergencyReserveData {
  totalAmount: number; // Valor que tenho em reserva total
  targetMonths: number; // Meta de meses (3, 6, 12 meses de despesas essenciais)
  lastUpdated?: string;
  notes?: string;
}

export interface IncomeTemplate {
  sources: RecurringIncomeSource[];
  autoApply: boolean;
}

// Avaliador de Compra Esporádica
export interface PurchaseEvaluationRequest {
  itemName: string;
  amount: number;
  categoryId: string;
  nature: ExpenseNature;
  installments: number; // 1 = à vista, 2+ = parcelas
  necessityLevel: 'essential' | 'useful' | 'impulse' | 'investment';
  reason?: string;
}

export interface PurchaseEvaluationResult {
  decision: 'recommended' | 'warning' | 'not_recommended';
  decisionScore: number; // 0 - 100
  verdictTitle: string;
  verdictExplanation: string;
  budgetImpact: {
    categoryName: string;
    currentCategorySpent: number;
    categoryBudget: number;
    newCategorySpent: number;
    currentFreeBalance: number;
    newFreeBalance: number;
    monthlyInstallmentAmount: number;
    impactOnSavingsRate: number;
    isExceedingBudget: boolean;
    isExceedingBalance: boolean;
  };
  suggestions: string[];
  alternatives: {
    title: string;
    description: string;
  }[];
  coolingOffAdvice: string;
}

// Importação de Fatura de Cartão
export interface InvoiceParsedItem {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  nature: ExpenseNature;
  isSubscription?: boolean;
  subscriptionName?: string;
  selected: boolean;
  confidence?: number;
  rawLine?: string;
  classifiedBy?: 'ai' | 'fallback';
}
