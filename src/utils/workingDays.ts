/**
 * Cálculo de dias úteis e feriados nacionais brasileiros para o cálculo de benefícios como VA/VR.
 */

interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  isWeekday: boolean;
}

// Algoritmo de Butcher / Gauss para calcular a Páscoa em qualquer ano
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

// Retorna todos os feriados nacionais de um determinado ano
export function getBrazilianHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year);

  const addDays = (base: Date, days: number): Date => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  };

  const carnival = addDays(easter, -47); // Terça-feira de carnaval
  const goodFriday = addDays(easter, -2); // Sexta-feira Santa
  const corpusChristi = addDays(easter, 60); // Corpus Christi

  const toIso = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  const holidaysList: { date: string; name: string }[] = [
    { date: `${year}-01-01`, name: 'Confraternização Universal' },
    { date: toIso(carnival), name: 'Carnaval' },
    { date: toIso(goodFriday), name: 'Sexta-feira Santa' },
    { date: toIso(easter), name: 'Páscoa' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho' },
    { date: toIso(corpusChristi), name: 'Corpus Christi' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-11-20`, name: 'Dia Nacional de Zumbi dos Palmares' },
    { date: `${year}-12-25`, name: 'Natal' },
  ];

  return holidaysList.map((h) => {
    const [y, m, d] = h.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    return {
      date: h.date,
      name: h.name,
      isWeekday: dayOfWeek >= 1 && dayOfWeek <= 5,
    };
  });
}

export interface MonthWorkingDaysResult {
  year: number;
  month: number;
  totalDays: number;
  workingDays: number;
  weekendDays: number;
  holidaysOnWeekdays: Holiday[];
}

/**
 * Calcula dias úteis de um mês específico (ex: "2026-09" ou ano 2026 e mês 9)
 */
export function getMonthWorkingDays(yearOrMonthStr: number | string, monthArg?: number): MonthWorkingDaysResult {
  let year: number;
  let month: number; // 1-12

  if (typeof yearOrMonthStr === 'string') {
    const [y, m] = yearOrMonthStr.split('-').map(Number);
    year = y;
    month = m;
  } else {
    year = yearOrMonthStr;
    month = monthArg || 1;
  }

  const holidays = getBrazilianHolidays(year);
  const monthHolidaysMap = new Map<string, Holiday>();
  holidays.forEach((h) => {
    const [hY, hM] = h.date.split('-').map(Number);
    if (hY === year && hM === month && h.isWeekday) {
      monthHolidaysMap.set(h.date, h);
    }
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  let weekendDays = 0;
  const holidaysOnWeekdays: Holiday[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sáb
    const dateIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendDays++;
    } else {
      // Dia de semana (Seg-Sex)
      if (monthHolidaysMap.has(dateIso)) {
        holidaysOnWeekdays.push(monthHolidaysMap.get(dateIso)!);
      } else {
        workingDays++;
      }
    }
  }

  return {
    year,
    month,
    totalDays: daysInMonth,
    workingDays,
    weekendDays,
    holidaysOnWeekdays,
  };
}

/**
 * Calcula o total de Vale Alimentação / Refeição para o mês
 */
export function calculateVATotal(dailyRate: number, workingDays: number): number {
  return Number((Math.max(0, dailyRate) * Math.max(0, workingDays)).toFixed(2));
}

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

/**
 * Calcula a data exata do 5º dia útil bancário de um determinado mês
 */
export function getFifthWorkingDay(year: number, month: number): { day: number; dateIso: string; weekdayName: string } {
  const holidays = getBrazilianHolidays(year);
  const holidaySet = new Set(holidays.filter((h) => h.isWeekday).map((h) => h.date));
  const daysInMonth = new Date(year, month, 0).getDate();

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const dow = d.getDay();
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (dow >= 1 && dow <= 5 && !holidaySet.has(iso)) {
      count++;
      if (count === 5) {
        return {
          day,
          dateIso: iso,
          weekdayName: WEEKDAY_NAMES[dow],
        };
      }
    }
  }

  // Fallback caso não encontre
  return {
    day: 5,
    dateIso: `${year}-${String(month).padStart(2, '0')}-05`,
    weekdayName: 'Dia 5',
  };
}

/**
 * Calcula a data do último dia útil de um mês
 */
export function getLastWorkingDay(year: number, month: number): { day: number; dateIso: string; weekdayName: string } {
  const holidays = getBrazilianHolidays(year);
  const holidaySet = new Set(holidays.filter((h) => h.isWeekday).map((h) => h.date));
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = daysInMonth; day >= 1; day--) {
    const d = new Date(year, month - 1, day);
    const dow = d.getDay();
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (dow >= 1 && dow <= 5 && !holidaySet.has(iso)) {
      return {
        day,
        dateIso: iso,
        weekdayName: WEEKDAY_NAMES[dow],
      };
    }
  }

  return {
    day: daysInMonth,
    dateIso: `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
    weekdayName: 'Último dia',
  };
}

/**
 * Retorna as informações do dia de recebimento para o mês
 */
export function getSalaryPaydayInfo(
  year: number,
  month: number,
  paydayType: 'day_of_month' | 'fifth_working_day' | 'last_working_day' = 'day_of_month',
  dayOfMonth: number = 5
): { day: number; dateIso: string; weekdayName: string; description: string } {
  if (paydayType === 'fifth_working_day') {
    const fifth = getFifthWorkingDay(year, month);
    return {
      ...fifth,
      description: `5º dia útil (${fifth.weekdayName}, ${String(fifth.day).padStart(2, '0')}/${String(month).padStart(2, '0')})`,
    };
  }

  if (paydayType === 'last_working_day') {
    const last = getLastWorkingDay(year, month);
    return {
      ...last,
      description: `Último dia útil (${last.weekdayName}, ${String(last.day).padStart(2, '0')}/${String(month).padStart(2, '0')})`,
    };
  }

  // Dia fixo do mês
  const daysInMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(1, dayOfMonth), daysInMonth);
  const dateObj = new Date(year, month - 1, safeDay);
  const dow = dateObj.getDay();
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

  return {
    day: safeDay,
    dateIso: iso,
    weekdayName: WEEKDAY_NAMES[dow],
    description: `Dia ${safeDay} (${WEEKDAY_NAMES[dow]})`,
  };
}
