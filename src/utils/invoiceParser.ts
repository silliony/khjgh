import { Category, ExpenseNature, InvoiceParsedItem } from '../types';

/**
 * Remove ruídos comuns de faturas de cartão de crédito brasileiras
 * (prefixos de maquininha, gateways, asteriscos e caracteres estranhos)
 */
export function cleanMerchantDescription(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^["']|["']$/g, '')
    // Remove prefixos comuns de adquirentes e carteiras (ex: PAG*Araujo, MP*Uber, PG *PagueMenos)
    .replace(/^(pag\*|pg\s*\*|mp\s*\*|pagto\s*\*|picpay\s*\*|stone\s*\*|cielo\s*\*|rede\s*\*|sumup\s*\*|pagseguro\s*\*|ebn\s*\*|paypal\s*\*|stripe\s*\*|dm\s*\*)/i, '')
    .replace(/^\*+|\*+$/g, '')
    .replace(/[–—_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza o texto removendo acentos e pontuações para correspondência precisa de regex
 * e separa letras de números colados (ex: PAGUEMENOS00530 -> paguemenos 00530)
 */
export function normalizeForMatching(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/([a-z])([0-9])/gi, '$1 $2') // Separa letras de números colados (ex: paguemenos00530 -> paguemenos 00530)
    .replace(/([0-9])([a-z])/gi, '$1 $2')
    .replace(/[^a-z0-9\s*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mapeia categorias do banco (ex: Nubank, C6, Inter, Itaú) para as categorias do aplicativo
 */
export function mapBankCategoryToAppCategory(
  bankCategory: string,
  categories: Category[] = []
): { categoryId: string; categoryName: string; subcategory?: string; nature: ExpenseNature } | null {
  if (!bankCategory) return null;
  const clean = normalizeForMatching(bankCategory);

  // Ignora categorias excessivamente vagas do banco para não mascarar a análise do estabelecimento
  if (/^(outros|outro|servicos|servico|geral|despesa|compras|diversos|sem categoria)$/i.test(clean)) {
    return null;
  }

  // Supermercado / Alimentação
  if (/alimenta|restaurante|supermercado|mercado|comida|lanche|refei|padaria/i.test(clean)) {
    const found = categories.find((c) => c.id === 'food' || /alimenta/i.test(c.name));
    if (found) {
      const isWant = /restaurante|lanche|ifood|delivery/i.test(clean);
      return {
        categoryId: found.id,
        categoryName: found.name,
        subcategory: isWant ? 'Restaurante & Delivery' : 'Supermercado & Alimentação',
        nature: isWant ? 'want' : 'need',
      };
    }
  }

  // Transporte
  if (/transporte|locomo|combust|posto|veiculo|viagem|corrida|uber/i.test(clean)) {
    const found = categories.find((c) => c.id === 'transport' || /transporte|veiculo/i.test(c.name));
    if (found) {
      return {
        categoryId: found.id,
        categoryName: found.name,
        subcategory: 'Transporte & Mobilidade',
        nature: 'need',
      };
    }
  }

  // Moradia & Contas (sem capturar a palavra genérica 'serviços')
  if (/moradia|casa|habita|contas|luz|agua|gas|internet|aluguel|condom/i.test(clean)) {
    const found = categories.find((c) => c.id === 'housing' || /moradia|casa|contas/i.test(c.name));
    if (found) {
      return {
        categoryId: found.id,
        categoryName: found.name,
        subcategory: 'Contas Básicas & Moradia',
        nature: 'need',
      };
    }
  }

  // Saúde
  if (/saude|farmacia|drogaria|medico|hospital|dentista|cuidados/i.test(clean)) {
    const found = categories.find((c) => c.id === 'health' || /saude|farmacia/i.test(c.name));
    if (found) {
      return {
        categoryId: found.id,
        categoryName: found.name,
        subcategory: 'Saúde & Farmácia',
        nature: 'need',
      };
    }
  }

  // Lazer / Compras / Entretenimento
  if (/lazer|entretenimento|shopping|compras|vestuario|eletronico|cultura/i.test(clean)) {
    const found = categories.find((c) => c.id === 'leisure' || /lazer|compras|estilo/i.test(c.name));
    if (found) {
      return {
        categoryId: found.id,
        categoryName: found.name,
        subcategory: 'Lazer & Compras',
        nature: 'want',
      };
    }
  }

  // Educação
  if (/educa|curso|escola|livro|faculdade|estudo/i.test(clean)) {
    const found = categories.find((c) => c.id === 'education' || /educa|estudo/i.test(c.name));
    if (found) {
      return {
        categoryId: found.id,
        categoryName: found.name,
        subcategory: 'Educação & Cursos',
        nature: 'need',
      };
    }
  }

  // Dívidas / Encargos
  if (/divida|juros|tarifa|encargo|iof|multa|parcelamento/i.test(clean)) {
    const found = categories.find((c) => c.id === 'debts' || /divida|parcelamento/i.test(c.name));
    if (found) {
      return {
        categoryId: found.id,
        categoryName: found.name,
        subcategory: 'Dívidas & Encargos',
        nature: 'need',
      };
    }
  }

  // Busca genérica pelo nome exato de alguma categoria do usuário
  const directMatch = categories.find(
    (c) => normalizeForMatching(c.name).includes(clean) || clean.includes(normalizeForMatching(c.name))
  );
  if (directMatch) {
    return {
      categoryId: directMatch.id,
      categoryName: directMatch.name,
      subcategory: directMatch.name,
      nature: directMatch.nature,
    };
  }

  return null;
}

/**
 * Interface para resultado de detecção de assinaturas
 */
export interface SubscriptionCandidate {
  isSubscription: boolean;
  serviceType: 'apple' | 'google' | 'spotify' | 'streaming' | 'software' | 'fitness' | 'telecom' | 'generic';
  suggestedName: string;
  isAppleService: boolean;
  confidence: number;
}

/**
 * Presets específicos de serviços da Apple com valores típicos no Brasil (iCloud, Apple Music, Apple One, etc.)
 */
export const APPLE_SUBSCRIPTION_PRESETS = [
  { id: 'icloud_50gb', name: 'iCloud+ (50 GB)', typicalAmount: 4.90 },
  { id: 'icloud_200gb', name: 'iCloud+ (200 GB)', typicalAmount: 14.90 },
  { id: 'icloud_2tb', name: 'iCloud+ (2 TB)', typicalAmount: 49.90 },
  { id: 'apple_music', name: 'Apple Music', typicalAmount: 21.90 },
  { id: 'apple_music_family', name: 'Apple Music Família', typicalAmount: 34.90 },
  { id: 'apple_one_individual', name: 'Apple One Individual', typicalAmount: 42.90 },
  { id: 'apple_one_family', name: 'Apple One Familiar', typicalAmount: 54.90 },
  { id: 'apple_tv', name: 'Apple TV+', typicalAmount: 21.90 },
  { id: 'apple_arcade', name: 'Apple Arcade', typicalAmount: 14.90 },
  { id: 'apple_generic', name: 'Apple (Outra Assinatura)', typicalAmount: null },
  { id: 'not_subscription', name: 'Não é Assinatura (Compra Única/App)', typicalAmount: null },
];

/**
 * Presets de assinaturas populares em geral
 */
export const POPULAR_SUBSCRIPTION_PRESETS = [
  { id: 'google_one', name: 'Google One' },
  { id: 'youtube_premium', name: 'YouTube Premium' },
  { id: 'spotify', name: 'Spotify Premium' },
  { id: 'netflix', name: 'Netflix' },
  { id: 'amazon_prime', name: 'Amazon Prime' },
  { id: 'max', name: 'Max (HBO)' },
  { id: 'disney_plus', name: 'Disney+' },
  { id: 'chatgpt', name: 'ChatGPT Plus' },
  { id: 'smartfit', name: 'Smart Fit' },
];

/**
 * Mecanismo heurístico avançado para identificar se uma despesa é uma assinatura (Apple, Google, Spotify, etc.)
 */
export function identifySubscriptionCandidate(
  description: string,
  amount?: number
): SubscriptionCandidate {
  const norm = normalizeForMatching(description);

  // 1. Serviços Apple (apple.com/bill, itunes, apple services, etc.)
  // IMPORTANTE: Cobranças da Apple geralmente vêm como APPLE.COM/BILL.
  if (/apple(\.com)?(\/bill)?|itunes(\.com)?|apple\s*services/i.test(norm)) {
    let name = 'Apple (Assinatura)';
    if (/icloud/i.test(norm)) name = 'iCloud';
    else if (/music/i.test(norm)) name = 'Apple Music';
    else if (/tv/i.test(norm)) name = 'Apple TV+';
    else if (/one/i.test(norm)) name = 'Apple One';
    else if (amount) {
      // Heurística de faixas de valores conhecidas no Brasil
      if (Math.abs(amount - 4.90) < 0.1 || Math.abs(amount - 14.90) < 0.1 || Math.abs(amount - 49.90) < 0.1) {
        name = amount < 10 ? 'iCloud+ (50 GB)' : amount < 20 ? 'iCloud+ (200 GB)' : 'iCloud+ (2 TB)';
      } else if (Math.abs(amount - 21.90) < 0.1 || Math.abs(amount - 34.90) < 0.1) {
        name = 'Apple Music';
      } else if (Math.abs(amount - 42.90) < 0.1 || Math.abs(amount - 54.90) < 0.1) {
        name = 'Apple One';
      }
    }
    return {
      isSubscription: true,
      serviceType: 'apple',
      suggestedName: name,
      isAppleService: true,
      confidence: 0.95,
    };
  }

  // 2. Google (Google One, Google Storage, Google Play Assinaturas, YouTube Premium)
  if (/google\s*one|google\s*storage|google\s*play|google\s*\*|youtube\s*premium|youtube\s*music/i.test(norm)) {
    let name = 'Google One';
    if (/youtube/i.test(norm)) name = 'YouTube Premium';
    else if (/workspace/i.test(norm)) name = 'Google Workspace';
    return {
      isSubscription: true,
      serviceType: 'google',
      suggestedName: name,
      isAppleService: false,
      confidence: 0.96,
    };
  }

  // 3. Spotify e streaming de música
  if (/spotify|deezer|tidal|amazon\s*music/i.test(norm)) {
    return {
      isSubscription: true,
      serviceType: 'spotify',
      suggestedName: /deezer/i.test(norm) ? 'Deezer' : 'Spotify Premium',
      isAppleService: false,
      confidence: 0.98,
    };
  }

  // 4. Streaming de vídeo e entretenimento
  if (/netflix|amazon\s*prime|prime\s*video|disney|hbo|max(\.com)?|globoplay|paramount|crunchyroll|star\+|mubi/i.test(norm)) {
    let name = 'Streaming de Vídeo';
    if (/netflix/i.test(norm)) name = 'Netflix';
    else if (/prime/i.test(norm)) name = 'Amazon Prime';
    else if (/disney/i.test(norm)) name = 'Disney+';
    else if (/max|hbo/i.test(norm)) name = 'Max (HBO)';
    else if (/globo/i.test(norm)) name = 'Globoplay';
    return {
      isSubscription: true,
      serviceType: 'streaming',
      suggestedName: name,
      isAppleService: false,
      confidence: 0.96,
    };
  }

  // 5. Ferramentas, Nuvem e IA (ChatGPT, Dropbox, OneDrive, Microsoft 365, etc.)
  if (/chatgpt|openai|claude(\.ai)?|anthropic|dropbox|onedrive|microsoft\s*365|office\s*365|notion|canva|figma|adobe|github/i.test(norm)) {
    let name = 'Assinatura Software/IA';
    if (/chatgpt|openai/i.test(norm)) name = 'ChatGPT Plus';
    else if (/claude/i.test(norm)) name = 'Claude Pro';
    else if (/microsoft|office/i.test(norm)) name = 'Microsoft 365';
    else if (/dropbox/i.test(norm)) name = 'Dropbox';
    return {
      isSubscription: true,
      serviceType: 'software',
      suggestedName: name,
      isAppleService: false,
      confidence: 0.95,
    };
  }

  // 6. Fitness e Academias recorrentes
  if (/smart\s*fit|smartfit|bluefit|gympass|wellhub|totalpass|bodytech/i.test(norm)) {
    return {
      isSubscription: true,
      serviceType: 'fitness',
      suggestedName: /gympass|wellhub/i.test(norm) ? 'Wellhub (Gympass)' : 'Smart Fit',
      isAppleService: false,
      confidence: 0.94,
    };
  }

  // 7. Palavras-chave explícitas de recorrência
  if (/(mensalidade|assinatura|recorrente|plano\s*mensal|subscricao)/i.test(norm)) {
    return {
      isSubscription: true,
      serviceType: 'generic',
      suggestedName: 'Assinatura Recorrente',
      isAppleService: false,
      confidence: 0.85,
    };
  }

  return {
    isSubscription: false,
    serviceType: 'generic',
    suggestedName: '',
    isAppleService: false,
    confidence: 0,
  };
}

/**
 * Classificação heurística robusta de itens de fatura com base de conhecimento abrangente do Brasil
 */
export function classifyInvoiceMerchant(
  description: string,
  amount: number,
  categories: Category[] = [],
  bankCategory = ''
): {
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  nature: ExpenseNature;
  isSubscription?: boolean;
  subscriptionName?: string;
  confidence: number;
} {
  const cleanedDesc = cleanMerchantDescription(description);
  const normalized = normalizeForMatching(cleanedDesc);

  // Helper para buscar categoria no array do app
  const findCat = (id: string, fallbackKeywords: RegExp) =>
    categories.find((c) => c.id === id || fallbackKeywords.test(normalizeForMatching(c.name)));

  // =========================================================================
  // 0. DETECÇÃO DE ASSINATURAS & SERVIÇOS DIGITAIS (Apple, Google, Spotify, etc.)
  // =========================================================================
  const subCandidate = identifySubscriptionCandidate(cleanedDesc, amount);
  if (subCandidate.isSubscription) {
    const subCat = findCat('subscriptions', /assinatura|recorrente|servico/i);
    if (subCat) {
      return {
        categoryId: subCat.id,
        categoryName: subCat.name,
        subcategory: subCandidate.suggestedName,
        nature: subCat.nature,
        isSubscription: true,
        subscriptionName: subCandidate.suggestedName,
        confidence: subCandidate.confidence,
      };
    }
    const leisureCat = findCat('leisure', /lazer|estilo|compras/i);
    return {
      categoryId: leisureCat?.id || 'leisure',
      categoryName: leisureCat?.name || 'Lazer & Estilo de Vida',
      subcategory: `Assinatura: ${subCandidate.suggestedName}`,
      nature: 'want',
      isSubscription: true,
      subscriptionName: subCandidate.suggestedName,
      confidence: subCandidate.confidence,
    };
  }

  // =========================================================================
  // 1. SAÚDE & CUIDADOS (50% Necessidade - 'need')
  // =========================================================================

  // 1.1 Farmácias e Grandes Redes (Araújo, Pague Menos, Drogasil, Pacheco, Panvel, etc.)
  if (
    /(araujo|drog\s*araujo|drogaria\s*araujo)/i.test(normalized) ||
    /(pague\s*menos|paguemenos|pg\s*menos)/i.test(normalized) ||
    /(drogasil|droga\s*raia|raiadrogasil|rd\s*saude)/i.test(normalized) ||
    /(drogaria\s*sao\s*paulo|drog\s*sao\s*paulo|drogaria\s*pacheco|pacheco|dpsp)/i.test(normalized) ||
    /(panvel|dimed|venancio|drogaria\s*venancio)/i.test(normalized) ||
    /(drogaria\s*catarinense|preco\s*popular|farmacia\s*preco\s*popular|clamed)/i.test(normalized) ||
    /(drogal|nissei|farmacias\s*nissei|indiana|drogaria\s*indiana|globo|drogaria\s*globo|ultrafarma|extrafarma|minas\s*brasil|santa\s*marta|drogamais|farmarcas)/i.test(normalized) ||
    /(farmacia|drogaria|drog\b|remedio|medicamento|medicamentos|manipulacao|homeopatia|farmaceutica)/i.test(normalized)
  ) {
    const cat = findCat('health', /saude|farmacia/i);
    return {
      categoryId: cat?.id || 'health',
      categoryName: cat?.name || 'Saúde & Cuidados',
      subcategory: 'Farmácia & Medicamentos',
      nature: 'need',
      isSubscription: false,
      confidence: 0.98,
    };
  }

  // 1.2 Laboratórios, Clínicas Médicas, Consultas e Hospitais
  if (
    /\b(fleury|dasa|lavoisier|pardini|hermes\s*pardini|sabin|delboni|a\+\s*medicina|laboratorio|laborat|exames\s*medicos)\b/i.test(normalized) ||
    /\b(dr\s*consulta|doutor\s*consulta|hospital|pronto\s*socorro|clinica|consulta\s*medica|medico|medica|oftalmo|pediatra|psicolog|psiquiatra|fisioterapia|dermatologista|cardiologista)\b/i.test(normalized)
  ) {
    const cat = findCat('health', /saude|farmacia/i);
    return {
      categoryId: cat?.id || 'health',
      categoryName: cat?.name || 'Saúde & Cuidados',
      subcategory: 'Consultas & Exames',
      nature: 'need',
      confidence: 0.96,
    };
  }

  // 1.3 Planos de Saúde e Odontologia
  if (
    /\b(unimed|hapvida|notredame|intermedica|bradesco\s*saude|amil|sulamerica|golden\s*cross|omint|plano\s*de\s*saude|seguro\s*saude)\b/i.test(normalized) ||
    /\b(dentista|odonto|odontoprev|sorridents|orthopride|ortodontia)\b/i.test(normalized)
  ) {
    const cat = findCat('health', /saude|farmacia/i);
    return {
      categoryId: cat?.id || 'health',
      categoryName: cat?.name || 'Saúde & Cuidados',
      subcategory: /odonto|dent/i.test(normalized) ? 'Odontologia' : 'Plano de Saúde',
      nature: 'need',
      confidence: 0.97,
    };
  }

  // 1.4 Academias e Bem-Estar Físico
  if (/\b(smart\s*fit|smartfit|bluefit|bio\s*ritmo|bodytech|crossfit|academia|gympass|wellhub|totalpass)\b/i.test(normalized)) {
    const cat = findCat('health', /saude|farmacia/i);
    return {
      categoryId: cat?.id || 'health',
      categoryName: cat?.name || 'Saúde & Cuidados',
      subcategory: 'Academia & Atividade Física',
      nature: 'need',
      confidence: 0.95,
    };
  }

  // =========================================================================
  // 2. TRANSPORTE & MOBILIDADE (50% Necessidade - 'need')
  // =========================================================================

  // 2.1 Bilhetagem Eletrônica e Transporte Coletivo (Transfácil, BHBUS, SPTrans, RioCard, etc.)
  if (
    /\b(transfacil|transfacil\b|bhbus|cartao\s*otimo|otimo|transcol)\b/i.test(normalized) ||
    /\b(sptrans|bilhete\s*unico|bilheteunico|riocard|top\s*transporte|autopass|metro\s*sp|metro\s*bh|cptm|supervia|vlt|trensurb|metrorec|metrofor|ccr\s*metro|urbs|vem\s*recife|salvador\s*card|sinetram|tri\s*transporte|cartao\s*transporte|recarga\s*transporte|recarga\s*bilhete|passe\s*facil|onibus|coletivo|tarifa\s*onibus)\b/i.test(normalized)
  ) {
    const cat = findCat('transport', /transporte|veiculo/i);
    return {
      categoryId: cat?.id || 'transport',
      categoryName: cat?.name || 'Transporte & Mobilidade',
      subcategory: 'Transporte Coletivo & Bilhetagem',
      nature: 'need',
      confidence: 0.99,
    };
  }

  // 2.2 Aplicativos de Corrida e Táxi
  if (/\b(uber(?!\s*eats)|99\s*app|99app|99\s*pop|99pop|99\s*corrida|99\s*tecnologia|99\s*\*|indrive|indriver|cabify|taxi|coopertramo|radio\s*taxi)\b/i.test(normalized)) {
    const cat = findCat('transport', /transporte|veiculo/i);
    return {
      categoryId: cat?.id || 'transport',
      categoryName: cat?.name || 'Transporte & Mobilidade',
      subcategory: 'Corridas por Aplicativo',
      nature: 'need',
      confidence: 0.96,
    };
  }

  // 2.3 Postos de Combustíveis e Abastecimento
  if (/\b(posto|auto\s*posto|gasolina|etanol|diesel|gnv|combustivel|abastece|abastecimento|shell|ipiranga|petrobras|br\s*distribuidora|vibra|ale\s*combustiveis|boxter|rodoil)\b/i.test(normalized)) {
    const cat = findCat('transport', /transporte|veiculo/i);
    return {
      categoryId: cat?.id || 'transport',
      categoryName: cat?.name || 'Transporte & Mobilidade',
      subcategory: 'Combustível & Postos',
      nature: 'need',
      confidence: 0.96,
    };
  }

  // 2.4 Estacionamentos, Tags de Pedágio e Concessionárias
  if (
    /\b(sem\s*parar|semparar|veloe|conectcar|taggy|zul\s*digital|estapar|estacionamento|pare\s*bem|indigo\s*estac|rotativo|zona\s*azul)\b/i.test(normalized) ||
    /\b(pedagio|autopista|ecovias|ecopistas|novadutra|via\s*oeste|rodovias|arteris|entrevias|ccr\s*via)\b/i.test(normalized)
  ) {
    const cat = findCat('transport', /transporte|veiculo/i);
    return {
      categoryId: cat?.id || 'transport',
      categoryName: cat?.name || 'Transporte & Mobilidade',
      subcategory: 'Estacionamento & Pedágios',
      nature: 'need',
      confidence: 0.95,
    };
  }

  // 2.5 Passagens Aéreas e Rodoviárias (Mobilidade de deslocamento)
  if (/\b(gol\s*linhas|voegol|latam|azul\s*linhas|buser|clickbus|rodoviaria|cometa|aguia\s*branca|rapido\s*cometa|auto\s*viacao|viacao\s*1001|catarinense|progresso|itapemirim|gontijo)\b/i.test(normalized)) {
    const cat = findCat('transport', /transporte|veiculo/i);
    return {
      categoryId: cat?.id || 'transport',
      categoryName: cat?.name || 'Transporte & Mobilidade',
      subcategory: 'Passagens & Viagens',
      nature: 'need',
      confidence: 0.93,
    };
  }

  // =========================================================================
  // 3. ALIMENTAÇÃO ESSENCIAL (Supermercado / Feira / Padaria) (50% Necessidade)
  // =========================================================================
  if (
    /\b(assai|atacadao|carrefour|pao\s*de\s*acucar|extra\s*mercado|supermercado|hipermercado|mercado|sam'?s\s*club|dia%|st\s*marche|zona\s*sul|zaffari|muffato|supermuffato|condor|supermercados\s*bh|supermercado\s*bh|bh\s*supermercados|epa\s*supermercado|super\s*nosso|verdemar|mart\s*minas|villefort|guanabara|mundial|prezunic|giga\s*atacado|tenda\s*atacado|roldao|spani|koch|komprao|coop\s*supermercado|swift|oxxo|hortifruti|natural\s*da\s*terra|sacolao|verdurao|acougue|padaria|panificadora|panificacao|mercearia|peixaria|feira|armazem|emporio)\b/i.test(normalized)
  ) {
    const cat = findCat('food', /alimenta/i);
    return {
      categoryId: cat?.id || 'food',
      categoryName: cat?.name || 'Alimentação',
      subcategory: 'Supermercado & Feira',
      nature: 'need',
      confidence: 0.97,
    };
  }

  // =========================================================================
  // 4. RESTAURANTE, DELIVERY & LANCHES (30% Desejo / Estilo de Vida - 'want')
  // =========================================================================
  if (
    /\b(ifood|rappi|uber\s*eats|aiqfome|delivery|restaurante|pizzaria|pizza|burger|hamburguer|hamburgueria|mcdonald|mc\s*donald|burger\s*king|bk\s*brasil|subway|habib|popeyes|kfc|pizza\s*hut|dominos|madero|outback|coco\s*bambu|paris\s*6|giraffas|spoleto)\b/i.test(normalized) ||
    /\b(starbucks|the\s*coffee|cafeteria|cafe\b|bacio\s*di\s*latte|sorveteria|sorvete|cacau\s*show|kopenhagen|chocolates\s*brasil\s*cacau|bauducco|bar\b|pub\b|cervejaria|choperia|chopp|boteco|lanchonete|esfiharia|pastelaria|churrascaria|cantina|sushi|japones|temakeria|bistro)\b/i.test(normalized)
  ) {
    const cat = findCat('food', /alimenta/i);
    return {
      categoryId: cat?.id || 'food',
      categoryName: cat?.name || 'Alimentação',
      subcategory: 'Restaurante & Delivery',
      nature: 'want',
      confidence: 0.95,
    };
  }

  // =========================================================================
  // 5. MORADIA & CONTAS BÁSICAS (50% Necessidade - 'need')
  // =========================================================================
  if (
    /\b(enel|copel|cemig|sabesp|sanepar|cedae|copasa|cpfl|light\s*servicos|light\s*sa|neoenergia|energisa|equatorial|coelba|celpe|edp|embasa|compesa|corsan|cagece|saneago|comgas|naturgy|ultragaz|liquigas|supergasbras|copagaz|nacional\s*gas|energia|luz|agua|gas|saneamento|esgoto)\b/i.test(normalized) ||
    /\b(aluguel|condominio|quintoandar|quinto\s*andar|loft|imobiliaria|iptu|taxa\s*de\s*lixo)\b/i.test(normalized) ||
    /\b(claro|net\s*claro|vivo|tim|oi\s*fibra|algar|brisanet|desktop\s*internet|internet|banda\s*larga|provedor|recarga\s*celular)\b/i.test(normalized) ||
    /\b(leroy\s*merlin|telhanorte|c&c|sodimac|dicico)\b/i.test(normalized)
  ) {
    const cat = findCat('housing', /moradia|casa|contas/i);
    return {
      categoryId: cat?.id || 'housing',
      categoryName: cat?.name || 'Moradia & Contas',
      subcategory: /aluguel|condom/i.test(normalized) ? 'Aluguel & Condomínio' : /claro|vivo|tim|net|internet/i.test(normalized) ? 'Telefonia & Internet' : 'Contas Básicas (Luz/Água/Gás)',
      nature: 'need',
      confidence: 0.97,
    };
  }

  // =========================================================================
  // 6. EDUCAÇÃO & CARREIRA (50% Necessidade - 'need')
  // =========================================================================
  if (
    /\b(alura|udemy|coursera|edx|rocketseat|fiap|fgv|estacio|puc|anhanguera|unip|faculdade|universidade|colegio|escola|curso|cursos|idiomas|wizard|ccaa|cna|duolingo|hotmart|kiwify|eduzz|livraria|saraiva|leitura|travessa|kindle|editora|graduacao|pos\s*graduacao|mestrado)\b/i.test(normalized)
  ) {
    const cat = findCat('education', /educa|carreira/i);
    return {
      categoryId: cat?.id || 'education',
      categoryName: cat?.name || 'Educação & Carreira',
      subcategory: /livro|livraria|kindle/i.test(normalized) ? 'Livros & Leitura' : 'Cursos & Treinamentos',
      nature: 'need',
      confidence: 0.94,
    };
  }

  // =========================================================================
  // 7. STREAMING, LAZER, VESTUÁRIO & COMPRAS (30% Desejo - 'want')
  // =========================================================================
  if (
    /\b(netflix|spotify|amazon\s*prime|prime\s*video|disney|hbo|max\.com|globoplay|apple\.com|apple\s*bill|youtube\s*premium|deezer|paramount|crunchyroll|twitch)\b/i.test(normalized) ||
    /\b(steam|playstation|psn|xbox|microsoft\*xbox|nintendo|epic\s*games|riot\s*games|blizzard|ea\s*games|roblox|valorant|cinema|cinemark|cinepolis|uci|ingresso\.com|sympla|eventim)\b/i.test(normalized) ||
    /\b(shein|shopee|aliexpress|amazon|mercadolivre|mercado\s*livre|magalu|magazine\s*luiza|casas\s*bahia|ponto\s*frio|fast\s*shop|zara|renner|riachuelo|c&a|hering|dafiti|netshoes|centauro|decathlon|sephora|beleza\s*na\s*web|boticario|o\s*boticario|natura|oticas\s*carol|chilli\s*beans|vivara|pandora)\b/i.test(normalized)
  ) {
    const cat = findCat('leisure', /lazer|compras|estilo/i);
    return {
      categoryId: cat?.id || 'leisure',
      categoryName: cat?.name || 'Lazer & Estilo de Vida',
      subcategory: /netflix|spotify|prime|disney|hbo|globo|apple/i.test(normalized) ? 'Streaming & Assinaturas' : /shein|shopee|zara|renner|c&a/i.test(normalized) ? 'Vestuário & Moda' : 'Lazer & Entretenimento',
      nature: 'want',
      confidence: 0.92,
    };
  }

  // =========================================================================
  // 8. DÍVIDAS, ENCARGOS & TARIFAS BANCÁRIAS (50% Necessidade - 'need')
  // =========================================================================
  if (/\b(iof|juros|multa|tarifa|encargo|anuidade|renegociacao|parcelamento|seguro\s*cartao|taxa\s*bancaria|manutencao\s*conta)\b/i.test(normalized)) {
    const cat = findCat('debts', /divida|parcelamento/i);
    return {
      categoryId: cat?.id || 'debts',
      categoryName: cat?.name || 'Dívidas & Parcelamentos',
      subcategory: 'Tarifas & Encargos',
      nature: 'need',
      confidence: 0.96,
    };
  }

  // =========================================================================
  // 9. RESERVA & INVESTIMENTOS (20% Reserva - 'savings')
  // =========================================================================
  if (/\b(tesouro\s*direto|cdb|lci|lca|poupanca|investimento|rico\s*invest|xp\s*invest|nu\s*invest|nuinvest|banco\s*inter\s*invest|btg\s*pactual|clear\s*corretora|orama|reserva\s*de\s*emergencia)\b/i.test(normalized)) {
    const cat = findCat('savings', /reserva|invest/i);
    return {
      categoryId: cat?.id || 'savings',
      categoryName: cat?.name || 'Reserva & Investimentos',
      subcategory: 'Aportes & Poupança',
      nature: 'savings',
      confidence: 0.98,
    };
  }

  // =========================================================================
  // 10. CATEGORIA DO BANCO COMO HINT SECUNDÁRIO
  // =========================================================================
  if (bankCategory) {
    const mappedBank = mapBankCategoryToAppCategory(bankCategory, categories);
    if (mappedBank) {
      return {
        ...mappedBank,
        confidence: 0.88,
      };
    }
  }

  // =========================================================================
  // 11. CORRESPONDÊNCIA DINÂMICA POR CATEGORIAS PERSONALIZADAS DO USUÁRIO
  // =========================================================================
  for (const cat of categories) {
    const catWords = normalizeForMatching(cat.name).split(/\s+/).filter((w) => w.length > 3);
    for (const word of catWords) {
      if (normalized.includes(word)) {
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          subcategory: cat.name,
          nature: cat.nature,
          confidence: 0.85,
        };
      }
    }
  }

  // =========================================================================
  // 12. FALLBACK CONTROLADO (Com indicação clara para revisão)
  // =========================================================================
  const fallbackCat = categories.find((c) => c.id === 'leisure') || categories[0];
  return {
    categoryId: fallbackCat?.id || 'leisure',
    categoryName: fallbackCat?.name || 'Lazer & Estilo de Vida',
    subcategory: 'Diversos / A Revisar',
    nature: fallbackCat?.nature || 'want',
    confidence: 0.55,
  };
}

/**
 * Converte data em vários formatos para YYYY-MM-DD
 */
function normalizeDate(rawDate: string, defaultYearMonth = '2026-09'): string {
  const clean = rawDate.trim();
  const [defaultYear, defaultMonth] = defaultYearMonth.split('-');

  // Formato DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Formato DD/MM
  if (/^\d{1,2}\/\d{1,2}$/.test(clean)) {
    const [d, m] = clean.split('/');
    return `${defaultYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Formato YYYYMMDD (OFX)
  if (/^\d{8}/.test(clean)) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    return `${y}-${m}-${d}`;
  }

  return `${defaultYearMonth}-15`;
}

/**
 * Converte string de valor monetário (ex: "1.250,50", "45.90", "R$ 32,00") para number
 */
function parseBrazilianCurrency(rawAmount: string): number {
  if (!rawAmount) return 0;
  let clean = rawAmount.replace(/R\$/gi, '').trim();

  // Tratamento de sinais negativos ou parênteses
  const isNegative = clean.includes('-') || (clean.startsWith('(') && clean.endsWith(')'));
  clean = clean.replace(/[-()]/g, '').trim();

  // Se tem ponto e vírgula, ex: 1.250,90
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // Apenas vírgula: 45,90
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : Math.abs(num);
}

/**
 * Faz o parsing inteligente de faturas em formato CSV (Nubank, C6, Inter, Bradesco, Itaú)
 */
export function parseCSVInvoice(
  csvText: string,
  defaultYearMonth = '2026-09',
  categories: Category[] = []
): InvoiceParsedItem[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const items: InvoiceParsedItem[] = [];

  // Detecta separador: vírgula, ponto-e-vírgula ou tab
  const header = lines[0];
  const separator = header.includes(';') ? ';' : header.includes('\t') ? '\t' : ',';

  // Analisa colunas pelo cabeçalho
  let startIndex = 0;
  const rawHeaders = header.split(separator).map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  let dateColIdx = -1;
  let categoryColIdx = -1;
  let descColIdx = -1;
  let amountColIdx = -1;

  if (rawHeaders.some((h) => /data|date|descri|title|amount|valor|categoria/i.test(h))) {
    startIndex = 1;
    rawHeaders.forEach((h, idx) => {
      if (/data|date|dt/i.test(h) && dateColIdx === -1) dateColIdx = idx;
      else if (/categor/i.test(h) && categoryColIdx === -1) categoryColIdx = idx;
      else if (/title|titulo|título|descri|estabelecimento|memo|hist[oó]rico|nome/i.test(h) && descColIdx === -1) descColIdx = idx;
      else if (/amount|valor|val|pre[cç]o/i.test(h) && amountColIdx === -1) amountColIdx = idx;
    });
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const columns = line.split(separator).map((c) => c.replace(/^["']|["']$/g, '').trim());

    if (columns.length < 2) continue;

    let dateStr = '';
    let description = '';
    let amount = 0;
    let bankCategory = '';

    if (dateColIdx !== -1 && amountColIdx !== -1) {
      dateStr = columns[dateColIdx] || '';
      amount = parseBrazilianCurrency(columns[amountColIdx] || '0');
      description = descColIdx !== -1 ? columns[descColIdx] : '';
      if (categoryColIdx !== -1) {
        bankCategory = columns[categoryColIdx] || '';
      }
    } else {
      // Fallback inteligente quando cabeçalho não foi explicitamente detectado
      // Procura data
      const foundDateIdx = columns.findIndex((c) => /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(c));
      // Procura valor
      const foundAmountIdx = columns.findIndex((c, idx) => idx !== foundDateIdx && /^[+-]?\s*(?:R\$\s*)?\d+(?:[.,]\d+)?$/.test(c));

      if (foundDateIdx !== -1 && foundAmountIdx !== -1) {
        dateStr = columns[foundDateIdx];
        amount = parseBrazilianCurrency(columns[foundAmountIdx]);

        // Se tiver 4 colunas (típico Nubank: date, category, title, amount)
        if (columns.length === 4) {
          bankCategory = columns[1];
          description = columns[2] || columns[1];
        } else {
          const remainingCols = columns.filter((_, idx) => idx !== foundDateIdx && idx !== foundAmountIdx && _.length > 1);
          description = remainingCols[0] || 'Compra no Cartão';
          if (remainingCols.length > 1) {
            bankCategory = remainingCols[1];
          }
        }
      } else {
        dateStr = columns[0];
        description = columns[1] || 'Gasto Cartão';
        amount = parseBrazilianCurrency(columns[columns.length - 1]);
      }
    }

    if (!description) {
      description = bankCategory ? `Despesa (${bankCategory})` : 'Compra no Cartão';
    }

    // Ignora pagamentos de fatura ou estornos positivos se forem entradas
    if (/pagamento recebido|pagamento de fatura|pagamento efetuado|saldo anterior/i.test(description)) {
      continue;
    }

    if (amount <= 0) continue;

    const normalizedDate = normalizeDate(dateStr, defaultYearMonth);
    const classification = classifyInvoiceMerchant(description, amount, categories, bankCategory);

    items.push({
      id: `inv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
      date: normalizedDate,
      description,
      amount,
      categoryId: classification.categoryId,
      categoryName: classification.categoryName,
      subcategory: classification.subcategory,
      nature: classification.nature,
      isSubscription: classification.isSubscription,
      subscriptionName: classification.subscriptionName,
      selected: true,
      confidence: classification.confidence,
      rawLine: line,
    });
  }

  return items;
}

/**
 * Parsing de arquivo OFX (Open Financial Exchange) com suporte a categorias dinâmicas
 */
export function parseOFXInvoice(
  ofxText: string,
  defaultYearMonth = '2026-09',
  categories: Category[] = []
): InvoiceParsedItem[] {
  const items: InvoiceParsedItem[] = [];
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  let counter = 0;

  while ((match = trnRegex.exec(ofxText)) !== null) {
    const block = match[1];

    const dtMatch = /<DTPOSTED>([0-9]+)/i.exec(block);
    const amtMatch = /<TRNAMT>([-0-9.,]+)/i.exec(block);
    const memoMatch = /<MEMO>(.*?)(?:<|\r|\n)/i.exec(block);
    const nameMatch = /<NAME>(.*?)(?:<|\r|\n)/i.exec(block);

    const rawDate = dtMatch ? dtMatch[1] : '';
    const rawAmt = amtMatch ? amtMatch[1] : '0';
    const nameStr = (nameMatch ? nameMatch[1] : '').trim();
    const memoStr = (memoMatch ? memoMatch[1] : '').trim();
    const description = nameStr || memoStr || 'Compra Cartão';

    const amount = Math.abs(parseFloat(rawAmt.replace(',', '.')));

    if (/pagamento|fatura|pagto/i.test(description)) {
      continue;
    }
    if (amount <= 0) continue;

    const normalizedDate = normalizeDate(rawDate, defaultYearMonth);
    const classification = classifyInvoiceMerchant(description, amount, categories, memoStr !== nameStr ? memoStr : '');

    items.push({
      id: `ofx-${Date.now()}-${counter++}`,
      date: normalizedDate,
      description,
      amount,
      categoryId: classification.categoryId,
      categoryName: classification.categoryName,
      subcategory: classification.subcategory,
      nature: classification.nature,
      isSubscription: classification.isSubscription,
      subscriptionName: classification.subscriptionName,
      selected: true,
      confidence: classification.confidence,
    });
  }

  return items;
}

/**
 * Parsing de texto livre colado com suporte a categorias dinâmicas
 */
export function parsePastedTextInvoice(
  rawText: string,
  defaultYearMonth = '2026-09',
  categories: Category[] = []
): InvoiceParsedItem[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const items: InvoiceParsedItem[] = [];

  lines.forEach((line, index) => {
    // Ignora títulos de cabeçalho
    if (/^fatura|^vencimento|^limite|^total|pagamento recebido|pagamento de fatura/i.test(line)) {
      return;
    }

    // Tenta encontrar um valor monetário na linha (ex: R$ 45,90 ou 120.00 ou 45,90)
    const amountRegex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})/g;
    const amounts = Array.from(line.matchAll(amountRegex));

    if (amounts.length === 0) return;

    // Pega o último match de valor (geralmente o valor da transação está no final da linha)
    const lastAmountMatch = amounts[amounts.length - 1];
    const amount = parseBrazilianCurrency(lastAmountMatch[0]);

    if (amount <= 0) return;

    // Tenta encontrar uma data na linha (ex: 15/09 ou 15/09/2026 ou 2026-09-15)
    const dateRegex = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/;
    const dateMatch = line.match(dateRegex);

    let dateStr = defaultYearMonth + '-15';
    if (dateMatch) {
      dateStr = dateMatch[0];
    }

    // Procura se o texto inclui tags de categoria explícita, ex: [Alimentação] ou - Transporte
    let explicitCategory = '';
    const bracketMatch = line.match(/\[(.*?)\]|\((.*?)\)/);
    if (bracketMatch) {
      explicitCategory = bracketMatch[1] || bracketMatch[2] || '';
    }

    // A descrição é o texto restante após remover data e valor
    let description = line
      .replace(lastAmountMatch[0], '')
      .replace(dateMatch ? dateMatch[0] : '', '')
      .replace(/\[.*?\]|\(.*?\)/g, '')
      .replace(/R\$/gi, '')
      .replace(/[-–—]/g, ' ')
      .trim();

    if (!description || description.length < 2) {
      description = explicitCategory || 'Lançamento Cartão';
    }

    const normalizedDate = normalizeDate(dateStr, defaultYearMonth);
    const classification = classifyInvoiceMerchant(description, amount, categories, explicitCategory);

    items.push({
      id: `paste-${Date.now()}-${index}`,
      date: normalizedDate,
      description,
      amount,
      categoryId: classification.categoryId,
      categoryName: classification.categoryName,
      subcategory: classification.subcategory,
      nature: classification.nature,
      isSubscription: classification.isSubscription,
      subscriptionName: classification.subscriptionName,
      selected: true,
      confidence: classification.confidence,
      rawLine: line,
    });
  });

  return items;
}

/**
 * Função unificada que detecta o formato e processa o texto da fatura
 */
export function parseInvoiceContent(
  content: string,
  defaultYearMonth = '2026-09',
  categories: Category[] = []
): InvoiceParsedItem[] {
  const trimmed = content.trim();

  if (trimmed.includes('<OFX>') || trimmed.includes('<STMTTRN>')) {
    return parseOFXInvoice(trimmed, defaultYearMonth, categories);
  }

  // Verifica se parece CSV
  const firstLines = trimmed.split('\n').slice(0, 3).join('\n');
  if (
    firstLines.includes(';') ||
    (firstLines.includes(',') &&
      (firstLines.includes('data') ||
        firstLines.includes('date') ||
        firstLines.includes('amount') ||
        firstLines.includes('valor') ||
        firstLines.includes('categoria') ||
        firstLines.includes('category')))
  ) {
    return parseCSVInvoice(trimmed, defaultYearMonth, categories);
  }

  // Fallback para texto livre colado
  return parsePastedTextInvoice(trimmed, defaultYearMonth, categories);
}

