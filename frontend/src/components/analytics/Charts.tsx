import { formatCurrency } from '../../utils/formatting';
import { useI18n } from '../../i18n/I18nProvider';

export function AnalyticsBar({ value, max, colorClass = 'bg-blue-500' }: { value: number; max: number; colorClass?: string }) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return <div className="h-2 w-full rounded-full bg-gray-700"><div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${Math.min(width, 100)}%` }} /></div>;
}

export function PieDonutChart({ data, total, onSelect, selectedName }: {
  data: { name: string; amount: number }[];
  total: number;
  onSelect?: (name: string) => void;
  selectedName?: string | null;
}) {
  const { locale, t } = useI18n();
  const size = 220;
  const strokeWidth = 36;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#a855f7'];
  let cumulative = 0;

  return <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
    <div className="relative h-[220px] w-[220px] shrink-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#374151" strokeWidth={strokeWidth} />
        {data.map((item, index) => {
          const fraction = total > 0 ? item.amount / total : 0;
          const dash = fraction * circumference;
          const gap = circumference - dash;
          const offset = -cumulative * circumference;
          cumulative += fraction;
          const isSelected = selectedName === item.name;
          return <circle key={item.name} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors[index % colors.length]} strokeWidth={isSelected ? strokeWidth + 6 : strokeWidth} strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset} strokeLinecap="butt" className={onSelect ? 'cursor-pointer transition-all duration-150' : ''} onClick={() => onSelect?.(item.name)} />;
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-xs uppercase tracking-wide text-gray-400">{t('Wydatki')}</div>
        <div className="text-lg font-semibold text-white">{formatCurrency(total, 'PLN', locale)}</div>
        {selectedName && <div className="mt-1 max-w-[120px] text-xs text-gray-300">{selectedName}</div>}
      </div>
    </div>
    <div className="w-full space-y-2">
      {data.length > 0 ? data.map((item, index) => {
        const share = total > 0 ? (item.amount / total) * 100 : 0;
        const isSelected = selectedName === item.name;
        return <button key={item.name} type="button" onClick={() => onSelect?.(item.name)} className={`flex w-full items-center justify-between gap-3 rounded border px-3 py-2 text-left transition ${isSelected ? 'border-blue-500 bg-gray-700' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}>
          <div className="flex min-w-0 items-center gap-3"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="truncate text-sm text-gray-200">{item.name}</span></div>
          <div className="shrink-0 text-right"><div className="font-mono text-sm text-white">{formatCurrency(item.amount, 'PLN', locale)}</div><div className="text-xs text-gray-400">{share.toFixed(1)}%</div></div>
        </button>;
      }) : <div className="text-sm text-gray-400">{t('Brak danych.')}</div>}
    </div>
  </div>;
}
