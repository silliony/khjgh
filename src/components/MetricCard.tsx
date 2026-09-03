import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColorClass?: string;
  badge?: {
    text: string;
    type: 'positive' | 'warning' | 'danger' | 'neutral';
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  iconColorClass = 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
  badge,
}) => {
  const badgeStyles = {
    positive: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <div
      id={id}
      className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl transition-all shadow-sm flex flex-col justify-between hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${iconColorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {title}
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-50 tracking-tight mt-0.5">
              {value}
            </div>
          </div>
        </div>
        {badge && (
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold border whitespace-nowrap ${
              badgeStyles[badge.type]
            }`}
          >
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          {subtitle}
        </div>
      )}
    </div>
  );
};
