import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch as fetch, getErrorText } from './api/client';
import { AnalyticsBar, PieDonutChart } from './components/analytics/Charts';
import { AdminPanel } from './components/admin/AdminPanel';
import { DeleteIcon, EditIcon, IconButton } from './components/common/Icons';
import { LoginScreen } from './components/LoginScreen';
import { UserMenu } from './components/user/UserMenu';
import { useI18n } from './i18n/I18nProvider';
import {
  EXTENDED_MONTH_THRESHOLD_DAYS, FUTURE_DAYS_VISIBLE, PAST_DAYS_VISIBLE, emptyManagedUserForm,
  emptySummary, initialCategoryFormState, initialFormData, monthEnd, monthStart, viewModeLabels,
} from './config';
import type {
  Account, ActiveTab, AuthUser, CategoryFormMode, CategoryFormState, FormDataState, ManagedUserForm,
  ProjectionDay, ProjectionDefaultRangeResponse, ProjectionResponse, ProjectionRow, ProjectionSummary,
  RecurringTemplate, SettingsResponse, TransactionGroup, TransactionListItem, TransactionSubgroup, ViewMode,
} from './types';
import { formatCurrency, formatLocalDate, getOperationDisplayInfo } from './utils/formatting';
import { parseAmountInput } from './utils/amountFormula';

export default function App() {
  const { language, locale, setLanguage, t } = useI18n();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [managedUsers, setManagedUsers] = useState<AuthUser[]>([]);
  const [managedUserForm, setManagedUserForm] = useState<ManagedUserForm>(emptyManagedUserForm);
  const [editingManagedUserId, setEditingManagedUserId] = useState<number | null>(null);
  const [isManagedUserModalOpen, setIsManagedUserModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<AuthUser | null>(null);
  const [managedUserPassword, setManagedUserPassword] = useState('');
  const [timeline, setTimeline] = useState<ProjectionDay[]>([]);
  const [summary, setSummary] = useState<ProjectionSummary>(emptySummary);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [settings, setSettings] = useState<SettingsResponse>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('transaction');
  const [viewMode, setViewMode] = useState<ViewMode>('transactions');
  const [isAccountListOpen, setIsAccountListOpen] = useState(false);
  const [expandedCreditCardId, setExpandedCreditCardId] = useState<number | null>(null);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [formData, setFormData] = useState<FormDataState>(initialFormData);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [editingFromAnalytics, setEditingFromAnalytics] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [dailyBudgetInput, setDailyBudgetInput] = useState('130');
  const [isSalaryCardExpanded, setIsSalaryCardExpanded] = useState(false);
  const [isBudgetCardExpanded, setIsBudgetCardExpanded] = useState(false);
  const [manualNextSalaryDateInput, setManualNextSalaryDateInput] = useState('');
  const [selectedCurrentBalanceAccountIds, setSelectedCurrentBalanceAccountIds] = useState<number[]>([]);
  const [selectedSalaryBalanceAccountIds, setSelectedSalaryBalanceAccountIds] = useState<number[]>([]);
  const [projectionStart, setProjectionStart] = useState('');
  const [projectionEnd, setProjectionEnd] = useState('');
  const [analyticsStart, setAnalyticsStart] = useState('');
  const [analyticsEnd, setAnalyticsEnd] = useState('');
  const [isDefaultRangeReady, setIsDefaultRangeReady] = useState(false);
  const [transactionGroups, setTransactionGroups] = useState<TransactionGroup[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<TransactionGroup[]>([]);
  const [showInactiveCategories, setShowInactiveCategories] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormMode, setCategoryFormMode] = useState<CategoryFormMode>('group');
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(initialCategoryFormState);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingSubgroupId, setEditingSubgroupId] = useState<number | null>(null);
  const [isCategoryCodeDirty, setIsCategoryCodeDirty] = useState(false);
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [analyticsSourceTransactions, setAnalyticsSourceTransactions] = useState<TransactionListItem[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedAnalyticsGroup, setSelectedAnalyticsGroup] = useState<string | null>(null);
  const [selectedAnalyticsSubgroup, setSelectedAnalyticsSubgroup] = useState<string | null>(null);
  const [analyticsBreakdownMode, setAnalyticsBreakdownMode] = useState<'group' | 'account'>('group');
  const [selectedAnalyticsAccount, setSelectedAnalyticsAccount] = useState<string | null>(null);
  const [pendingAnalyticsCategories, setPendingAnalyticsCategories] = useState<Record<number, { groupId: number | null; subgroupId: number | null }>>({});
  const [operationDisplayMode, setOperationDisplayMode] = useState<'window' | 'full-range'>('window');
  const [openFilterMenu, setOpenFilterMenu] = useState<null | 'date' | 'account' | 'info' | 'cleared'>(null);
  const [isPageAtTop, setIsPageAtTop] = useState(true);
  const [transactionFilters, setTransactionFilters] = useState<{
    date: string[];
    account: string[];
    info: string[];
    cleared: '' | 'ok' | 'nie';
  }>({
    date: [],
    account: [],
    info: [],
    cleared: '',
  });
  
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const lastClearedMobileRef = useRef<HTMLElement | null>(null);
  const lastClearedDesktopRef = useRef<HTMLTableRowElement | null>(null);
  const lastScrolledOperationDisplayModeRef = useRef<'window' | 'full-range' | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      if (!localStorage.getItem('projection_auth_token')) {
        setAuthReady(true);
        return;
      }
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) throw new Error();
        setAuthUser(await response.json());
      } catch {
        localStorage.removeItem('projection_auth_token');
      } finally {
        setAuthReady(true);
      }
    };
    restoreSession();
  }, []);

  const fetchData = async () => {
    try {
      setErrorMessage('');

      const [projRes, accRes, groupsRes, tempRes, settingsRes, transactionsRes] = await Promise.all([
        fetch(`/api/projection?start=${projectionStart}&end=${projectionEnd}`),
        fetch('/api/accounts'),
        fetch('/api/transaction-groups'),
        fetch('/api/recurring-templates'),
        fetch('/api/settings'),
        fetch('/api/transactions'),
      ]);

      if (!projRes.ok) throw new Error(await getErrorText(projRes));
      if (!accRes.ok) throw new Error(await getErrorText(accRes));
      if (!groupsRes.ok) throw new Error(await getErrorText(groupsRes));
      if (!tempRes.ok) throw new Error(await getErrorText(tempRes));
      if (!settingsRes.ok) throw new Error(await getErrorText(settingsRes));
      if (!transactionsRes.ok) throw new Error(await getErrorText(transactionsRes));

      const projData: ProjectionResponse = await projRes.json();
      const accData: Account[] = await accRes.json();
      const groupsData: TransactionGroup[] = await groupsRes.json();
      const tempData: RecurringTemplate[] = await tempRes.json();
      const settingsData: SettingsResponse = await settingsRes.json();
      const transactionsData: TransactionListItem[] = await transactionsRes.json();

      setTimeline(Array.isArray(projData.timeline) ? projData.timeline : []);
      setSummary({
        ...emptySummary,
        ...projData.summary,
        dailyBudget: Number(settingsData.daily_budget ?? projData.summary?.dailyBudget ?? 130),
      });
      setAccounts(accData);
      setTransactionGroups(groupsData);
      setTransactions(transactionsData);
      setAnalyticsSourceTransactions(transactionsData);
      setPendingAnalyticsCategories({});
	  
      const defaultIncludedAccountIds = accData
        .filter((account) => {
          if (!account.includeInDailyBudget) return false;

          const isAutoRepaidCreditCard =
            account.accountType?.code === 'credit_card' &&
            account.autoRepaymentEnabled &&
            account.repaymentAccountId != null;

          return !isAutoRepaidCreditCard;
        })
        .map((account) => account.id);

	  setSelectedCurrentBalanceAccountIds((prev) =>
  	  prev.length > 0
    	  ? prev.filter((id) => defaultIncludedAccountIds.includes(id))
    	  : defaultIncludedAccountIds
	  );

      setSelectedCurrentBalanceAccountIds((prev) =>
        prev.length > 0 ? prev.filter((id) => defaultIncludedAccountIds.includes(id)) : defaultIncludedAccountIds
      );

      setSelectedSalaryBalanceAccountIds((prev) => {
        const filtered = prev.filter((id) => defaultIncludedAccountIds.includes(id));
        return filtered.length > 0 ? filtered : defaultIncludedAccountIds;
      });

      setTemplates(tempData);
      setSettings(settingsData);
      if (settingsData.ui_locale === 'pl' || settingsData.ui_locale === 'en') {
        setLanguage(settingsData.ui_locale);
      }
      setDailyBudgetInput(settingsData.daily_budget ?? '130');
      setManualNextSalaryDateInput(settingsData.manual_next_salary_date ?? '');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message ?? 'Nie udało się pobrać danych z API.');
    }
  };

  const isDateInRange = (date: string, start: string, end: string) => {
    const normalizedDate = date.slice(0, 10);
    return normalizedDate >= start && normalizedDate <= end;
  };

  const fetchCategoryAdminData = async (includeInactive = showInactiveCategories) => {
    const res = await fetch(`/api/admin/transaction-groups?includeInactive=${includeInactive ? 'true' : 'false'}`);
    if (!res.ok) {
      throw new Error(await getErrorText(res));
    }

    const data: TransactionGroup[] = await res.json();
    setCategoryGroups(data);
  };

  const fetchTransactions = async () => {
    const res = await fetch('/api/transactions');

    if (!res.ok) {
      throw new Error(await getErrorText(res));
    }

    const data: TransactionListItem[] = await res.json();
    setTransactions(data);
  };

  const refreshAnalytics = async () => {
    setAnalyticsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error(await getErrorText(response));
      const data: TransactionListItem[] = await response.json();
      setTransactions(data);
      setAnalyticsSourceTransactions(data);
      setPendingAnalyticsCategories({});
    } catch (error: any) {
      setErrorMessage(error?.message ?? t('Nie udało się odświeżyć analityki.'));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    const loadDefaultRange = async () => {
      try {
        setErrorMessage('');
        const res = await fetch('api/projection-default-range');
        if (!res.ok) throw new Error(await getErrorText(res));

        const data: ProjectionDefaultRangeResponse = await res.json();
        setProjectionStart(data.projectionStart);
        setProjectionEnd(data.projectionEnd);
        setAnalyticsStart(data.projectionStart);
        setAnalyticsEnd(data.projectionEnd);
        setIsDefaultRangeReady(true);
      } catch (err: any) {
        console.error(err);
        setErrorMessage(err?.message ?? 'Nie udało się pobrać domyślnego zakresu projekcji.');
        setProjectionStart(monthStart);
        setProjectionEnd(monthEnd);
        setAnalyticsStart(monthStart);
        setAnalyticsEnd(monthEnd);
        setIsDefaultRangeReady(true);
      }
    };

    if (authUser?.role === 'USER') loadDefaultRange();
  }, [authUser]);

  useEffect(() => {
    if (authUser?.role !== 'USER' || !isDefaultRangeReady || !projectionStart || !projectionEnd) return;
    fetchData();
  }, [authUser, isDefaultRangeReady, projectionStart, projectionEnd]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 2500);
    return () => clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    setManualNextSalaryDateInput(settings.manual_next_salary_date || '');
  }, [settings]);

  useEffect(() => {
    if (!authUser || viewMode !== 'categories') return;

    fetchCategoryAdminData(showInactiveCategories).catch((err: any) => {
      console.error(err);
      setErrorMessage(err?.message ?? 'Nie udało się pobrać kategorii.');
    });
  }, [authUser, viewMode, showInactiveCategories]);

  const loadManagedUsers = async () => {
    const response = await fetch('/api/admin/users');
    if (!response.ok) throw new Error(await getErrorText(response));
    setManagedUsers(await response.json());
  };

  useEffect(() => {
    if (authUser?.role !== 'ADMIN') return;
    loadManagedUsers().catch((err: any) => setErrorMessage(err?.message ?? 'Nie udało się pobrać użytkowników.'));
  }, [authUser]);

  const saveManagedUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setErrorMessage('');
      const response = await fetch(editingManagedUserId ? `/api/admin/users/${editingManagedUserId}` : '/api/admin/users', {
        method: editingManagedUserId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingManagedUserId
          ? { username: managedUserForm.username, role: managedUserForm.role, isActive: managedUserForm.isActive }
          : managedUserForm),
      });
      if (!response.ok) throw new Error(await getErrorText(response));
      await loadManagedUsers();
      setIsManagedUserModalOpen(false);
      setManagedUserForm(emptyManagedUserForm);
      setEditingManagedUserId(null);
      setSuccessMessage(editingManagedUserId ? 'Dane użytkownika zostały zapisane.' : 'Użytkownik został dodany.');
    } catch (err: any) { setErrorMessage(err?.message ?? 'Nie udało się zapisać użytkownika.'); }
  };

  const updateManagedUser = async (id: number, data: Partial<Pick<AuthUser, 'username' | 'isActive' | 'role'>> & { password?: string }) => {
    try {
      setErrorMessage('');
      const response = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!response.ok) throw new Error(await getErrorText(response));
      await loadManagedUsers();
      setSuccessMessage(data.password ? 'Hasło zostało zmienione.' : 'Status użytkownika został zmieniony.');
      return true;
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Nie udało się zapisać użytkownika.');
      return false;
    }
  };

  const openCreateManagedUser = () => {
    setEditingManagedUserId(null);
    setManagedUserForm(emptyManagedUserForm);
    setIsManagedUserModalOpen(true);
  };

  const openEditManagedUser = (user: AuthUser) => {
    setEditingManagedUserId(user.id);
    setManagedUserForm({ username: user.username, password: '', role: user.role, isActive: user.isActive });
    setIsManagedUserModalOpen(true);
  };

  const expireManagedUser = async (user: AuthUser) => {
    if (!window.confirm(`Czy na pewno wygasić konto „${user.username}”? Użytkownik utraci dostęp do systemu.`)) return;
    await updateManagedUser(user.id, { isActive: false });
  };

  const saveManagedUserPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!passwordUser) return;
    if (await updateManagedUser(passwordUser.id, { password: managedUserPassword })) {
      setPasswordUser(null);
      setManagedUserPassword('');
    }
  };

  const availableTransactionSubgroups = useMemo<TransactionSubgroup[]>(() => {
    if (!formData.transactionGroupId) return [];

    const selectedGroup = transactionGroups.find(
      (group) => String(group.id) === formData.transactionGroupId
    );

    return selectedGroup?.subgroups ?? [];
  }, [transactionGroups, formData.transactionGroupId]);

  const availableAutoRepaymentSubgroups = useMemo<TransactionSubgroup[]>(() => {
    if (!formData.autoRepaymentGroupId) return [];

    const selectedGroup = transactionGroups.find(
      (group) => String(group.id) === formData.autoRepaymentGroupId,
    );

    return selectedGroup?.subgroups ?? [];
  }, [transactionGroups, formData.autoRepaymentGroupId]);

  useEffect(() => {
    if (!formData.transactionSubgroupId) return;

    const subgroupStillValid = availableTransactionSubgroups.some(
      (subgroup) => String(subgroup.id) === formData.transactionSubgroupId,
    );

    if (!subgroupStillValid) {
      setFormData((prev) => ({
        ...prev,
        transactionSubgroupId: '',
      }));
    }
  }, [availableTransactionSubgroups, formData.transactionSubgroupId]);

  useEffect(() => {
    if (!formData.autoRepaymentSubgroupId) return;

    const subgroupStillValid = availableAutoRepaymentSubgroups.some(
      (subgroup) => String(subgroup.id) === formData.autoRepaymentSubgroupId,
    );

    if (!subgroupStillValid) {
      setFormData((prev) => ({ ...prev, autoRepaymentSubgroupId: '' }));
    }
  }, [availableAutoRepaymentSubgroups, formData.autoRepaymentSubgroupId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        viewMenuRef.current?.contains(target) ||
        createMenuRef.current?.contains(target) ||
        target.closest('[data-filter-menu]') ||
        target.closest('[data-filter-button]')
      ) {
        return;
      }

      setIsViewMenuOpen(false);
      setIsCreateMenuOpen(false);
      setOpenFilterMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sumSelectedBalances = (
    balancesMap: Record<string, number> | undefined,
    selectedIds: number[]
  ) => {
    if (!balancesMap) return 0;

    return selectedIds.reduce((sum, accountId) => {
      return sum + Number(balancesMap[String(accountId)] ?? 0);
    }, 0);
  };
  
  const latestDay = timeline.length > 0 ? timeline[timeline.length - 1] : null;

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  const todayDay = useMemo(() => {
    return timeline.find((day) => day.date === todayStr) ?? null;
  }, [timeline, todayStr]);
  
  const balances = useMemo(() => {
    return todayDay?.balances ?? {};
  }, [todayDay]);

  const currentTotalBalance = useMemo(() => {
    return sumSelectedBalances(
      todayDay?.balances as Record<string, number> | undefined,
      selectedCurrentBalanceAccountIds
    );
  }, [todayDay, selectedCurrentBalanceAccountIds]);

  const operationRows = useMemo(
    () => timeline.flatMap((day) => day.rows ?? []),
    [timeline]
  );

  const visibleOperationRows = useMemo(() => {
    if (operationDisplayMode === 'full-range') {
      return operationRows.filter(
        (row) => row.date >= projectionStart && row.date <= projectionEnd
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const visibleStart = new Date(today);
    visibleStart.setDate(visibleStart.getDate() - PAST_DAYS_VISIBLE);

    const visibleEnd = new Date(today);
    visibleEnd.setDate(visibleEnd.getDate() + FUTURE_DAYS_VISIBLE);

    const toDateOnly = (value: Date) => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const visibleStartStr = toDateOnly(visibleStart);
    const visibleEndStr = toDateOnly(visibleEnd);

    return operationRows.filter(
      (row) => row.date >= visibleStartStr && row.date <= visibleEndStr
    );
  }, [operationRows, operationDisplayMode, projectionStart, projectionEnd]);

  const dateFilterOptions = useMemo(() => {
    return Array.from(new Set(visibleOperationRows.map((row) => row.date))).sort();
  }, [visibleOperationRows]);

  const accountFilterOptions = useMemo(() => {
    return Array.from(new Set(visibleOperationRows.map((row) => row.accountName))).sort();
  }, [visibleOperationRows]);

  const infoFilterOptions = useMemo(() => {
    return Array.from(new Set(visibleOperationRows.map(getOperationDisplayInfo))).sort();
  }, [visibleOperationRows]);

  // Autocomplete: build options and mapping from historical info -> most frequent category/subcategory
  const infoOptions = useMemo(() => {
    return Array.from(new Set(transactions.map((tx) => (tx.info || '').trim()))).filter(Boolean);
  }, [transactions]);

  const infoToCategoryMap = useMemo(() => {
    const map = new Map<string, { groupId: string; subgroupId: string }>();

    const counters = new Map<string, Map<string, { count: number; groupId: string; subgroupId: string }>>();

    for (const tx of transactions) {
      const key = (tx.info || '').trim().toLowerCase();
      if (!key) continue;
      const pairKey = `${tx.transactionGroupId ?? ''}:${tx.transactionSubgroupId ?? ''}`;

      if (!counters.has(key)) counters.set(key, new Map());
      const inner = counters.get(key)!;

      if (!inner.has(pairKey)) {
        inner.set(pairKey, { count: 0, groupId: String(tx.transactionGroupId ?? ''), subgroupId: String(tx.transactionSubgroupId ?? '') });
      }

      inner.get(pairKey)!.count++;
    }

    for (const [key, inner] of counters.entries()) {
      let best: { count: number; groupId: string; subgroupId: string } | null = null;
      for (const v of inner.values()) {
        if (!best || v.count > best.count) best = v;
      }
      if (best) map.set(key, { groupId: best.groupId, subgroupId: best.subgroupId });
    }

    return map;
  }, [transactions]);

  const [infoSuggestion, setInfoSuggestion] = useState<string | null>(null);

  const applyCategorySuggestion = (infoText: string) => {
    const key = infoText.trim().toLowerCase();
    const pair = infoToCategoryMap.get(key);
    if (pair) {
      setFormData((prev) => ({ ...prev, transactionGroupId: pair.groupId || '', transactionSubgroupId: pair.subgroupId || '' }));
    }
  };

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, info: val }));

    const trimmed = val.trim();
    if (!trimmed) {
      setInfoSuggestion(null);
      return;
    }

    // Suggest first historical option that starts with typed value (case-insensitive)
    const found = infoOptions.find((opt) => opt.toLowerCase().startsWith(trimmed.toLowerCase()) && opt.toLowerCase() !== trimmed.toLowerCase());
    setInfoSuggestion(found ?? null);

    // If exact match to history, apply category automatically
    if (infoToCategoryMap.has(trimmed.toLowerCase())) {
      applyCategorySuggestion(trimmed);
    }
  };

  const acceptInfoSuggestion = () => {
    if (!infoSuggestion) return;
    setFormData((prev) => ({ ...prev, info: infoSuggestion }));
    applyCategorySuggestion(infoSuggestion);
    setInfoSuggestion(null);
  };

  const handleInfoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!infoSuggestion) return;
    if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      acceptInfoSuggestion();
    }
  };

  const filteredOperationRows = useMemo(() => {
    return visibleOperationRows.filter((row) => {
      if (transactionFilters.date.length > 0 && !transactionFilters.date.includes(row.date)) {
        return false;
      }

      const matchesAccount =
        row.type === 'transfer'
          ? visibleOperationRows.some(
              (candidate) =>
                candidate.transactionId === row.transactionId &&
                transactionFilters.account.includes(candidate.accountName),
            )
          : transactionFilters.account.includes(row.accountName);

      if (transactionFilters.account.length > 0 && !matchesAccount) {
        return false;
      }

      if (
        transactionFilters.info.length > 0 &&
        !transactionFilters.info.includes(getOperationDisplayInfo(row))
      ) {
        return false;
      }

      if (transactionFilters.cleared === 'ok' && !row.isCleared) {
        return false;
      }

      if (transactionFilters.cleared === 'nie' && row.isCleared) {
        return false;
      }

      return true;
    });
  }, [visibleOperationRows, transactionFilters]);

  const tableOperationRows = useMemo(() => {
    const result: Array<{ row: ProjectionRow; transferRows?: ProjectionRow[] }> = [];
    const handledTransferIds = new Set<number>();

    for (const row of filteredOperationRows) {
      if (row.type !== 'transfer') {
        result.push({ row });
        continue;
      }

      if (handledTransferIds.has(row.transactionId)) continue;
      handledTransferIds.add(row.transactionId);

      const transferRows = filteredOperationRows
        .filter((candidate) => candidate.transactionId === row.transactionId)
        .sort((a, b) => (a.transferSide === 'out' ? -1 : 1) - (b.transferSide === 'out' ? -1 : 1));

      result.push({
        row: transferRows.find((candidate) => candidate.transferSide === 'out') ?? transferRows[0],
        transferRows,
      });
    }

    return result;
  }, [filteredOperationRows]);

  const lastClearedTransactionId = useMemo(() => {
    for (let index = tableOperationRows.length - 1; index >= 0; index -= 1) {
      if (tableOperationRows[index].row.isCleared) {
        return tableOperationRows[index].row.transactionId;
      }
    }

    return null;
  }, [tableOperationRows]);

  useEffect(() => {
    if (
      lastScrolledOperationDisplayModeRef.current === operationDisplayMode ||
      viewMode !== 'transactions' ||
      tableOperationRows.length === 0
    ) {
      return;
    }

    lastScrolledOperationDisplayModeRef.current = operationDisplayMode;
    if (lastClearedTransactionId === null) return;

    const animationFrame = window.requestAnimationFrame(() => {
      const target = window.matchMedia('(min-width: 768px)').matches
        ? lastClearedDesktopRef.current
        : lastClearedMobileRef.current;

      target?.scrollIntoView({ block: 'center' });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [lastClearedTransactionId, operationDisplayMode, tableOperationRows.length, viewMode]);

  useEffect(() => {
    const updatePagePosition = () => setIsPageAtTop(window.scrollY <= 80);

    updatePagePosition();
    window.addEventListener('scroll', updatePagePosition, { passive: true });

    return () => window.removeEventListener('scroll', updatePagePosition);
  }, []);

  const handleMobilePageNavigation = () => {
    if (isPageAtTop) {
      lastClearedMobileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const accountTypeOptions = useMemo(() => {
    const map = new Map<number, { id: number; code: string; name: string }>();

    accounts.forEach((account) => {
      if (account.accountType?.id) {
        map.set(account.accountType.id, account.accountType);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [accounts]);

  const selectedAccountType = useMemo(() => {
    if (!formData.accountTypeId) return null;
    return (
      accountTypeOptions.find((type) => String(type.id) === formData.accountTypeId) ?? null
    );
  }, [accountTypeOptions, formData.accountTypeId]);

  const isCreditCardForm = selectedAccountType?.code === 'credit_card';

  const repaymentAccountOptions = useMemo(() => {
    return accounts.filter((account) => {
      if (account.id === editingAccountId) return false;
      return account.accountType?.code !== 'credit_card';
    });
  }, [accounts, editingAccountId]);

  const totalBalance = summary.totalBalance || 0;
  const dailyBudgetBalance = summary.dailyBudgetBalance || 0;
  const dailyBudget = summary.dailyBudget || Number(settings.daily_budget || 130);
  const availableDailyBudget = summary.availableDailyBudget || 0;
  const variance = summary.variance || 0;
  const daysToSalary = summary.daysToSalary || 0;
  const nextSalaryDate = summary.nextSalaryDate;

  const salaryDateBalances = useMemo(() => {
    if (!summary.nextSalaryDate) return null;
    return timeline.find((day) => day.date === summary.nextSalaryDate) ?? null;
  }, [timeline, summary.nextSalaryDate]);

  const salaryPerAccount = useMemo(() => {
    if (!salaryDateBalances) return [];

    return accounts
      .filter((account) => {
        const isAutoRepaidCreditCard =
          account.accountType?.code === 'credit_card' &&
          account.autoRepaymentEnabled &&
          account.repaymentAccountId != null;

        return !isAutoRepaidCreditCard;
      })
      .map((account) => ({
        id: account.id,
        name: account.name,
        balance: Number(salaryDateBalances.balances?.[String(account.id)] ?? 0),
      }));
  }, [accounts, salaryDateBalances]);

  const salaryTotalBalance = useMemo(() => {
    return sumSelectedBalances(
      salaryDateBalances?.balances as Record<string, number> | undefined,
      selectedSalaryBalanceAccountIds
    );
  }, [salaryDateBalances, selectedSalaryBalanceAccountIds]);
  
  const toggleAccountSelection = (
    accountId: number,
    selectedIds: number[],
    setSelectedIds: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    setSelectedIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const varianceColorClass =
    variance >= 0 ? 'text-green-400' : variance > -300 ? 'text-yellow-400' : 'text-red-400';

  const availableBudgetColorClass =
    availableDailyBudget > 130 ? 'text-green-400' : availableDailyBudget > 50 ? 'text-yellow-400' : 'text-red-400';

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const normalizedDate = dateStr.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizedDate);
    if (!match) return dateStr;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? dateStr : new Intl.DateTimeFormat(locale).format(date);
  };

  const formatDisplayMonth = (monthStr: string) => {
    const match = /^(\d{4})-(\d{2})$/.exec(monthStr);
    if (!match) return monthStr;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return Number.isNaN(date.getTime())
      ? monthStr
      : new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  };

  const formatDaysLabel = (days: number) => {
    if (days === 1) return `1 ${t('dzień')}`;
    if (language === 'en') return `${days} ${t('dni')}`;
    if (days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 12 || days % 100 > 14)) {
      return `${days} dni`;
    }
    return `${days} dni`;
  };

  const analyticsTransactions = useMemo(() => {
    if (!analyticsStart || !analyticsEnd || analyticsStart > analyticsEnd) return [];
    return analyticsSourceTransactions.filter((tx) => isDateInRange(tx.date, analyticsStart, analyticsEnd));
  }, [analyticsSourceTransactions, analyticsStart, analyticsEnd]);
  
  const slugifyCategoryCode = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const expensesByGroup = useMemo(() => {
    const map = new Map<string, number>();

    for (const tx of analyticsTransactions) {
      const expense = Number(tx.expense || 0);
      if (expense <= 0 || tx.type === 'transfer') continue;

      const key = tx.transactionGroupName || t('Bez grupy');
      map.set(key, (map.get(key) || 0) + expense);
    }

    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [analyticsTransactions, language]);

  const expensesBySubgroup = useMemo(() => {
    const map = new Map<string, number>();

    for (const tx of analyticsTransactions) {
      const expense = Number(tx.expense || 0);
      if (expense <= 0 || tx.type === 'transfer') continue;

      const group = tx.transactionGroupName || t('Bez grupy');
      const subgroup = tx.transactionSubgroupName || t('Bez podgrupy');
      const key = `${group} / ${subgroup}`;

      map.set(key, (map.get(key) || 0) + expense);
    }

    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15);
  }, [analyticsTransactions, language]);

  const analyticsAccountName = (accountId: number) => {
    const account = accounts.find((candidate) => candidate.id === accountId);
    if (!account) return `${t('Konto')} #${accountId}`;
    const hasDuplicateName = accounts.some(
      (candidate) => candidate.id !== account.id && candidate.name === account.name,
    );
    return hasDuplicateName ? `${account.name} (#${account.id})` : account.name;
  };

  const expensesByAccount = useMemo(() => {
    const map = new Map<string, number>();

    for (const tx of analyticsTransactions) {
      const expense = Number(tx.expense || 0);
      if (expense <= 0 || tx.type === 'transfer') continue;
      if (!tx.accountId) continue;

      const accountName = analyticsAccountName(tx.accountId);
      map.set(accountName, (map.get(accountName) || 0) + expense);
    }

    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [analyticsTransactions, accounts, language]);

  const monthlyFlow = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();

    for (const tx of analyticsTransactions) {
      const month = tx.date.slice(0, 7);
      const current = map.get(month) || { income: 0, expense: 0 };

      current.income += Number(tx.income || 0);
      current.expense += Number(tx.expense || 0);

      map.set(month, current);
    }

    return Array.from(map.entries())
      .map(([month, values]) => ({
        month,
        income: values.income,
        expense: values.expense,
        net: values.income - values.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [analyticsTransactions]);

  const dailyExpenseTrend = useMemo(() => {
    const map = new Map<string, number>();

    for (const tx of analyticsTransactions) {
      const expense = Number(tx.expense || 0);
      if (expense <= 0 || tx.type === 'transfer') continue;

      map.set(tx.date, (map.get(tx.date) || 0) + expense);
    }

    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [analyticsTransactions]);

  const getDefaultCategorySortOrder = (mode: CategoryFormMode, groupId?: string) => {
    if (mode === 'group') {
      if (categoryGroups.length === 0) return '10';
      const maxSort = Math.max(...categoryGroups.map((g) => Number(g.sortOrder ?? 0)));
      return String(maxSort + 10);
    }

    const parentGroup = categoryGroups.find((g) => String(g.id) === String(groupId));
    if (!parentGroup || parentGroup.subgroups.length === 0) return '10';

    const maxSort = Math.max(...parentGroup.subgroups.map((sg) => Number(sg.sortOrder ?? 0)));
    return String(maxSort + 10);
  };

  const analyticsSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let salaryIncome = 0;
    let transferExpense = 0;

    for (const tx of analyticsTransactions) {
      totalIncome += Number(tx.income || 0);
      totalExpense += Number(tx.expense || 0);

      if (tx.isSalaryIncome) {
        salaryIncome += Number(tx.income || 0);
      }

      if (tx.type === 'transfer') {
        transferExpense += Number(tx.expense || 0);
      }
    }

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      salaryIncome,
      transferExpense,
    };
  }, [analyticsTransactions]);
  
  
  const expensesBySelectedGroupSubgroup = useMemo(() => {
  if (!selectedAnalyticsGroup) return [];

  const map = new Map<string, number>();

  for (const tx of analyticsTransactions) {
    const expense = Number(tx.expense ?? 0);
    if (expense <= 0 || tx.type === 'transfer') continue;
    if ((tx.transactionGroupName ?? t('Bez grupy')) !== selectedAnalyticsGroup) continue;

    const key = tx.transactionSubgroupName ?? t('Bez podgrupy');
    map.set(key, (map.get(key) ?? 0) + expense);
  }

  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}, [analyticsTransactions, selectedAnalyticsGroup, language]);

  useEffect(() => {
    if (!selectedAnalyticsGroup) return;

    const stillExists = expensesByGroup.some(
      (item) => item.name === selectedAnalyticsGroup
    );

    if (!stillExists) {
      setSelectedAnalyticsGroup(null);
    }
  }, [expensesByGroup, selectedAnalyticsGroup]);

  useEffect(() => {
    if (!selectedAnalyticsSubgroup) return;
    if (!expensesBySelectedGroupSubgroup.some((item) => item.name === selectedAnalyticsSubgroup)) {
      setSelectedAnalyticsSubgroup(null);
    }
  }, [expensesBySelectedGroupSubgroup, selectedAnalyticsSubgroup]);

  useEffect(() => {
    if (!selectedAnalyticsAccount) return;
    if (!expensesByAccount.some((item) => item.name === selectedAnalyticsAccount)) {
      setSelectedAnalyticsAccount(null);
    }
  }, [expensesByAccount, selectedAnalyticsAccount]);
  
  const totalGroupExpenses = useMemo(
    () => expensesByGroup.reduce((sum, item) => sum + item.amount, 0),
    [expensesByGroup]
  );

  const totalAccountExpenses = useMemo(
    () => expensesByAccount.reduce((sum, item) => sum + item.amount, 0),
    [expensesByAccount]
  );

  const totalSelectedGroupExpenses = useMemo(
    () => expensesBySelectedGroupSubgroup.reduce((sum, item) => sum + item.amount, 0),
    [expensesBySelectedGroupSubgroup]
  );

  const selectedSubgroupTransactions = useMemo(() => {
    if (!selectedAnalyticsGroup || !selectedAnalyticsSubgroup) return [];
    return analyticsTransactions.filter((transaction) => {
      if (transaction.type === 'transfer' || Number(transaction.expense || 0) <= 0) return false;
      const groupName = transaction.transactionGroupName ?? t('Bez grupy');
      const subgroupName = transaction.transactionSubgroupName ?? t('Bez podgrupy');
      return groupName === selectedAnalyticsGroup && subgroupName === selectedAnalyticsSubgroup;
    });
  }, [analyticsTransactions, selectedAnalyticsGroup, selectedAnalyticsSubgroup, language]);

  const selectedAccountTransactions = useMemo(() => {
    if (!selectedAnalyticsAccount) return [];
    return analyticsTransactions.filter((transaction) => {
      if (transaction.type === 'transfer' || Number(transaction.expense || 0) <= 0 || !transaction.accountId) return false;
      const accountName = analyticsAccountName(transaction.accountId);
      return accountName === selectedAnalyticsAccount;
    });
  }, [analyticsTransactions, accounts, selectedAnalyticsAccount, language]);

  const selectedDetailTransactions = analyticsBreakdownMode === 'account'
    ? selectedAccountTransactions
    : selectedSubgroupTransactions;

  const updateAnalyticsCategory = async (
    transaction: TransactionListItem,
    groupId: number | null,
    subgroupId: number | null,
  ) => {
    const previous = pendingAnalyticsCategories[transaction.id];
    setPendingAnalyticsCategories((current) => ({
      ...current,
      [transaction.id]: { groupId, subgroupId },
    }));
    setErrorMessage('');

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: transaction.date.slice(0, 10),
          accountId: transaction.accountId ?? undefined,
          sourceAccountId: transaction.sourceAccountId ?? undefined,
          destinationAccountId: transaction.destinationAccountId ?? undefined,
          info: transaction.info,
          income: Number(transaction.income || 0),
          expense: Number(transaction.expense || 0),
          type: transaction.type,
          isSalaryIncome: transaction.isSalaryIncome,
          transactionGroupId: groupId,
          transactionSubgroupId: subgroupId,
        }),
      });
      if (!response.ok) throw new Error(await getErrorText(response));
    } catch (error: any) {
      setPendingAnalyticsCategories((current) => {
        const next = { ...current };
        if (previous) next[transaction.id] = previous;
        else delete next[transaction.id];
        return next;
      });
      setErrorMessage(error?.message ?? t('Nie udało się zmienić kategorii.'));
    }
  };

  const openCreateModal = (tab: ActiveTab) => {
    setActiveTab(tab);
    setFormData({
      ...initialFormData,
      date: formatLocalDate(new Date()),
      startDate: formatLocalDate(new Date()),
    });
    setEditingTransactionId(null);
    setEditingFromAnalytics(false);
    setEditingTemplateId(null);
    setEditingAccountId(null);
    setErrorMessage('');
    setSuccessMessage('');
    setIsCreateMenuOpen(false);
    setIsModalOpen(true);
  };

  const openDefaultOperationModal = () => {
    openCreateModal('transaction');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setEditingTransactionId(null);
    setEditingFromAnalytics(false);
    setEditingTemplateId(null);
    setEditingAccountId(null);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setCategoryFormMode('group');
    setCategoryForm(initialCategoryFormState);
    setEditingGroupId(null);
    setEditingSubgroupId(null);
    setIsCategoryCodeDirty(false);
  };

  const openCreateGroupModal = () => {
    setCategoryFormMode('group');
    setCategoryForm({
      ...initialCategoryFormState,
      sortOrder: getDefaultCategorySortOrder('group'),
    });
    setEditingGroupId(null);
    setEditingSubgroupId(null);
    setIsCategoryCodeDirty(false);
    setIsCategoryModalOpen(true);
  };

  const openEditGroupModal = (group: TransactionGroup) => {
    setCategoryFormMode('group');
    setCategoryForm({
      code: group.code,
      name: group.name,
      sortOrder: String(group.sortOrder ?? 0),
      transactionGroupId: '',
    });
    setEditingGroupId(group.id);
    setEditingSubgroupId(null);
    setIsCategoryCodeDirty(true);
    setIsCategoryModalOpen(true);
  };

  const openCreateSubgroupModal = (groupId?: number) => {
    const nextGroupId = groupId ? String(groupId) : '';

    setCategoryFormMode('subgroup');
    setCategoryForm({
      ...initialCategoryFormState,
      transactionGroupId: nextGroupId,
      sortOrder: getDefaultCategorySortOrder('subgroup', nextGroupId),
    });
    setEditingGroupId(null);
    setEditingSubgroupId(null);
    setIsCategoryCodeDirty(false);
    setIsCategoryModalOpen(true);
  };

  const openEditSubgroupModal = (groupId: number, subgroup: TransactionSubgroup) => {
    setCategoryFormMode('subgroup');
    setCategoryForm({
      code: subgroup.code,
      name: subgroup.name,
      sortOrder: String(subgroup.sortOrder ?? 0),
      transactionGroupId: String(groupId),
    });
    setEditingGroupId(null);
    setEditingSubgroupId(subgroup.id);
    setIsCategoryCodeDirty(true);
    setIsCategoryModalOpen(true);
  };
  
  const submitCategoryGroup = async () => {
    const payload = {
      code: categoryForm.code,
      name: categoryForm.name,
      sortOrder: Number(categoryForm.sortOrder || 0),
    };

    const method = editingGroupId ? 'PATCH' : 'POST';
    const url = editingGroupId
      ? `/api/admin/transaction-groups/${editingGroupId}`
      : '/api/admin/transaction-groups';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await getErrorText(res));
    }
  };

  const submitCategorySubgroup = async () => {
    const payload = {
      transactionGroupId: Number(categoryForm.transactionGroupId),
      code: categoryForm.code,
      name: categoryForm.name,
      sortOrder: Number(categoryForm.sortOrder || 0),
    };

    const method = editingSubgroupId ? 'PATCH' : 'POST';
    const url = editingSubgroupId
      ? `/api/admin/transaction-subgroups/${editingSubgroupId}`
      : '/api/admin/transaction-subgroups';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await getErrorText(res));
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage('');

    if (!categoryForm.name.trim()) {
      throw new Error(
        categoryFormMode === 'group'
          ? 'Podaj nazwę grupy.'
          : 'Podaj nazwę podgrupy.'
      );
    }

    if (categoryFormMode === 'subgroup' && !categoryForm.transactionGroupId) {
      throw new Error('Wybierz grupę nadrzędną.');
    }


	if (categoryFormMode === 'group') {
        await submitCategoryGroup();
        setSuccessMessage(editingGroupId ? 'Grupa została zaktualizowana.' : 'Grupa została dodana.');
      } else {
        await submitCategorySubgroup();
        setSuccessMessage(editingSubgroupId ? 'Podgrupa została zaktualizowana.' : 'Podgrupa została dodana.');
      }

    await Promise.all([fetchData(), fetchCategoryAdminData(showInactiveCategories)]);
      closeCategoryModal();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message ?? 'Nie udało się zapisać kategorii.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const deactivateGroup = async (id: number) => {
    try {
      setErrorMessage('');

      const res = await fetch(`/api/admin/transaction-groups/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(await getErrorText(res));
      }

      await Promise.all([
        fetchData(),
        fetchCategoryAdminData(showInactiveCategories),
      ]);

      setSuccessMessage('Grupa została dezaktywowana.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message ?? 'Nie udało się dezaktywować grupy.');
    }
  };

  const deactivateSubgroup = async (id: number) => {
    try {
      setErrorMessage('');

      const res = await fetch(`/api/admin/transaction-subgroups/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(await getErrorText(res));
      }

      await Promise.all([
        fetchData(),
        fetchCategoryAdminData(showInactiveCategories),
      ]);

      setSuccessMessage('Podgrupa została dezaktywowana.');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message ?? 'Nie udało się dezaktywować podgrupy.');
    }
  };

  const submitTransaction = async () => {
    if (!formData.accountId) throw new Error('Wybierz konto.');
    if (!formData.info.trim()) throw new Error('Podaj opis.');
    if (!formData.date) throw new Error('Podaj datę.');
    if (!formData.income && !formData.expense) throw new Error('Podaj wpłatę lub wypłatę.');

    const income = formData.income ? parseAmountInput(formData.income) : null;
    const expense = formData.expense ? parseAmountInput(formData.expense) : null;
    if ((income && income.value <= 0) || (expense && expense.value <= 0)) {
      throw new Error('Kwota musi być większa od zera.');
    }

    const payload = {
      date: formData.date,
      accountId: Number(formData.accountId),
      info: formData.info,
      income: income?.value ?? 0,
      expense: expense?.value ?? 0,
      incomeFormula: income?.formula ?? null,
      expenseFormula: expense?.formula ?? null,
      type: 'transaction',
      isSalaryIncome: formData.isSalaryIncome,
      transactionGroupId: formData.transactionGroupId
        ? Number(formData.transactionGroupId)
        : null,
      transactionSubgroupId: formData.transactionSubgroupId
        ? Number(formData.transactionSubgroupId)
        : null,
    };

    const method = editingTransactionId ? 'PATCH' : 'POST';
    const url = editingTransactionId ? `/api/transactions/${editingTransactionId}` : '/api/transactions';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await getErrorText(res));
  };

  const submitTransfer = async () => {
    if (!formData.sourceAccountId) throw new Error('Wybierz konto źródłowe.');
    if (!formData.destinationAccountId) throw new Error('Wybierz konto docelowe.');
    if (formData.sourceAccountId === formData.destinationAccountId) {
      throw new Error('Konta przelewu muszą być różne.');
    }
    if (!formData.info.trim()) throw new Error('Podaj opis.');
    if (!formData.date) throw new Error('Podaj datę.');
    if (!formData.amount) throw new Error('Podaj kwotę.');

    const payload = {
      date: formData.date,
      sourceAccountId: Number(formData.sourceAccountId),
      destinationAccountId: Number(formData.destinationAccountId),
      info: formData.info.trim(),
      expense: Number(formData.amount),
      type: 'transfer',
      transactionGroupId: formData.transactionGroupId
        ? Number(formData.transactionGroupId)
        : null,
      transactionSubgroupId: formData.transactionSubgroupId
        ? Number(formData.transactionSubgroupId)
        : null,
    };

    const method = editingTransactionId ? 'PATCH' : 'POST';
    const url = editingTransactionId ? `/api/transactions/${editingTransactionId}` : '/api/transactions';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await getErrorText(res));
  };

  const submitRecurring = async () => {
    if (!formData.accountId) throw new Error('Wybierz konto.');
    if (!formData.info.trim()) throw new Error('Podaj opis szablonu.');
    if (!formData.amount) throw new Error('Podaj kwotę.');
    if (!formData.startDate) throw new Error('Podaj datę startową.');

    const payload = {
      accountId: Number(formData.accountId),
      info: formData.info.trim(),
      amount: Number(formData.amount),
      startDate: formData.startDate,
      endDate: formData.endDate || undefined,
      multiplier: Number(formData.frequencyMultiplier || 1),
      period: formData.frequencyPeriod,
      dayOfMonth:
        formData.frequencyPeriod === 'month' && formData.dayOfMonth
          ? Number(formData.dayOfMonth)
          : undefined,
      transactionGroupId: formData.transactionGroupId
        ? Number(formData.transactionGroupId)
        : null,
      transactionSubgroupId: formData.transactionSubgroupId
        ? Number(formData.transactionSubgroupId)
        : null,
      isActive: true,
    };

    const method = editingTemplateId ? 'PATCH' : 'POST';
    const url = editingTemplateId ? `/api/recurring-templates/${editingTemplateId}` : '/api/recurring-templates';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await getErrorText(res));
  };

  const submitAccount = async () => {
    if (!formData.accountName.trim()) throw new Error('Podaj nazwę konta.');
    if (!formData.accountTypeId) throw new Error('Wybierz typ konta.');

    const isCreditCard =
      selectedAccountType?.code === 'credit_card' || selectedAccountType?.code === 'credit_card';

    const payload = {
      name: formData.accountName.trim(),
      accountTypeId: Number(formData.accountTypeId),
      initialBalance: Number(formData.initialBalance || 0),
      includeInDailyBudget: formData.includeInDailyBudget,
      creditLimit: isCreditCard ? (formData.creditLimit ? Number(formData.creditLimit) : null) : undefined,
      repaymentAccountId: isCreditCard
        ? (formData.repaymentAccountId ? Number(formData.repaymentAccountId) : null)
        : undefined,
      autoRepaymentEnabled: isCreditCard ? formData.autoRepaymentEnabled : undefined,
      autoRepaymentOffsetDays: isCreditCard
        ? Number(formData.autoRepaymentOffsetDays || 1)
        : undefined,
      autoRepaymentGroupId: isCreditCard
        ? (formData.autoRepaymentGroupId ? Number(formData.autoRepaymentGroupId) : null)
        : undefined,
      autoRepaymentSubgroupId: isCreditCard
        ? (formData.autoRepaymentSubgroupId ? Number(formData.autoRepaymentSubgroupId) : null)
        : undefined,
    };

    const method = editingAccountId ? 'PATCH' : 'POST';
    const url = editingAccountId ? `/api/accounts/${editingAccountId}` : '/api/accounts';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await getErrorText(res));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (activeTab === 'transaction') await submitTransaction();
      if (activeTab === 'transfer') await submitTransfer();
      if (activeTab === 'recurring') await submitRecurring();
      if (activeTab === 'account') await submitAccount();

      if (editingFromAnalytics && editingTransactionId) {
        setPendingAnalyticsCategories((current) => ({
          ...current,
          [editingTransactionId]: {
            groupId: formData.transactionGroupId ? Number(formData.transactionGroupId) : null,
            subgroupId: formData.transactionSubgroupId ? Number(formData.transactionSubgroupId) : null,
          },
        }));
      } else {
        await fetchData();
      }
      setSuccessMessage('Zapisano pomyślnie.');
      closeModal();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Nie udało się zapisać danych.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDailyBudget = async () => {
    try {
      setErrorMessage('');
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'daily_budget', value: String(Number(dailyBudgetInput || 0)) }),
      });

      if (!res.ok) throw new Error(await getErrorText(res));

      await fetchData();
      setSuccessMessage('Budżet dzienny zapisany.');
    } catch (err) {
      console.error(err);
      setErrorMessage('Nie udało się zapisać budżetu dziennego.');
    }
  };

  const saveManualNextSalaryDate = async () => {
    try {
      setErrorMessage('');

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'manual_next_salary_date',
          value: manualNextSalaryDateInput || '',
        }),
      });

      if (!res.ok) throw new Error(await getErrorText(res));

      await fetchData();
      setSuccessMessage('Data następnej wypłaty zapisana.');
    } catch (err) {
      console.error(err);
      setErrorMessage('Nie udało się zapisać daty następnej wypłaty.');
    }
  };

  const startEditRow = (row: ProjectionRow) => {
    setEditingFromAnalytics(false);
    if (row.type === 'transfer') {
      const partnerRow = timeline
        .flatMap((day) => day.rows)
        .find((item) => item.transactionId === row.transactionId && item.rowId !== row.rowId);

      setActiveTab('transfer');
      setFormData({
        ...initialFormData,
        date: row.date,
        sourceAccountId: row.transferSide === 'out' ? String(row.accountId) : String(partnerRow?.accountId || ''),
        destinationAccountId: row.transferSide === 'in' ? String(row.accountId) : String(partnerRow?.accountId || ''),
        info: row.info.replace(' przelew wychodzący', '').replace(' przelew przychodzący', ''),
        amount: String(row.transferSide === 'out' ? row.expense : row.income),
		transactionGroupId: row.transactionGroupId ? String(row.transactionGroupId) : '',
        transactionSubgroupId: row.transactionSubgroupId ? String(row.transactionSubgroupId) : '',
      });
      setEditingTransactionId(row.transactionId);
      setEditingTemplateId(null);
      setEditingAccountId(null);
      setIsModalOpen(true);
      return;
    }

    setActiveTab('transaction');
    setFormData({
      ...initialFormData,
      date: row.date,
      accountId: String(row.accountId || ''),
      info: row.info,
      income: row.incomeFormula || (row.income ? String(row.income) : ''),
      expense: row.expenseFormula || (row.expense ? String(row.expense) : ''),
      isSalaryIncome: row.isSalaryIncome,
      transactionGroupId: row.transactionGroupId ? String(row.transactionGroupId) : '',
      transactionSubgroupId: row.transactionSubgroupId ? String(row.transactionSubgroupId) : '',
    });
    setEditingTransactionId(row.transactionId);
    setEditingTemplateId(null);
    setEditingAccountId(null);
    setIsModalOpen(true);
  };

  const startEditAnalyticsTransaction = (transaction: TransactionListItem) => {
    const pendingCategory = pendingAnalyticsCategories[transaction.id];
    setActiveTab(transaction.type === 'transfer' ? 'transfer' : 'transaction');
    setFormData({
      ...initialFormData,
      date: transaction.date.slice(0, 10),
      accountId: transaction.accountId ? String(transaction.accountId) : '',
      sourceAccountId: transaction.sourceAccountId ? String(transaction.sourceAccountId) : '',
      destinationAccountId: transaction.destinationAccountId ? String(transaction.destinationAccountId) : '',
      info: transaction.info,
      income: transaction.incomeFormula || (transaction.income ? String(transaction.income) : ''),
      expense: transaction.expenseFormula || (transaction.expense ? String(transaction.expense) : ''),
      amount: transaction.expense ? String(transaction.expense) : '',
      isSalaryIncome: transaction.isSalaryIncome,
      transactionGroupId: String((pendingCategory ? pendingCategory.groupId : transaction.transactionGroupId) ?? ''),
      transactionSubgroupId: String((pendingCategory ? pendingCategory.subgroupId : transaction.transactionSubgroupId) ?? ''),
    });
    setEditingTransactionId(transaction.id);
    setEditingFromAnalytics(true);
    setEditingTemplateId(null);
    setEditingAccountId(null);
    setIsModalOpen(true);
  };

  const startEditTemplate = (template: RecurringTemplate) => {
    setActiveTab('recurring');
    setFormData({
      ...initialFormData,
      accountId: String(template.accountId),
      info: template.info,
      amount: String(template.amount),
      startDate: String(template.startDate).split('T')[0],
      endDate: template.endDate ? String(template.endDate).split('T')[0] : '',
      frequencyMultiplier: String(template.multiplier || 1),
      frequencyPeriod: template.period,
      dayOfMonth: template.dayOfMonth ? String(template.dayOfMonth) : '',
      transactionGroupId: template.transactionGroupId ? String(template.transactionGroupId) : '',
      transactionSubgroupId: template.transactionSubgroupId ? String(template.transactionSubgroupId) : '',
    });
    setEditingTemplateId(template.id);
    setEditingTransactionId(null);
    setEditingAccountId(null);
    setIsModalOpen(true);
  };

  const startEditAccount = (account: Account) => {
    setActiveTab('account');
    setFormData({
      ...initialFormData,
      accountName: account.name,
      accountTypeId: String(account.accountTypeId),
      initialBalance: String(account.initialBalance),
      includeInDailyBudget: account.includeInDailyBudget,
      creditLimit: account.creditLimit != null ? String(account.creditLimit) : '',
      repaymentAccountId: account.repaymentAccountId != null ? String(account.repaymentAccountId) : '',
      autoRepaymentEnabled: account.autoRepaymentEnabled ?? false,
      autoRepaymentOffsetDays:
        account.autoRepaymentOffsetDays != null ? String(account.autoRepaymentOffsetDays) : '1',
      autoRepaymentGroupId:
        account.autoRepaymentGroupId != null ? String(account.autoRepaymentGroupId) : '',
      autoRepaymentSubgroupId:
        account.autoRepaymentSubgroupId != null ? String(account.autoRepaymentSubgroupId) : '',
    });
    setEditingAccountId(account.id);
    setEditingTransactionId(null);
    setEditingTemplateId(null);
    setIsModalOpen(true);
  };

  const toggleCleared = async (id: number) => {
    try {
      const res = await fetch(`/api/transactions/${id}/toggle-clear`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Toggle failed');
      await fetchData();
    } catch (err) {
      console.error(err);
      setErrorMessage('Nie udało się zmienić statusu Rozl.');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!window.confirm('Czy na pewno usunąć tę transakcję?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchData();
    } catch (err) {
      console.error(err);
      setErrorMessage('Nie udało się usunąć transakcji.');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm('Czy na pewno usunąć ten szablon cykliczny?')) return;
    try {
      const res = await fetch(`/api/recurring-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await fetchData();
    } catch (err) {
      console.error(err);
      setErrorMessage('Nie udało się usunąć szablonu cyklicznego.');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!window.confirm('Czy na pewno usunąć to konto?')) return;
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await getErrorText(res));
      await fetchData();
    } catch (err) {
      console.error(err);
      setErrorMessage('Nie udało się usunąć konta.');
    }
  };

  const accountTypeLabel = (account: Account) => {
    if (account.accountType?.code === 'checking') return t('Rachunek bieżący');
    if (account.accountType?.code === 'savings') return t('Oszczędnościowe');
    if (account.accountType?.code === 'credit_card') return t('Karta kredytowa');
    return account.accountType?.name ?? `${t('Typ')} #${account.accountTypeId}`;
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } finally {
      localStorage.removeItem('projection_auth_token');
      setAuthUser(null);
      setIsDefaultRangeReady(false);
    }
  };

  if (!authReady) return <main className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">{t('Sprawdzanie sesji…')}</main>;
  if (!authUser) return <LoginScreen onLogin={(user) => { setAuthUser(user); setIsDefaultRangeReady(false); }} />;

  if (authUser.role === 'ADMIN') return <AdminPanel
    authUser={authUser} users={managedUsers} errorMessage={errorMessage} successMessage={successMessage}
    form={managedUserForm} setForm={setManagedUserForm} editingUserId={editingManagedUserId}
    isUserModalOpen={isManagedUserModalOpen} setIsUserModalOpen={setIsManagedUserModalOpen}
    passwordUser={passwordUser} setPasswordUser={setPasswordUser} password={managedUserPassword}
    setPassword={setManagedUserPassword}
    onCreateUser={openCreateManagedUser} onEditUser={openEditManagedUser} onExpireUser={expireManagedUser}
    onUpdateUser={updateManagedUser} onSaveUser={saveManagedUser} onSaveUserPassword={saveManagedUserPassword}
    onLogout={logout} onUserUpdated={setAuthUser}
  />;

  return (
    <div className="min-h-screen bg-gray-950 pt-[env(safe-area-inset-top)] text-gray-100">
      <div className="mx-auto max-w-7xl space-y-5 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:space-y-6 sm:p-6">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-4">
          <div className="order-2 col-span-2 flex min-w-0 flex-col gap-2 md:order-none md:col-span-1 md:justify-self-start">
            <div className="text-xs text-gray-400">
              {t(viewMode === 'analytics' ? 'Zakres analizy' : 'Zakres projekcji')}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-[auto_auto_auto]">
              {viewMode === 'analytics' ? (
                <>
                  <input aria-label={t('Data początkowa analizy')} type="date" className="min-w-0 rounded border border-gray-700 bg-gray-800 px-2 py-2 text-sm sm:px-3" value={analyticsStart} max={analyticsEnd || undefined} onChange={(event) => setAnalyticsStart(event.target.value)} />
                  <input aria-label={t('Data końcowa analizy')} type="date" className="min-w-0 rounded border border-gray-700 bg-gray-800 px-2 py-2 text-sm sm:px-3" value={analyticsEnd} min={analyticsStart || undefined} onChange={(event) => setAnalyticsEnd(event.target.value)} />
                  <button type="button" disabled={analyticsLoading} onClick={refreshAnalytics} className="col-span-2 rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 disabled:opacity-60 md:col-span-1 md:px-4">{analyticsLoading ? t('Odświeżanie…') : t('Odśwież')}</button>
                </>
              ) : (
                <>
                  <input aria-label={t('Data początkowa projekcji')} type="date" className="min-w-0 rounded border border-gray-700 bg-gray-800 px-2 py-2 text-sm sm:px-3" value={projectionStart} onChange={(event) => setProjectionStart(event.target.value)} />
                  <input aria-label={t('Data końcowa projekcji')} type="date" className="min-w-0 rounded border border-gray-700 bg-gray-800 px-2 py-2 text-sm sm:px-3" value={projectionEnd} onChange={(event) => setProjectionEnd(event.target.value)} />
                  <button onClick={fetchData} className="rounded bg-blue-600 px-3 py-2 text-sm hover:bg-blue-500 md:px-4" type="button">{t('Odśwież')}</button>
                </>
              )}
              {viewMode !== 'analytics' && (
                <button
                  type="button"
                  aria-pressed={operationDisplayMode === 'window'}
                  onClick={() => setOperationDisplayMode((current) => current === 'window' ? 'full-range' : 'window')}
                  className="rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 md:col-span-3 md:w-fit"
                >
                  {t(operationDisplayMode === 'window' ? 'Widok skrócony' : 'Pełen zakres')}
                </button>
              )}
            </div>
            {viewMode === 'analytics' && analyticsStart && analyticsEnd && analyticsStart > analyticsEnd && (
              <div className="text-sm text-red-300">{t('Data początkowa nie może być późniejsza niż data końcowa.')}</div>
            )}
          </div>

          <h1 className="order-1 min-w-0 text-xl font-bold sm:text-2xl md:order-none md:justify-self-center md:text-3xl">{t('Projekcja finansowa')}</h1>

          <div className="order-1 flex min-w-0 justify-self-end text-sm text-gray-300 md:order-none md:justify-self-end">
            <UserMenu user={authUser} onUserUpdated={setAuthUser} onLogout={logout} />
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-red-300">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-green-300">
            {successMessage}
          </div>
        )}

        <div className="sticky top-[env(safe-area-inset-top)] z-40 -mx-4 grid grid-cols-2 gap-2 border-y border-gray-800 bg-gray-950/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:flex md:items-center md:justify-between md:gap-3 md:py-3">
          <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 md:flex md:flex-wrap">
            <div className="min-w-0 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 md:px-3 md:py-2">
              <div className="truncate text-[11px] text-gray-400 md:text-xs">{t('Saldo bieżące')}</div>
              <div className="truncate text-sm font-semibold md:text-base">
                {formatCurrency(currentTotalBalance ?? 0, 'PLN')}
              </div>
            </div>
            <div className="min-w-0 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 md:px-3 md:py-2">
              <div className="truncate text-[11px] text-gray-400 md:text-xs">
                {t('Prognoza na wypłatę')}{nextSalaryDate ? ` (${formatDisplayDate(nextSalaryDate)})` : ''}
              </div>
              <div className="truncate text-sm font-semibold md:text-base">
                {formatCurrency(salaryTotalBalance, 'PLN')}
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-auto" ref={viewMenuRef}>
            <button
              type="button"
              onClick={() => setIsViewMenuOpen((prev) => !prev)}
              className="w-full truncate rounded border border-gray-700 bg-gray-800 px-2 py-2 text-sm hover:bg-gray-700 md:w-auto md:px-4 md:text-base"
            >
              {t('Widok')}: {t(viewModeLabels[viewMode])} ▾
            </button>

            {isViewMenuOpen && (
              <div className="absolute z-20 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-lg">
                {(Object.keys(viewModeLabels) as ViewMode[]).filter((mode) => mode !== 'users' || authUser.role === 'ADMIN').map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setViewMode(mode);
                      setIsViewMenuOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left hover:bg-gray-800 ${
                      viewMode === mode ? 'text-blue-400' : 'text-gray-100'
                    }`}
                  >
                    {t(viewModeLabels[mode])}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            ref={createMenuRef}
            className="relative flex min-w-0 w-full items-stretch self-stretch md:w-auto md:self-end"
          >
            <button
              type="button"
              onClick={openDefaultOperationModal}
              className="min-w-0 flex-1 truncate rounded-l bg-blue-600 px-2 py-2 text-sm hover:bg-blue-500 md:flex-none md:px-4 md:text-base"
            >
              {t('Nowa operacja')}
            </button>
            <button
              type="button"
              onClick={() => setIsCreateMenuOpen((previous) => !previous)}
              className="rounded-r border-l border-blue-400/40 bg-blue-600 px-2 py-2 hover:bg-blue-500 md:px-3"
              aria-label={t('Pokaż dodatkowe opcje')}
              aria-expanded={isCreateMenuOpen}
              aria-haspopup="menu"
            >
              ▾
            </button>

            {isCreateMenuOpen && (
              <div role="menu" className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-gray-700 bg-gray-900 shadow-lg">
                <button
                  type="button"
                  onClick={() => openCreateModal('transfer')}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-800"
                >
                  {t('Przelew')}
                </button>
                <button
                  type="button"
                  onClick={() => openCreateModal('recurring')}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-800"
                >
                  {t('Cykliczne')}
                </button>
                <button
                  type="button"
                  onClick={() => openCreateModal('account')}
                  className="block w-full px-4 py-2 text-left hover:bg-gray-800"
                >
                  {t('Konto')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 sm:p-4">
            <button
              type="button"
              onClick={() => setIsAccountListOpen((prev) => !prev)}
              className="block w-full cursor-pointer text-left"
            >
              <h3 className="text-sm text-gray-400">{t('Saldo całkowite')}</h3>
              <p className="text-xl font-bold sm:text-2xl">{formatCurrency(currentTotalBalance ?? 0, 'PLN')}</p>
            </button>

            {isAccountListOpen && (
              <div className="mt-2 space-y-1 border-t border-gray-700 pt-2">
                {accounts.map((acc) => {
                  const balance = Number((balances as any)?.[acc.id] ?? 0);
                  const isCreditCard = acc.accountType?.code === 'credit_card';
                  const creditLimit = Number(acc.creditLimit ?? 0);
                  const availableCredit = Math.max(0, Math.min(creditLimit, creditLimit + balance));
                  const isCreditCardExpanded = expandedCreditCardId === acc.id;

                  return (
                    <div key={acc.id} className="rounded py-1 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex min-w-0 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedCurrentBalanceAccountIds.includes(acc.id)}
                            onChange={() =>
                              toggleAccountSelection(
                                acc.id,
                                selectedCurrentBalanceAccountIds,
                                setSelectedCurrentBalanceAccountIds
                              )
                            }
                          />
                          <span className="truncate text-gray-400">{acc.name}</span>
                        </label>

                        {isCreditCard ? (
                          <button
                            type="button"
                            onClick={() => setExpandedCreditCardId(isCreditCardExpanded ? null : acc.id)}
                            className="shrink-0 rounded px-1 hover:bg-gray-700"
                            title={t('Pokaż limit karty')}
                          >
                            {formatCurrency(balance, 'PLN')}
                          </button>
                        ) : (
                          <span className="shrink-0">{formatCurrency(balance, 'PLN')}</span>
                        )}
                      </div>

                      {isCreditCardExpanded && acc.creditLimit != null && (
                        <div className="ml-6 mt-1 flex items-center justify-between text-xs text-gray-400">
                          <span>{t('dostępny limit')}:</span>
                          <span className="font-medium text-emerald-400">{formatCurrency(availableCredit, 'PLN')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 p-3 sm:p-4"
            onClick={() => setIsSalaryCardExpanded((prev) => !prev)}
          >
            <h3 className="text-sm text-gray-400">{t('Saldo na dzień następnej wypłaty')}</h3>
            <p className="text-xl font-bold sm:text-2xl">{formatCurrency(salaryTotalBalance, 'PLN')}</p>

            {isSalaryCardExpanded && (
              <div className="mt-3 space-y-2 border-t border-gray-700 pt-3 text-sm">
                {salaryPerAccount.length > 0 ? (
                  salaryPerAccount.map((item) => (
                    <label key={item.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedSalaryBalanceAccountIds.includes(item.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleAccountSelection(
                              item.id,
                              selectedSalaryBalanceAccountIds,
                              setSelectedSalaryBalanceAccountIds
                            );
                          }}
                        />
                        <span className="text-gray-300">{item.name}</span>
                      </div>

                      <span className="font-medium">{formatCurrency(item.balance, 'PLN')}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-gray-400">{t('Brak danych per konto dla dnia wypłaty.')}</div>
                )}
              </div>
            )}
          </div>

          <div
            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 p-3 sm:p-4"
            onClick={() => setIsBudgetCardExpanded((prev) => !prev)}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-sm text-gray-400">{t('Nad / pod kreską')}</h3>
              <p className={`text-xl font-bold sm:text-2xl ${varianceColorClass}`}>{formatCurrency(variance, 'PLN')}</p>
            </div>

            <div className="mt-3 border-t border-gray-700 pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{t('Dostępny budżet dzienny')}</span>
                <span className={`font-semibold ${availableBudgetColorClass}`}>
                  {formatCurrency(availableDailyBudget, 'PLN')}
                </span>
              </div>
            </div>

            {isBudgetCardExpanded && (
              <div
                className="mt-3 space-y-3 border-t border-gray-700 pt-3 text-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">{t('Liczba dni do wypłaty')}</span>
                  <span>{daysToSalary}</span>
                </div>

                <div className="space-y-2">
                  <div className="text-gray-300">{t('Następna wypłata')}</div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="w-full rounded bg-gray-700 px-3 py-2"
                      value={manualNextSalaryDateInput}
                      onChange={(e) => setManualNextSalaryDateInput(e.target.value)}
                    />
                    <button
                      onClick={saveManualNextSalaryDate}
                      type="button"
                      className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500"
                    >
                      Zapisz
                    </button>
                  </div>
                  <div className="text-xs text-gray-400">Aktualnie: {formatDisplayDate(nextSalaryDate)}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-gray-300">{t('Zadeklarowany budżet dzienny')}</div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded bg-gray-700 px-3 py-2"
                      value={dailyBudgetInput}
                      onChange={(e) => setDailyBudgetInput(e.target.value)}
                    />
                    <button
                      onClick={saveDailyBudget}
                      type="button"
                      className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500"
                    >
                      Zapisz
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {viewMode !== 'analytics' && <div className="text-sm text-gray-400">
          {operationDisplayMode === 'window'
            ? `Widoczne operacje: ostatnie ${PAST_DAYS_VISIBLE} dni i najbliższe ${FUTURE_DAYS_VISIBLE} dni.`
            : `Widoczne operacje z pełnego zakresu projekcji: ${projectionStart} -> ${projectionEnd}.`}
        </div>}

          {viewMode === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <div className="text-sm text-gray-400">{t('Wpływy')}</div>
                  <div className="mt-2 text-2xl font-bold text-green-400">
                    {formatCurrency(analyticsSummary.totalIncome, 'PLN')}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <div className="text-sm text-gray-400">{t('Wydatki')}</div>
                  <div className="mt-2 text-2xl font-bold text-red-400">
                    {formatCurrency(analyticsSummary.totalExpense, 'PLN')}
                  </div>
                </div>
          
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <div className="text-sm text-gray-400">{t('Bilans')}</div>
                  <div
                    className={`mt-2 text-2xl font-bold ${
                      analyticsSummary.balance >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatCurrency(analyticsSummary.balance, 'PLN')}
                  </div>
                </div>

                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <div className="text-sm text-gray-400">{t('Wpływy z wypłat')}</div>
                  <div className="mt-2 text-2xl font-bold text-emerald-300">
                    {formatCurrency(analyticsSummary.salaryIncome, 'PLN')}
                  </div>
                </div>
              </div>


              <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{analyticsBreakdownMode === 'group' ? t('Wydatki wg grup') : t('Wydatki wg kont')}</h3>
                    {((analyticsBreakdownMode === 'group' && selectedAnalyticsGroup) || (analyticsBreakdownMode === 'account' && selectedAnalyticsAccount)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAnalyticsGroup(null);
                        setSelectedAnalyticsSubgroup(null);
                        setSelectedAnalyticsAccount(null);
                      }}
                      className="rounded border border-gray-600 px-3 py-1 text-sm hover:bg-gray-700"
                    >
                      {t('Wyczyść wybór')}
                    </button>
                    )}
                  </div>
                  <div className="inline-flex self-start rounded border border-gray-600 bg-gray-900 p-1">
                    <button type="button" onClick={() => { setAnalyticsBreakdownMode('group'); setSelectedAnalyticsAccount(null); }} className={`rounded px-3 py-1.5 text-sm ${analyticsBreakdownMode === 'group' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>{t('Grupa')}</button>
                    <button type="button" onClick={() => { setAnalyticsBreakdownMode('account'); setSelectedAnalyticsGroup(null); setSelectedAnalyticsSubgroup(null); }} className={`rounded px-3 py-1.5 text-sm ${analyticsBreakdownMode === 'account' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>{t('Konto')}</button>
                  </div>
                </div>

                {(analyticsBreakdownMode === 'group' ? expensesByGroup : expensesByAccount).length > 0 ? (
                  <PieDonutChart
                    data={analyticsBreakdownMode === 'group' ? expensesByGroup : expensesByAccount}
                    total={analyticsBreakdownMode === 'group' ? totalGroupExpenses : totalAccountExpenses}
                    selectedName={analyticsBreakdownMode === 'group' ? selectedAnalyticsGroup : selectedAnalyticsAccount}
                    onSelect={(name) => {
                      if (analyticsBreakdownMode === 'group') {
                        setSelectedAnalyticsGroup((previous) => (previous === name ? null : name));
                        setSelectedAnalyticsSubgroup(null);
                      } else {
                        setSelectedAnalyticsAccount((previous) => (previous === name ? null : name));
                      }
                    }}
                  />
                ) : (
                  <div className="text-sm text-gray-400">{t('Brak wydatków w wybranym zakresie.')}</div>
                )}
              </section>

              {analyticsBreakdownMode === 'group' && <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">
                    {selectedAnalyticsGroup
                      ? `${t('Podgrupy')}: ${selectedAnalyticsGroup}`
                      : t('Podgrupy kosztów')}
                  </h3>
                  {selectedAnalyticsGroup && (
                    <div className="text-sm text-gray-400">
                      {t('Szczegóły dla wybranej grupy')}
                    </div>
                  )}
                </div>

                {selectedAnalyticsGroup ? (
                  expensesBySelectedGroupSubgroup.length > 0 ? (
                    <PieDonutChart
                      data={expensesBySelectedGroupSubgroup}
                      total={totalSelectedGroupExpenses}
                      selectedName={selectedAnalyticsSubgroup}
                      onSelect={(name) => setSelectedAnalyticsSubgroup((previous) => previous === name ? null : name)}
                    />
                  ) : (
                    <div className="text-sm text-gray-400">
                      {t('Brak danych o podgrupach dla tej grupy.')}
                    </div>
                  )
                ) : (
                  <div className="text-sm text-gray-400">
                    {t('Kliknij grupę na wykresie powyżej, aby zobaczyć rozbicie na podgrupy.')}
                  </div>
                )}
              </section>}

              {((analyticsBreakdownMode === 'group' && selectedAnalyticsSubgroup) || (analyticsBreakdownMode === 'account' && selectedAnalyticsAccount)) && (
                <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{analyticsBreakdownMode === 'group' ? `${t('Operacje w podgrupie')}: ${selectedAnalyticsSubgroup}` : `${t('Operacje na koncie')}: ${selectedAnalyticsAccount}`}</h3>
                    <p className="mt-1 text-sm text-gray-400">{t('Zmiany kategorii zostaną uwzględnione na wykresach po odświeżeniu analityki.')}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-sm">
                      <thead><tr className="border-b border-gray-700 text-gray-400">
                        <th className="p-2 text-left">{t('Data')}</th>
                        <th className="p-2 text-left">{t('Konto')}</th>
                        <th className="p-2 text-left">{t('Nazwa operacji')}</th>
                        <th className="p-2 text-right">{t('Kwota')}</th>
                        <th className="p-2 text-left">{t('Grupa')}</th>
                        <th className="p-2 text-left">{t('Podgrupa')}</th>
                      </tr></thead>
                      <tbody>
                        {selectedDetailTransactions.map((transaction) => {
                          const pending = pendingAnalyticsCategories[transaction.id];
                          const groupId = (pending ? pending.groupId : transaction.transactionGroupId) ?? null;
                          const subgroupId = (pending ? pending.subgroupId : transaction.transactionSubgroupId) ?? null;
                          const selectedGroup = transactionGroups.find((group) => group.id === groupId);
                          const accountName = accounts.find((account) => account.id === transaction.accountId)?.name ?? `${t('Konto')} #${transaction.accountId ?? '—'}`;
                          return <tr key={transaction.id} onClick={() => startEditAnalyticsTransaction(transaction)} className="cursor-pointer border-b border-gray-700/60 hover:bg-gray-700/70">
                            <td className="whitespace-nowrap p-2">{formatDisplayDate(transaction.date)}</td>
                            <td className="p-2">{accountName}</td>
                            <td className="p-2">{transaction.info}</td>
                            <td className="whitespace-nowrap p-2 text-right font-mono">{formatCurrency(Number(transaction.expense || 0), 'PLN')}</td>
                            <td className="p-2" onClick={(event) => event.stopPropagation()}>
                              <select value={groupId ?? ''} onChange={(event) => updateAnalyticsCategory(transaction, event.target.value ? Number(event.target.value) : null, null)} className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5">
                                <option value="">{t('Bez grupy')}</option>
                                {transactionGroups.filter((group) => group.isActive).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                              </select>
                            </td>
                            <td className="p-2" onClick={(event) => event.stopPropagation()}>
                              <select disabled={!groupId} value={subgroupId ?? ''} onChange={(event) => updateAnalyticsCategory(transaction, groupId, event.target.value ? Number(event.target.value) : null)} className="w-full rounded border border-gray-600 bg-gray-900 px-2 py-1.5 disabled:opacity-50">
                                <option value="">{groupId ? t('Bez podgrupy') : t('Najpierw wybierz grupę')}</option>
                                {(selectedGroup?.subgroups ?? []).filter((subgroup) => subgroup.isActive).map((subgroup) => <option key={subgroup.id} value={subgroup.id}>{subgroup.name}</option>)}
                              </select>
                            </td>
                          </tr>;
                        })}
                        {selectedDetailTransactions.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">{analyticsBreakdownMode === 'group' ? t('Brak operacji w wybranej podgrupie.') : t('Brak operacji dla wybranego konta.')}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                <h3 className="mb-4 text-lg font-semibold">{t('Top podgrupy kosztów')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                        <th className="p-2 text-left">{t('Podgrupa')}</th>
                        <th className="p-2 text-right">{t('Kwota')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensesBySubgroup.length > 0 ? (
                        expensesBySubgroup.map((item) => (
                          <tr key={item.name} className="border-b border-gray-700/60">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-right font-mono">{formatCurrency(item.amount, 'PLN')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="p-4 text-center text-gray-400">
                            {t('Brak danych o podgrupach.')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                <h3 className="mb-4 text-lg font-semibold">{t('Miesięczny przepływ')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400">
                        <th className="p-2 text-left">{t('Miesiąc')}</th>
                        <th className="p-2 text-right">{t('Wpływy')}</th>
                        <th className="p-2 text-right">{t('Wydatki')}</th>
                        <th className="p-2 text-right">{t('Bilans')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyFlow.length > 0 ? (
                        monthlyFlow.map((item) => (
                          <tr key={item.month} className="border-b border-gray-700/60">
                            <td className="p-2">{formatDisplayMonth(item.month)}</td>
                            <td className="p-2 text-right text-green-400">{formatCurrency(item.income, 'PLN')}</td>
                            <td className="p-2 text-right text-red-400">{formatCurrency(item.expense, 'PLN')}</td>
                            <td
                              className={`p-2 text-right font-semibold ${
                                item.net >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {formatCurrency(item.net, 'PLN')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-gray-400">
                            {t('Brak danych miesięcznych w wybranym zakresie.')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                <h3 className="mb-4 text-lg font-semibold">{t('Dzienny trend wydatków')}</h3>
                <div className="space-y-2">
                  {dailyExpenseTrend.length > 0 ? (
                    dailyExpenseTrend.map((item) => (
                      <div key={item.date} className="grid grid-cols-[120px_1fr_140px] items-center gap-3">
                        <div className="text-sm text-gray-300">{formatDisplayDate(item.date)}</div>
                        <AnalyticsBar
                          value={item.amount}
                          max={Math.max(...dailyExpenseTrend.map((d) => d.amount))}
                          colorClass="bg-orange-500"
                        />
                        <div className="text-right font-mono text-sm">{formatCurrency(item.amount, 'PLN')}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400">{t('Brak dziennych wydatków w wybranym zakresie.')}</div>
                  )}
                </div>
              </section>
            </div>
	      )}
		  
          {viewMode === 'categories' ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openCreateGroupModal}
                  className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500"
                >
                  Dodaj grupę
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={showInactiveCategories}
                  onChange={(e) => setShowInactiveCategories(e.target.checked)}
                />
                Pokaż nieaktywne
              </label>
            </div>
			
			<div className="space-y-4">
			  {categoryGroups.map((group) => (
			    <div key={group.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
	              <div>
				    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{group.name}</h3>
                        <span className="rounded border border-gray-600 px-2 py-1 text-xs text-gray-300">
                          {group.code}
                        </span>
                        <span className={`rounded px-2 py-1 text-xs ${group.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                          {group.isActive ? 'Aktywna' : 'Nieaktywna'}
                        </span>					  
                        {group.isSystem && (
                          <span className="rounded bg-purple-900 px-2 py-1 text-xs text-purple-300">
                            Systemowa
                          </span>
                        )}
					</div>
                    <div className="mt-1 text-sm text-gray-400">Sortowanie: {group.sortOrder ?? 0}</div>					
                  </div>
                  <div className="flex flex-wrap gap-2">
				    <button
                      type="button"
                      onClick={() => openCreateSubgroupModal(group.id)}
                      className="rounded border border-gray-600 px-3 py-2 hover:bg-gray-700"
                      disabled={!group.isActive}
                    >
                      Dodaj podgrupę
                    </button>
					
					{!group.isSystem && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditGroupModal(group)}
                          className="rounded border border-gray-600 px-3 py-2 hover:bg-gray-700"
                        >
                          Edytuj
                        </button>
                        {group.isActive && (
                          <button
                            type="button"
                            onClick={() => deactivateGroup(group.id)}
                            className="rounded border border-red-800 px-3 py-2 text-red-300 hover:bg-red-950"
                          >
                            Dezaktywuj
                          </button>
                        )}
                      </>
                    )}
				  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-gray-400">
                          <th className="p-2 text-left">Podgrupa</th>
                          <th className="p-2 text-left">Kod</th>
                          <th className="p-2 text-left">Sort.</th>
                          <th className="p-2 text-left">Status</th>
                          <th className="p-2 text-left">Typ</th>
                          <th className="p-2 text-left">Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.subgroups.length > 0 ? (
                          group.subgroups.map((subgroup) => (
                            <tr key={subgroup.id} className="border-b border-gray-700/60">
                              <td className="p-2">{subgroup.name}</td>
                              <td className="p-2 text-gray-300">{subgroup.code}</td>
                              <td className="p-2">{subgroup.sortOrder ?? 0}</td>
                              <td className="p-2">{subgroup.isActive ? 'Aktywna' : 'Nieaktywna'}</td>
                              <td className="p-2">{subgroup.isSystem ? 'Systemowa' : 'Użytkownika'}</td>
                              <td className="p-2">
                                <div className="flex flex-wrap gap-2">
                                  {!subgroup.isSystem && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openEditSubgroupModal(group.id, subgroup)}
                                        className="rounded border border-gray-600 px-3 py-1 hover:bg-gray-700"
                                      >
                                        Edytuj
                                      </button>
                                      {subgroup.isActive && (
                                        <button
                                          type="button"
                                          onClick={() => deactivateSubgroup(subgroup.id)}
                                          className="rounded border border-red-800 px-3 py-1 text-red-300 hover:bg-red-950"
                                        >
                                          Dezaktywuj
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-3 text-center text-gray-400">
                              Brak podgrup w tej grupie.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>		   
				</div>
			  ))}

              {categoryGroups.length === 0 && (
                <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-gray-400">
                  Brak kategorii do wyświetlenia.
                </div>
              )}

			</div>
		</div>
        ) : viewMode === 'users' ? (
          <section className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Użytkownicy</h2><p className="text-sm text-gray-400">Administrator nie ma dostępu do danych finansowych innych użytkowników.</p></div><button type="button" onClick={openCreateManagedUser} className="rounded bg-blue-600 px-3 py-2 hover:bg-blue-500">Dodaj użytkownika</button></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-gray-700 text-gray-400"><tr><th className="p-2">Nazwa</th><th className="p-2">Rola</th><th className="p-2">Status</th><th className="p-2">Akcje</th></tr></thead><tbody>{managedUsers.map((user) => <tr key={user.id} className="border-b border-gray-700/60"><td className="p-2">{user.username}</td><td className="p-2">{user.role === 'ADMIN' ? 'Administrator' : 'Użytkownik'}</td><td className="p-2">{user.isActive ? 'Aktywny' : 'Zablokowany'}</td><td className="flex flex-wrap gap-2 p-2"><button type="button" onClick={() => updateManagedUser(user.id, { isActive: !user.isActive })} className="rounded border border-gray-600 px-2 py-1">{user.isActive ? 'Zablokuj' : 'Odblokuj'}</button><button type="button" onClick={() => { const password = window.prompt(`Nowe hasło dla ${user.username}:`); if (password) updateManagedUser(user.id, { password }); }} className="rounded border border-gray-600 px-2 py-1">Ustaw hasło</button></td></tr>)}</tbody></table></div>
          </section>
        ) : (
        <>
        {viewMode === 'transactions' && (
          <div className="space-y-3 md:hidden">
            {tableOperationRows.length > 0 ? (
              tableOperationRows.map(({ row, transferRows }) => {
                const transferOut = transferRows?.find((item) => item.transferSide === 'out');
                const transferIn = transferRows?.find((item) => item.transferSide === 'in');
                const isTransfer = Boolean(transferRows);

                return (
                  <article
                    key={transferRows ? `mobile-transfer-${row.transactionId}` : `mobile-${row.rowId}`}
                    ref={row.transactionId === lastClearedTransactionId ? lastClearedMobileRef : undefined}
                    onClick={() => startEditRow(row)}
                    className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 p-4 active:bg-gray-700/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-400">{formatDisplayDate(row.date)}</div>
                        <div className="mt-1 break-words text-lg leading-snug">{getOperationDisplayInfo(row)}</div>
                        <div className="mt-1 text-sm text-blue-300">
                          {isTransfer ? 'Przelew' : row.accountName}
                          {row.isRecurringGenerated && !isTransfer ? ' · cyklicznie' : ''}
                          {row.isSalaryIncome ? ' · wypłata' : ''}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton title="Edytuj" colorClass="text-blue-400" onClick={(e) => { e.stopPropagation(); startEditRow(row); }}><EditIcon /></IconButton>
                        <IconButton title="Usuń" colorClass="text-red-400" onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(row.transactionId); }}><DeleteIcon /></IconButton>
                      </div>
                    </div>

                    {isTransfer ? (
                      <div className="mt-3 space-y-1 border-t border-gray-700 pt-3 text-sm">
                        {transferOut && <div className="flex justify-between gap-3 text-red-300"><span>− {transferOut.accountName}</span><span className="font-mono">{formatCurrency(transferOut.expense, 'PLN')}</span></div>}
                        {transferIn && <div className="flex justify-between gap-3 text-green-300"><span>+ {transferIn.accountName}</span><span className="font-mono">{formatCurrency(transferIn.income, 'PLN')}</span></div>}
                      </div>
                    ) : (
                      <div className="mt-3 flex items-end justify-between gap-3 border-t border-gray-700 pt-3">
                        <div className="text-sm text-gray-400">Saldo konta: {row.accountBalanceAfter !== null ? formatCurrency(row.accountBalanceAfter, 'PLN') : '—'}</div>
                        <div className={`shrink-0 font-mono text-lg ${row.income ? 'text-green-400' : 'text-red-400'}`}>
                          {row.income ? `+ ${formatCurrency(row.income, 'PLN')}` : `− ${formatCurrency(row.expense, 'PLN')}`}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-gray-700 pt-3 text-xs text-gray-400">
                      <span>Saldo całkowite: {formatCurrency(row.totalBalanceAfter, 'PLN')}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCleared(row.transactionId); }}
                        className={`rounded px-2 py-1 ${row.isCleared ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-300'}`}
                        type="button"
                      >
                        {row.isCleared ? 'Rozliczona' : 'Nierozliczona'}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-center text-gray-400">Brak operacji w widocznym zakresie dat.</div>
            )}
          </div>
        )}
        {(viewMode === 'transactions' || viewMode === 'recurring' || viewMode === 'accounts') && <div className={`${viewMode === 'transactions' ? 'hidden md:block ' : ''}overflow-x-auto rounded-lg border border-gray-700 bg-gray-800`}>
          <table className="w-full text-center">
            <thead className="border-b border-gray-700">
              <tr>
                {viewMode === 'transactions' ? (
                  <>
                    <th className="p-4 text-left text-gray-400 align-top relative">
                      <button
                        type="button"
                        data-filter-button
                        className="inline-flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-100 hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterMenu((prev) => (prev === 'date' ? null : 'date'));
                        }}
                      >
                        Data
                        <span className="text-gray-400">▾</span>
                      </button>
                      {openFilterMenu === 'date' && (
                        <div data-filter-menu className="absolute left-0 top-full z-30 mt-2 w-72 rounded border border-gray-700 bg-gray-900 p-3 shadow-lg">
                          <div className="mb-2 flex items-center justify-between text-sm text-gray-200">
                            <span>Filtruj Data</span>
                            <button
                              type="button"
                              className="text-blue-400 hover:text-blue-300"
                              onClick={() =>
                                setTransactionFilters((prev) => ({
                                  ...prev,
                                  date: [],
                                }))
                              }
                            >
                              Wyczyść
                            </button>
                          </div>
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                            <label className="flex items-center gap-2 text-sm text-gray-100">
                              <input
                                type="checkbox"
                                checked={transactionFilters.date.length === dateFilterOptions.length}
                                onChange={(e) =>
                                  setTransactionFilters((prev) => ({
                                    ...prev,
                                    date: e.target.checked ? [...dateFilterOptions] : [],
                                  }))
                                }
                              />
                              Wszystkie
                            </label>
                            {dateFilterOptions.map((value) => (
                              <label key={value} className="flex items-center gap-2 text-sm text-gray-100">
                                <input
                                  type="checkbox"
                                  checked={transactionFilters.date.includes(value)}
                                  onChange={() =>
                                    setTransactionFilters((prev) => {
                                      const values = prev.date.includes(value)
                                        ? prev.date.filter((item) => item !== value)
                                        : [...prev.date, value];
                                      return { ...prev, date: values };
                                    })
                                  }
                                />
                                <span>{value}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="p-4 text-left text-gray-400 align-top relative">
                      <button
                        type="button"
                        data-filter-button
                        className="inline-flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-100 hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterMenu((prev) => (prev === 'account' ? null : 'account'));
                        }}
                      >
                        Konto
                        <span className="text-gray-400">▾</span>
                      </button>
                      {openFilterMenu === 'account' && (
                        <div data-filter-menu className="absolute left-0 top-full z-30 mt-2 w-72 rounded border border-gray-700 bg-gray-900 p-3 shadow-lg">
                          <div className="mb-2 flex items-center justify-between text-sm text-gray-200">
                            <span>Filtruj Konto</span>
                            <button
                              type="button"
                              className="text-blue-400 hover:text-blue-300"
                              onClick={() =>
                                setTransactionFilters((prev) => ({
                                  ...prev,
                                  account: [],
                                }))
                              }
                            >
                              Wyczyść
                            </button>
                          </div>
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                            <label className="flex items-center gap-2 text-sm text-gray-100">
                              <input
                                type="checkbox"
                                checked={transactionFilters.account.length === accountFilterOptions.length}
                                onChange={(e) =>
                                  setTransactionFilters((prev) => ({
                                    ...prev,
                                    account: e.target.checked ? [...accountFilterOptions] : [],
                                  }))
                                }
                              />
                              Wszystkie
                            </label>
                            {accountFilterOptions.map((value) => (
                              <label key={value} className="flex items-center gap-2 text-sm text-gray-100">
                                <input
                                  type="checkbox"
                                  checked={transactionFilters.account.includes(value)}
                                  onChange={() =>
                                    setTransactionFilters((prev) => {
                                      const values = prev.account.includes(value)
                                        ? prev.account.filter((item) => item !== value)
                                        : [...prev.account, value];
                                      return { ...prev, account: values };
                                    })
                                  }
                                />
                                <span>{value}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="p-4 text-left text-gray-400 align-top relative">
                      <button
                        type="button"
                        data-filter-button
                        className="inline-flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-100 hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterMenu((prev) => (prev === 'info' ? null : 'info'));
                        }}
                      >
                        Info
                        <span className="text-gray-400">▾</span>
                      </button>
                      {openFilterMenu === 'info' && (
                        <div data-filter-menu className="absolute left-0 top-full z-30 mt-2 w-80 rounded border border-gray-700 bg-gray-900 p-3 shadow-lg">
                          <div className="mb-2 flex items-center justify-between text-sm text-gray-200">
                            <span>Filtruj Info</span>
                            <button
                              type="button"
                              className="text-blue-400 hover:text-blue-300"
                              onClick={() =>
                                setTransactionFilters((prev) => ({
                                  ...prev,
                                  info: [],
                                }))
                              }
                            >
                              Wyczyść
                            </button>
                          </div>
                          <div className="max-h-64 space-y-2 overflow-y-auto">
                            <label className="flex items-center gap-2 text-sm text-gray-100">
                              <input
                                type="checkbox"
                                checked={transactionFilters.info.length === infoFilterOptions.length}
                                onChange={(e) =>
                                  setTransactionFilters((prev) => ({
                                    ...prev,
                                    info: e.target.checked ? [...infoFilterOptions] : [],
                                  }))
                                }
                              />
                              Wszystkie
                            </label>
                            {infoFilterOptions.map((value) => (
                              <label key={value} className="flex items-center gap-2 text-sm text-gray-100">
                                <input
                                  type="checkbox"
                                  checked={transactionFilters.info.includes(value)}
                                  onChange={() =>
                                    setTransactionFilters((prev) => {
                                      const values = prev.info.includes(value)
                                        ? prev.info.filter((item) => item !== value)
                                        : [...prev.info, value];
                                      return { ...prev, info: values };
                                    })
                                  }
                                />
                                <span>{value}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="p-4 text-gray-400">Wpłata</th>
                    <th className="p-4 text-gray-400">Wypłata</th>
                    <th className="p-4 text-gray-400">Saldo konta</th>
                    <th className="p-4 text-gray-400">Saldo całkowite</th>
                    <th className="p-4 text-left text-gray-400 align-top relative">
                      <button
                        type="button"
                        data-filter-button
                        className="inline-flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-3 py-1 text-sm text-gray-100 hover:bg-gray-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterMenu((prev) => (prev === 'cleared' ? null : 'cleared'));
                        }}
                      >
                        Rozl.
                        <span className="text-gray-400">▾</span>
                      </button>
                      {openFilterMenu === 'cleared' && (
                        <div data-filter-menu className="absolute left-0 top-full z-30 mt-2 w-60 rounded border border-gray-700 bg-gray-900 p-3 shadow-lg">
                          <div className="mb-2 flex items-center justify-between text-sm text-gray-200">
                            <span>Filtruj Rozl.</span>
                            <button
                              type="button"
                              className="text-blue-400 hover:text-blue-300"
                              onClick={() =>
                                setTransactionFilters((prev) => ({
                                  ...prev,
                                  cleared: '',
                                }))
                              }
                            >
                              Wyczyść
                            </button>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-100">
                              <input
                                type="radio"
                                name="cleared-filter"
                                value=""
                                checked={transactionFilters.cleared === ''}
                                onChange={() =>
                                  setTransactionFilters((prev) => ({
                                    ...prev,
                                    cleared: '',
                                  }))
                                }
                              />
                              Wszystkie
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-100">
                              <input
                                type="radio"
                                name="cleared-filter"
                                value="ok"
                                checked={transactionFilters.cleared === 'ok'}
                                onChange={() =>
                                  setTransactionFilters((prev) => ({
                                    ...prev,
                                    cleared: 'ok',
                                  }))
                                }
                              />
                              OK
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-100">
                              <input
                                type="radio"
                                name="cleared-filter"
                                value="nie"
                                checked={transactionFilters.cleared === 'nie'}
                                onChange={() =>
                                  setTransactionFilters((prev) => ({
                                    ...prev,
                                    cleared: 'nie',
                                  }))
                                }
                              />
                              Nie
                            </label>
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="p-4 text-gray-400">Akcje</th>
                  </>
                ) : viewMode === 'recurring' ? (
                  <>
                    <th className="p-4 text-gray-400">Info</th>
                    <th className="p-4 text-gray-400">Konto</th>
                    <th className="p-4 text-gray-400">Kwota</th>
                    <th className="p-4 text-gray-400">Start</th>
                    <th className="p-4 text-gray-400">Koniec</th>
                    <th className="p-4 text-gray-400">Częstotliwość</th>
                    <th className="p-4 text-gray-400">Akcje</th>
                  </>
                ) : viewMode === 'accounts' ? (
                  <>
                    <th className="p-4 align-middle text-gray-400">Nazwa</th>
                    <th className="p-4 align-middle text-gray-400">Typ</th>
                    <th className="p-4 align-middle text-gray-400">Saldo początkowe</th>
                    <th className="p-4 align-middle text-gray-400">Limit</th>
                    <th className="p-4 align-middle text-gray-400">Konto spłaty</th>
                    <th className="p-4 align-middle text-gray-400">Auto-spłata</th>
                    <th className="p-4 align-middle text-gray-400">W budżecie</th>
                    <th className="p-4 text-center text-gray-400">Akcje</th>
                  </>
                ) : null}
              </tr>
            </thead>

            <tbody>
              {viewMode === 'transactions' ? (
                tableOperationRows.length > 0 ? (
                  tableOperationRows.map(({ row, transferRows }) => {
                    const transferOut = transferRows?.find((item) => item.transferSide === 'out');
                    const transferIn = transferRows?.find((item) => item.transferSide === 'in');

                    return (
                    <tr
                      key={transferRows ? `transfer-${row.transactionId}` : row.rowId}
                      ref={row.transactionId === lastClearedTransactionId ? lastClearedDesktopRef : undefined}
                      className="cursor-pointer border-b border-gray-700 hover:bg-gray-700/40"
                      onClick={() => startEditRow(row)}
                    >
                      <td className="p-4 align-middle">{row.date}</td>
                      <td className="p-4 align-middle">
                        {transferRows ? (
                          <div className="space-y-0 text-left text-xs leading-3">
                            {transferOut && (
                              <div className="flex items-center gap-1 whitespace-nowrap text-red-300">
                                <span className="text-xs">−</span>
                                <span>{transferOut.accountName}</span>
                              </div>
                            )}
                            {transferIn && (
                              <div className="flex items-center gap-1 whitespace-nowrap text-green-300">
                                <span className="text-xs">+</span>
                                <span>{transferIn.accountName}</span>
                              </div>
                            )}
                          </div>
                        ) : row.accountName}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <span>
                            {getOperationDisplayInfo(row)}
                            {transferRows && <span className="ml-1 text-xs text-blue-300">· przelew</span>}
                          </span>
                          {row.isRecurringGenerated && !transferRows && (
                            <span className="text-xs text-purple-300">wygenerowane cyklicznie</span>
                          )}
                          {row.isSalaryIncome && (
                            <span className="text-xs text-emerald-300">wypłata</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-green-400">
                        {transferRows
                          ? transferIn?.income ? formatCurrency(transferIn.income, 'PLN') : ''
                          : row.income ? <span title={row.incomeFormula || undefined}>{formatCurrency(row.income, 'PLN')}{row.incomeFormula && <span className="ml-1 text-xs text-gray-400">({row.incomeFormula})</span>}</span> : ''}
                      </td>
                      <td className="p-4 align-middle text-red-400">
                        {transferRows
                          ? transferOut?.expense ? formatCurrency(transferOut.expense, 'PLN') : ''
                          : row.expense ? <span title={row.expenseFormula || undefined}>{formatCurrency(row.expense, 'PLN')}{row.expenseFormula && <span className="ml-1 text-xs text-gray-400">({row.expenseFormula})</span>}</span> : ''}
                      </td>
                      <td className="p-4 align-middle font-mono">
                        {transferRows ? (
                          <div className="space-y-0 whitespace-nowrap text-right text-xs leading-3">
                            {transferOut && (
                              <div className="text-red-200">
                                {transferOut.accountBalanceAfter !== null
                                  ? formatCurrency(transferOut.accountBalanceAfter, 'PLN')
                                  : ''}
                              </div>
                            )}
                            {transferIn && (
                              <div className="text-green-200">
                                {transferIn.accountBalanceAfter !== null
                                  ? formatCurrency(transferIn.accountBalanceAfter, 'PLN')
                                  : ''}
                              </div>
                            )}
                          </div>
                        ) : row.accountBalanceAfter !== null ? formatCurrency(row.accountBalanceAfter, 'PLN') : ''}
                      </td>
                      <td className="p-4 align-middle font-mono">
                        {formatCurrency(row.totalBalanceAfter, 'PLN')}
                      </td>
                      <td className="p-4 align-middle">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCleared(row.transactionId);
                          }}
                          className={`rounded px-2 py-1 text-xs ${
                            row.isCleared
                              ? 'bg-green-700 text-green-100'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                          type="button"
                        >
                          {row.isCleared ? 'OK' : 'Nie'}
                        </button>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex justify-center gap-2">
                          <IconButton
                            title="Edytuj"
                            colorClass="text-blue-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditRow(row);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            title="Usuń"
                            colorClass="text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTransaction(row.transactionId);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="p-4 text-center text-gray-400">
                      Brak operacji w widocznym zakresie dat.
                    </td>
                  </tr>
                )
              ) : viewMode === 'recurring' ? (
                templates.length > 0 ? (
                  templates.map((t) => (
                    <tr
                      key={t.id}
                      className="cursor-pointer border-b border-gray-700 hover:bg-gray-700"
                      onClick={() => startEditTemplate(t)}
                    >
                      <td className="p-4 align-middle">{t.info}</td>
                      <td className="p-4 align-middle">
                        {accounts.find((a) => a.id === t.accountId)?.name ?? ''}
                      </td>
                      <td className="p-4 align-middle">{formatCurrency(t.amount, 'PLN')}</td>
                      <td className="p-4 align-middle">{String(t.startDate).split('T')[0]}</td>
                      <td className="p-4 align-middle">
                        {t.endDate ? String(t.endDate).split('T')[0] : ''}
                      </td>
                      <td className="p-4 align-middle">
                        co {t.multiplier} {t.period}
                        {t.dayOfMonth ? `, dzień ${t.dayOfMonth}` : ''}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex justify-center gap-2">
                          <IconButton
                            title="Edytuj"
                            colorClass="text-blue-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditTemplate(t);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            title="Usuń"
                            colorClass="text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(t.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-400">
                      Brak szablonów cyklicznych.
                    </td>
                  </tr>
                )
              ) : (
                accounts.length > 0 ? (
                  accounts.map((account) => (
                    <tr
                      key={account.id}
                      className="cursor-pointer border-b border-gray-700 hover:bg-gray-700"
                      onClick={() => startEditAccount(account)}
                    >
                      <td className="p-4 align-middle">{account.name}</td>
                      <td className="p-4 align-middle">
                        {accountTypeLabel(account)}
                      </td>
                      <td className="p-4 align-middle">
                        {formatCurrency(account.initialBalance, 'PLN')}
                      </td>
                      <td className="p-4 align-middle">
                        {account.creditLimit != null ? formatCurrency(account.creditLimit, 'PLN') : ''}
                      </td>
                      <td className="p-4 align-middle">
                        {account.repaymentAccount?.name ?? ''}
                      </td>
                      <td className="p-4 align-middle">
                        {account.autoRepaymentEnabled
                          ? `Tak, dzień ${Number(account.autoRepaymentOffsetDays ?? 1) + 1}`
                          : 'Nie'}
                      </td>
                      <td className="p-4 align-middle">
                        {account.includeInDailyBudget ? 'Tak' : 'Nie'}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex justify-center gap-2">
                          <IconButton
                            title="Edytuj"
                            colorClass="text-blue-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditAccount(account);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            title="Usuń"
                            colorClass="text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAccount(account.id);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-400">
                      Brak kont.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>}
        </>
        )}
      </div>
		
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {activeTab === 'transaction' && t(editingTransactionId ? 'Edytuj transakcję' : 'Dodaj operację')}
                {activeTab === 'transfer' && t(editingTransactionId ? 'Edytuj przelew' : 'Dodaj przelew')}
                {activeTab === 'recurring' && t(editingTemplateId ? 'Edytuj szablon cykliczny' : 'Dodaj cykliczne')}
                {activeTab === 'account' && t(editingAccountId ? 'Edytuj konto' : 'Dodaj konto')}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white" type="button">
                {t('Zamknij')}
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                className={`rounded px-3 py-2 ${
                  activeTab === 'transaction' ? 'bg-blue-600' : 'border border-gray-700 bg-gray-800'
                }`}
                onClick={() => setActiveTab('transaction')}
                type="button"
              >
                {t('Operacja')}
              </button>
              <button
                className={`rounded px-3 py-2 ${
                  activeTab === 'transfer' ? 'bg-blue-600' : 'border border-gray-700 bg-gray-800'
                }`}
                onClick={() => setActiveTab('transfer')}
                type="button"
              >
                {t('Przelew')}
              </button>
              <button
                className={`rounded px-3 py-2 ${
                  activeTab === 'recurring' ? 'bg-blue-600' : 'border border-gray-700 bg-gray-800'
                }`}
                onClick={() => setActiveTab('recurring')}
                type="button"
              >
                {t('Cykliczne')}
              </button>
              <button
                className={`rounded px-3 py-2 ${
                  activeTab === 'account' ? 'bg-blue-600' : 'border border-gray-700 bg-gray-800'
                }`}
                onClick={() => setActiveTab('account')}
                type="button"
              >
                {t('Konto')}
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {activeTab === 'transaction' && (
                <>
                  <input
                    type="date"
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                  <select
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  >
                    <option value="">{t('Wybierz konto')}</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder={t('Opis')}
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.info}
                    onChange={handleInfoChange}
                    onKeyDown={handleInfoKeyDown}
                  />
                  {infoSuggestion && (
                    <div className="text-sm text-gray-400">
                      Podpowiedź: <button type="button" onClick={acceptInfoSuggestion} className="underline">{infoSuggestion}</button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">{t('Grupa')}</label>
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                        value={formData.transactionGroupId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transactionGroupId: e.target.value,
                            transactionSubgroupId: '',
                          }))
                        }
                      >
                        <option value="">{t('Bez grupy')}</option>
                        {transactionGroups
                          .filter((group) => group.isActive)
                          .map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">{t('Podgrupa')}</label>
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.transactionSubgroupId}
                        disabled={!formData.transactionGroupId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transactionSubgroupId: e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          {formData.transactionGroupId ? 'Bez podgrupy' : 'Najpierw wybierz grupę'}
                        </option>
                        {availableTransactionSubgroups
                          .filter((subgroup) => subgroup.isActive)
                          .map((subgroup) => (
                            <option key={subgroup.id} value={subgroup.id}>
                              {subgroup.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={t('Kwota wpłata')}
                      className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                      value={formData.income}
                      onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={t('Kwota wypłata')}
                      className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                      value={formData.expense}
                      onChange={(e) => setFormData({ ...formData, expense: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-gray-400">Możesz wpisać formułę, np. =27+53,50. Obsługiwane są też -, *, / i nawiasy.</p>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.isSalaryIncome}
                      onChange={(e) => setFormData({ ...formData, isSalaryIncome: e.target.checked })}
                    />
                    To wpływ wynagrodzenia
                  </label>
                </>
              )}

              {activeTab === 'transfer' && (
                <>
                  <input
                    type="date"
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                  <select
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.sourceAccountId}
                    onChange={(e) => setFormData({ ...formData, sourceAccountId: e.target.value })}
                  >
                    <option value="">{t('Z konta')}</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.destinationAccountId}
                    onChange={(e) => setFormData({ ...formData, destinationAccountId: e.target.value })}
                  >
                    <option value="">{t('Na konto')}</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder={t('Opis')}
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.info}
                    onChange={handleInfoChange}
                    onKeyDown={handleInfoKeyDown}
                  />
                  {infoSuggestion && (
                    <div className="text-sm text-gray-400">
                      Podpowiedź: <button type="button" onClick={acceptInfoSuggestion} className="underline">{infoSuggestion}</button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">{t('Grupa')}</label>
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                        value={formData.transactionGroupId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transactionGroupId: e.target.value,
                            transactionSubgroupId: '',
                          }))
                        }
                      >
                        <option value="">{t('Bez grupy')}</option>
                        {transactionGroups
                          .filter((group) => group.isActive)
                          .map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">{t('Podgrupa')}</label>
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.transactionSubgroupId}
                        disabled={!formData.transactionGroupId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transactionSubgroupId: e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          {formData.transactionGroupId ? 'Bez podgrupy' : 'Najpierw wybierz grupę'}
                        </option>
                        {availableTransactionSubgroups
                          .filter((subgroup) => subgroup.isActive)
                          .map((subgroup) => (
                            <option key={subgroup.id} value={subgroup.id}>
                              {subgroup.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('Kwota')}
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </>
              )}

              {activeTab === 'recurring' && (
                <>
                  <select
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  >
                    <option value="">{t('Konto')}</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder={t('Opis szablonu')}
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.info}
                    onChange={handleInfoChange}
                    onKeyDown={handleInfoKeyDown}
                  />
                  {infoSuggestion && (
                    <div className="text-sm text-gray-400">
                      Podpowiedź: <button type="button" onClick={acceptInfoSuggestion} className="underline">{infoSuggestion}</button>
                    </div>
                  )}
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('Kwota')}
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">{t('Grupa')}</label>
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                        value={formData.transactionGroupId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transactionGroupId: e.target.value,
                            transactionSubgroupId: '',
                          }))
                        }
                      >
                        <option value="">{t('Bez grupy')}</option>
                        {transactionGroups
                          .filter((group) => group.isActive)
                          .map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">{t('Podgrupa')}</label>
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.transactionSubgroupId}
                        disabled={!formData.transactionGroupId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            transactionSubgroupId: e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          {formData.transactionGroupId ? 'Bez podgrupy' : 'Najpierw wybierz grupę'}
                        </option>
                        {availableTransactionSubgroups
                          .filter((subgroup) => subgroup.isActive)
                          .map((subgroup) => (
                            <option key={subgroup.id} value={subgroup.id}>
                              {subgroup.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="w-1/2 rounded border border-gray-700 bg-gray-800 p-2"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                    <input
                      type="date"
                      className="w-1/2 rounded border border-gray-700 bg-gray-800 p-2"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-1/3 rounded border border-gray-700 bg-gray-800 p-2"
                      placeholder="Co ile"
                      value={formData.frequencyMultiplier}
                      onChange={(e) => setFormData({ ...formData, frequencyMultiplier: e.target.value })}
                    />
                    <select
                      className="w-2/3 rounded border border-gray-700 bg-gray-800 p-2"
                      value={formData.frequencyPeriod}
                      onChange={(e) =>
                        setFormData({ ...formData, frequencyPeriod: e.target.value as 'day' | 'month' | 'year' })
                      }
                    >
                      <option value="day">{t('Dni')}</option>
                      <option value="month">{t('Miesięcy')}</option>
                      <option value="year">{t('Lat')}</option>
                    </select>
                  </div>
                  {formData.frequencyPeriod === 'month' && (
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder={t('Dzień miesiąca')}
                      className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                    />
                  )}
                </>
              )}

              {activeTab === 'account' && (
                <>
                  <input
                    type="text"
                    placeholder={t('Nazwa konta')}
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  />
                  <select
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.accountTypeId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        accountTypeId: e.target.value,
                        creditLimit: '',
                        repaymentAccountId: '',
                        autoRepaymentEnabled: false,
                        autoRepaymentOffsetDays: '1',
                        autoRepaymentGroupId: '',
                        autoRepaymentSubgroupId: '',
                      }))
                    }
                  >
                    <option value="">{t('Wybierz typ konta')}</option>
                    {accountTypeOptions.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={t('Saldo początkowe')}
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.includeInDailyBudget}
                      onChange={(e) => setFormData({ ...formData, includeInDailyBudget: e.target.checked })}
                    />
                    Uwzględniaj konto w budżecie dziennym
                  </label>
                  {isCreditCardForm && (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={t('Limit karty kredytowej')}
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                        value={formData.creditLimit}
                        onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                      />
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                        value={formData.repaymentAccountId}
                        onChange={(e) => setFormData({ ...formData, repaymentAccountId: e.target.value })}
                      >
                        <option value="">Konto do spłaty karty (opcjonalnie)</option>
                        {accounts
                          .filter((a) => !editingAccountId || a.id !== editingAccountId)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>


                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.autoRepaymentEnabled}
                      onChange={(e) =>
                        setFormData({ ...formData, autoRepaymentEnabled: e.target.checked })
                      }
                    />
                    Automatyczna spłata
                  </label>

                  <input
                    type="number"
                    min="0"
                    max="31"
                    placeholder={t('Dzień spłaty')}
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.autoRepaymentOffsetDays}
                    disabled={!formData.autoRepaymentEnabled}
                    onChange={(e) => setFormData({ ...formData, autoRepaymentOffsetDays: e.target.value })}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">
                        Grupa spłaty
                      </label>
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.autoRepaymentGroupId}
                        disabled={!formData.autoRepaymentEnabled}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            autoRepaymentGroupId: e.target.value,
                            autoRepaymentSubgroupId: '',
                          }))
                        }
                      >
                        <option value="">Domyślna kategoria systemowa</option>
                        {transactionGroups
                          .filter((group) => group.isActive)
                          .map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">
                        Podgrupa spłaty
                      </label>
                      <select
                        className="w-full rounded border border-gray-700 bg-gray-800 p-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.autoRepaymentSubgroupId}
                        disabled={!formData.autoRepaymentEnabled || !formData.autoRepaymentGroupId}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            autoRepaymentSubgroupId: e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          {formData.autoRepaymentGroupId
                            ? 'Bez podgrupy'
                            : 'Najpierw wybierz grupę'}
                        </option>
                        {availableAutoRepaymentSubgroups
                          .filter((subgroup) => subgroup.isActive)
                          .map((subgroup) => (
                            <option key={subgroup.id} value={subgroup.id}>
                              {subgroup.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                    </>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded border border-gray-700 px-4 py-2 hover:bg-gray-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
	  
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {categoryFormMode === 'group'
                  ? editingGroupId
                    ? 'Edytuj grupę'
                    : 'Dodaj grupę'
                  : editingSubgroupId
                    ? 'Edytuj podgrupę'
                    : 'Dodaj podgrupę'}
              </h2>
              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded border border-gray-600 px-3 py-1 hover:bg-gray-800"
              >
                Zamknij
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCategorySubmit}>
              {categoryFormMode === 'subgroup' && (
                <select
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                  value={categoryForm.transactionGroupId}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      transactionGroupId: e.target.value,
                    }))
                  }
                >
                  <option value="">Wybierz grupę nadrzędną</option>
                  {categoryGroups
                    .filter((group) => group.isActive)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-200">
                  {categoryFormMode === 'group' ? 'Nazwa grupy' : 'Nazwa podgrupy'}
                </label>
                <input
                  type="text"
                  placeholder={categoryFormMode === 'group' ? 'Np. Dom' : 'Np. Prąd'}
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                  value={categoryForm.name}
                  onChange={(e) => {
                    const nextName = e.target.value;

                    setCategoryForm((prev) => ({
                      ...prev,
                      name: nextName,
                      code: isCategoryCodeDirty ? prev.code : slugifyCategoryCode(nextName),
                    }));
                  }}
                />
			  </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-200">
                  Kod techniczny
                </label>
                <input
                  type="text"
                  placeholder={
                    categoryFormMode === 'group'
                      ? 'Uzupełni się automatycznie, np. dom'
                      : 'Uzupełni się automatycznie, np. prad'
                  }
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                  value={categoryForm.code}
                  onChange={(e) => {
                    const nextCode = slugifyCategoryCode(e.target.value);
                    setIsCategoryCodeDirty(true);
                    setCategoryForm((prev) => ({
                      ...prev,
                      code: nextCode,
                    }));
                  }}
                />
                <p className="text-xs text-gray-400">
                  Kod jest używany technicznie w systemie. Możesz go zmienić ręcznie, ale domyślnie tworzy się z nazwy.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-200">
                  Kolejność wyświetlania
                </label>
                <input
                  type="number"
                  placeholder="Np. 10, 20, 30"
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2"
                  value={categoryForm.sortOrder}
                  onChange={(e) =>
                    setCategoryForm((prev) => ({
                      ...prev,
                      sortOrder: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-gray-400">
                  Mniejsza wartość oznacza wyższą pozycję na liście. Dla porządku warto używać kroków co 10.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="rounded border border-gray-600 px-4 py-2 hover:bg-gray-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'transactions' && lastClearedTransactionId !== null && (
        <button
          type="button"
          onClick={handleMobilePageNavigation}
          aria-label={t(isPageAtTop ? 'Przejdź do ostatniej rozliczonej operacji' : 'Przejdź na górę strony')}
          title={t(isPageAtTop ? 'Przejdź do ostatniej rozliczonej operacji' : 'Przejdź na górę strony')}
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-gray-600 bg-gray-700/95 text-white shadow-xl backdrop-blur transition hover:bg-gray-600 active:scale-95 md:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-7 w-7 transition-transform duration-200 ${isPageAtTop ? 'rotate-180' : ''}`}
          >
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>
      )}
	  
	  
	  
	  
	  
    </div>
  );
}
