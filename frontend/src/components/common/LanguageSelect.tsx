import type { Language } from '../../i18n/I18nProvider';
import { useI18n } from '../../i18n/I18nProvider';
import { apiFetch } from '../../api/client';

export function LanguageSelect({ onChange }: { onChange?: (language: Language) => void }) {
  const { language, setLanguage, t } = useI18n();

  return <label className="inline-flex items-center gap-2 text-sm text-gray-300">
    <span className="sr-only">{t('Język')}</span>
    <select
      value={language}
      aria-label={t('Język')}
      onChange={(event) => {
        const nextLanguage = event.target.value as Language;
        setLanguage(nextLanguage);
        if (localStorage.getItem('projection_auth_token')) {
          void apiFetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: 'ui_locale', value: nextLanguage }),
          });
        }
        onChange?.(nextLanguage);
      }}
      className="rounded border border-gray-700 bg-gray-900 px-2 py-2 text-gray-200"
    >
      <option value="pl">PL</option>
      <option value="en">EN</option>
    </select>
  </label>;
}
