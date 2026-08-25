import React from 'react';
import type { AuthUser, ManagedUserForm } from '../../types';
import { useI18n } from '../../i18n/I18nProvider';
import { UserMenu } from '../user/UserMenu';

type Props = {
  authUser: AuthUser;
  users: AuthUser[];
  errorMessage: string;
  successMessage: string;
  form: ManagedUserForm;
  setForm: React.Dispatch<React.SetStateAction<ManagedUserForm>>;
  editingUserId: number | null;
  isUserModalOpen: boolean;
  setIsUserModalOpen: (open: boolean) => void;
  passwordUser: AuthUser | null;
  setPasswordUser: (user: AuthUser | null) => void;
  password: string;
  setPassword: (password: string) => void;
  onCreateUser: () => void;
  onEditUser: (user: AuthUser) => void;
  onExpireUser: (user: AuthUser) => void;
  onUpdateUser: (id: number, data: Partial<Pick<AuthUser, 'username' | 'isActive' | 'role'>> & { password?: string }) => Promise<boolean>;
  onSaveUser: (event: React.FormEvent) => void;
  onSaveUserPassword: (event: React.FormEvent) => void;
  onLogout: () => void;
  onUserUpdated: (user: AuthUser) => void;
};

export function AdminPanel(props: Props) {
  const { t } = useI18n();
  const {
    authUser, users, errorMessage, successMessage, form, setForm, editingUserId, isUserModalOpen,
    setIsUserModalOpen, passwordUser, setPasswordUser, password, setPassword,
    onCreateUser, onEditUser, onExpireUser, onUpdateUser, onSaveUser, onSaveUserPassword,
    onLogout, onUserUpdated,
  } = props;

  return <main className="min-h-screen bg-gray-950 px-4 py-6 pt-[calc(1.5rem+env(safe-area-inset-top))] text-gray-100 sm:px-6">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-gray-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-medium text-blue-400">{t('Panel administratora')}</p><h1 className="mt-1 text-3xl font-bold">{t('Zarządzanie użytkownikami')}</h1><p className="mt-1 text-sm text-gray-400">{t('Dodawaj konta, zmieniaj ich dane i kontroluj dostęp do systemu.')}</p></div>
        <UserMenu user={authUser} onUserUpdated={onUserUpdated} onLogout={onLogout} />
      </header>
      {errorMessage && <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-red-300">{errorMessage}</div>}
      {successMessage && <div className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-green-300">{successMessage}</div>}
      <section className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
        <div className="flex flex-col gap-3 border-b border-gray-700 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h2 className="text-lg font-semibold">{t('Użytkownicy w systemie')}</h2><p className="mt-1 text-sm text-gray-400">{t('Łącznie')}: {users.length}</p></div><button type="button" onClick={onCreateUser} className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500">{t('Dodaj użytkownika')}</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-gray-800 text-xs uppercase tracking-wide text-gray-400"><tr><th className="px-5 py-3">{t('Nazwa')}</th><th className="px-5 py-3">{t('Rola')}</th><th className="px-5 py-3">{t('Status')}</th><th className="px-5 py-3 text-right">{t('Akcje')}</th></tr></thead><tbody className="divide-y divide-gray-800">
          {users.map((user) => <tr key={user.id} className="hover:bg-gray-800/60"><td className="px-5 py-4 font-medium">{user.username}{user.id === authUser.id && <span className="ml-2 text-xs text-gray-500">(Ty)</span>}</td><td className="px-5 py-4 text-gray-300">{t(user.role === 'ADMIN' ? 'Administrator' : 'Użytkownik')}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${user.isActive ? 'bg-emerald-950 text-emerald-300' : 'bg-gray-700 text-gray-300'}`}>{t(user.isActive ? 'Aktywny' : 'Wygasły')}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => onEditUser(user)} className="rounded border border-gray-600 px-3 py-1.5 hover:bg-gray-700">{t('Edytuj')}</button><button type="button" onClick={() => { setPasswordUser(user); setPassword(''); }} className="rounded border border-gray-600 px-3 py-1.5 hover:bg-gray-700">{t('Zmień hasło')}</button>{user.isActive ? <button type="button" disabled={user.id === authUser.id} onClick={() => onExpireUser(user)} className="rounded border border-red-800 px-3 py-1.5 text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40">{t('Wygaś')}</button> : <button type="button" onClick={() => onUpdateUser(user.id, { isActive: true })} className="rounded border border-emerald-800 px-3 py-1.5 text-emerald-300 hover:bg-emerald-950">{t('Aktywuj')}</button>}</div></td></tr>)}
          {users.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">{t('Brak użytkowników do wyświetlenia.')}</td></tr>}
        </tbody></table></div>
      </section>
    </div>
    {isUserModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={onSaveUser} className="w-full max-w-md space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"><h2 className="text-xl font-semibold">{editingUserId ? 'Edytuj użytkownika' : 'Nowy użytkownik'}</h2><label className="block text-sm">Nazwa użytkownika<input required minLength={3} value={form.username} onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>{!editingUserId && <label className="block text-sm">Hasło początkowe<input required minLength={8} type="password" value={form.password} onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label>}<label className="block text-sm">Rola<select value={form.role} disabled={editingUserId === authUser.id} onChange={(event) => setForm((previous) => ({ ...previous, role: event.target.value as 'USER' | 'ADMIN' }))} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2"><option value="USER">Użytkownik</option><option value="ADMIN">Administrator</option></select></label>{editingUserId && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} disabled={editingUserId === authUser.id} onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))} /> Konto aktywne</label>}<div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsUserModalOpen(false)} className="rounded border border-gray-700 px-4 py-2">Anuluj</button><button className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500">Zapisz</button></div></form></div>}
    {passwordUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={onSaveUserPassword} className="w-full max-w-sm space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"><div><h2 className="text-xl font-semibold">Zmień hasło</h2><p className="mt-1 text-sm text-gray-400">Użytkownik: {passwordUser.username}</p></div><label className="block text-sm">Nowe hasło<input autoFocus required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2" /></label><p className="text-xs text-gray-400">Po zmianie hasła wszystkie aktywne sesje tego użytkownika zostaną zakończone.</p><div className="flex justify-end gap-2"><button type="button" onClick={() => setPasswordUser(null)} className="rounded border border-gray-700 px-4 py-2">Anuluj</button><button className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-500">Zmień hasło</button></div></form></div>}
  </main>;
}
