import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy Gemini client helper with telemetry user-agent
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient, fast Gemini generator with fallback models for high demand / 503 spikes
// Prioritizes gemini-flash-latest with fallback to gemini-3.6-flash and gemini-3.8-flash
async function generateContentWithFallback(ai: GoogleGenAI, config: any) {
  const enhancedConfig = {
    ...config,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      ...(config.config || {}),
    },
  };

  const modelsToTry = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      return await ai.models.generateContent({
        ...enhancedConfig,
        model,
      });
    } catch (err: any) {
      lastError = err;
      // Log clean informational message without dumping raw 503 JSON stack to console
      const is503 = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand');
      console.log(`[Gemini API] Modelo ${model} indisponível temporariamente${is503 ? ' (alta demanda/503)' : ''}. Tentando próximo modelo...`);
    }
  }

  throw new Error(`Serviço Gemini temporariamente sobrecarregado: ${lastError?.message || 'indisponível'}`);
}

// Fallback rule-based categorizer when Gemini key is absent or offline
function fallbackCategorize(description: string, amount: number) {
  const text = (description || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/([a-z])([0-9])/gi, '$1 $2')
    .replace(/([0-9])([a-z])/gi, '$1 $2')
    .trim();

  // 0. Assinaturas & Serviços Digitais (Apple, Google One, Spotify, Netflix, etc.)
  if (
    /(apple(\.com)?(\/bill)?|itunes|icloud|apple\s*music)/i.test(text) ||
    /(google\s*one|google\s*storage|google\s*play|youtube\s*premium)/i.test(text) ||
    /(spotify|deezer|tidal)/i.test(text) ||
    /(netflix|amazon\s*prime|prime\s*video|disney|hbo|max(\.com)?|globoplay)/i.test(text) ||
    /(chatgpt|openai|claude(\.ai)?|dropbox|microsoft\s*365|office\s*365)/i.test(text)
  ) {
    let subName = 'Assinatura Digital';
    if (/apple|itunes|icloud/i.test(text)) subName = 'Apple (iCloud / Serviços)';
    else if (/google/i.test(text)) subName = 'Google One / YouTube';
    else if (/spotify/i.test(text)) subName = 'Spotify Premium';
    else if (/netflix/i.test(text)) subName = 'Netflix';
    else if (/prime/i.test(text)) subName = 'Amazon Prime';
    else if (/chatgpt/i.test(text)) subName = 'ChatGPT Plus';

    return {
      categoryId: 'subscriptions',
      categoryName: 'Assinaturas & Serviços Digitais',
      subcategory: subName,
      nature: 'want',
      isSubscription: true,
      subscriptionName: subName,
      confidence: 0.98,
      tip: 'Assinaturas automáticas no cartão passam despercebidas. Revise periodicamente serviços que você não usa com frequência.',
    };
  }

  // 1. Saúde & Cuidados (Farmácias como Araújo, Pague Menos, Drogasil, Raia, Pacheco, etc.)
  if (
    /(araujo|drog\s*araujo|drogaria\s*araujo)/i.test(text) ||
    /(pague\s*menos|paguemenos|pg\s*menos)/i.test(text) ||
    /(drogasil|droga\s*raia|raiadrogasil|rd\s*saude|pacheco|drogaria\s*sao\s*paulo|dpsp|panvel|venancio)/i.test(text) ||
    /(farmacia|drogaria|remedio|medicamento|manipulacao|consulta|medico|medica|dentista|odonto|hospital|pronto\s*socorro|clinica|laboratorio|fleury|dasa|pardini|hermes\s*pardini|sabin|unimed|hapvida|notredame|amil|bradesco\s*saude|smart\s*fit|smartfit|bluefit|bio\s*ritmo|bodytech|academia|gympass|wellhub|totalpass)/i.test(text)
  ) {
    const isPharma = /araujo|pague\s*menos|paguemenos|drogasil|raia|pacheco|panvel|farmacia|drogaria|remedio/i.test(text);
    return {
      categoryId: 'health',
      categoryName: 'Saúde & Cuidados',
      subcategory: isPharma ? 'Farmácia & Medicamentos' : 'Consultas, Exames & Cuidados',
      nature: 'need',
      isSubscription: false,
      confidence: 0.98,
      tip: 'Gastos com farmácia e saúde são essenciais. Cadastre seu CPF nos programas de fidelidade das redes para descontos de até 30% em remédios.',
    };
  }

  // 2. Transporte & Mobilidade (Transfácil, BHBus, SPTrans, Uber, 99, Postos, Estacionamentos)
  if (
    /\b(transfacil|transfacil\b|bhbus|cartao\s*otimo|sptrans|bilhete\s*unico|bilheteunico|riocard|top\s*transporte|autopass|metro|cptm|supervia|vlt|onibus|coletivo|tarifa\s*onibus)\b/i.test(text) ||
    /\b(uber(?!\s*eats)|99\s*app|99app|99\s*pop|99pop|99\s*corrida|99\s*\*|indrive|cabify|taxi|t[aá]xi)\b/i.test(text) ||
    /\b(posto|auto\s*posto|gasolina|etanol|diesel|combustivel|abastec|shell|ipiranga|petrobras|br\s*distribuidora|vibra|ale|boxter)\b/i.test(text) ||
    /\b(sem\s*parar|semparar|veloe|conectcar|taggy|estapar|estacionamento|pedagio|autopista|ecovias)\b/i.test(text)
  ) {
    const isTransit = /transfacil|bhbus|otimo|sptrans|bilhete|metro|cptm|onibus|coletivo/i.test(text);
    const isRideApp = /uber|99|indrive|taxi/i.test(text);
    return {
      categoryId: 'transport',
      categoryName: 'Transporte & Mobilidade',
      subcategory: isTransit ? 'Transporte Coletivo & Bilhetagem' : isRideApp ? 'Corridas por Aplicativo' : 'Combustível & Postos',
      nature: 'need',
      confidence: 0.95,
      tip: 'Monitore seus gastos de mobilidade urbana e compare o uso de transporte coletivo com aplicativos em horários de pico.',
    };
  }

  // 3. Alimentação Essencial (Supermercado, Atacado, Feira, Padaria)
  if (
    /\b(assai|atacadao|carrefour|pao\s*de\s*acucar|extra\s*mercado|supermercado|hipermercado|mercado|sam'?s\s*club|dia%|st\s*marche|zona\s*sul|zaffari|muffato|condor|supermercados\s*bh|supermercado\s*bh|bh\s*supermercados|epa|super\s*nosso|verdemar|mart\s*minas|villefort|guanabara|mundial|prezunic|giga\s*atacado|tenda\s*atacado|roldao|swift|oxxo|hortifruti|sacolao|acougue|padaria|panificadora|feira)\b/i.test(text)
  ) {
    return {
      categoryId: 'food',
      categoryName: 'Alimentação',
      subcategory: 'Supermercado & Feira',
      nature: 'need',
      confidence: 0.96,
      tip: 'Compras de supermercado são essenciais. Planejar cardápios e fazer listas semanais evita compras por impulso e desperdícios.',
    };
  }

  // 4. Alimentação Estilo de Vida (Restaurantes, Delivery, Bares, Cafés)
  if (
    /\b(ifood|rappi|uber\s*eats|aiqfome|delivery|restaurante|pizzaria|burger|hamburguer|mcdonald|burger\s*king|subway|habib|outback|coco\s*bambu|starbucks|cafeteria|cafe|bacio\s*di\s*latte|sorvete|cacau\s*show|kopenhagen|bar|cervejaria|choperia|lanchonete)\b/i.test(text)
  ) {
    return {
      categoryId: 'food',
      categoryName: 'Alimentação',
      subcategory: 'Restaurante & Delivery',
      nature: 'want',
      confidence: 0.93,
      tip: 'Refeições fora de casa entram nos 30% de estilo de vida. Estabelecer um teto semanal para delivery protege o orçamento.',
    };
  }

  // 5. Moradia & Contas Básicas
  if (
    /\b(aluguel|condominio|quintoandar|iptu|enel|luz|energia|copel|cemig|sabesp|agua|sanepar|cedae|copasa|cpfl|light|gas|comgas|naturgy|ultragaz|liquigas|claro|net\s*claro|vivo|tim|oi\s*fibra|internet)\b/i.test(text)
  ) {
    return {
      categoryId: 'housing',
      categoryName: 'Moradia & Contas',
      subcategory: 'Contas Básicas & Moradia',
      nature: 'need',
      confidence: 0.96,
      tip: 'Custo fixo essencial. O ideal é que a moradia total não ultrapasse 30% da sua renda líquida.',
    };
  }

  // 6. Educação & Carreira
  if (
    /\b(curso|cursos|faculdade|universidade|escola|colegio|alura|udemy|coursera|idiomas|ingles|duolingo|livro|livraria|kindle|hotmart)\b/i.test(text)
  ) {
    return {
      categoryId: 'education',
      categoryName: 'Educação & Carreira',
      subcategory: 'Cursos & Livros',
      nature: 'need',
      confidence: 0.92,
      tip: 'Investimento em capital humano que impulsiona o aumento da sua capacidade de renda no médio prazo.',
    };
  }

  // 7. Lazer, Vestuário, Streaming & Compras
  if (
    /\b(netflix|spotify|amazon\s*prime|disney|hbo|max|globoplay|apple|cinema|cinemark|steam|playstation|xbox|jogos|shein|shopee|aliexpress|zara|renner|riachuelo|c&a|dafiti|netshoes|mercadolivre|mercado\s*livre|magalu)\b/i.test(text)
  ) {
    return {
      categoryId: 'leisure',
      categoryName: 'Lazer & Estilo de Vida',
      subcategory: 'Streaming, Lazer & Compras',
      nature: 'want',
      confidence: 0.9,
      tip: 'Gastos de lazer trazem bem-estar. Monitore assinaturas não utilizadas para cortar custos invisíveis.',
    };
  }

  // 8. Dívidas & Encargos
  if (/\b(iof|juros|multa|tarifa|encargo|anuidade|renegociacao|parcelamento)\b/i.test(text)) {
    return {
      categoryId: 'debts',
      categoryName: 'Dívidas & Encargos',
      subcategory: 'Tarifas & Encargos',
      nature: 'need',
      confidence: 0.96,
      tip: 'Tarifas e juros de cartão drenam o orçamento. Se pagar juros rotativos, priorize a quitação total da fatura.',
    };
  }

  // 9. Reserva & Investimentos
  if (/\b(investimento|tesouro|cdb|lci|lca|acoes|poupanca|reserva|fundo|xp|nuinvest|rico|btg)\b/i.test(text)) {
    return {
      categoryId: 'savings',
      categoryName: 'Reserva & Investimentos',
      subcategory: 'Aportes & Reserva',
      nature: 'savings',
      confidence: 0.98,
      tip: 'Princípio do "Pague-se Primeiro": reserve o valor do seu aporte financeiro logo no início do mês.',
    };
  }

  return {
    categoryId: 'leisure',
    categoryName: 'Lazer & Estilo de Vida',
    subcategory: 'Diversos / A Revisar',
    nature: 'want',
    confidence: 0.6,
    tip: 'Categorize gastos pontuais para manter o acompanhamento claro de todas as suas despesas.',
  };
}

// Fallback rule-based diagnostic for Monthly Advisor
function generateDiagnosticFallback(
  monthlyIncome: number,
  totalSpent: number,
  categoryBreakdown: any[],
  budgetLimits: any
) {
  const savingsRate = monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - totalSpent) / monthlyIncome) * 100) : 0;
  const isOverBudget = totalSpent > monthlyIncome;
  const status = isOverBudget
    ? 'Alerta Crítico'
    : savingsRate >= 20
    ? 'Excelente'
    : savingsRate >= 10
    ? 'Equilibrado'
    : 'Atenção ao Orçamento';
  const score = Math.min(100, Math.max(20, Math.round(isOverBudget ? 40 : 50 + savingsRate * 1.5)));

  return {
    overallStatus: status,
    behavioralScore: score,
    summary: isOverBudget
      ? `Você gastou R$ ${(totalSpent - monthlyIncome).toFixed(2)} a mais do que sua renda registrada este mês. É urgente readequar despesas de estilo de vida e renegociar despesas fixas.`
      : `Seus gastos totais representam ${((totalSpent / (monthlyIncome || 1)) * 100).toFixed(1)}% da sua renda mensal. Você manteve uma margem de segurança de ${savingsRate.toFixed(1)}%.`,
    recommendations: [
      'Adote a regra 50/30/20: destine no máximo 50% para necessidades, 30% para estilo de vida e reserve 20% logo no início do mês.',
      'Identifique micro-gastos recorrentes em delivery e transporte por aplicativo nos fins de semana.',
      'Revise assinaturas e serviços recorrentes não utilizados nos últimos 30 dias.',
    ],
    categoryAlerts: Array.isArray(categoryBreakdown)
      ? categoryBreakdown
          .filter((c: any) => c.spent > (c.budget || 0) && c.budget > 0)
          .map((c: any) => `A categoria ${c.name} excedeu a reserva estipulada em R$ ${(c.spent - c.budget).toFixed(2)}.`)
      : [],
    savingsPotential: Math.max(0, Math.round(monthlyIncome * 0.15)),
  };
}

// Fallback rule-based purchase evaluation
function generatePurchaseEvaluationFallback(data: any) {
  const {
    amount = 0,
    installments = 1,
    necessityLevel = 'useful',
    monthlyIncome = 5000,
    remainingBalance = 0,
  } = data || {};

  const numAmount = Number(amount) || 0;
  const numInstallments = Math.max(1, Number(installments) || 1);
  const monthlyImpact = numInstallments === 1 ? numAmount : numAmount / numInstallments;
  const numIncome = Number(monthlyIncome) || 5000;
  const numRemaining = Number(remainingBalance) || 0;
  const newRemaining = numRemaining - monthlyImpact;
  const isExceeding = newRemaining < 0;

  const isImpulse = necessityLevel === 'impulse';
  const isEssential = necessityLevel === 'essential';
  let score = isEssential ? 85 : isImpulse ? 45 : 65;
  if (isExceeding) score -= 35;
  if (newRemaining > numIncome * 0.2) score += 15;
  score = Math.max(10, Math.min(95, score));

  const decision = score >= 70 && !isExceeding ? 'recommended' : score >= 45 && !isExceeding ? 'warning' : 'not_recommended';

  return {
    decision,
    decisionScore: score,
    verdictTitle: decision === 'recommended'
      ? 'Compra Viável e Saudável para o seu Momento'
      : decision === 'warning'
      ? 'Compra Possível, mas Requer Compensações'
      : 'Não Recomendada: Risco de Estouro de Orçamento',
    verdictExplanation: decision === 'recommended'
      ? `O valor de R$ ${numAmount.toFixed(2)} cabe no seu saldo livre de R$ ${numRemaining.toFixed(2)} sem comprometer sua reserva.`
      : isExceeding
      ? `Essa aquisição causará déficit de R$ ${Math.abs(newRemaining).toFixed(2)} no seu orçamento este mês.`
      : `A compra reduz consideravelmente sua margem de segurança para R$ ${newRemaining.toFixed(2)}.`,
    suggestions: [
      isExceeding
        ? `Adie a compra para o próximo mês ou parcele em até ${Math.min(6, Math.ceil(numAmount / (Math.max(1, numRemaining) * 0.5)))}x sem juros.`
        : `Compense R$ ${(numAmount * 0.3).toFixed(2)} reduzindo saídas e pedidos por aplicativo esta semana.`,
      `Esta compra consome cerca de ${Math.round(numAmount / ((numIncome || 4000) / 160))} horas do seu trabalho.`,
    ],
    coolingOffAdvice: isImpulse
      ? 'Aplique a Regra das 72 Horas: espere 3 dias antes de fechar a compra para evitar o arrependimento pós-impulso.'
      : 'Certifique-se de comparar preços em ao menos 3 lojas ou checar cupons de primeira compra.',
    alternatives: [
      {
        title: 'Caixinha de Metas',
        description: `Guardar R$ ${(numAmount / 2).toFixed(2)} em 2 meses para comprar com desconto no Pix.`,
      },
      {
        title: 'Pesquisa de Usados/Seminovos',
        description: 'Verificar ofertas com garantia em plataformas de seminovos verificados.',
      },
    ],
  };
}

// 1. Endpoint: AI Categorization & Insights for single transaction
// Prioritizes Gemini Flash (fast response & low computational cost) with instant rule-based fallback
app.post('/api/gemini/categorize', async (req, res) => {
  const { description, amount } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Descrição é obrigatória.' });
  }

  // 1. Tentar primeiramente categorização por IA (Gemini Flash - rápido e baixo custo)
  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await generateContentWithFallback(ai, {
        contents: `Você é um classificador financeiro inteligente especializado em finanças pessoais e extratos bancários do Brasil.
Analise a despesa: "${description}" no valor de R$ ${amount || 0}.

Classifique estritamente nas seguintes categorias oficiais:
- 'housing': Moradia & Contas (aluguel, condomínio, luz, água, gás, internet residencial)
- 'food': Alimentação (supermercado, atacarejo, açougue, padaria, feira, restaurante, delivery, ifood)
- 'transport': Transporte & Mobilidade (combustível, postos, uber, 99, transfácil, bilhetagem de ônibus/metrô, pedágio)
- 'health': Saúde & Cuidados (farmácias como Pague Menos/PAGUEMENOS00530, Drogasil, Araújo, Raia, Pacheco; remédios, consultas, exames, dentista, academia, plano de saúde)
- 'leisure': Lazer & Estilo de Vida (cinema, passeios, jogos, roupas, compras pessoais, vestuário)
- 'education': Educação & Carreira (cursos, livros, faculdade, escolas, idiomas)
- 'debts': Dívidas & Encargos (juros, tarifas bancárias, IOF, anuidade de cartão, financiamentos)
- 'subscriptions': Assinaturas & Serviços Digitais (serviços recorrentes: Apple/iCloud/Apple Music, Google One/YouTube Premium, Spotify, Netflix, Amazon Prime, Max, Disney+, ChatGPT Plus, softwares e planos mensais)
- 'savings': Reserva & Investimentos (aportes, poupança, tesouro, CDB, ações)

Regras mandatórias:
1. Farmácias (mesmo com códigos como PAGUEMENOS00530, DROGASIL, ARAUJO, PANVEL) -> categoryId: 'health', subcategory: 'Farmácia & Medicamentos', nature: 'need'.
2. Transporte coletivo/bilhetagem (Transfácil, BHBus, SPTrans, Top) -> categoryId: 'transport', subcategory: 'Transporte Coletivo & Bilhetagem', nature: 'need'.
3. Assinaturas e serviços digitais (Apple, Google One, Spotify, Netflix, ChatGPT, etc.) -> isSubscription: true, subscriptionName: nome do serviço, categoryId: 'subscriptions', nature: 'want'.
4. Defina nature: 'need' (essencial 50%), 'want' (estilo de vida 30%), ou 'savings' (reserva 20%).
5. Gere uma tip curta, prática e acolhedora em português sobre este tipo de gasto.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              categoryId: { type: Type.STRING },
              categoryName: { type: Type.STRING },
              subcategory: { type: Type.STRING },
              nature: { type: Type.STRING },
              isSubscription: { type: Type.BOOLEAN },
              subscriptionName: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              tip: { type: Type.STRING },
            },
            required: ['categoryId', 'categoryName', 'subcategory', 'nature', 'tip'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (parsed && parsed.categoryId) {
        return res.json({
          ...parsed,
          classifiedBy: 'ai',
          modelUsed: 'gemini-flash',
        });
      }
    } catch (aiError: any) {
      console.log('[Categorize] IA indisponível no momento, acionando fallback por regras.');
    }
  }

  // 2. Método de contingência: regras e heurísticas locais implementadas atualmente
  const fallbackResult = fallbackCategorize(description, Number(amount) || 0);
  return res.json({
    ...fallbackResult,
    classifiedBy: 'fallback',
  });
});

// 2. Endpoint: Monthly Financial Diagnostic & Behavioral Report
app.post('/api/gemini/advisor', async (req, res) => {
  const { monthlyIncome = 0, totalSpent = 0, categoryBreakdown = [], budgetLimits = {} } = req.body;
  const numIncome = Number(monthlyIncome) || 0;
  const numSpent = Number(totalSpent) || 0;

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json(generateDiagnosticFallback(numIncome, numSpent, categoryBreakdown, budgetLimits));
    }

    const savingsRate = numIncome > 0 ? Math.max(0, ((numIncome - numSpent) / numIncome) * 100) : 0;

    const prompt = `Você é um consultor e educador financeiro especialista em comportamento do consumidor e planejamento orçamentário.
Analise a situação financeira mensal do usuário com os seguintes dados:
- Renda Líquida Mensal: R$ ${numIncome}
- Gastos Totais no Mês: R$ ${numSpent}
- Taxa de Poupança Atual: ${savingsRate.toFixed(1)}%
- Gastos por Categoria: ${JSON.stringify(categoryBreakdown)}
- Metas de Reserva por Categoria: ${JSON.stringify(budgetLimits)}

Forneça um diagnóstico comportamental estruturado em formato JSON com:
- overallStatus: String (ex: 'Excelente', 'Equilibrado', 'Atenção ao Orçamento', 'Alerta Crítico')
- behavioralScore: Número de 0 a 100 avaliando a saúde e disciplina financeira
- summary: Texto explicativo de 2 a 3 frases em português, com tom encorajador e direto, avaliando o comportamento financeiro do mês
- recommendations: Array de 3 a 4 conselhos práticos e prioritários para otimizar gastos e poupar mais
- categoryAlerts: Array de frases alertando sobre categorias onde houve excesso ou que exigem corte
- savingsPotential: Número estimado de reais que o usuário poderia economizar ajustando desperdícios`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallStatus: { type: Type.STRING },
            behavioralScore: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            categoryAlerts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            savingsPotential: { type: Type.NUMBER },
          },
          required: ['overallStatus', 'behavioralScore', 'summary', 'recommendations', 'categoryAlerts', 'savingsPotential'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error) {
    console.log('[Advisor] Acionando diagnóstico financeiro resiliente.');
    return res.json(generateDiagnosticFallback(numIncome, numSpent, categoryBreakdown, budgetLimits));
  }
});

// 3. Endpoint: Optimized Budget Reservation Suggestion (Quanto reservar para cada categoria)
app.post('/api/gemini/optimize-budget', async (req, res) => {
  try {
    const { monthlyIncome, profile } = req.body;
    const income = Number(monthlyIncome) || 5000;
    
    // Profiles: 'rule503020', 'aggressive_savings', 'comfort_balance'
    let allocations: Record<string, number> = {};
    if (profile === 'aggressive_savings') {
      // 50% Need, 20% Want, 30% Savings
      allocations = {
        housing: Math.round(income * 0.28),
        food: Math.round(income * 0.16),
        transport: Math.round(income * 0.08),
        health: Math.round(income * 0.06),
        leisure: Math.round(income * 0.12),
        education: Math.round(income * 0.04),
        debts: 0,
        savings: Math.round(income * 0.26),
      };
    } else if (profile === 'comfort_balance') {
      allocations = {
        housing: Math.round(income * 0.32),
        food: Math.round(income * 0.22),
        transport: Math.round(income * 0.10),
        health: Math.round(income * 0.08),
        leisure: Math.round(income * 0.13),
        education: Math.round(income * 0.05),
        debts: 0,
        savings: Math.round(income * 0.10),
      };
    } else {
      // Standard 50 / 30 / 20
      allocations = {
        housing: Math.round(income * 0.25),
        food: Math.round(income * 0.18),
        transport: Math.round(income * 0.09),
        health: Math.round(income * 0.06),
        leisure: Math.round(income * 0.15),
        education: Math.round(income * 0.07),
        debts: 0,
        savings: Math.round(income * 0.20),
      };
    }

    return res.json({
      profile: profile || 'rule503020',
      income,
      allocations,
      explanation: 'Divisão calculada com base em metodologias financeiras recomendadas para garantir segurança e qualidade de vida.',
    });
  } catch (error) {
    console.error('Erro na otimização de orçamento:', error);
    return res.status(500).json({ error: 'Erro ao calcular alocação.' });
  }
});

// 4. Endpoint: Advanced Purchase Viability Evaluator with AI
app.post('/api/gemini/evaluate-purchase', async (req, res) => {
  try {
    const {
      itemName,
      amount,
      installments,
      necessityLevel,
      reason,
      monthlyIncome,
      remainingBalance,
      categoryName,
      categoryBudget,
      currentCategorySpent,
    } = req.body;

    const numAmount = Number(amount) || 0;
    const numInstallments = Math.max(1, Number(installments) || 1);
    const monthlyImpact = numInstallments === 1 ? numAmount : numAmount / numInstallments;
    const numIncome = Number(monthlyIncome) || 5000;
    const numRemaining = Number(remainingBalance) || 0;

    const ai = getGeminiClient();

    if (!ai) {
      return res.json(generatePurchaseEvaluationFallback(req.body));
    }

    const prompt = `Você é um mentor e consultor financeiro comportamental. Avalie com extremo rigor e empatia se o usuário deve realizar esta compra esporádica:
- Item: "${itemName}"
- Valor Total: R$ ${numAmount} (${numInstallments > 1 ? `${numInstallments}x de R$ ${monthlyImpact.toFixed(2)}` : 'À vista'})
- Nível de necessidade autodeclarado: ${necessityLevel} (essential, useful, impulse, ou investment)
- Motivo/Contexto: "${reason || 'Sem motivo específico informado'}"
- Categoria do gasto: ${categoryName}
- Renda Líquida Mensal: R$ ${numIncome}
- Saldo Livre Atual no Mês: R$ ${numRemaining}
- Gasto atual na categoria: R$ ${currentCategorySpent} (Teto reservado: R$ ${categoryBudget})

Responda em formato JSON:
- decision: 'recommended' (se for segura e saudável), 'warning' (se for possível mas arriscada ou exigir cortes), ou 'not_recommended' (se estourar o orçamento ou for impulso desnecessário)
- decisionScore: número inteiro de 0 a 100
- verdictTitle: título direto e objetivo do veredito (ex: 'Compra Financeiramente Saudável', 'Atenção: Margem Muito Apertada', 'Contraindicada no Momento')
- verdictExplanation: texto de 2 a 3 frases explicando com clareza o motivo financeiro da decisão
- suggestions: array de 3 sugestões pragmáticas de encaixe no orçamento (ex: compensar em outra categoria, parcelamento ótimo, custo em horas de trabalho)
- coolingOffAdvice: dica comportamental sobre controle de impulso ou oportunidade de desconto
- alternatives: array de 2 objetos com { title: string, description: string } contendo caminhos alternativos mais econômicos ou estratégicos.`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING },
            decisionScore: { type: Type.INTEGER },
            verdictTitle: { type: Type.STRING },
            verdictExplanation: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            coolingOffAdvice: { type: Type.STRING },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['title', 'description'],
              },
            },
          },
          required: ['decision', 'decisionScore', 'verdictTitle', 'verdictExplanation', 'suggestions', 'coolingOffAdvice', 'alternatives'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error) {
    console.log('[PurchaseEvaluation] Acionando avaliação financeira resiliente.');
    return res.json(generatePurchaseEvaluationFallback(req.body));
  }
});

// 5. Endpoint: Batch Categorization for Credit Card Invoices & Statements
// Prioritizes Gemini Flash (fast response & low computational cost) with instant rule-based fallback
app.post('/api/gemini/batch-categorize', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ items: [], classifiedBy: 'none' });
    }

    // Helper para gerar o fallback completo para a lista
    const generateFullFallback = () =>
      items.map((item: any) => {
        const result = fallbackCategorize(item.description || '', Number(item.amount) || 0);
        return {
          id: item.id,
          categoryId: result.categoryId,
          categoryName: result.categoryName,
          subcategory: result.subcategory,
          nature: result.nature,
          isSubscription: result.isSubscription,
          subscriptionName: result.subscriptionName,
          confidence: result.confidence,
          classifiedBy: 'fallback',
        };
      });

    // 1. Tentar primeiramente categorização por IA (Gemini Flash - rápido e baixo custo)
    const ai = getGeminiClient();
    if (ai) {
      try {
        const batchPayload = items.slice(0, 60).map((it: any) => ({
          id: String(it.id),
          desc: String(it.description || ''),
          val: Number(it.amount) || 0,
        }));

        const prompt = `Você é um classificador financeiro de extratos bancários e faturas de cartão no Brasil.
Analise os seguintes lançamentos e classifique cada um:
${JSON.stringify(batchPayload)}

Categorias oficiais permitidas:
- 'housing': Moradia & Contas (aluguel, condomínio, luz, água, internet residencial)
- 'food': Alimentação (supermercado/atacadão é 'need', restaurante/delivery/ifood é 'want')
- 'transport': Transporte & Mobilidade (combustível, postos, uber, 99, transfácil, metrô - 'need')
- 'health': Saúde & Cuidados (farmácias como Pague Menos/PAGUEMENOS00530, Drogasil, Araújo, Raia, consultas - 'need')
- 'leisure': Lazer & Estilo de Vida (cinemas, passeios, compras pessoais, vestuário - 'want')
- 'education': Educação & Carreira ('need')
- 'debts': Dívidas, juros, tarifas, anuidade ('need')
- 'subscriptions': Assinaturas & Serviços Digitais (Apple/iCloud, Google One/YouTube, Spotify, Netflix, Amazon Prime, ChatGPT - marque isSubscription: true, nature: 'want')
- 'savings': Reserva & Investimentos ('savings')

Regras:
1. Mantenha estritamente os mesmos IDs recebidos.
2. Farmácias (mesmo com códigos como PAGUEMENOS00530) -> categoryId: 'health', subcategory: 'Farmácia & Medicamentos', nature: 'need'.
3. Transporte coletivo (Transfácil, BHBus, SPTrans) -> categoryId: 'transport', subcategory: 'Transporte Coletivo & Bilhetagem', nature: 'need'.
4. Assinaturas -> isSubscription: true, subscriptionName com o nome do serviço (ex: 'Apple (iCloud / Serviços)', 'Google One', 'Spotify').`;

        const response = await generateContentWithFallback(ai, {
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  categoryId: { type: Type.STRING },
                  categoryName: { type: Type.STRING },
                  subcategory: { type: Type.STRING },
                  nature: { type: Type.STRING },
                  isSubscription: { type: Type.BOOLEAN },
                  subscriptionName: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                },
                required: ['id', 'categoryId', 'categoryName', 'subcategory', 'nature'],
              },
            },
          },
        });

        const parsed = JSON.parse(response.text || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          const aiMap = new Map(parsed.map((item: any) => [String(item.id), item]));

          const enriched = items.map((orig: any) => {
            const aiItem = aiMap.get(String(orig.id));
            if (aiItem && aiItem.categoryId) {
              return {
                id: orig.id,
                categoryId: aiItem.categoryId,
                categoryName: aiItem.categoryName,
                subcategory: aiItem.subcategory,
                nature: aiItem.nature,
                isSubscription: Boolean(aiItem.isSubscription),
                subscriptionName: aiItem.subscriptionName,
                confidence: aiItem.confidence ?? 0.95,
                classifiedBy: 'ai',
              };
            }
            // Fallback por item se algum não retornou da IA
            const fb = fallbackCategorize(orig.description || '', Number(orig.amount) || 0);
            return {
              id: orig.id,
              ...fb,
              classifiedBy: 'fallback',
            };
          });

          return res.json({
            items: enriched,
            classifiedBy: 'ai',
            modelUsed: 'gemini-flash',
          });
        }
      } catch (aiBatchErr: any) {
        console.log('[BatchCategorize] IA indisponível no momento, acionando fallback por regras.');
      }
    }

    // 2. Contingência: método de regras e heurísticas atual se IA não estiver configurada ou falhar
    const fallbackItems = generateFullFallback();
    return res.json({
      items: fallbackItems,
      classifiedBy: 'fallback',
    });
  } catch (error) {
    console.log('[BatchCategorize] Acionando contingência de emergência por regras.');
    const { items = [] } = req.body;
    const emergencyItems = items.map((item: any) => ({
      id: item.id,
      ...fallbackCategorize(item.description || '', Number(item.amount) || 0),
      classifiedBy: 'fallback',
    }));
    return res.json({ items: emergencyItems, classifiedBy: 'fallback' });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
