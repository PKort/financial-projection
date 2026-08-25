import React, { useEffect, useRef, useState } from 'react';
import { apiFetch, getErrorText } from '../../api/client';
import { useI18n } from '../../i18n/I18nProvider';
import type { AuthUser } from '../../types';
import { LanguageSelect } from '../common/LanguageSelect';

export function UserMenu({ user, onUserUpdated, onLogout }: {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onLogout: () => void;
}) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const openSettings = () => {
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setEmail(user.email ?? '');
    setCurrentPassword('');
    setNewPassword('');
    setMessage('');
    setError('');
    setIsMenuOpen(false);
    setIsSettingsOpen(true);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage('');
    setError('');
    try {
      const response = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      if (!response.ok) throw new Error(await getErrorText(response));
      onUserUpdated(await response.json());
      setMessage(t('Profil został zapisany.'));
    } catch (caught: any) {
      setError(caught?.message ?? t('Nie udało się zapisać profilu.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPassword(true);
    setMessage('');
    setError('');
    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.ok) throw new Error(await getErrorText(response));
      onLogout();
    } catch (caught: any) {
      setError(caught?.message ?? t('Nie udało się zmienić hasła.'));
      setSavingPassword(false);
    }
  };

  return <>
    <div ref={menuRef} className="relative">
      <button type="button" onClick={() => setIsMenuOpen((open) => !open)} aria-expanded={isMenuOpen} aria-haspopup="menu" className="flex items-center gap-2 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm hover:bg-gray-800">
        <span className="max-w-48 truncate">{displayName}</span><span aria-hidden="true">▾</span>
      </button>
      {isMenuOpen && <div role="menu" className="absolute right-0 z-40 mt-2 w-48 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
        <button type="button" role="menuitem" onClick={openSettings} className="block w-full px-4 py-2 text-left hover:bg-gray-800">{t('Ustawienia')}</button>
        <button type="button" role="menuitem" onClick={onLogout} className="block w-full px-4 py-2 text-left text-red-300 hover:bg-gray-800">{t('Wyloguj')}</button>
      </div>}
    </div>

    {isSettingsOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
      <div className="w-full max-w-lg space-y-6 rounded-xl border border-gray-700 bg-gray-900 p-6 text-gray-100 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{t('Ustawienia')}</h2><button type="button" onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">{t('Zamknij')}</button></div>
        {error && <div className="rounded border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-300">{error}</div>}
        {message && <div className="rounded border border-green-800 bg-green-950 px-3 py-2 text-sm text-green-300">{message}</div>}

        <form onSubmit={saveProfile} className="space-y-4">
          <h3 className="font-semibold">{t('Profil')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">{t('Imię')}<input value={firstName} maxLength={100} onChange={(event) => setFirstName(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>
            <label className="block text-sm">{t('Nazwisko')}<input value={lastName} maxLength={100} onChange={(event) => setLastName(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>
          </div>
          <label className="block text-sm">{t('E-mail')}<input type="email" value={email} maxLength={191} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>
          <div><div className="mb-1 text-sm">{t('Język')}</div><LanguageSelect /></div>
          <div className="flex justify-end"><button disabled={savingProfile} className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-60">{savingProfile ? t('Zapisywanie…') : t('Zapisz profil')}</button></div>
        </form>

        <form onSubmit={savePassword} className="space-y-4 border-t border-gray-700 pt-5">
          <h3 className="font-semibold">{t('Zmiana hasła')}</h3>
          <label className="block text-sm">{t('Obecne hasło')}<input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>
          <label className="block text-sm">{t('Nowe hasło (min. 8 znaków)')}<input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>
          <div className="flex justify-end"><button disabled={savingPassword} className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500 disabled:opacity-60">{savingPassword ? t('Zapisywanie…') : t('Zmień hasło')}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
