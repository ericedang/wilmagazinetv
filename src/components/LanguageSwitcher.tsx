import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gold transition-all group",
        className
      )}
    >
      <Globe className="w-4 h-4 text-gray-400 group-hover:text-gold transition-colors" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 group-hover:text-gold transition-colors">
        {i18n.language === 'fr' ? 'EN' : 'FR'}
      </span>
    </button>
  );
}
