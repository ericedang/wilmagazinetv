import { useTranslation } from 'react-i18next';

export function useLocalizedField() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return <T extends Record<string, any>>(item: T, field: keyof T): any => {
    if (lang === 'en') {
      const enField = `${String(field)}_en` as keyof T;
      return item[enField] || item[field];
    }
    return item[field];
  };
}
