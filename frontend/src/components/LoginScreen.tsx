import React, { useState } from 'react';
import { getErrorText } from '../api/client';
import type { AuthUser } from '../types';
import { LanguageSelect } from './common/LanguageSelect';
import { useI18n } from '../i18n/I18nProvider';

export function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await window.fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error(await getErrorText(response));
      const data: { token: string; user: AuthUser } = await response.json();
      localStorage.setItem('projection_auth_token', data.token);
      onLogin(data.user);
    } catch (error: any) {
      setError(error?.message ?? t('Nie udało się zalogować.'));
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-gray-950 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] text-gray-100 sm:p-6">
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
      <div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">{t('Projekcja finansowa')}</h1><p className="mt-1 text-sm text-gray-400">{t('Zaloguj się, aby przejść do swoich danych.')}</p></div><LanguageSelect /></div>
      {error && <div className="rounded border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</div>}
      <label className="block text-sm">{t('Nazwa użytkownika')}<input required autoFocus value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>
      <label className="block text-sm">{t('Hasło')}<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>
      <button disabled={submitting} className="w-full rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500 disabled:opacity-60">{submitting ? t('Logowanie…') : t('Zaloguj się')}</button>
    </form>
  </main>;
}
