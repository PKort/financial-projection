import type { ProjectionRow } from '../types';

export const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatCurrency = (value: number, currency = 'PLN') =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const getOperationDisplayInfo = (row: ProjectionRow) =>
  row.type === 'transfer'
    ? row.info.replace(/ przelew (wychodzący|przychodzący)$/, '')
    : row.info;
