import React, { useId } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { formatCurrency } from '../../utils/formatting';

export function AmountWithBreakdown({ amount, formula }: { amount: number; formula?: string | null }) {
  const tooltipId = useId();
  const { t } = useI18n();
  const hasBreakdown = formula && (formula.match(/\d+(?:[.,]\d*)?|[.,]\d+/g)?.length ?? 0) > 1;

  return (
    <span className="inline-flex items-baseline whitespace-nowrap">
      {formatCurrency(amount, 'PLN')}
      {hasBreakdown && (
        <span className="group relative ml-1 inline-flex">
          <button
            type="button"
            aria-label={t('Składowe kwoty')}
            aria-describedby={tooltipId}
            className="cursor-help rounded px-1 text-gray-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
            onClick={(event) => event.stopPropagation()}
          >
            *
          </button>
          <span
            id={tooltipId}
            role="tooltip"
            className="invisible absolute bottom-full right-0 z-50 w-max max-w-64 whitespace-normal break-words rounded border border-gray-600 bg-gray-900 p-2 text-left text-sm font-normal text-gray-100 shadow-lg group-hover:visible group-focus-within:visible"
          >
            {formula}
          </span>
        </span>
      )}
    </span>
  );
}
