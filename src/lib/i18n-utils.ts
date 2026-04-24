import { useTranslation } from 'react-i18next';

export function useLocalizedField() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2).toLowerCase() || 'fr';

  return <T extends Record<string, any>>(item: T, field: keyof T): any => {
    if (lang === 'en') {
      const enField = `${String(field)}_en` as keyof T;
      return item[enField] || item[field];
    }
    if (lang === 'es') {
      const esField = `${String(field)}_es` as keyof T;
      return item[esField] || item[`${String(field)}_en` as keyof T] || item[field];
    }
    return item[field];
  };
}
