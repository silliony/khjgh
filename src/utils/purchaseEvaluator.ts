import {
  Category,
  ExpenseNature,
  PurchaseEvaluationRequest,
  PurchaseEvaluationResult,
} from '../types';

interface EvaluationContext {
  monthlyIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  categorySpent: number;
  categoryBudget: number;
  categories: Category[];
}

/**
 * Avaliador matemático e comportamental de compras esporádicas
 */
export function evaluatePurchaseLocally(
  req: PurchaseEvaluationRequest,
  ctx: EvaluationContext
): PurchaseEvaluationResult {
  const { itemName, amount, categoryId, installments, necessityLevel, reason } = req;
  const { monthlyIncome, totalExpenses, remainingBalance, categorySpent, categoryBudget, categories } = ctx;

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const categoryName = selectedCategory ? selectedCategory.name : 'Outros';

  const installmentCount = Math.max(1, installments || 1);
  const monthlyImpact = installmentCount === 1 ? amount : amount / installmentCount;

  // Novo saldo livre do mês
  const newFreeBalance = remainingBalance - monthlyImpact;
  const isExceedingBalance = newFreeBalance < 0;

  // Impacto na categoria
  const newCategorySpent = categorySpent + monthlyImpact;
  const isExceedingBudget = categoryBudget > 0 && newCategorySpent > categoryBudget;
  const categoryOverBudgetAmount = isExceedingBudget ? newCategorySpent - categoryBudget : 0;

  // Impacto na taxa de poupança do mês
  const currentSavingsRate = monthlyIncome > 0 ? (remainingBalance / monthlyIncome) * 100 : 0;
  const newSavingsRate = monthlyIncome > 0 ? (newFreeBalance / monthlyIncome) * 100 : 0;
  const savingsRateDrop = currentSavingsRate - newSavingsRate;

  // Horas de trabalho necessárias para pagar o bem (base: 160h úteis/mês)
  const hourlyRate = monthlyIncome > 0 ? monthlyIncome / 160 : 30;
  const hoursOfWorkNeeded = Math.round(amount / hourlyRate);

  // Cálculo da pontuação de viabilidade (0 a 100)
  let score = 70;

  // Fator 1: Nível de Necessidade
  if (necessityLevel === 'essential') score += 20;
  else if (necessityLevel === 'investment') score += 15;
  else if (necessityLevel === 'useful') score += 0;
  else if (necessityLevel === 'impulse') score -= 25;

  // Fator 2: Impacto no saldo livre
  if (isExceedingBalance) {
    score -= 40;
  } else if (newFreeBalance > monthlyIncome * 0.2) {
    score += 15; // Mantém folga acima de 20%
  } else if (newFreeBalance < monthlyIncome * 0.05) {
    score -= 20; // Margem de segurança muito apertada
  }

  // Fator 3: Estouro do teto da categoria
  if (isExceedingBudget) {
    score -= 20;
  }

  // Fator 4: Proporção em relação à renda mensal
  const percentOfIncome = monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 50;
  if (percentOfIncome > 50 && installmentCount === 1) {
    score -= 20;
  } else if (percentOfIncome > 100) {
    score -= 30;
  }

  score = Math.max(5, Math.min(98, Math.round(score)));

  // Decisão
  let decision: 'recommended' | 'warning' | 'not_recommended';
  let verdictTitle: string;
  let verdictExplanation: string;

  if (score >= 70 && !isExceedingBalance) {
    decision = 'recommended';
    verdictTitle = 'Compra Financeiramente Viável & Aprovada';
    verdictExplanation = `A compra de "${itemName}" tem excelente encaixe. Seu orçamento absorve o valor de R$ ${amount.toFixed(2)} sem comprometer a estabilidade do mês, mantendo uma taxa de poupança de ${Math.max(0, newSavingsRate).toFixed(1)}%.`;
  } else if (score >= 45 || (!isExceedingBalance && isExceedingBudget)) {
    decision = 'warning';
    verdictTitle = 'Compra Possível, mas Exige Ajustes e Atenção';
    verdictExplanation = `A compra de "${itemName}" pode ser realizada, porém reduz sua margem livre para R$ ${newFreeBalance.toFixed(2)}${
      isExceedingBudget ? ` e ultrapassa a reserva da categoria ${categoryName} em R$ ${categoryOverBudgetAmount.toFixed(2)}` : ''
    }. Veja as compensações recomendadas abaixo.`;
  } else {
    decision = 'not_recommended';
    verdictTitle = 'Compra Não Recomendada no Momento';
    verdictExplanation = `Adquirir "${itemName}" neste momento ${
      isExceedingBalance
        ? `gerará um déficit de R$ ${Math.abs(newFreeBalance).toFixed(2)} no seu saldo do mês.`
        : 'compromete severamente sua reserva de segurança financeira.'
    } O mais prudente é planejar para o próximo mês ou renegociar despesas.`;
  }

  // Sugestões de Encaixe no Orçamento
  const suggestions: string[] = [];

  if (isExceedingBalance) {
    suggestions.push(
      `Déficit imediato: À vista faltariam R$ ${Math.abs(newFreeBalance).toFixed(2)}. Considere adiar para o próximo mês ou parcelar em até ${Math.min(6, Math.ceil(amount / (remainingBalance * 0.4 || 100)))}x sem juros.`
    );
  }

  if (isExceedingBudget && categoryOverBudgetAmount > 0) {
    suggestions.push(
      `Compensação de Categorias: Para não estourar seu orçamento geral, reduza R$ ${categoryOverBudgetAmount.toFixed(2)} de despesas flexíveis (como Lazer ou Delivery) este mês.`
    );
  }

  if (installmentCount > 1) {
    suggestions.push(
      `Atenção ao parcelamento: ${installmentCount} parcelas de R$ ${monthlyImpact.toFixed(2)} comprometerão R$ ${monthlyImpact.toFixed(2)} da sua renda pelos próximos ${installmentCount} meses.`
    );
  } else if (amount > remainingBalance * 0.5 && installmentCount === 1) {
    suggestions.push(
      `Opção de parcelamento sem juros: Se a loja oferecer parcelamento sem acréscimo, dividir em 2x ou 3x preserva sua liquidez imediata.`
    );
  }

  suggestions.push(
    `Custo em Tempo de Vida: Esta compra equivale a aproximadamente ${hoursOfWorkNeeded} horas dedicadas do seu trabalho.`
  );

  // Alternativas inteligentes
  const alternatives = [
    {
      title: 'Regra de Espera de 72 Horas',
      description: 'Aguarde 3 dias antes de concluir a compra. Em 70% dos casos de impulso, a urgência percebida diminui naturalmente.',
    },
    {
      title: 'Caixinha Específica para o Próximo Mês',
      description: `Reserve R$ ${(amount / 2).toFixed(2)} neste mês e R$ ${(amount / 2).toFixed(2)} no próximo para comprar à vista com desconto.`,
    },
  ];

  if (necessityLevel === 'impulse' || necessityLevel === 'useful') {
    alternatives.push({
      title: 'Pesquisa de Cupom e Cashback',
      description: 'Verifique se há cupons de desconto, cashback (Méliuz, Inter, Nubank) ou opções seminovas com garantia.',
    });
  }

  const coolingOffAdvice =
    necessityLevel === 'impulse'
      ? 'Atenção a compras por impulso: Se você não sentia essa necessidade há 7 dias, estabeleça o desafio de esperar 1 semana antes de comprar.'
      : necessityLevel === 'essential'
      ? 'Necessidade prioritária: Por ser um gasto indispensável, priorize o pagamento à vista com o melhor desconto possível.'
      : 'Gasto de qualidade de vida: Garanta que o valor não sacrifique seus aportes na reserva de emergência.';

  return {
    decision,
    decisionScore: score,
    verdictTitle,
    verdictExplanation,
    budgetImpact: {
      categoryName,
      currentCategorySpent: categorySpent,
      categoryBudget,
      newCategorySpent,
      currentFreeBalance: remainingBalance,
      newFreeBalance,
      monthlyInstallmentAmount: monthlyImpact,
      impactOnSavingsRate: savingsRateDrop,
      isExceedingBudget,
      isExceedingBalance,
    },
    suggestions,
    alternatives,
    coolingOffAdvice,
  };
}
