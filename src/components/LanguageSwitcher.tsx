import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  const cycleLanguage = () => {
    const langs = ['fr', 'en', 'es'];
    const currentLang = i18n.language?.substring(0, 2).toLowerCase() || 'fr';
    const currentIdx = langs.indexOf(currentLang) !== -1 ? langs.indexOf(currentLang) : 0;
    const newLang = langs[(currentIdx + 1) % langs.length];
    i18n.changeLanguage(newLang);
  };

  const displayLang = i18n.language?.substring(0, 2).toUpperCase() || 'FR';

  return (
    <button
      onClick={cycleLanguage}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gold transition-all group",
        className
      )}
      title="Change language"
    >
      <Globe className="w-4 h-4 text-gray-400 group-hover:text-gold transition-colors" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 group-hover:text-gold transition-colors">
        {displayLang}
      </span>
    </button>
  );
}
