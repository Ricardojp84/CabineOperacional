import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  variant?: 'profit' | 'expense' | 'neutral' | 'accent' | 'warning';
  icon?: LucideIcon;
  badge?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  unit,
  subValue,
  variant = 'neutral',
  icon: Icon,
  badge,
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'profit':
        return {
          valueColor: 'text-[#10b981]',
          borderColor: 'border-[#10b981]/40',
          badgeBg: 'bg-[#003824] text-[#4edea3]',
          iconColor: 'text-[#10b981]',
        };
      case 'expense':
        return {
          valueColor: 'text-[#f59e0b]',
          borderColor: 'border-[#f59e0b]/40',
          badgeBg: 'bg-[#472a00] text-[#ffb95f]',
          iconColor: 'text-[#f59e0b]',
        };
      case 'warning':
        return {
          valueColor: 'text-[#ea580c]',
          borderColor: 'border-[#ea580c]/50',
          badgeBg: 'bg-[#690005] text-[#ffb4ab]',
          iconColor: 'text-[#ea580c]',
        };
      case 'accent':
        return {
          valueColor: 'text-[#bec6e0]',
          borderColor: 'border-[#bec6e0]/40',
          badgeBg: 'bg-[#1e293b] text-[#bec6e0]',
          iconColor: 'text-[#bec6e0]',
        };
      default:
        return {
          valueColor: 'text-[#f8fafc]',
          borderColor: 'border-[#334155]',
          badgeBg: 'bg-[#152031] text-[#94a3b8]',
          iconColor: 'text-[#94a3b8]',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`relative bg-[#1e293b] border ${styles.borderColor} rounded-xl p-4 transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:bg-[#243248] active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${styles.badgeBg}`}>
              {badge}
            </span>
          )}
          {Icon && <Icon className={`w-4 h-4 ${styles.iconColor}`} />}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono font-extrabold text-2xl lg:text-3xl tracking-tight ${styles.valueColor}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs font-semibold text-[#94a3b8]">
            {unit}
          </span>
        )}
      </div>

      {subValue && (
        <div className="mt-1 text-xs text-[#94a3b8] font-medium truncate">
          {subValue}
        </div>
      )}
    </div>
  );
};
