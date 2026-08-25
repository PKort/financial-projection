import type { CategoryFormState, FormDataState, ManagedUserForm, ProjectionSummary, ViewMode } from './types';
import { formatLocalDate } from './utils/formatting';

const today = new Date();
export const monthStart = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
export const monthEnd = formatLocalDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));

export const PAST_DAYS_VISIBLE = 10;
export const FUTURE_DAYS_VISIBLE = 15;
export const EXTENDED_MONTH_THRESHOLD_DAYS = 10;

export const emptyManagedUserForm: ManagedUserForm = { username: '', password: '', role: 'USER', isActive: true };
export const initialCategoryFormState: CategoryFormState = { code: '', name: '', sortOrder: '0', transactionGroupId: '' };

export const emptySummary: ProjectionSummary = {
  projectionStart: monthStart,
  projectionEnd: monthEnd,
  nextSalaryDate: null,
  daysToSalary: 0,
  totalBalance: 0,
  dailyBudgetBalance: 0,
  dailyBudget: 130,
  availableDailyBudget: 0,
  variance: 0,
};

export const initialFormData: FormDataState = {
  date: formatLocalDate(new Date()), startDate: formatLocalDate(new Date()), endDate: '', accountId: '',
  sourceAccountId: '', destinationAccountId: '', info: '', income: '', expense: '', amount: '',
  frequencyMultiplier: '1', frequencyPeriod: 'month', dayOfMonth: '', accountName: '', accountTypeId: '',
  initialBalance: '0', includeInDailyBudget: true, creditLimit: '', repaymentAccountId: '',
  autoRepaymentEnabled: false, autoRepaymentOffsetDays: '1', autoRepaymentGroupId: '',
  autoRepaymentSubgroupId: '', isSalaryIncome: false, transactionGroupId: '', transactionSubgroupId: '',
};

export const viewModeLabels: Record<ViewMode, string> = {
  transactions: 'Operacje', analytics: 'Podsumowanie', recurring: 'Cykliczne', accounts: 'Konta',
  categories: 'Kategorie', users: 'Użytkownicy',
};
