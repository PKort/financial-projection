import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'pl' | 'en';

const STORAGE_KEY = 'projection_ui_locale';

const en: Record<string, string> = {
  'Projekcja finansowa': 'Financial projection',
  'Zaloguj się, aby przejść do swoich danych.': 'Sign in to access your data.',
  'Nazwa użytkownika': 'Username',
  'Hasło': 'Password',
  'Logowanie…': 'Signing in…',
  'Zaloguj się': 'Sign in',
  'Nie udało się zalogować.': 'Could not sign in.',
  'Sprawdzanie sesji…': 'Checking session…',
  'Operacje': 'Transactions',
  'Podsumowanie': 'Overview',
  'Cykliczne': 'Recurring',
  'Konta': 'Accounts',
  'Kategorie': 'Categories',
  'Użytkownicy': 'Users',
  'Nowa operacja': 'New transaction',
  'Przelew': 'Transfer',
  'Konto': 'Account',
  'Pokaż dodatkowe opcje': 'Show additional options',
  'Wyloguj': 'Sign out',
  'Zmień hasło': 'Change password',
  'Zmień swoje hasło': 'Change your password',
  'Panel administratora': 'Administrator panel',
  'Zarządzanie użytkownikami': 'User management',
  'Dodawaj konta, zmieniaj ich dane i kontroluj dostęp do systemu.': 'Add accounts, edit user details and control access.',
  'Użytkownicy w systemie': 'System users',
  'Łącznie': 'Total',
  'Dodaj użytkownika': 'Add user',
  'Nazwa': 'Name',
  'Rola': 'Role',
  'Status': 'Status',
  'Akcje': 'Actions',
  'Administrator': 'Administrator',
  'Użytkownik': 'User',
  'Aktywny': 'Active',
  'Wygasły': 'Expired',
  'Edytuj': 'Edit',
  'Wygaś': 'Expire',
  'Aktywuj': 'Activate',
  'Brak użytkowników do wyświetlenia.': 'No users to display.',
  'Edytuj użytkownika': 'Edit user',
  'Nowy użytkownik': 'New user',
  'Hasło początkowe': 'Initial password',
  'Konto aktywne': 'Active account',
  'Anuluj': 'Cancel',
  'Zapisz': 'Save',
  'Nowe hasło': 'New password',
  'Obecne hasło': 'Current password',
  'Zmiana własnego hasła': 'Change your password',
  'Po zmianie hasła wszystkie aktywne sesje tego użytkownika zostaną zakończone.': "Changing the password will end all of this user's active sessions.",
  'Wydatki': 'Expenses',
  'Brak danych.': 'No data.',
  'Język': 'Language',
  'Polski': 'Polish',
  'Angielski': 'English',
  'Widok': 'View',
  'Odśwież': 'Refresh',
  'Widok skrócony': 'Compact view',
  'Pełen zakres': 'Full range',
  'Saldo całkowite': 'Total balance',
  'Pokaż limit karty': 'Show card limit',
  'dostępny limit': 'available limit',
  'Saldo na dzień następnej wypłaty': 'Balance on next salary date',
  'Nad / pod kreską': 'Above / below target',
  'Dostępny budżet dzienny': 'Available daily budget',
  'Liczba dni do wypłaty': 'Days until salary',
  'Następna wypłata': 'Next salary',
  'Zadeklarowany budżet dzienny': 'Declared daily budget',
  'Saldo bieżące': 'Current balance',
  'Prognoza na wypłatę': 'Forecast for salary date',
  'Wpływy': 'Income',
  'Bilans': 'Net balance',
  'Wydatki wg grup': 'Expenses by group',
  'Wydatki wg kont': 'Expenses by account',
  'Brak danych o wydatkach per konto.': 'No expense data by account.',
  'Podgrupa': 'Subgroup',
  'Kwota': 'Amount',
  'Kod': 'Code',
  'Typ': 'Type',
  'Brak dziennych wydatków w wybranym zakresie.': 'No daily expenses in the selected range.',
  'Brak danych per konto dla dnia wypłaty.': 'No per-account data for the salary date.',
  'Wpływy z wypłat': 'Salary income',
  'Wyczyść wybór': 'Clear selection',
  'Brak wydatków w wybranym zakresie.': 'No expenses in the selected range.',
  'Podgrupy kosztów': 'Expense subgroups',
  'Szczegóły dla wybranej grupy': 'Selected group details',
  'Top podgrupy kosztów': 'Top expense subgroups',
  'Miesięczny przepływ': 'Monthly cash flow',
  'Miesiąc': 'Month',
  'Dzienny trend wydatków': 'Daily expense trend',
  'Dodaj grupę': 'Add group',
  'Pokaż nieaktywne': 'Show inactive',
  'Dodaj podgrupę': 'Add subgroup',
  'Brak kategorii do wyświetlenia.': 'No categories to display.',
  'Wpłata': 'Income',
  'Wypłata': 'Expense',
  'Częstotliwość': 'Frequency',
  'Saldo początkowe': 'Initial balance',
  'Konto spłaty': 'Repayment account',
  'Auto-spłata': 'Auto repayment',
  'W budżecie': 'In budget',
  'Usuń': 'Delete',
  'Wyczyść': 'Clear',
  'Zmiana hasła': 'Change password',
  'Nowe hasło (min. 8 znaków)': 'New password (min. 8 characters)',
  'Rachunek bieżący': 'Checking account',
  'Oszczędnościowe': 'Savings account',
  'Karta kredytowa': 'Credit card',
  'dzień': 'day',
  'dni': 'days',
  'Edytuj transakcję': 'Edit transaction',
  'Dodaj operację': 'Add transaction',
  'Edytuj przelew': 'Edit transfer',
  'Dodaj przelew': 'Add transfer',
  'Edytuj szablon cykliczny': 'Edit recurring template',
  'Dodaj cykliczne': 'Add recurring transaction',
  'Edytuj konto': 'Edit account',
  'Dodaj konto': 'Add account',
  'Zamknij': 'Close',
  'Operacja': 'Transaction',
  'Wybierz konto': 'Select account',
  'Opis': 'Description',
  'Grupa': 'Group',
  'Bez grupy': 'No group',
  'Bez podgrupy': 'No subgroup',
  'Kwota wpłata': 'Income amount',
  'Kwota wypłata': 'Expense amount',
  'Z konta': 'From account',
  'Na konto': 'To account',
  'Opis szablonu': 'Template description',
  'Dni': 'Days',
  'Miesięcy': 'Months',
  'Lat': 'Years',
  'Dzień miesiąca': 'Day of month',
  'Nazwa konta': 'Account name',
  'Wybierz typ konta': 'Select account type',
  'Limit karty kredytowej': 'Credit card limit',
  'Dzień spłaty': 'Repayment day',
  'Ustawienia': 'Settings',
  'Profil': 'Profile',
  'Imię': 'First name',
  'Nazwisko': 'Last name',
  'E-mail': 'Email',
  'Zapisz profil': 'Save profile',
  'Zapisywanie…': 'Saving…',
  'Profil został zapisany.': 'Profile saved.',
  'Nie udało się zapisać profilu.': 'Could not save profile.',
  'Nie udało się zmienić hasła.': 'Could not change password.',
  'Zakres analizy': 'Analytics date range',
  'Data początkowa analizy': 'Analytics start date',
  'Data końcowa analizy': 'Analytics end date',
  'Data początkowa nie może być późniejsza niż data końcowa.': 'The start date cannot be later than the end date.',
  'Podgrupy': 'Subgroups',
  'Brak danych o podgrupach dla tej grupy.': 'No subgroup data for this group.',
  'Kliknij grupę na wykresie powyżej, aby zobaczyć rozbicie na podgrupy.': 'Select a group in the chart above to see its subgroup breakdown.',
  'Brak danych o podgrupach.': 'No subgroup data.',
  'Brak danych miesięcznych w wybranym zakresie.': 'No monthly data in the selected range.',
  'Zakres projekcji': 'Projection date range',
  'Data początkowa projekcji': 'Projection start date',
  'Data końcowa projekcji': 'Projection end date',
  'Odświeżanie…': 'Refreshing…',
  'Nie udało się odświeżyć analityki.': 'Could not refresh analytics.',
  'Operacje w podgrupie': 'Transactions in subgroup',
  'Zmiany kategorii zostaną uwzględnione na wykresach po odświeżeniu analityki.': 'Category changes will be reflected in the charts after refreshing analytics.',
  'Data': 'Date',
  'Nazwa operacji': 'Transaction name',
  'Najpierw wybierz grupę': 'Select a group first',
  'Brak operacji w wybranej podgrupie.': 'No transactions in the selected subgroup.',
  'Nie udało się zmienić kategorii.': 'Could not change category.',
  'Operacje na koncie': 'Transactions for account',
  'Brak operacji dla wybranego konta.': 'No transactions for the selected account.',
};

type I18nContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const detectLanguage = (): Language => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'pl' || stored === 'en') return stored;
  return navigator.language.toLowerCase().startsWith('pl') ? 'pl' : 'en';
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage);

  const setLanguage = (nextLanguage: Language) => {
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'pl' ? 'Projekcja Finansowa' : 'Financial Projection';
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    locale: language === 'pl' ? 'pl-PL' : 'en-GB',
    setLanguage,
    t: (key) => language === 'pl' ? key : en[key] ?? key,
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
